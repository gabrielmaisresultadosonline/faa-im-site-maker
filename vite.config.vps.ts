import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin";
import { tanstackStartVite } from "@tanstack/react-start/config";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// Esta config NÃO usa @lovable.dev/vite-tanstack-config para ser compatível com ambientes externos (VPS)
export default defineConfig({
  plugins: [
    tanstackStartVite({
      server: {
        entry: "server",
      },
      prerender: {
        routes: ["/"],
      },
    }),
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  nitro: {
    preset: "node-server",
  },
  vite: {
    ssr: {
      noExternal: true,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      cssCodeSplit: false,
    },
  },
});