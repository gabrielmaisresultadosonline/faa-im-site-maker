import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin";
import { tanstackStartVite } from "@tanstack/react-start/config";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStartVite({
      server: {
        entry: "server",
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
});
