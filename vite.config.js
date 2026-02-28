import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envPrefix: "VITE_",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
});
