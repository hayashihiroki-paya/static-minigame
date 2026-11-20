// DOMイベントと表示を担当し、盤面ルールはlogic.jsの状態遷移関数に委ねます。
import {
  BOARD_SIZE,
  MINE_COUNT,
  createInitialGame,
  revealCell,
  toggleFlag,
} from "./logic.js";

// HTML側のIDとひも付け、DOM参照を一度だけ取得して再描画で使い回します。
const boardElement = document.querySelector("#minesweeper-board");
const flagCount = document.querySelector("#flag-count");
const feedback = document.querySelector("#game-feedback");
const revealModeButton = document.querySelector("#reveal-mode-button");
const flagModeButton = document.querySelector("#flag-mode-button");
const resetButton = document.querySelector("#reset-button");

// ゲーム状態、操作モード、キーボードの現在位置は表示と同期するため画面側で保持します。
let game = createInitialGame();
let mode = "reveal";
let activeRow = 0;
let activeColumn = 0;
let actionMessage = "";

const cellButtons = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE));

/**
 * 終了状態をひとつの判定にまとめ、クリック処理と表示処理で同じ条件を使います。
 * @returns {boolean} 勝利または敗北の状態ならtrue
 */
function isGameFinished() {
  return game.status === "won" || game.status === "lost";
}

/**
 * セルの座標と状態から、スクリーンリーダーへ渡す日本語名を作ります。
 * @returns {string} 未確認・旗・空白・隣接数・地雷のいずれかを含む名前
 */
function getCellName(row, column, cell) {
  const location = (row + 1) + "行" + (column + 1) + "列";
  if (cell.isFlagged && !(game.status === "lost" && cell.hasMine)) {
    return location + "、旗";
  }
  if (game.status === "lost" && cell.hasMine) {
    return location + "、地雷";
  }
  if (cell.isRevealed && cell.hasMine) {
    return location + "、地雷";
  }
  if (cell.isRevealed && cell.adjacentMines > 0) {
    return location + "、隣接する地雷" + cell.adjacentMines + "個";
  }
  if (cell.isRevealed) return location + "、空白";
  return location + "、未確認";
}

/**
 * ひとつのセル状態をボタンの見た目、読み上げ名、Tab移動状態へ反映します。
 * 敗北後は隠れていた地雷も表示し、結果を盤面から確認できるようにします。
 */
function renderCell(row, column) {
  const cell = game.board[row][column];
  const button = cellButtons[row][column];
  const showMine = cell.hasMine && (cell.isRevealed || game.status === "lost");
  const classNames = ["minesweeper-cell"];

  if (showMine) {
    classNames.push("minesweeper-cell--mine");
  } else if (cell.isRevealed) {
    classNames.push("minesweeper-cell--revealed");
  } else if (cell.isFlagged) {
    classNames.push("minesweeper-cell--flagged");
  }

  button.className = classNames.join(" ");
  button.tabIndex = row === activeRow && column === activeColumn ? 0 : -1;
  button.disabled = isGameFinished();
  button.setAttribute("aria-label", getCellName(row, column, cell));

  if (showMine) {
    button.textContent = "✹";
  } else if (cell.isFlagged) {
    button.textContent = "⚑";
  } else if (cell.isRevealed && cell.adjacentMines > 0) {
    button.textContent = String(cell.adjacentMines);
    button.dataset.number = String(cell.adjacentMines);
  } else {
    button.textContent = cell.isRevealed ? "·" : "";
    delete button.dataset.number;
  }
}

/**
 * ライブ領域へ出す案内をゲーム状態から選びます。
 * 勝敗を一時的な操作メッセージより優先し、重要な結果が隠れないようにします。
 */
function getStatusText() {
  if (game.status === "won") return "クリア！安全なマスをすべて開きました。";
  if (game.status === "lost") return "地雷を踏みました。盤面に地雷を表示しています。最初から遊び直せます。";
  if (actionMessage) return actionMessage;
  if (game.status === "ready") return "最初に開くマスは安全です。地雷を避けながら盤面を開いてください。";
  return "地雷を避けて安全なマスを開いてください。";
}

/**
 * 全セルとモードボタン、旗数、ライブ領域を現在の状態に合わせて更新します。
 * @returns {void} DOMの表示のみを変更します
 */
function render() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      renderCell(row, column);
    }
  }

  flagCount.textContent = "旗 " + game.flagCount + " / " + MINE_COUNT;
  feedback.textContent = getStatusText();
  revealModeButton.setAttribute("aria-pressed", String(mode === "reveal"));
  flagModeButton.setAttribute("aria-pressed", String(mode === "flag"));
  revealModeButton.classList.toggle("minesweeper-button--selected", mode === "reveal");
  flagModeButton.classList.toggle("minesweeper-button--selected", mode === "flag");
}

