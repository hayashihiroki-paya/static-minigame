import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Phaserを使うPongだけをバンドルし、依存ライブラリを含む静的ファイルとして配信します。
export default defineConfig({
  root: fileURLToPath(new URL("./src/games/pong/", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/games/pong/", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      // Phaser本体と小さな起動処理を別エントリーにし、本体だけを圧縮して配布します。
      // これにより静的配布時の大きな単一ファイルをそのままリポジトリに置かずに済みます。
      input: {
        index: fileURLToPath(new URL("./src/games/pong/index.html", import.meta.url)),
        main: fileURLToPath(new URL("./src/games/pong/main.js", import.meta.url)),
        bootstrap: fileURLToPath(new URL("./src/games/pong/bootstrap.js", import.meta.url)),
      },
      output: {
        // 同じ出力パスを使うと、静的配布物をCIで再生成して確認できます。
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
