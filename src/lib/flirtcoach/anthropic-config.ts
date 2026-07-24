/**
 * Anthropic API key must come from the environment:
 * - Locally: set VITE_ANTHROPIC_API_KEY in `.env`
 * - Production: set VITE_ANTHROPIC_API_KEY in Vercel
 * - Native (Capacitor): set it before `npm run build` / `cap:sync` so it is baked into the bundle
 *
 * Never hardcode Anthropic API keys in source — secret scanning will block the push.
 */
export function resolveAnthropicApiKey(envValue: string | undefined): string {
  return typeof envValue === "string" ? envValue.trim() : "";
}
