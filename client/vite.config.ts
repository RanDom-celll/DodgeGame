import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    proxy: {
      "/socket.io": {
        target: "https://dodgegame-epf4.onrender.com",
        ws: true,
      },
    },
  },
});
