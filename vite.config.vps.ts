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
      output: {
        // Garante que o código do servidor não tente importar assets via URL relativa
        // se o bundler do Nitro não estiver sincronizado
        format: "esm",
      }
    }
  },
  ssr: {
    // Força o bundling de todas as dependências no servidor para evitar erros de importação
    noExternal: true,
    // Garante que o TanStack Start e Radix não sejam tratados como externos
    external: ["@tanstack/react-start/config"]
  },
  resolve: {
    alias: {
      // Previne duplicação de React no bundle SSR que causa erro de hooks
      "react": "react",
      "react-dom": "react-dom",
    }
  }
});
