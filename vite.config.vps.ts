// Config exclusiva para deploy em VPS (Node.js + PM2 + Nginx).
// NÃO é usada pelo build padrão da Lovable (que continua usando vite.config.ts).
//
// Uso na VPS:
//   npx vite build --config vite.config.vps.ts
//   PORT=3000 HOST=127.0.0.1 pm2 start .output/server/index.mjs --name lovablack
//
// Por que existe: o build padrão gera um Worker (Cloudflare), que NÃO abre porta TCP.
// Rodá-lo com `node` faz o Nginx retornar 502. Este preset gera um servidor Node real.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "node-server" },
  vite: {
    // Evita erro de inicialização (createCsrfMiddleware is not a function)
    // causado pela ordem de chunks no preset Node.
    build: {
      rolldownOptions: { output: { codeSplitting: false } },
    },
  },
});
