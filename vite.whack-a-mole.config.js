import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Reactだけをコンパイルし、他のゲームのVite設定とビルド先を分離します。
export default defineConfig({
  root: fileURLToPath(new URL("./src/games/whack-a-mole/", import.meta.url)),
  base: "./",
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("./dist/games/whack-a-mole/", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 静的出力をコミット済みファイルへ再生成できるよう、ファイル名を固定します。
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
