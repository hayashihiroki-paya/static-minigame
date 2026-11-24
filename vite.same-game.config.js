import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// RustのWASMと画面を一緒に静的出力し、開発時のサーバーを配信物に含めません。
export default defineConfig({
  root: fileURLToPath(new URL("./src/games/same-game/", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/games/same-game/", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // CIで毎回同じ静的ファイル名を生成できるようにします。
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
