/**
 * ブロック崩しの入力・Canvas描画・アニメーションを担当します。
 * ゲーム状態と衝突判定はlogic.jsに任せ、Canvasは状態を画面へ写すだけにします。
 */
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  INITIAL_LIVES,
  createInitialGame,
  launchBall,
  movePaddleBy,
  resetGame,
  updateGame,
} from "./logic.js";

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const scoreOutput = document.querySelector("#score-output");
const livesOutput = document.querySelector("#lives-output");
const gameFeedback = document.querySelector("#game-feedback");
const launchButton = document.querySelector("#launch-button");
const resetButton = document.querySelector("#reset-button");
const directionButtons = document.querySelectorAll("[data-direction]");

if (!context) {
  throw new Error("Canvas 2D APIを利用できません。");
}

let game = createInitialGame();
const heldKeys = new Set();
const heldPointers = new Map();
let animationFrameId = null;
let previousFrameTime = null;
let accumulatedSeconds = 0;

const FIXED_STEP_SECONDS = 1 / 120;
const MAX_FRAME_SECONDS = 0.05;
const BLOCK_COLORS = ["#6978d2", "#7b8bdc", "#8b9be3", "#a0aceb"];

/**
 * 描画だけでなく、読み上げ通知でも残機やゲーム結果を伝えます。
 * 同じ値を書き直さないことで、状態が変わらないフレームの通知を避けます。
 */
function renderHud() {
  const score = String(game.score);
  const lives = String(game.lives);
  let feedback;

  if (scoreOutput.textContent !== score) {
    scoreOutput.textContent = score;
  }

  if (livesOutput.textContent !== lives) {
    livesOutput.textContent = lives;
  }

  if (game.status === "playing") {
    feedback = "ボールを返してください。左右キーまたはA/D、画面上の左右ボタンでパドルを動かせます。";
  } else if (game.status === "won") {
    feedback = `クリアです。${game.score}点を獲得しました。最初から遊ぶと再挑戦できます。`;
  } else if (game.status === "lost") {
    feedback = `ゲームオーバーです。得点は${game.score}点です。最初から遊ぶと再挑戦できます。`;
  } else if (game.lives < INITIAL_LIVES) {
    feedback = `残機は${game.lives}です。準備ができたらボールを発射してください。`;
  } else {
    feedback = "ボールを発射してゲームを始めてください。";
  }

  if (gameFeedback.textContent !== feedback) {
    // ライブ領域は状態が変わったときだけ書き換え、毎フレームの再通知を防ぎます。
    gameFeedback.textContent = feedback;
  }

  launchButton.disabled = game.status !== "ready";
}

/**
 * 現在の状態をCanvas 2D APIで描き直します。
 * 固定の内部サイズを使うため、CSSで画面に合わせても衝突計算と描画がずれません。
 */
function drawGame() {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  context.fillStyle = "#f4f6ff";
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (const block of game.blocks) {
    if (!block.active) {
      continue;
    }

    context.fillStyle = BLOCK_COLORS[block.row];
    context.fillRect(block.x, block.y, block.width, block.height);
    context.fillStyle = "rgb(255 255 255 / 24%)";
    context.fillRect(block.x + 2, block.y + 2, block.width - 4, 3);
  }

  context.fillStyle = "#35499f";
  context.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);

  context.beginPath();
  context.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
  context.fillStyle = "#ed8b45";
  context.fill();

  // 盤面の枠を最後に描くと、ボールやブロックが端に触れても境界が読み取れます。
  context.strokeStyle = "#d4daeb";
  context.lineWidth = 2;
  context.strokeRect(1, 1, GAME_WIDTH - 2, GAME_HEIGHT - 2);
}

/**
 * 押されているキーとタッチボタンをまとめ、左・右・停止のいずれかを返します。
 * 左右を同時に押したときは相殺し、急にパドルが片側へ寄らないようにします。
 */
