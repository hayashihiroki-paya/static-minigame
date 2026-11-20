/**
 * マルバツゲームの盤面状態とHTMLをつなぎます。
 * ルール判定はlogic.jsに任せ、このファイルではボタン操作と表示更新を担当します。
 */
import { BOARD_CELL_COUNT, createInitialGame, playMove, resetGame } from "./logic.js";

const cellButtons = document.querySelectorAll("[data-cell-index]");
const nextMarkOutput = document.querySelector("#next-mark");
const gameFeedback = document.querySelector("#game-feedback");
const resetButton = document.querySelector("#reset-button");

let game = createInitialGame();

/**
 * 位置と記号からボタンの読み上げ名を作ります。
 * 空きマスと選択済みのマスが、絵や色に頼らず分かるようにします。
 */
function getCellLabel(cellIndex, mark) {
  const row = Math.floor(cellIndex / 3) + 1;
  const column = (cellIndex % 3) + 1;
  const cellState = mark === null ? "空き" : mark;

  return `${row}行${column}列目、${cellState}`;
}

/**
 * 現在のゲーム状態から盤面と案内文をまとめて描画します。
 * 勝ち筋の位置もクラスに反映し、終了後にどこがそろったか視覚的に分かるようにします。
 */
function renderGame() {
  for (const button of cellButtons) {
    const cellIndex = Number(button.dataset.cellIndex);
    const mark = game.board[cellIndex];
    const isWinningCell = game.winningLine?.includes(cellIndex) ?? false;

    button.textContent = mark ?? "";
    button.setAttribute("aria-label", getCellLabel(cellIndex, mark));
    button.setAttribute("aria-pressed", String(mark !== null));
    button.classList.toggle("is-marked", mark !== null);
    button.classList.toggle("is-winning", isWinningCell);
  }

  nextMarkOutput.textContent = game.result === "playing" ? game.currentMark : "—";

  if (game.result === "won") {
    gameFeedback.textContent = `${game.winner}の勝ちです。リセットするともう一度遊べます。`;
  } else if (game.result === "draw") {
    gameFeedback.textContent = "引き分けです。リセットするともう一度遊べます。";
  } else {
    gameFeedback.textContent = `${game.currentMark}の番です。空いているマスを選んでください。`;
  }
}

/**
 * クリックされたマスでルール状態を更新します。
 * 同じマスや終了後の選択はlogic.jsが同じ状態を返すため、不要な再描画をしません。
 */
for (const button of cellButtons) {
  button.addEventListener("click", () => {
    const nextGame = playMove(game, Number(button.dataset.cellIndex));

    if (nextGame === game) {
      return;
    }

    game = nextGame;
    renderGame();
  });
}

/**
 * 新しいゲームへ戻し、最初のマスにフォーカスを置きます。
 * キーボード利用者がリセット後すぐに「×」の手を選べるようにします。
 */
resetButton.addEventListener("click", () => {
  game = resetGame();
  renderGame();
  cellButtons[0].focus();
});

// 初期画面も状態から描画し、初期表示と各手の後の書式を統一します。
if (cellButtons.length !== BOARD_CELL_COUNT) {
  throw new Error("盤面には9個のマスが必要です。");
}

renderGame();
