// 盤面のルールをlogic.jsへ任せ、ここではボタン操作と表示の同期を担当します。
import {
  CELL_COUNT,
  GRID_SIZE,
  PIECE_LABELS,
  attemptSwap,
  areAdjacent,
  createBoard,
} from "./logic.js";

const boardElement = document.querySelector("#match3-board");
const feedback = document.querySelector("#match3-feedback");
const chainCountElement = document.querySelector("#match3-chain-count");
const resetButton = document.querySelector("#match3-reset");
const cellButtons = [];
const pieceSymbols = {
  ruby: "●",
  sapphire: "◆",
  leaf: "▲",
  sun: "✦",
  grape: "■",
};

if (!boardElement || !feedback || !chainCountElement || !resetButton) {
  throw new Error("マッチ3の画面要素を読み込めませんでした。");
}

let board = createBoard();
let selectedIndex = null;
let focusedIndex = 0;

/**
 * 左上から順に座標を日本語で表します。
 * @param {number} index 盤面の一次元インデックス
 * @returns {string} 例: 2行3列
 */
function describeCell(index) {
  return `${Math.floor(index / GRID_SIZE) + 1}行${(index % GRID_SIZE) + 1}列`;
}

/**
 * 64個のボタンを一度だけ作り、各ボタンを同じ配列インデックスへ結び付けます。
 * 要素を再利用すると、盤面を更新してもキーボードフォーカスが失われません。
 */
function createCellButtons() {
  const rows = document.createDocumentFragment();
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "match3-row";
    rowElement.setAttribute("role", "group");
    rowElement.setAttribute("aria-label", `${row + 1}行目`);

    for (let column = 0; column < GRID_SIZE; column += 1) {
      const index = row * GRID_SIZE + column;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "match3-cell";
      button.dataset.cellIndex = String(index);

      const symbol = document.createElement("span");
      symbol.className = "match3-cell__symbol";
      symbol.setAttribute("aria-hidden", "true");
      button.append(symbol);

      button.addEventListener("click", () => chooseCell(index));
      button.addEventListener("keydown", (event) => moveFocus(event, index));
      button.addEventListener("focus", () => {
        focusedIndex = index;
      });
      cellButtons.push(button);
      rowElement.append(button);
    }
    rows.append(rowElement);
  }
  boardElement.replaceChildren(rows);
}

/**
 * 盤面の色・読み上げ名・選択状態と、前の手の連鎖数を画面へ反映します。
 * @param {string} message 状態領域へ表示する説明
 */
function render(message) {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const button = cellButtons[index];
    const piece = board[index];
    const selected = index === selectedIndex;
    const symbol = button.firstElementChild;

    button.dataset.piece = piece;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute(
      "aria-label",
      `${describeCell(index)}、${PIECE_LABELS[piece]}のピース${selected ? "、選択中" : ""}`,
    );
    button.tabIndex = index === focusedIndex ? 0 : -1;
    symbol.textContent = pieceSymbols[piece];
  }

  feedback.textContent = message;
}

/**
 * 一つ目の選択、選択解除、隣接交換のいずれかを行います。
 * 不成立の交換はlogic.jsが元の盤面を返すため、UIはそのまま状態を保てます。
 * @param {number} index 押されたマス
 */
function chooseCell(index) {
  focusedIndex = index;
  if (selectedIndex === null) {
    selectedIndex = index;
    render(`${describeCell(index)}を選びました。隣のマスを選んで交換してください。`);
    return;
  }

  if (selectedIndex === index) {
    selectedIndex = null;
    render("選択を解除しました。交換するマスを選んでください。");
    return;
  }

  if (!areAdjacent(selectedIndex, index)) {
    selectedIndex = index;
    render(`マスは隣り合っていません。${describeCell(index)}を新しく選びました。`);
    return;
  }

  const result = attemptSwap(board, selectedIndex, index);
  if (!result.accepted) {
    render("3つ以上そろわなかったため交換を戻しました。選んだマスから別の隣接マスを試してください。");
    return;
  }

  board = result.board;
  selectedIndex = null;
  chainCountElement.textContent = String(result.cascadeCount);
  render(`${result.cascadeCount}連鎖！ ${result.clearedCount}個のピースが消えました。`);
}

/**
 * 矢印キーで盤面内のフォーカスを動かします。
 * タブキーは盤面の出入りに使い、盤面内では一つのボタンだけをTab順に残します。
 * @param {KeyboardEvent} event キーボードイベント
 * @param {number} index 現在フォーカス中のマス
 */
function moveFocus(event, index) {
  const movement = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[event.key];
  if (!movement) return;

  event.preventDefault();
  const row = Math.floor(index / GRID_SIZE);
  const column = index % GRID_SIZE;
  const nextRow = Math.max(0, Math.min(GRID_SIZE - 1, row + movement[0]));
  const nextColumn = Math.max(0, Math.min(GRID_SIZE - 1, column + movement[1]));
  focusedIndex = nextRow * GRID_SIZE + nextColumn;
  cellButtons[focusedIndex].focus();
}

resetButton.addEventListener("click", () => {
  board = createBoard();
  selectedIndex = null;
  focusedIndex = 0;
  chainCountElement.textContent = "0";
  render("新しい盤面です。マスを選び、隣のマスを交換してください。");
  cellButtons[focusedIndex].focus();
});

createCellButtons();
render("マスを選び、隣のマスを選んで交換しましょう。");
