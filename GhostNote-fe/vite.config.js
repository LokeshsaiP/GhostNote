import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      // Allows serving index.html as fallback for React Router
      allow: ["."],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  // 👇 this is the important part
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
