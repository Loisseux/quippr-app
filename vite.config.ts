import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
} from "./src/lib/supabase/config";
import {
  DEFAULT_ANTHROPIC_API_KEY,
  resolveAnthropicApiKey,
} from "./src/lib/flirtcoach/anthropic-config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Merge VITE_* from project root when cwd is not the repo root. */
function viteEnvFromProjectRoot(): Plugin {
  return {
    name: "vite-env-from-project-root",
    config(_cfg, { mode }) {
      const loaded = loadEnv(mode, projectRoot, "VITE_");
      const envEntries = {
        ...loaded,
        VITE_SUPABASE_URL: resolveSupabaseUrl(loaded.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY:
          resolveSupabaseAnonKey(loaded.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY,
        VITE_ANTHROPIC_API_KEY:
          resolveAnthropicApiKey(loaded.VITE_ANTHROPIC_API_KEY) || DEFAULT_ANTHROPIC_API_KEY,
      };

      return {
        define: Object.fromEntries(
          Object.entries(envEntries).map(([key, value]) => [
            `import.meta.env.${key}`,
            JSON.stringify(value),
          ]),
        ),
      };
    },
  };
}

// Client-only SPA: single `dist/index.html` + assets (easy Vercel / Netlify / static hosts).
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tailwindcss(),
    react(),
    tsconfigPaths(),
    viteEnvFromProjectRoot(),
  ],
  envDir: projectRoot,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/ingest/static": {
        target: "https://eu-assets.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
      },
      "/ingest/array": {
        target: "https://eu-assets.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
      },
      "/ingest": {
        target: "https://eu.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
      },
    },
  },
});
