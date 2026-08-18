import { defineConfig } from "@lovable.dev/vite-tanstack-config";

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
      noExternal: true, // Garante que as dependências sejam buildadas no bundle SSR para evitar erros de import no Node
    },
    build: {
      chunkSizeWarningLimit: 2000,
    }
  }
});
