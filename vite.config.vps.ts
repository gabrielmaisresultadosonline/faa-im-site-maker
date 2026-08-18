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
    // Desabilitar prerender para evitar falhas durante o build se o ambiente de rede for instável
    prerender: {
      routes: ["/"],
    },
  },
  vite: {
    ssr: {
      // Usamos noExternal: true para garantir que todas as dependências sejam buildadas no bundle.
      // Isso evita erros de "module not found" no Node no VPS da Hostinger.
      noExternal: true,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      // Desabilitar CSS code splitting para evitar links quebrados em rotas dinâmicas
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
