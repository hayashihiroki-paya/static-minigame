// DOM操作とAIの呼び出しを担当し、合法手や反転規則はlogic.jsへ任せます。
import {
  AI_SEARCH_DEPTH,
  BLACK,
  BOARD_SIZE,
  CELL_COUNT,
  EMPTY,
  WHITE,
  chooseBestMove,
  countDiscs,
  createGameState,
  getGameResult,
  getLegalMoves,
  playMove,
} from "./logic.js";

const boardElement = document.querySelector("#reversi-board");
const blackScore = document.querySelector("#black-score");
const whiteScore = document.querySelector("#white-score");
const feedback = document.querySelector("#game-feedback");
const restartButton = document.querySelector("#restart-button");
const cells = [];

let game = createGameState();
let focusedCell = getLegalMoves(game.board, BLACK)[0];
let isThinking = false;
let turnToken = 0;

function playerName(player) {
  return player === BLACK ? "黒" : "白";
}

/** 盤面ボタンを一度だけ作り、再描画しても同じ要素とフォーカスを保ちます。 */
function createBoard() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "reversi-row";
    rowElement.setAttribute("role", "row");

    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const index = row * BOARD_SIZE + column;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "reversi-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.cellIndex = String(index);
      cell.addEventListener("click", () => chooseCell(index));
      cells[index] = cell;
      rowElement.append(cell);
    }
    fragment.append(rowElement);
  }
  boardElement.replaceChildren(fragment);
}

function getFeedbackText() {
  if (game.isGameOver) {
    const result = getGameResult(game.board);
    const black = result.black;
    const white = result.white;
    if (result.winner === null) return `引き分けです。黒${black}対白${white}。新しい対局を始められます。`;
    const winner = result.winner === BLACK ? "あなた（黒）" : "コンピューター（白）";
    return `${winner}の勝ちです。黒${black}対白${white}。新しい対局を始められます。`;
  }

  const passNotice = game.passedPlayer
    ? `${playerName(game.passedPlayer)}は置ける場所がないためパスしました。`
    : "";
  if (isThinking) return `${passNotice}コンピューターが考えています。`;
  if (game.currentPlayer === BLACK) {
    return `${passNotice}黒のあなたの番です。置ける場所を選んでください。`;
  }
  return `${passNotice}白のコンピューターの番です。`;
}

/** 石数、石の色、合法手、読み上げ用の座標を盤面へ反映します。 */
function render() {
  const legalMoves = new Set(
    game.isGameOver || game.currentPlayer === null
      ? []
      : getLegalMoves(game.board, game.currentPlayer),
  );

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const cell = cells[index];
    const value = game.board[index];
    const canPlace = legalMoves.has(index) && !isThinking && game.currentPlayer === BLACK;
    const stateName = value === BLACK ? "黒石" : value === WHITE ? "白石" : "空きマス";

    cell.classList.toggle("is-black", value === BLACK);
    cell.classList.toggle("is-white", value === WHITE);
    cell.classList.toggle("is-legal", canPlace);
    cell.textContent = value === BLACK ? "●" : value === WHITE ? "○" : "";
    cell.tabIndex = index === focusedCell ? 0 : -1;
    cell.setAttribute("aria-disabled", String(!canPlace));
    cell.setAttribute(
      "aria-label",
      `${row + 1}行${column + 1}列、${stateName}${canPlace ? "、置けます" : ""}`,
    );
  }

  const discs = countDiscs(game.board);
  blackScore.textContent = String(discs.black);
  whiteScore.textContent = String(discs.white);
  feedback.textContent = getFeedbackText();
}

function chooseCell(index) {
  if (isThinking || game.isGameOver || game.currentPlayer !== BLACK) return;
  if (!getLegalMoves(game.board, BLACK).includes(index)) {
    feedback.textContent = "そこには置けません。緑の印があるマスを選んでください。";
    return;
  }

  game = playMove(game, index);
  focusedCell = index;
  render();
  if (game.currentPlayer === WHITE && !game.isGameOver) scheduleComputerTurn();
}

/** 考え中の表示を先に描画してから探索し、古い対局の処理は世代番号で無効にします。 */
function scheduleComputerTurn() {
  isThinking = true;
  const scheduledToken = turnToken;
  render();

  window.setTimeout(() => {
    if (scheduledToken !== turnToken || game.isGameOver || game.currentPlayer !== WHITE) return;

    const choice = chooseBestMove(game.board, WHITE, AI_SEARCH_DEPTH);
    if (choice.move === null) {
      // 通常は手番解決で対局終了またはパスになります。予期しない状態なら人に知らせます。
      isThinking = false;
      feedback.textContent = "コンピューターは置ける場所を見つけられませんでした。新しい対局を始めてください。";
      return;
    }

    game = playMove(game, choice.move);
    focusedCell = choice.move;
    isThinking = false;
    render();

    // 人がパスになった場合、白はもう一度連続して手を選びます。
    if (game.currentPlayer === WHITE && !game.isGameOver) scheduleComputerTurn();
  }, 40);
}

// 矢印キーで盤面内を移動し、Enter・Spaceは各ボタン標準のクリックとして扱います。
boardElement.addEventListener("keydown", (event) => {
  const activeIndex = Number(event.target.closest("[data-cell-index]")?.dataset.cellIndex);
  const currentIndex = Number.isInteger(activeIndex) ? activeIndex : focusedCell;
  const row = Math.floor(currentIndex / BOARD_SIZE);
  const column = currentIndex % BOARD_SIZE;
  const steps = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const step = steps[event.key];
  if (!step) return;

  event.preventDefault();
  const nextRow = Math.max(0, Math.min(BOARD_SIZE - 1, row + step[0]));
  const nextColumn = Math.max(0, Math.min(BOARD_SIZE - 1, column + step[1]));
  focusedCell = nextRow * BOARD_SIZE + nextColumn;
  render();
  cells[focusedCell].focus();
});

restartButton.addEventListener("click", () => {
  // 再開操作で保留中のAIタイマーも破棄し、新しい対局に古い手が混ざらないようにします。
  turnToken += 1;
  isThinking = false;
  game = createGameState();
  focusedCell = getLegalMoves(game.board, BLACK)[0];
  render();
  cells[focusedCell].focus();
});

createBoard();
render();
