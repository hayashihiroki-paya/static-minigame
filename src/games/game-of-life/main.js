// DOM入力と自動進行タイマーを担当し、セルの規則はlogic.jsへ委ねます。
import {
  ALIVE,
  BOARD_SIZE,
  CELL_COUNT,
  countLiveCells,
  createEmptyBoard,
  nextGeneration,
  toggleCell,
} from "./logic.js";

const boardElement = document.querySelector("#life-board");
const generationOutput = document.querySelector("#generation-count");
const liveCountOutput = document.querySelector("#live-count");
const feedback = document.querySelector("#game-feedback");
const stepButton = document.querySelector("#step-button");
const runButton = document.querySelector("#run-button");
const resetButton = document.querySelector("#reset-button");
const cells = [];

let board = createEmptyBoard();
let generation = 0;
let isRunning = false;
let timerId = null;
let focusedCell = 0;

/** 20行×20列のボタンを作り、盤面の番号とDOM要素の対応を固定します。 */
function createBoard() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "life-row";
    rowElement.setAttribute("role", "row");

    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const index = row * BOARD_SIZE + column;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "life-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.cellIndex = String(index);
      cell.addEventListener("click", () => toggleAt(index));
      cells[index] = cell;
      rowElement.append(cell);
    }
    fragment.append(rowElement);
  }
  boardElement.replaceChildren(fragment);
}

/** 状態を盤面、セル名、ボタン状態、数値表示へ反映します。 */
function render() {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const isAlive = board[index] === ALIVE;
    const cell = cells[index];

    cell.classList.toggle("is-alive", isAlive);
    cell.disabled = isRunning;
    cell.tabIndex = index === focusedCell ? 0 : -1;
    cell.setAttribute("aria-pressed", String(isAlive));
    cell.setAttribute("aria-label", `${row + 1}行${column + 1}列、生存セル${isAlive ? "あり" : "なし"}`);
  }

  generationOutput.textContent = String(generation);
  liveCountOutput.textContent = String(countLiveCells(board));
  stepButton.disabled = isRunning;
  runButton.textContent = isRunning ? "一時停止する" : "自動進行を始める";
  runButton.setAttribute("aria-pressed", String(isRunning));
}

function toggleAt(index) {
  if (isRunning) return;
  board = toggleCell(board, index);
  focusedCell = index;
  const row = Math.floor(index / BOARD_SIZE) + 1;
  const column = (index % BOARD_SIZE) + 1;
  const stateName = board[index] ? "生存" : "死亡";
  feedback.textContent = `${row}行${column}列を${stateName}セルにしました。`;
  render();
}

/** 1世代分だけ盤面を進めます。自動進行からも同じ関数を呼びます。 */
function advanceGeneration() {
  board = nextGeneration(board);
  generation += 1;
  render();
}

function stopAutomaticRun() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  isRunning = false;
}

runButton.addEventListener("click", () => {
  if (isRunning) {
    stopAutomaticRun();
    feedback.textContent = `自動進行を一時停止しました。世代${generation}、生存セル${countLiveCells(board)}個です。`;
  } else {
    isRunning = true;
    timerId = window.setInterval(advanceGeneration, 350);
    feedback.textContent = "自動進行を始めました。停止するには一時停止ボタンを押してください。";
  }
  render();
});

stepButton.addEventListener("click", () => {
  if (isRunning) return;
  advanceGeneration();
  feedback.textContent = `世代${generation}へ進みました。生存セルは${countLiveCells(board)}個です。`;
});

resetButton.addEventListener("click", () => {
  stopAutomaticRun();
  board = createEmptyBoard();
  generation = 0;
  focusedCell = 0;
  feedback.textContent = "盤面を初期化しました。セルを配置してください。";
  render();
  cells[focusedCell].focus();
});

// 矢印キーで盤面を移動し、Enter・Spaceによる切り替えはボタン標準の動作に任せます。
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
  if (!isRunning) cells[focusedCell].focus();
});

createBoard();
render();
