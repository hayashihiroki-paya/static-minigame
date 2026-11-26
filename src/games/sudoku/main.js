import { CELL_COUNT, columnOf, createGame, enterDigit, findConflicts, rowOf, SIZE } from "./board.js";

const grid = document.querySelector("#sudoku-grid");
const keypad = document.querySelector("#sudoku-keypad");
const status = document.querySelector("#sudoku-status");
const empty = document.querySelector("#sudoku-empty");
const newButton = document.querySelector("#sudoku-new");

let game = null;
let selected = 0;
let worker = null;
let loading = false;
const cells = [];

function selectCell(index, focus = false) {
  // 選択中のマスだけをTabの移動先にし、盤面内は矢印キーで移動します。
  cells[selected].button.tabIndex = -1;
  cells[selected].cell.setAttribute("aria-selected", "false");
  selected = index;
  cells[selected].button.tabIndex = 0;
  cells[selected].cell.setAttribute("aria-selected", "true");
  if (focus) cells[selected].button.focus();
}

for (let row = 0; row < SIZE; row += 1) {
  const rowElement = document.createElement("div");
  rowElement.setAttribute("role", "row");
  for (let column = 0; column < SIZE; column += 1) {
    const index = row * SIZE + column;
    const cell = document.createElement("div");
    cell.setAttribute("role", "gridcell");
    const button = document.createElement("button");
    button.type = "button";
    button.tabIndex = -1;
    button.addEventListener("click", () => selectCell(index, true));
    button.addEventListener("focus", () => {
      if (selected !== index) selectCell(index);
    });
    cell.append(button);
    rowElement.append(cell);
    cells.push({ cell, button });
  }
  grid.append(rowElement);
}

function enter(digit) {
  if (!game || loading || game.cleared) return false;
  if (!enterDigit(game, selected, digit)) {
    status.textContent = "最初から入っている数字は変更できません。";
    return false;
  }
  const conflicts = renderBoard();
  status.textContent = game.cleared ? "クリア！ すべての数字が正しく入りました。"
    : conflicts.size ? "数字が重複しています。下線のあるマスを確認してください。"
      : digit === 0 ? "数字を消しました。" : digit + "を入力しました。";
  return true;
}

const keys = Array.from({ length: SIZE + 1 }, (_, digit) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = digit === 0 ? "消す" : String(digit);
  button.addEventListener("click", () => enter(digit));
  return button;
});
keypad.append(...keys.slice(1), keys[0]);

function updateKeypad() {
  for (const button of keys) {
    // 画面ボタンにフォーカスして解いた場合も、フォーカスを失わないようにします。
    button.setAttribute("aria-disabled", String(!game || loading || game.cleared));
  }
}

function renderBoard() {
  const conflicts = findConflicts(game.values);
  cells.forEach(({ cell, button }, index) => {
    const value = game.values[index];
    const fixed = game.givens[index] !== 0;
    const conflict = conflicts.has(index);
    cell.dataset.fixed = String(fixed);
    cell.dataset.conflict = String(conflict);
    cell.setAttribute("aria-readonly", String(fixed || game.cleared));
    button.textContent = value || "";
    const label = (rowOf(index) + 1) + "行" + (columnOf(index) + 1) + "列、"
      + (value || "空欄") + (fixed ? "、初期数字" : "") + (conflict ? "、重複" : "");
    button.setAttribute("aria-label", label);
  });
  empty.textContent = "空き " + game.values.filter((value) => value === 0).length + "マス";
  updateKeypad();
  return conflicts;
}

const arrows = new Map([
  ["ArrowUp", [-1, 0]], ["ArrowDown", [1, 0]], ["ArrowLeft", [0, -1]], ["ArrowRight", [0, 1]],
]);
grid.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const move = arrows.get(event.key);
  if (move) {
    event.preventDefault();
    const row = Math.max(0, Math.min(SIZE - 1, rowOf(selected) + move[0]));
    const column = Math.max(0, Math.min(SIZE - 1, columnOf(selected) + move[1]));
    selectCell(row * SIZE + column, true);
  } else if (/^[0-9]$/.test(event.key) || event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    enter(Number(event.key) || 0);
  }
});

function finishLoading(message) {
  loading = false;
  grid.removeAttribute("aria-busy");
  status.textContent = message;
  updateKeypad();
}

function requestPuzzle() {
  // 新しい要求を受けたら前の探索を中断します。前の問題は表示したまま入力を止めます。
  worker?.terminate();
  worker = null;
  loading = true;
  grid.setAttribute("aria-busy", "true");
  status.textContent = "問題を生成しています。";
  updateKeypad();

  let current;
  const fail = () => {
    if (worker !== current) return;
    current.terminate();
    worker = null;
    finishLoading("問題を生成できませんでした。「新しい問題」で再試行できます。");
  };

  try {
    // 相対URLはこのモジュールを基準に解決し、Worker側でもimportを使えるようにします。
    current = new Worker(new URL("./generator-worker.js", import.meta.url), { type: "module" });
    worker = current;
    current.addEventListener("message", ({ data }) => {
      // すでに処理待ちの応答があっても、現在のWorkerの応答だけを採用します。
      // Workerの参照で照合するため、問題の内容や応答の到着順には依存しません。
      if (worker !== current) return;
      if (!Array.isArray(data) || data.length !== CELL_COUNT
        || !data.every((value) => Number.isInteger(value) && value >= 0 && value <= SIZE)
        || !data.includes(0) || !data.some(Boolean)) {
        fail();
        return;
      }
      current.terminate();
      worker = null;
      // 盤面を操作中なら新しい空欄へ案内し、ほかの操作中ならフォーカスを奪いません。
      const boardHadFocus = grid.contains(document.activeElement);
      game = createGame(data);
      grid.hidden = false;
      selectCell(data.indexOf(0), boardHadFocus);
      renderBoard();
      finishLoading("新しい問題です。空いているマスに数字を入れてください。");
    });
    current.addEventListener("error", fail);
    current.addEventListener("messageerror", fail);
    // プレイ中の入力を含めず、前回の出題そのものと比較します。
    current.postMessage(game?.givens ?? null);
  } catch {
    if (current) fail();
    else finishLoading("問題を生成できませんでした。「新しい問題」で再試行できます。");
  }
}

newButton.addEventListener("click", requestPuzzle);
requestPuzzle();
