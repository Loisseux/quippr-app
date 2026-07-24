import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseAnonKey, resolveSupabaseUrl } from "./config";

const supabaseUrl = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = resolveSupabaseAnonKey(
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : "Unable to connect to Quippr servers. Please check your connection and try again.";

/**
 * createClient requires non-empty strings. When env vars are missing we still
 * construct a client with placeholders so imports don't crash; API calls will fail
 * until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
 */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "public-anon-key-not-configured";

let supabaseClient: SupabaseClient;

try {
  supabaseClient = createClient(supabaseUrl || PLACEHOLDER_URL, supabaseAnonKey || PLACEHOLDER_KEY, {
    auth: {
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  supabaseClient = createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY, {
    auth: {
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

export const supabase = supabaseClient;
