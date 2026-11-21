// DOM入力と表示更新を担当し、迷路生成や移動ルールはlogic.jsへ任せます。
import { MAZE_SIZE, createInitialGame, movePlayer } from "./logic.js";

const mazeBoard = document.querySelector("#maze-board");
const moveCount = document.querySelector("#move-count");
const feedback = document.querySelector("#game-feedback");
const restartButton = document.querySelector("#restart-button");
const directionButtons = document.querySelectorAll("[data-direction]");

// キーボードと画面ボタンで同じ方向名を使い、入力経路を一つにまとめます。
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

let game = createInitialGame();

/**
 * ゲーム状態に合わせて盤面、移動数、操作可能なボタンを描き直します。
 * 盤面のマスはCSSの壁枠で表し、開いている辺だけ色を透明にします。
 * @param {string} message ライブ領域に表示する状態の説明
 */
function render(message) {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < MAZE_SIZE; row += 1) {
    for (let column = 0; column < MAZE_SIZE; column += 1) {
      const mazeCell = game.maze[row][column];
      const element = document.createElement("div");
      element.className = "maze-cell";
      element.dataset.wallUp = String(mazeCell.walls.up);
      element.dataset.wallRight = String(mazeCell.walls.right);
      element.dataset.wallDown = String(mazeCell.walls.down);
      element.dataset.wallLeft = String(mazeCell.walls.left);

      const isStart = row === 0 && column === 0;
      const isGoal = row === MAZE_SIZE - 1 && column === MAZE_SIZE - 1;
      const isPlayer = game.player.row === row && game.player.column === column;
      if (isStart) element.classList.add("maze-cell--start");
      if (isGoal) element.classList.add("maze-cell--goal");
      if (isPlayer) element.classList.add("maze-cell--player");

      fragment.append(element);
    }
  }

  mazeBoard.replaceChildren(fragment);
  moveCount.textContent = String(game.moves);
  feedback.textContent = message;
  directionButtons.forEach((button) => {
    button.disabled = game.isWon;
  });
}

/**
 * 指定方向へ進み、壁・境界・ゴールの結果を日本語で通知します。
 * @param {string} direction 移動方向
 */
function move(direction) {
  if (game.isWon) return;

  const nextGame = movePlayer(game, direction);
  if (nextGame === game) {
    feedback.textContent = "壁があるか迷路の端です。移動数は変わりません。";
    return;
  }

  game = nextGame;
  if (game.isWon) {
    render("ゴールに到着しました！" + game.moves + "回の移動で脱出しました。");
  } else {
    render("移動しました。現在の移動数は" + game.moves + "回です。");
  }
}

// 矢印キーでページがスクロールしないようにし、迷路操作に入力を使います。
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const direction = KEY_DIRECTIONS.get(event.key) ?? KEY_DIRECTIONS.get(event.key.toLowerCase());
  if (!direction) return;

  event.preventDefault();
  move(direction);
});

// 画面上の方向ボタンはタッチ端末でも使えるよう標準button要素にします。
directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    move(button.dataset.direction);
  });
});

// 新しい迷路を生成し、プレイヤーと移動数を同時に初期化します。
restartButton.addEventListener("click", () => {
  game = createInitialGame();
  render("新しい迷路を作りました。左上の●から右下の★へ進みましょう。");
});

render("迷路を作りました。左上の●から右下の★へ進みましょう。");
