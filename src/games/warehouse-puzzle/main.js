import { countPlacedBoxes, createGame, isCleared, movePlayer, undoMove } from "./logic.js";
import { stages } from "./stages.js";

const stageSelect = document.querySelector("#warehouse-stage");
const board = document.querySelector("#warehouse-board");
const status = document.querySelector("#warehouse-status");
const undo = document.querySelector("#warehouse-undo");
const reset = document.querySelector("#warehouse-reset");
const directionButtons = [...document.querySelectorAll("[data-direction]")];
const keys = new Map([
  ["ArrowUp", "up"], ["ArrowDown", "down"], ["ArrowLeft", "left"], ["ArrowRight", "right"],
]);

stages.forEach(({ name }, index) => {
  stageSelect.add(new Option((index + 1) + "．" + name, String(index)));
});

let game;
let cells;

function startStage(message) {
  game = createGame(stages[Number(stageSelect.value)].rows);
  board.style.setProperty("--columns", String(game.width));
  cells = [];

  // ステージ切り替え時だけセルを作り直し、各手では同じセルの表示を更新します。
  const rows = document.createDocumentFragment();
  for (let row = 0; row < game.height; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.setAttribute("role", "row");
    for (let column = 0; column < game.width; column += 1) {
      const cell = document.createElement("div");
      cell.setAttribute("role", "gridcell");
      rowElement.append(cell);
      cells.push(cell);
    }
    rows.append(rowElement);
  }
  board.replaceChildren(rows);
  render(message);
}

function cellAppearance(index) {
  const goal = game.goals.has(index);
  if (game.walls.has(index)) return ["wall", "", "壁"];
  if (game.position.player === index) {
    return [goal ? "player-goal" : "player", "▲", goal ? "ゴール上のプレイヤー" : "プレイヤー"];
  }
  if (game.position.boxes.has(index)) {
    return [goal ? "placed" : "box", goal ? "✓" : "■", goal ? "ゴール上の箱" : "箱"];
  }
  return goal ? ["goal", "◎", "ゴール"] : ["floor", "", "床"];
}

function render(message) {
  cells.forEach((cell, index) => {
    const [kind, symbol, label] = cellAppearance(index);
    cell.dataset.kind = kind;
    cell.textContent = symbol;
    cell.setAttribute("aria-label", label);
  });

  undo.disabled = game.history.length === 0;
  const cleared = isCleared(game);
  const row = Math.floor(game.position.player / game.width) + 1;
  const column = game.position.player % game.width + 1;
  const summary = "ゴール " + countPlacedBoxes(game) + " / " + game.goals.size
    + "。移動 " + game.history.length + "手。位置 " + row + "行" + column + "列。";
  status.textContent = (cleared ? "クリア！ " : message + " ") + summary;
}

function move(direction) {
  if (isCleared(game)) return;
  render(movePlayer(game, direction) ? "移動しました。" : "その方向には進めません。");
}

board.addEventListener("keydown", (event) => {
  const direction = keys.get(event.key);
  if (!direction) return;
  event.preventDefault();
  move(direction);
});
directionButtons.forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction));
});
stageSelect.addEventListener("change", () => startStage("ステージを切り替えました。"));
reset.addEventListener("click", () => startStage("最初からやり直しました。"));
undo.addEventListener("click", () => {
  if (!undoMove(game)) return;
  // 最後の履歴を使うとボタンが無効になるので、盤面からそのまま矢印キーで続けます。
  if (game.history.length === 0) board.focus();
  render("1手戻しました。");
});

startStage("ステージを開始しました。");
