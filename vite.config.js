import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const normalizeBase = (value) => {
  if (!value) return "/";
  if (value === "relative") return "./";
  return value.endsWith("/") ? value : `${value}/`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = normalizeBase(env.VITE_BASE_PATH);
  const commitSha =
    env.VITE_GIT_COMMIT ||
    (() => {
      try {
        return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
          .toString()
          .trim();
      } catch {
        return "unknown";
      }
    })();
  const repoUrl = env.VITE_REPO_URL || "https://github.com/fcsonline/family-map";

  return {
    envPrefix: "VITE_",
    base,
    define: {
      __APP_COMMIT_SHA__: JSON.stringify(commitSha),
      __APP_REPO_URL__: JSON.stringify(repoUrl),
    },
    plugins: [react()],
    server: {
      proxy: {
        "/api": "http://localhost:3001",
        "/uploads": "http://localhost:3001",
      },
    },
  };
});
