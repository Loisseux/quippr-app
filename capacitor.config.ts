import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quippr.app",
  appName: "Quippr",
  webDir: "dist",
  server: {
    // Ensures SPA routes like /app resolve inside the native WebView.
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  ios: {
    contentInset: "automatic",
    // Prefer the dark splash/background while the WebView boots.
    backgroundColor: "#0D0F1A",
  },
  backgroundColor: "#0D0F1A",
};

export default config;
