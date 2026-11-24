// JavaScriptは入力と画面更新を担当し、盤面ルールはRust製WebAssemblyへ委ねます。
import init, { SameGame } from "./pkg/same_game.js";

const TILE_TYPES = [
  null,
  { name: "赤", symbol: "●" },
  { name: "青", symbol: "▲" },
  { name: "黄", symbol: "■" },
  { name: "緑", symbol: "◆" },
  { name: "紫", symbol: "★" },
];
const BOARD_SIZE = 10;

const board = document.querySelector("#same-board");
const scoreOutput = document.querySelector("#score-output");
const tileCountOutput = document.querySelector("#tile-count-output");
const feedback = document.querySelector("#game-feedback");
const resetButton = document.querySelector("#reset-button");

let game;
let activeGroup = [];

/** 固定100個のボタンを一度だけ作り、再描画後もフォーカス位置を保ちます。 */
function createBoard() {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    const button = document.createElement("button");
    button.className = "same-tile";
    button.type = "button";
    button.dataset.tileIndex = String(index);
    button.addEventListener("click", () => removeGroupAt(index));
    fragment.append(button);
  }
  board.replaceChildren(fragment);
}

/** 現在のポインターまたはキーボード位置から、Rust側の隣接グループを表示します。 */
function showGroupAt(index) {
  activeGroup = Array.from(game.group_at(index));
  render();

  if (activeGroup.length >= 2) {
    const tileKind = game.tiles()[index];
    feedback.textContent = `${TILE_TYPES[tileKind].name}のグループ、${activeGroup.length}個を選択中です。EnterまたはSpaceで取り除けます。`;
  } else if (game.tiles()[index] !== 0) {
    feedback.textContent = "このタイルは1個だけです。2個以上つながったグループを選んでください。";
  }
}

/** Rustの状態から全タイルの記号・読み上げ名・ハイライトを更新します。 */
function render() {
  const tiles = Array.from(game.tiles());
  const highlighted = new Set(activeGroup);
  const phase = game.phase();

  for (const button of board.querySelectorAll("[data-tile-index]")) {
    const index = Number(button.dataset.tileIndex);
    const tileKind = tiles[index];
    const row = Math.floor(index / BOARD_SIZE) + 1;
    const column = (index % BOARD_SIZE) + 1;
    const tile = TILE_TYPES[tileKind];

    button.textContent = tile?.symbol ?? "";
    button.disabled = tileKind === 0 || phase !== 0;
    button.setAttribute(
      "aria-label",
      tile ? `${row}行${column}列、${tile.name}のタイル` : `${row}行${column}列、空きマス`,
    );
    button.classList.toggle("is-empty", tileKind === 0);
    button.classList.toggle("is-highlighted", highlighted.has(index));
    // 重力で色が変わるセルから古い色クラスも外し、常にRust側の状態と表示を一致させます。
    for (let kind = 1; kind < TILE_TYPES.length; kind += 1) {
      button.classList.toggle(`same-tile--${kind}`, tileKind === kind);
    }
  }

  scoreOutput.textContent = String(game.score());
  tileCountOutput.textContent = String(tiles.reduce((count, tile) => count + Number(tile !== 0), 0));

  if (phase === 1) {
    feedback.textContent = `クリア！最終得点は${game.score()}点です。最初から遊べます。`;
  } else if (phase === 2) {
    feedback.textContent = `消せるグループがなくなりました。最終得点は${game.score()}点です。`;
  }
}

/** 選んだグループをRustで除去し、得点・落下・終了判定をまとめて受け取ります。 */
function removeGroupAt(index) {
  const removedCount = game.remove_at(index);
  if (removedCount === 0) {
    feedback.textContent = "そのタイルは消せません。同じ色でつながった2個以上のグループを選んでください。";
    return;
  }

  activeGroup = [];
  const points = removedCount * removedCount;
  if (game.phase() === 0) {
    feedback.textContent = `${removedCount}個を取り除き、${points}点を獲得しました。`;
  }
  render();
}

board.addEventListener("pointerover", (event) => {
  const button = event.target.closest("[data-tile-index]");
  if (button && board.contains(button) && !button.disabled) {
    showGroupAt(Number(button.dataset.tileIndex));
  }
});

board.addEventListener("focusin", (event) => {
  const button = event.target.closest("[data-tile-index]");
  if (button && !button.disabled) {
    showGroupAt(Number(button.dataset.tileIndex));
  }
});

resetButton.addEventListener("click", () => {
  game.reset();
  activeGroup = [];
  feedback.textContent = "盤面を初期状態に戻しました。2個以上つながった同色タイルを選んでください。";
  render();
  board.querySelector("[data-tile-index='0']").focus();
});

// WASMは非同期に初期化し、初期化後に作ったRust状態を画面と共有します。
await init();
game = new SameGame();
createBoard();
render();
