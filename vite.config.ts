import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget =
    process.env.BACKEND_URL || env.VITE_API_BASE || "http://localhost:5157";

  return {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/hubs": {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
      "/shops": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/hubs": {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
      "/shops": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  };
});
