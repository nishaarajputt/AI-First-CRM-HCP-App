import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Use 127.0.0.1 (not localhost) — Node resolves localhost to IPv6 (::1)
        // while uvicorn binds to IPv4, which causes ECONNREFUSED on macOS.
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
