import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createInput } from "../src/games/side-scroll-action/input.js";
import {
  createRun, JUMP_GRACE_MS, PLAYER_HEIGHT, requestJump, STEP_MS, stepRun,
} from "../src/games/side-scroll-action/physics.js";
import { stage } from "../src/games/side-scroll-action/stage.js";

test("下降時だけ足場に着地し、ジャンプでは下から通り抜けられる", () => {
  const run = createRun(stage);
  run.x = 350;
  run.y = 231 - PLAYER_HEIGHT;
  run.grounded = false;
  run.vy = -300;
  stepRun(run, stage, 0);
  assert.equal(run.grounded, false);
  assert.ok(run.y + PLAYER_HEIGHT < 230);
  for (let i = 0; i < 80 && !run.grounded; i += 1) stepRun(run, stage, 0);
  assert.equal(run.grounded, true);
  assert.equal(run.y + PLAYER_HEIGHT, 230);
  assert.equal(run.vy, 0);
});

test("足場を離れた後は100msの境界までジャンプでき、その後はできない", () => {
  for (const elapsed of [JUMP_GRACE_MS - STEP_MS, JUMP_GRACE_MS, JUMP_GRACE_MS + STEP_MS]) {
    const run = createRun(stage);
    run.x = 249;
    stepRun(run, stage, 1);
    assert.equal(run.grounded, false);
    assert.equal(run.leftPlatformAt, run.timeMs);
    for (let t = 0; t < elapsed; t += STEP_MS) stepRun(run, stage, 1);
    requestJump(run);
    stepRun(run, stage, 0);
    assert.equal(run.vy < 0, elapsed <= JUMP_GRACE_MS);
    if (run.vy < 0) {
      assert.equal(run.leftPlatformAt, null);
      assert.equal(run.jumpRequestedAt, null);
    }
  }
});

test("着地前の入力は100msの境界まで有効で、着地した時点で一度だけ消費する", () => {
  for (const elapsed of [JUMP_GRACE_MS - STEP_MS, JUMP_GRACE_MS, JUMP_GRACE_MS + STEP_MS]) {
    const run = createRun(stage);
    Object.assign(run, { grounded: false, y: run.y - 1, vy: 100, timeMs: elapsed - STEP_MS, jumpRequestedAt: 0 });
    stepRun(run, stage, 0);
    const shouldJump = elapsed <= JUMP_GRACE_MS;
    assert.equal(run.grounded, !shouldJump);
    assert.equal(run.vy < 0, shouldJump);
    assert.equal(run.jumpRequestedAt, null);
    if (shouldJump) {
      requestJump(run);
      const velocity = run.vy;
      stepRun(run, stage, 0);
      assert.ok(run.vy > velocity, "新しい入力で空中の速度が再びジャンプ速度にならない");
    }
  }
});

test("指を別々に扱い、移動を押したままジャンプでき、長押しで再発動しない", () => {
  let jumps = 0;
  const input = createInput(() => { jumps += 1; });
  input.press(1, "right");
  input.press(2, "jump");
  input.press(2, "jump");
  input.press("Space", "jump");
  assert.equal(jumps, 1);
  assert.equal(input.direction(), 1);
  input.release(2);
  assert.equal(input.direction(), 1);
  input.release("Space");
  input.press(2, "jump");
  assert.equal(jumps, 2);
  input.press("ArrowLeft", "left");
  assert.equal(input.direction(), 0);
  input.clear();
  assert.equal(input.direction(), 0);
  input.press(2, "jump");
  assert.equal(jumps, 3);
});

test("穴に落下すると停止し、新しい走行で位置・速度・猶予を初期化する", () => {
  const run = createRun(stage);
  run.x = 249;
  for (let i = 0; i < 100; i += 1) stepRun(run, stage, i === 0 ? 1 : 0);
  assert.equal(run.phase, "fallen");
  const before = { ...run };
  requestJump(run);
  stepRun(run, stage, 1);
  assert.deepEqual(run, before);

  const retry = createRun(stage);
  assert.equal(retry.x, stage.start.x);
  assert.equal(retry.y, stage.start.y - PLAYER_HEIGHT);
  assert.equal(retry.vy, 0);
  assert.equal(retry.timeMs, 0);
  assert.equal(retry.leftPlatformAt, null);
  assert.equal(retry.jumpRequestedAt, null);
  assert.equal(retry.phase, "playing");
});

test("4回ジャンプしてオリジナルステージをクリアできる", () => {
  const run = createRun(stage);
  const jumps = [212, 509, 789, 1074];
  for (let i = 0; i < 1000 && run.phase === "playing"; i += 1) {
    if (run.x >= jumps[0]) {
      jumps.shift();
      requestJump(run);
    }
    stepRun(run, stage, 1);
  }
  assert.equal(run.phase, "cleared");
  assert.equal(jumps.length, 0);
});

test("ホームから開け、コースとボタンをキーボードで選べる", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/side-scroll-action/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="空の足場のゲームで遊ぶ" href="\.\/src\/games\/side-scroll-action\/"/);
  assert.match(page, /<canvas[^>]*tabindex="0"/);
  assert.deepEqual([...page.matchAll(/<button type="button" data-control="(left|right|jump)"/g)].map((match) => match[1]), ["left", "right", "jump"]);
  assert.match(page, /role="status" aria-live="polite"/);
});
