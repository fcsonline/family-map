import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const normalizeBase = (value) => {
  if (!value) return "/";
  if (value === "relative") return "./";
  return value.endsWith("/") ? value : `${value}/`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = normalizeBase(env.VITE_BASE_PATH);

  return {
    envPrefix: "VITE_",
    base,
    plugins: [react()],
    server: {
      proxy: {
        "/api": "http://localhost:3001",
        "/uploads": "http://localhost:3001",
      },
    },
  };
});
