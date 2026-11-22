// DOMの入力と表示を担当し、候補計算と勝敗判定はlogic.jsへ任せます。
import {
  CELL_MARK,
  CELL_COUNT,
  COLUMN_CLUES,
  GRID_SIZE,
  ROW_CLUES,
  createGame,
  markCell,
  requestHint,
} from "./logic.js";

const boardElement = document.querySelector("#nonogram-board");
const rowCluesElement = document.querySelector("#row-clues");
const columnCluesElement = document.querySelector("#column-clues");
const feedback = document.querySelector("#game-feedback");
const hintButton = document.querySelector("#hint-button");
const restartButton = document.querySelector("#restart-button");
const modeButtons = Array.from(document.querySelectorAll(".nonogram-mode-button"));
const cellButtons = [];

let game = createGame();
let selectedMark = CELL_MARK.FILLED;

/**
 * 数字ヒントを読み上げ名とリスト要素にして表示します。
 * @param {number[]} clues 連続するマス数
 * @param {string} label 何行目・何列目かを表す説明
 * @param {string} className 表示方向に応じたスタイル名
 * @returns {HTMLOListElement} 表示するヒント一覧
 */
function createClueList(clues, label, className) {
  const list = document.createElement("ol");
  list.className = className;
  list.setAttribute("aria-label", `${label}のヒント ${clues.length > 0 ? clues.join("、") : "0"}`);

  const visibleClues = clues.length > 0 ? clues : [0];
  for (const clue of visibleClues) {
    const item = document.createElement("li");
    item.textContent = String(clue);
    list.append(item);
  }
  return list;
}

/**
 * 解答から作った行・列ヒントを盤面の端に配置します。
 * @param {number[][]} clues ヒント一覧
 * @param {HTMLElement} container 表示先
 * @param {string} direction rowまたはcolumn
 */
function renderClues(clues, container, direction) {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < GRID_SIZE; index += 1) {
    const label = direction === "row" ? `${index + 1}行` : `${index + 1}列`;
    fragment.append(
      createClueList(clues[index], label, `nonogram-clue nonogram-clue--${direction}`),
    );
  }
  container.replaceChildren(fragment);
}

/**
 * 盤面ボタンを一度だけ作り、更新後も同じ要素を使ってフォーカスを保ちます。
 */
function createCellButtons() {
  const fragment = document.createDocumentFragment();
  for (let cellIndex = 0; cellIndex < CELL_COUNT; cellIndex += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nonogram-cell";
    button.dataset.cellIndex = String(cellIndex);
    button.addEventListener("click", () => chooseCell(cellIndex));
    cellButtons.push(button);
    fragment.append(button);
  }
  boardElement.replaceChildren(fragment);
}

/**
 * ゲーム状態をマスの記号、読み上げ名、選択中モード、通知へ反映します。
 * @param {string} message 状態ライブ領域へ表示する文
 */
function render(message) {
  for (let cellIndex = 0; cellIndex < CELL_COUNT; cellIndex += 1) {
    const row = Math.floor(cellIndex / GRID_SIZE);
    const column = cellIndex % GRID_SIZE;
    const button = cellButtons[cellIndex];
    const mark = game.marks[cellIndex];
    const isHinted = game.hint?.row === row && game.hint?.column === column;

    button.classList.toggle("is-filled", mark === CELL_MARK.FILLED);
    button.classList.toggle("is-empty-mark", mark === CELL_MARK.EMPTY);
    button.classList.toggle("is-hinted", isHinted);
    button.disabled = game.isWon;
    button.textContent = mark === CELL_MARK.FILLED ? "●" : mark === CELL_MARK.EMPTY ? "×" : "";
    const stateLabel =
      mark === CELL_MARK.FILLED ? "塗り" : mark === CELL_MARK.EMPTY ? "空きの印" : "未入力";
    button.setAttribute(
      "aria-label",
      `${row + 1}行${column + 1}列、${stateLabel}${isHinted ? "、ヒントのマス" : ""}`,
    );
  }

  for (const modeButton of modeButtons) {
    const isSelected = modeButton.dataset.mark === selectedMark;
    modeButton.classList.toggle("is-selected", isSelected);
    modeButton.setAttribute("aria-pressed", String(isSelected));
  }

  hintButton.disabled = game.isWon;
  feedback.textContent = message;
}

/**
 * 選択中の入力モードをマスに適用します。
 * @param {number} cellIndex 左上から数えたマスの位置
 */
function chooseCell(cellIndex) {
  const nextGame = markCell(game, cellIndex, selectedMark);
  if (nextGame === game) return;

  game = nextGame;
  render(
    game.isWon
      ? "完成！すべての塗りマスが絵と一致しました。"
      : `${Math.floor(cellIndex / GRID_SIZE) + 1}行${(cellIndex % GRID_SIZE) + 1}列を更新しました。`,
  );
}

// 入力モードを明示的に選べるため、右クリックや長押しを必要としません。
for (const button of modeButtons) {
  button.addEventListener("click", () => {
    selectedMark = button.dataset.mark;
    const modeName =
      selectedMark === CELL_MARK.FILLED
        ? "塗る"
        : selectedMark === CELL_MARK.EMPTY
          ? "空きの印"
          : "消す";
    render(`${modeName}モードを選びました。マスを選んでください。`);
  });
}

// 候補が共通して決めるマスだけを案内し、盤面の入力は自動変更しません。
hintButton.addEventListener("click", () => {
  game = requestHint(game);
  render(game.hintText);
});

// 初期状態に戻し、キーボード利用者が盤面の先頭から再開できるようにします。
restartButton.addEventListener("click", () => {
  game = createGame();
  selectedMark = CELL_MARK.FILLED;
  render("新しい盤面です。行と列の数字を手がかりに進めましょう。");
  cellButtons[0].focus();
});

renderClues(ROW_CLUES, rowCluesElement, "row");
renderClues(COLUMN_CLUES, columnCluesElement, "column");
createCellButtons();
render("塗るモードです。行と列の数字を手がかりに進めましょう。");
