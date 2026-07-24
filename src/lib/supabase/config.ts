/**
 * Supabase credentials must come from environment variables:
 * - Locally: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env`
 * - Production: set the same vars in the Vercel project settings
 * - Native (Capacitor): set them before `npm run build` / `cap:sync` so they are baked into the bundle
 *
 * Do not hardcode project URLs or anon keys in source — GitHub secret scanning will block the push.
 */
export const DEFAULT_SUPABASE_URL = "";
export const DEFAULT_SUPABASE_ANON_KEY = "";

export function resolveSupabaseUrl(envValue: string | undefined): string {
  const value = envValue?.trim();
  return value || DEFAULT_SUPABASE_URL;
}

export function resolveSupabaseAnonKey(envValue: string | undefined): string {
  const value = envValue?.trim();
  return value || DEFAULT_SUPABASE_ANON_KEY;
}
