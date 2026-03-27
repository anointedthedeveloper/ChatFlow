import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080, hmr: { overlay: false } },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg"],
      manifest: {
        name: "RepoRoom",
        short_name: "RepoRoom",
        description: "Developer messaging platform — chat, GitHub, projects, and workspace tools in one place.",
        theme_color: "#6d28d9",
        background_color: "#0a0e18",
        display: "standalone",
        orientation: "portrait",
        start_url: "https://www.reporoom.site/",
        scope: "https://www.reporoom.site/",
        id: "https://www.reporoom.site/",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          { src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,ico}"] },
    }),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
