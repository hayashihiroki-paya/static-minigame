import { createInput } from "./input.js";
import { createRun, PLAYER_HEIGHT, PLAYER_WIDTH, requestJump, STEP_MS, stepRun } from "./physics.js";
import { stage, VIEW_HEIGHT, VIEW_WIDTH } from "./stage.js";

const play = document.querySelector("#platform-play");
const canvas = document.querySelector("#platform-course");
const ctx = canvas.getContext("2d");
const status = document.querySelector("#platform-status");
const retry = document.querySelector("#platform-retry");
const controls = [...document.querySelectorAll("[data-control]")];
const inputs = createInput(() => requestJump(run));
const keyActions = new Map([["ArrowLeft", "left"], ["ArrowRight", "right"], ["Space", "jump"]]);
let run;
let frame;
let lastTime;
let remainingMs;

function draw() {
  const cameraX = Math.min(stage.width - VIEW_WIDTH, Math.max(0, run.x - VIEW_WIDTH * 0.35));
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, "#b9e1fa");
  sky.addColorStop(1, "#edf8ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // 背景は足場よりゆっくり流し、移動方向と距離が分かるようにします。
  for (let i = 0; i < 7; i += 1) {
    const x = 50 + i * 124 - cameraX * 0.23;
    const y = 44 + (i % 3) * 36;
    ctx.fillStyle = "#f7fcff";
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 10, y - 8, 21, 17, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const platform of stage.platforms) {
    const x = platform.x - cameraX;
    ctx.fillStyle = "#405975";
    ctx.fillRect(x, platform.y, platform.width, 23);
    ctx.fillStyle = "#1d6858";
    ctx.fillRect(x, platform.y, platform.width, 7);
  }

  const flagX = stage.goal.x - cameraX;
  const flagY = stage.goal.y - 67;
  ctx.fillStyle = "#34445e";
  ctx.fillRect(flagX, flagY, 4, 67);
  ctx.fillStyle = "#a63b13";
  ctx.beginPath();
  ctx.moveTo(flagX + 4, flagY);
  ctx.lineTo(flagX + 35, flagY + 11);
  ctx.lineTo(flagX + 4, flagY + 22);
  ctx.fill();

  const x = run.x - cameraX;
  ctx.fillStyle = "#263f81";
  ctx.fillRect(x, run.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 6, run.y + 6, PLAYER_WIDTH - 12, 8);
  ctx.fillStyle = "#263f81";
  ctx.fillRect(x + 14, run.y + 7, 3, 4);
}

function animate(timestamp) {
  if (lastTime !== null) {
    // タブ復帰直後などの長い間隔は捨て、見えていない間に一気に進まないようにします。
    remainingMs += Math.min(timestamp - lastTime, 100);
  }
  lastTime = timestamp;
  while (remainingMs >= STEP_MS && run.phase === "playing") {
    remainingMs -= STEP_MS;
    stepRun(run, stage, inputs.direction());
  }
  draw();

  if (run.phase === "playing") {
    frame = requestAnimationFrame(animate);
  } else {
    inputs.clear();
    controls.forEach((button) => button.setAttribute("aria-disabled", "true"));
    const wasInPlay = play.contains(document.activeElement);
    status.textContent = run.phase === "cleared" ? "ゴール！ ステージクリアです。" : "落下しました。「最初から」でやり直せます。";
    if (wasInPlay) retry.focus({ preventScroll: true });
  }
}

function restart() {
  cancelAnimationFrame(frame);
  inputs.clear();
  run = createRun(stage);
  lastTime = null;
  remainingMs = 0;
  controls.forEach((button) => button.removeAttribute("aria-disabled"));
  status.textContent = "足場を渡ってゴールへ進みましょう。";
  draw();
  frame = requestAnimationFrame(animate);
}

play.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const buttonAction = event.target.dataset.control;
  const activatesButton = buttonAction && (event.code === "Enter" || event.code === "Space");
  const action = activatesButton ? buttonAction : keyActions.get(event.code);
  if (!action) return;
  event.preventDefault();
  if (run.phase === "playing" && !event.repeat) inputs.press(event.code, action);
});
document.addEventListener("keyup", (event) => inputs.release(event.code));

play.addEventListener("focusout", (event) => {
  if (!play.contains(event.relatedTarget)) inputs.clear();
});
window.addEventListener("blur", () => inputs.clear());
document.addEventListener("visibilitychange", () => {
  lastTime = null;
  remainingMs = 0;
  inputs.clear();
});

for (const button of controls) {
  const action = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || run.phase !== "playing") return;
    button.setPointerCapture(event.pointerId);
    inputs.press(event.pointerId, action);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, (event) => inputs.release(event.pointerId));
  }
  if (action === "jump") {
    // キーボードや支援技術で生成されたクリックも、1回のジャンプとして扱います。
    button.addEventListener("click", (event) => {
      if (event.detail !== 0) return;
      inputs.press("jump-button", action);
      inputs.release("jump-button");
    });
  }
}

retry.addEventListener("click", () => {
  restart();
  canvas.focus({ preventScroll: true });
});
restart();
