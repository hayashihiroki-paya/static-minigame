export const STEP_MS = 10;
export const JUMP_GRACE_MS = 100;
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 30;
const seconds = STEP_MS / 1000;
const moveSpeed = 260;
const jumpSpeed = 510;
const gravity = 1550;

export function createRun(stage) {
  return {
    x: stage.start.x,
    y: stage.start.y - PLAYER_HEIGHT,
    vy: 0,
    grounded: true,
    timeMs: 0,
    leftPlatformAt: null,
    jumpRequestedAt: null,
    phase: "playing",
  };
}

export function requestJump(run) {
  if (run.phase === "playing") run.jumpRequestedAt = run.timeMs;
}

function jumpIfAllowed(run) {
  if (run.jumpRequestedAt === null) return;
  if (run.timeMs - run.jumpRequestedAt > JUMP_GRACE_MS) {
    run.jumpRequestedAt = null;
    return;
  }

  const justLeft = run.leftPlatformAt !== null
    && run.timeMs - run.leftPlatformAt <= JUMP_GRACE_MS;
  if (run.grounded || justLeft) {
    // 猶予と入力を両方消し、空中でもう一度使えないようにします。
    run.leftPlatformAt = null;
    run.jumpRequestedAt = null;
    run.grounded = false;
    run.vy = -jumpSpeed;
  }
}

function overlaps(x, segment) {
  return x < segment.x + segment.width && x + PLAYER_WIDTH > segment.x;
}

export function stepRun(run, stage, direction) {
  if (run.phase !== "playing") return;
  jumpIfAllowed(run);
  const wasGrounded = run.grounded;
  const previousBottom = run.y + PLAYER_HEIGHT;

  run.x = Math.min(stage.width - PLAYER_WIDTH, Math.max(0, run.x + direction * moveSpeed * seconds));
  run.vy += gravity * seconds;
  const nextBottom = previousBottom + run.vy * seconds;
  run.timeMs += STEP_MS;

  // 足場は上面だけで着地判定します。下降中に上面をまたいだ場合だけ止めます。
  const floor = run.vy >= 0
    ? stage.platforms.find((platform) =>
      overlaps(run.x, platform) && previousBottom <= platform.y && nextBottom >= platform.y)
    : undefined;

  if (floor) {
    run.y = floor.y - PLAYER_HEIGHT;
    run.vy = 0;
    run.grounded = true;
    if (floor.y === stage.goal.y && overlaps(run.x, stage.goal)) {
      run.phase = "cleared";
      return;
    }
    // 着地前の入力は着地したステップ内で消費します。
    jumpIfAllowed(run);
    return;
  }

  run.y = nextBottom - PLAYER_HEIGHT;
  run.grounded = false;
  if (wasGrounded) run.leftPlatformAt = run.timeMs;
  if (run.y > stage.fallY) run.phase = "fallen";
}
