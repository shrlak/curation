import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base keeps the build portable across the GitHub Pages project
// subpath (https://<user>.github.io/curation/) and any custom domain.
export default defineConfig({
  root: "src",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  assetsInclude: ["**/*.tsv"],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
  },
});
