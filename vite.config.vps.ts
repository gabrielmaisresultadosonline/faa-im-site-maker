import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouterVite } from "@tanstack/router-plugin/vite";

// Configuração otimizada para VPS Hostinger com Nitro/Node-server
export default defineConfig({
  plugins: [
    tanstackRouterVite(),
    react(),
    tsconfigPaths(),
  ],
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      external: ["@tanstack/react-start/config"],
    }
  },
  ssr: {
    noExternal: ["@tanstack/react-start", "@tanstack/react-router", "lucide-react"],
  }
});
