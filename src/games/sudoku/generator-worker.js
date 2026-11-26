import { generatePuzzle } from "./generator.js";

// 画面から受け取るのは比較用の前回の初期盤面、返すのは今回の初期盤面です。
// WorkerはDOMを参照せず、画面側は問題が届いてから表示と操作の状態を更新します。
self.addEventListener("message", ({ data: previous }) => {
  const puzzle = generatePuzzle();
  // 偶然同じ問題ができた場合も、数字を一律に置換すれば一意性と難しさを保てます。
  const distinct = previous && puzzle.every((value, index) => value === previous[index])
    ? puzzle.map((value) => value === 0 ? 0 : value % 9 + 1)
    : puzzle;
  self.postMessage(distinct);
});
