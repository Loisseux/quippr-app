import { Capacitor } from "@capacitor/core";
import { supabase } from "./client";

const WEB_OAUTH_CALLBACK = "https://quippr.app/app";
const NATIVE_OAUTH_CALLBACK = "com.quippr.app://auth/callback";
const APPLE_BUNDLE_ID = "com.quippr.app";
const APPLE_SERVICES_ID = "com.quippr.app.web";

function getSupabaseAuthCallback(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  return base ? `${base}/auth/v1/callback` : "https://placeholder.supabase.co/auth/v1/callback";
}

/** OAuth redirect URL after sign-in (must be listed in Supabase → Auth → URL Configuration). */
export function getOAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_OAUTH_CALLBACK;
  }
  return WEB_OAUTH_CALLBACK;
}

async function closeOAuthBrowser() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }
}

/** Complete OAuth from a native deep-link callback URL. */
export async function handleOAuthCallback(url: string): Promise<{ error: string | null }> {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");
    const errorDescription =
      parsed.searchParams.get("error_description") || parsed.searchParams.get("error");

    if (errorDescription) {
      return { error: decodeURIComponent(errorDescription.replace(/\+/g, " ")) };
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      await closeOAuthBrowser();
      return { error: error?.message ?? null };
    }

    // Implicit-flow fallback (tokens in hash)
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      await closeOAuthBrowser();
      return { error: error?.message ?? null };
    }

    return { error: null };
  } catch (e) {
    return { error: (e as Error).message || "Sign in failed. Please try again." };
  }
}

function formatOAuthError(provider: "google" | "apple", message?: string | null): string {
  const trimmed = message?.trim();
  if (trimmed) {
    if (/invalid[_ ]?client/i.test(trimmed)) {
      return provider === "apple"
        ? "Apple Sign In is misconfigured (invalid client). Contact support or use email sign-in."
        : trimmed;
    }
    return trimmed;
  }

  return provider === "apple"
    ? "Sign in with Apple failed. Please try again or use email sign-in."
    : "Google sign in failed. Please try again or use email sign-in.";
}

function createNonce(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Native Sign in with Apple on iOS — avoids browser OAuth "invalid_client". */
async function signInWithAppleNative(): Promise<{ error: string | null }> {
  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
    const rawNonce = createNonce();
    const hashedNonce = await sha256Hex(rawNonce);

    const result = await SignInWithApple.authorize({
      clientId: APPLE_BUNDLE_ID,
      redirectURI: getSupabaseAuthCallback(),
      scopes: "email name",
      nonce: hashedNonce,
    });

    const identityToken = result.response.identityToken;
    if (!identityToken) {
      return { error: formatOAuthError("apple", "Apple did not return an identity token.") };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
      nonce: rawNonce,
    });

    if (error) return { error: formatOAuthError("apple", error.message) };

    const given = result.response.givenName;
    const family = result.response.familyName;
    if (given || family) {
      void supabase.auth.updateUser({
        data: {
          full_name: [given, family].filter(Boolean).join(" "),
          given_name: given,
          family_name: family,
        },
      });
    }

    return { error: null };
  } catch (e) {
    const message = (e as Error).message || String(e);
    // User cancelled the Apple sheet — not an app error.
    if (/cancel|canceled|cancelled|1001/i.test(message)) {
      return { error: null };
    }
    return { error: formatOAuthError("apple", message) };
  }
}

export async function signInWithOAuthProvider(
  provider: "google" | "apple",
): Promise<{ error: string | null }> {
  // Prefer native Apple Sign In on iOS — browser OAuth often shows "invalid_client".
  if (provider === "apple" && Capacitor.getPlatform() === "ios") {
    return signInWithAppleNative();
  }

  try {
    const redirectTo = getOAuthRedirectUrl();
    const isNative = Capacitor.isNativePlatform();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: isNative,
        ...(provider === "apple" ? { scopes: "email name" } : {}),
      },
    });

    if (error) return { error: formatOAuthError(provider, error.message) };

    if (isNative) {
      if (!data.url) {
        return { error: formatOAuthError(provider, "Could not start sign in. Please try again.") };
      }

      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
      } catch (e) {
        return {
          error: formatOAuthError(
            provider,
            (e as Error).message || "Could not open the sign-in browser.",
          ),
        };
      }
    }

    return { error: null };
  } catch (e) {
    return { error: formatOAuthError(provider, (e as Error).message) };
  }
}

export function registerNativeOAuthListener(
  onError: (message: string) => void,
): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let removed = false;
  let listenerPromise: Promise<{ remove: () => void }> | null = null;

  void (async () => {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appUrlOpen", ({ url }) => {
      const isCallback =
        url.startsWith(NATIVE_OAUTH_CALLBACK) ||
        url.startsWith(WEB_OAUTH_CALLBACK) ||
        url.startsWith("https://quippr.app/app");
      if (!isCallback) return;

      void handleOAuthCallback(url).then((result) => {
        if (result.error) onError(formatOAuthError("apple", result.error));
      });
    });
    if (removed) {
      await handle.remove();
    } else {
      listenerPromise = Promise.resolve(handle);
    }
  })();

  return () => {
    removed = true;
    void listenerPromise?.then((handle) => handle.remove());
  };
}

export { APPLE_BUNDLE_ID, APPLE_SERVICES_ID };
