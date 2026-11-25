import { COURSE_HEIGHT, COURSE_WIDTH } from "./courses.js";

export const STEP_MS = 8;
export const BALL_RADIUS = 7;
export const CUP_RADIUS = 12;
export const CUP_MAX_SPEED = 100;
export const MAX_POWER = 10;
export const ANGLE_STEP = 5;
const STEP_SECONDS = STEP_MS / 1000;
const DRAG = 115;
const STOP_SPEED = 8;
const BOUNCE = 0.75;

export function createHole(course) {
  return {
    ...course.start,
    vx: 0,
    vy: 0,
    strokes: 0,
    phase: "ready",
    remainderMs: 0,
  };
}

export function shoot(state, angle, power) {
  if (state.phase !== "ready" || !Number.isFinite(angle)
    || !Number.isInteger(power) || power < 1 || power > MAX_POWER) return false;

  const radians = angle * Math.PI / 180;
  const speed = power * 36;
  state.vx = Math.cos(radians) * speed;
  state.vy = Math.sin(radians) * speed;
  state.strokes += 1;
  state.phase = "moving";
  return true;
}

// ボールの半径だけ壁の境界を広げ、移動方向で最も手前の面まで進めます。
// この小さな物理モデルでは、障害物の角も四角い当たり判定として扱います。
function moveAxis(state, course, axis, crossAxis, velocity, size, crossSize, limit) {
  const current = state[axis];
  const cross = state[crossAxis];
  const delta = state[velocity] * STEP_SECONDS;
  if (delta === 0) return;

  const forward = delta > 0;
  let boundary = forward ? limit - BALL_RADIUS : BALL_RADIUS;
  for (const wall of course.walls) {
    if (cross <= wall[crossAxis] - BALL_RADIUS || cross >= wall[crossAxis] + wall[crossSize] + BALL_RADIUS) continue;
    const face = forward ? wall[axis] - BALL_RADIUS : wall[axis] + wall[size] + BALL_RADIUS;
    if (forward && current <= face) boundary = Math.min(boundary, face);
    if (!forward && current >= face) boundary = Math.max(boundary, face);
  }

  const next = current + delta;
  if (forward ? next >= boundary : next <= boundary) {
    state[axis] = boundary;
    state[velocity] *= -BOUNCE;
  } else {
    state[axis] = next;
  }
}

export function isBallInCup(state, cup) {
  return Math.hypot(state.x - cup.x, state.y - cup.y) <= CUP_RADIUS
    && Math.hypot(state.vx, state.vy) <= CUP_MAX_SPEED;
}

function settle(state, phase) {
  state.vx = 0;
  state.vy = 0;
  state.remainderMs = 0;
  state.phase = phase;
}

function stepBall(state, course) {
  moveAxis(state, course, "x", "y", "vx", "width", "height", COURSE_WIDTH);
  moveAxis(state, course, "y", "x", "vy", "height", "width", COURSE_HEIGHT);

  if (isBallInCup(state, course.cup)) {
    state.x = course.cup.x;
    state.y = course.cup.y;
    settle(state, "cleared");
    return;
  }

  const speed = Math.hypot(state.vx, state.vy);
  const nextSpeed = speed - DRAG * STEP_SECONDS;
  if (nextSpeed <= STOP_SPEED) {
    settle(state, "ready");
    return;
  }
  const ratio = nextSpeed / speed;
  state.vx *= ratio;
  state.vy *= ratio;
}

/** 描画間隔を足し、8msに満たない分は次のフレームに持ち越します。 */
export function advanceTime(state, course, elapsedMs) {
  if (state.phase !== "moving" || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
  state.remainderMs += elapsedMs;
  while (state.phase === "moving" && state.remainderMs >= STEP_MS) {
    state.remainderMs -= STEP_MS;
    stepBall(state, course);
  }
}