/**
 * 選択中のモードに応じて旗切替または開く処理を呼び、結果を画面へ反映します。
 * 状態が変わらない入力には理由を案内し、無効な操作を黙って処理しません。
 */
function handleCell(row, column) {
  if (isGameFinished()) return;

  const cell = game.board[row][column];
  if (mode === "flag") {
    const willFlag = !cell.isFlagged;
    const nextGame = toggleFlag(game, row, column);
    if (nextGame === game) {
      actionMessage = cell.isRevealed
        ? "開いたマスには旗を付けられません。"
        : "このマスの旗は変更できません。";
    } else {
      game = nextGame;
      actionMessage = (willFlag ? "旗を付けました。" : "旗を外しました。") + "旗の数は" + game.flagCount + "です。";
    }
  } else {
    const nextGame = revealCell(game, row, column);
    if (nextGame === game) {
      actionMessage = cell.isFlagged
        ? "旗が付いています。旗モードで外してから開いてください。"
        : "このマスはすでに開いています。";
    } else {
      game = nextGame;
      actionMessage = game.status === "playing" ? "マスを開きました。" : "";
    }
  }
  render();
}

/**
 * 9行×9列の標準ボタンを一度だけDOMへ作ります。
 * grid/row/gridcellの関係を作り、各ボタンのclickを対応する座標に結び付けます。
 */
function createBoardButtons() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.setAttribute("role", "row");

    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const cellElement = document.createElement("div");
      const button = document.createElement("button");
      cellElement.setAttribute("role", "gridcell");
      button.type = "button";
      button.className = "minesweeper-cell";
      button.dataset.row = String(row);
      button.dataset.column = String(column);
      button.addEventListener("click", () => handleCell(row, column));
      cellElement.append(button);
      rowElement.append(cellElement);
      cellButtons[row][column] = button;
    }
    boardElement.append(rowElement);
  }
}

/**
 * フォーカス中セルを記録し、盤面内のTab停止点をその1マスだけにします。
 * 矢印キー移動後に再びTab操作で盤面を出られるロービングtabindexです。
 */
function setActiveCell(row, column) {
  activeRow = row;
  activeColumn = column;
  for (let currentRow = 0; currentRow < BOARD_SIZE; currentRow += 1) {
    for (let currentColumn = 0; currentColumn < BOARD_SIZE; currentColumn += 1) {
      cellButtons[currentRow][currentColumn].tabIndex =
        currentRow === activeRow && currentColumn === activeColumn ? 0 : -1;
    }
  }
}

// 2つのモードボタンは状態を排他的に保ち、画面とaria-pressedを同時に更新します。
revealModeButton.addEventListener("click", () => {
  mode = "reveal";
  actionMessage = "開くモードです。安全だと思うマスを選んでください。";
  render();
});
flagModeButton.addEventListener("click", () => {
  mode = "flag";
  actionMessage = "旗モードです。旗を付けるマスを選んでください。";
  render();
});
// やり直しでは盤面とモードを初期化し、最初のセルへフォーカスを戻します。
resetButton.addEventListener("click", () => {
  game = createInitialGame();
  mode = "reveal";
  activeRow = 0;
  activeColumn = 0;
  actionMessage = "盤面をリセットしました。";
  render();
  cellButtons[0][0].focus();
});

// クリックやTab移動でも、最後にフォーカスされたセルを矢印移動の起点にします。
boardElement.addEventListener("focusin", (event) => {
  const button = event.target.closest("button[data-row]");
  if (!button) return;
  setActiveCell(Number(button.dataset.row), Number(button.dataset.column));
});

// 標準ボタンのEnter/Space動作は残し、矢印キーだけ盤面内のフォーカス移動へ使います。
boardElement.addEventListener("keydown", (event) => {
  const movement = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[event.key];
  if (!movement) return;

  const nextRow = Math.max(0, Math.min(BOARD_SIZE - 1, activeRow + movement[0]));
  const nextColumn = Math.max(0, Math.min(BOARD_SIZE - 1, activeColumn + movement[1]));
  if (nextRow === activeRow && nextColumn === activeColumn) return;
  event.preventDefault();
  cellButtons[nextRow][nextColumn].focus();
});

// HTMLが読み込まれたら盤面ボタンを作り、初期状態を同じ描画関数で表示します。
createBoardButtons();
render();
