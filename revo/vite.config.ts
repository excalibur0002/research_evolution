import { defineConfig } from "vite";

const isGithubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGithubPages ? "/research_evolution/" : "/",
  server: {
    port: 5173,
  },
});
