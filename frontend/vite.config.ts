import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Backend runs on :4000 by default — see backend/src/server.ts
      "/api": "http://localhost:4000",
    },
  },
});
