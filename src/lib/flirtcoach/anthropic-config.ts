/** Fallback so iOS Capacitor builds work when env vars are missing at build time. */
export const DEFAULT_ANTHROPIC_API_KEY =
  "REMOVED_KEY";

export function resolveAnthropicApiKey(envValue: string | undefined): string {
  const value = typeof envValue === "string" ? envValue.trim() : "";
  return value || DEFAULT_ANTHROPIC_API_KEY;
}
