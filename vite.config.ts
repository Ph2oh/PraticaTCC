import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path,
        // Adiciona retry automático se o backend não estiver pronto
        configure: (proxy) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Proxy error:", err.message);
          });
        },
      },
    },
  },
  optimizeDeps: {
    include: ["lucide-react", "react-hook-form", "@tanstack/react-query"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-accordion", "@radix-ui/react-dialog", "@radix-ui/react-popover", "lucide-react"],
          form: ["react-hook-form", "@hookform/resolvers", "zod"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"]
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  }
}));
