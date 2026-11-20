import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * TypeScriptの入口をライツアウトだけに限定し、既存ゲームの配信方法を変えません。
 * 出力はルートから直接配信できるdist配下へ置き、相対URLで静的に動かします。
 */
export default defineConfig({
  root: fileURLToPath(new URL("./src/games/lights-out/", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/games/lights-out/", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 固定名を使うと、コミット済みの静的出力を再ビルドで同じパスに更新できます。
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
