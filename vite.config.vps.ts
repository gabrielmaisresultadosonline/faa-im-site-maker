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
      external: [
        "@tanstack/react-start/config"
      ],
    }
  },
  ssr: {
    noExternal: [
      "@tanstack/react-router",
      "@tanstack/react-start",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-tabs",
      "@radix-ui/react-slot",
      "clsx",
      "tailwind-merge",
      "sonner"
    ],
  }
});
