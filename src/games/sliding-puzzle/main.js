// DOM入力と表示を担当し、盤面のルールやA*探索はlogic.jsへ任せます。
import {
  BOARD_CELL_COUNT,
  createInitialGame,
  getMovableTileIndices,
  moveBlank,
  moveTile,
  requestHint,
} from "./logic.js";

const puzzleBoard = document.querySelector("#puzzle-board");
const moveCountOutput = document.querySelector("#move-count");
const feedback = document.querySelector("#game-feedback");
const hintButton = document.querySelector("#hint-button");
const restartButton = document.querySelector("#restart-button");

// 盤面ボタンは一度だけ作って再利用し、移動後もキーボードフォーカスを保ちます。
const tileButtons = Array.from({ length: BOARD_CELL_COUNT }, (_, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "puzzle-tile";
  button.dataset.cellIndex = String(index);
  button.addEventListener("click", () => selectTile(index));
  puzzleBoard.append(button);
  return button;
});

// 矢印キーとWASDで空きマスを動かし、クリック操作と同じルールを使います。
const KEY_DIRECTIONS = new Map([
  ["ArrowUp", "up"],
  ["ArrowRight", "right"],
  ["ArrowDown", "down"],
  ["ArrowLeft", "left"],
  ["w", "up"],
  ["d", "right"],
  ["s", "down"],
  ["a", "left"],
]);
const DIRECTION_LABELS = new Map([
  ["up", "上"],
  ["right", "右"],
  ["down", "下"],
  ["left", "左"],
]);

let game = createInitialGame();

/**
 * 盤面・移動数・ヒントの強調・日本語ライブ通知を更新します。
 * ボタン要素を置き換えずに更新するため、タイル移動後もフォーカスが維持されます。
 * @param {string} message ライブ領域で伝える状態
 */
function render(message) {
  const movableIndices = new Set(getMovableTileIndices(game.board));
  for (let index = 0; index < tileButtons.length; index += 1) {
    const button = tileButtons[index];
    const tile = game.board[index];
    const isEmpty = tile === 0;
    const isMovable = movableIndices.has(index);
    const isHinted = game.hintTileIndex === index;

    button.classList.toggle("puzzle-tile--empty", isEmpty);
    button.classList.toggle("puzzle-tile--movable", isMovable && !game.isWon);
    button.classList.toggle("puzzle-tile--hint", isHinted);
    button.disabled = game.isWon;
    button.textContent = isEmpty ? "空き" : String(tile);
    button.setAttribute(
      "aria-label",
      isEmpty
        ? "空きマス"
        : isMovable
          ? tile + "のタイル。空きマスへ移動できます。"
          : tile + "のタイル。空きマスには隣り合っていません。",
    );
  }

  moveCountOutput.textContent = String(game.moves);
  hintButton.disabled = game.isWon;
  feedback.textContent = message;
}

/**
 * 次の状態を反映して、移動数や完成状態を日本語で知らせます。
 * @param {object} nextGame 移動後の状態
 * @param {string} action 操作を表す言葉
 */
function applyMove(nextGame, action) {
  if (nextGame === game) {
    render("その操作では移動できません。移動数は変わりません。");
    return;
  }

  game = nextGame;
  if (game.isWon) {
    render("完成しました！" + game.moves + "回の移動で並べ替えました。");
  } else {
    render(action + "。現在の移動数は" + game.moves + "回です。");
  }
}

/**
 * 選ばれたタイルを空きマスへ動かします。
 * @param {number} tileIndex 選択位置
 */
function selectTile(tileIndex) {
  if (game.isWon) return;
  if (game.board[tileIndex] === 0) {
    render("そこは空きマスです。隣り合う数字タイルを選んでください。");
    return;
  }
  const tile = game.board[tileIndex];
  applyMove(moveTile(game, tileIndex), tile + "のタイルを動かしました");
}

/**
 * キー操作で空きマスを一方向へ動かします。
 * @param {string} direction 方向名
 */
function moveWithKey(direction) {
  if (game.isWon) return;
  const nextGame = moveBlank(game, direction);
  applyMove(nextGame, "空きマスを" + DIRECTION_LABELS.get(direction) + "へ動かしました");
}

// 方向キーがページをスクロールさせず、WASDも同じ移動処理を呼びます。
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;

  const direction = KEY_DIRECTIONS.get(event.key) ?? KEY_DIRECTIONS.get(event.key.toLowerCase());
  if (!direction) return;

  event.preventDefault();
  moveWithKey(direction);
});

// ヒントは最短手順の最初のタイルだけを示し、盤面は自動で動かしません。
hintButton.addEventListener("click", () => {
  game = requestHint(game);
  render(game.hintText);
});

// ゴール状態から新しい盤面を混ぜ、移動数とヒントを同時に初期化します。
restartButton.addEventListener("click", () => {
  game = createInitialGame();
  render("新しい盤面を作りました。空きマスを使って数字を並べましょう。");
});

render("新しい盤面です。タイルを動かして完成させましょう。");
