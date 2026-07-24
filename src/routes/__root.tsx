import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import { PostHogProvider } from "@posthog/react";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "@/contexts/AuthContext";
import { PremiumProvider } from "@/contexts/PremiumContext";

function NotFoundComponent() {
  return (
    <div className="fc-app-shell mx-auto flex w-full max-w-[430px] flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-white">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-white">Page not found</h2>
        <p className="mt-2 text-sm text-white/60">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/app"
            className="fc-gradient inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white"
          >
            Go to app
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="fc-app-shell mx-auto flex w-full max-w-[430px] flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-white">This page didn&apos;t load</h1>
        <p className="mt-2 text-sm text-white/60">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="fc-gradient inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
          >
            Try again
          </button>
          <a
            href="/app"
            className="fc-glass inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
          >
            Go to app
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const posthogKey =
    (import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined) ||
    (import.meta.env.VITE_POSTHOG_KEY as string | undefined);

  // Vite/Vercel proxy `/ingest` only works on web. Capacitor needs the real EU host.
  const apiHost = Capacitor.isNativePlatform()
    ? "https://eu.i.posthog.com"
    : "/ingest";

  const appTree = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PremiumProvider>
          <Outlet />
        </PremiumProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  if (!posthogKey) {
    return appTree;
  }

  return (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        api_host: apiHost,
        ui_host: (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string) || "https://eu.posthog.com",
        defaults: "2026-01-30",
        capture_exceptions: true,
        person_profiles: "identified_only",
        debug: import.meta.env.DEV,
      }}
    >
      {appTree}
    </PostHogProvider>
  );
}