function getPaddleDirection() {
  const leftPressed =
    heldKeys.has("arrowleft") || heldKeys.has("a") || [...heldPointers.values()].includes(-1);
  const rightPressed =
    heldKeys.has("arrowright") || heldKeys.has("d") || [...heldPointers.values()].includes(1);

  return Number(rightPressed) - Number(leftPressed);
}

/**
 * requestAnimationFrameを必要なときだけ1本起動します。
 * すでに予約済みなら追加しないため、開始操作の連打でもループが重複しません。
 */
function startAnimation() {
  if (animationFrameId !== null) {
    return;
  }

  previousFrameTime = null;
  accumulatedSeconds = 0;
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * 高速な固定時間刻みでルールを進め、Canvasへ描画します。
 * タブ復帰後の大きな時間差は上限を設けて、ボールが一瞬で画面を飛び越えないようにします。
 */
function animate(timestamp) {
  animationFrameId = null;
  const elapsedSeconds =
    previousFrameTime === null
      ? 0
      : Math.min((timestamp - previousFrameTime) / 1000, MAX_FRAME_SECONDS);
  previousFrameTime = timestamp;
  accumulatedSeconds += elapsedSeconds;

  while (accumulatedSeconds >= FIXED_STEP_SECONDS) {
    const previousGame = game;
    game = updateGame(game, getPaddleDirection(), FIXED_STEP_SECONDS);
    accumulatedSeconds -= FIXED_STEP_SECONDS;

    if (game !== previousGame) {
      renderHud();
    }
  }

  drawGame();

  const direction = getPaddleDirection();
  const shouldKeepAnimating =
    game.status === "playing" || (game.status === "ready" && direction !== 0);

  if (shouldKeepAnimating) {
    animationFrameId = requestAnimationFrame(animate);
  } else {
    previousFrameTime = null;
    accumulatedSeconds = 0;
  }
}

/**
 * ボール発射ボタンをready状態だけで有効にし、物理更新を開始します。
 * launchBallが終端状態を無視するため、終了後のSpaceキーもゲームを変えません。
 */
function launchGame() {
  const nextGame = launchBall(game);

  if (nextGame === game) {
    return;
  }

  game = nextGame;
  renderHud();
  startAnimation();
}

launchButton.addEventListener("click", launchGame);

resetButton.addEventListener("click", () => {
  game = resetGame();
  renderHud();
  drawGame();
  startAnimation();
});

for (const button of directionButtons) {
  const direction = button.dataset.direction === "left" ? -1 : 1;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    heldPointers.set(event.pointerId, direction);
    startAnimation();
  });

  const releasePointer = (event) => {
    heldPointers.delete(event.pointerId);
  };

  button.addEventListener("pointerup", (event) => {
    releasePointer(event);

    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
  });
  button.addEventListener("pointercancel", releasePointer);
  button.addEventListener("lostpointercapture", releasePointer);

  // 読み上げソフトからの仮想クリックには移動量を与え、押し続けなくても操作可能にします。
  button.addEventListener("click", (event) => {
    if (event.detail !== 0) {
      return;
    }

    game = movePaddleBy(game, direction, 48);
    renderHud();
    drawGame();
  });
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const isDirectionKey = ["arrowleft", "arrowright", "a", "d"].includes(key);

  if (isDirectionKey) {
    event.preventDefault();
    heldKeys.add(key);
    startAnimation();
    return;
  }

  const isInteractiveTarget = Boolean(
    event.target?.closest?.("button, a, input, textarea, select"),
  );

  if (event.code === "Space" && game.status === "ready" && !isInteractiveTarget) {
    event.preventDefault();
    launchGame();
  }
});

document.addEventListener("keyup", (event) => {
  heldKeys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
  // ウィンドウ外でキーや指を離した場合も、戻ってきた時に移動が続かないようにします。
  heldKeys.clear();
  heldPointers.clear();
});

renderHud();
drawGame();
