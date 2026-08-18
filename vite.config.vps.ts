import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolve } from "path";

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
  vite: {
    ssr: {
      noExternal: [
        "@tanstack/react-start",
        "@tanstack/react-router",
        "@tanstack/router-plugin",
        "react-hook-form",
        "@hookform/resolvers",
        "lucide-react",
        "sonner",
        "zod"
      ],
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
