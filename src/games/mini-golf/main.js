import { COURSE_HEIGHT, COURSE_WIDTH, courses } from "./courses.js";
import {
  advanceTime, ANGLE_STEP, BALL_RADIUS, createHole, CUP_RADIUS, MAX_POWER, shoot,
} from "./physics.js";

const canvas = document.querySelector("#golf-course");
const ctx = canvas.getContext("2d");
const select = document.querySelector("#golf-hole");
const hint = document.querySelector("#golf-hint");
const strokes = document.querySelector("#golf-strokes");
const angleOutput = document.querySelector("#golf-angle");
const powerOutput = document.querySelector("#golf-power");
const status = document.querySelector("#golf-status");
const shotButton = document.querySelector("#golf-shot");
const resetButton = document.querySelector("#golf-reset");
const adjustmentButtons = [...document.querySelectorAll("[data-adjust]")];

courses.forEach(({ name }, index) => {
  select.add(new Option((index + 1) + "．" + name, String(index)));
});

let course;
let state;
let angle;
let power;
let frameId;
let lastFrame;

function drawCircle(x, y, radius, fill, border) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function draw() {
  ctx.fillStyle = "#195745";
  ctx.fillRect(0, 0, COURSE_WIDTH, COURSE_HEIGHT);
  for (let y = 0; y < COURSE_HEIGHT; y += 60) {
    ctx.fillStyle = "#20634e";
    ctx.fillRect(0, y, COURSE_WIDTH, 30);
  }
  // 物理と同じ座標で描き、Canvasは画面幅に合わせてCSSで縮めます。
  for (const wall of course.walls) {
    ctx.fillStyle = "#e7c79b";
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.strokeStyle = "#603f26";
    ctx.lineWidth = 3;
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  }
  drawCircle(course.cup.x, course.cup.y, CUP_RADIUS, "#0a2423", "#f4dc96");

  if (state.phase === "ready") {
    const radians = angle * Math.PI / 180;
    const length = 22 + power * 5;
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(radians);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(length, 0);
    ctx.moveTo(length - 8, -6);
    ctx.lineTo(length, 0);
    ctx.lineTo(length - 8, 6);
    ctx.strokeStyle = "#fff2bd";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  if (state.phase !== "cleared") {
    drawCircle(state.x, state.y, BALL_RADIUS, "#fff", "#1a2732");
  }
}

function showAim() {
  angleOutput.textContent = angle + "°";
  powerOutput.textContent = power + " / " + MAX_POWER;
  draw();
}

function updateControls() {
  // 無効状態でもフォーカスを残し、停止後は同じキーで続けて打てます。
  const ready = state.phase === "ready";
  shotButton.setAttribute("aria-disabled", String(!ready));
  for (const button of adjustmentButtons) {
    const atLimit = (button.dataset.adjust === "weaker" && power === 1)
      || (button.dataset.adjust === "stronger" && power === MAX_POWER);
    button.setAttribute("aria-disabled", String(!ready || atLimit));
  }
}

function startHole() {
  cancelAnimationFrame(frameId);
  lastFrame = null;
  course = courses[Number(select.value)];
  state = createHole(course);
  angle = 0;
  power = 6;
  strokes.textContent = "0";
  hint.textContent = course.hint;
  status.textContent = "方向と強さを決めてショットしてください。";
  updateControls();
  showAim();
}

function animate(timestamp) {
  if (lastFrame !== null) advanceTime(state, course, timestamp - lastFrame);
  lastFrame = timestamp;
  draw();
  if (state.phase === "moving") {
    frameId = requestAnimationFrame(animate);
    return;
  }

  status.textContent = state.phase === "cleared"
    ? state.strokes + "打でカップイン！"
    : "ボールが止まりました。次のショットを打てます。";
  updateControls();
}

function takeShot() {
  if (!shoot(state, angle, power)) return;
  strokes.textContent = String(state.strokes);
  status.textContent = "ボールが移動しています。";
  updateControls();
  lastFrame = null;
  frameId = requestAnimationFrame(animate);
}

function adjust(action) {
  if (state.phase !== "ready") return;
  if (action === "left") angle = (angle + 360 - ANGLE_STEP) % 360;
  if (action === "right") angle = (angle + ANGLE_STEP) % 360;
  if (action === "weaker") power = Math.max(1, power - 1);
  if (action === "stronger") power = Math.min(MAX_POWER, power + 1);
  showAim();
  updateControls();
}

const arrowActions = new Map([
  ["ArrowLeft", "left"], ["ArrowRight", "right"],
  ["ArrowDown", "weaker"], ["ArrowUp", "stronger"],
]);
canvas.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const action = arrowActions.get(event.key);
  if (action) {
    event.preventDefault();
    adjust(action);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!event.repeat) takeShot();
  }
});

document.addEventListener("visibilitychange", () => {
  // タブを見ていない時間は物理の経過時間に含めません。
  lastFrame = null;
});
select.addEventListener("change", startHole);
resetButton.addEventListener("click", startHole);
shotButton.addEventListener("click", takeShot);
for (const button of adjustmentButtons) {
  button.addEventListener("click", () => adjust(button.dataset.adjust));
}

startHole();
