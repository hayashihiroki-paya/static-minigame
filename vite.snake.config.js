import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// SnakeだけにSvelteコンパイルを適用し、既存のLights Outビルド設定と分離します。
export default defineConfig({
  root: fileURLToPath(new URL("./src/games/snake/", import.meta.url)),
  base: "./",
  plugins: [svelte({ configFile: false })],
  build: {
    outDir: fileURLToPath(new URL("./dist/games/snake/", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // コミット済みの静的出力を再ビルドで同じパスに更新します。
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
