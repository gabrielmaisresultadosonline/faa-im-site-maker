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
      // Usamos noExternal: true para garantir que tudo seja empacotado no bundle SSR.
      // Isso é vital para evitar erros de "module not found" no Node no VPS.
      noExternal: true,
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
