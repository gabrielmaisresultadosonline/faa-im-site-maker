// Config exclusiva para deploy em VPS (Node.js + PM2 + Nginx).
// NÃO é usada pelo build padrão da Lovable (que continua usando vite.config.ts / Cloudflare).
// Uso na VPS:  npx vite build --config vite.config.vps.ts
// Saída:       .output/server/index.mjs  (servidor Node que escuta em PORT)
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
  },
});
