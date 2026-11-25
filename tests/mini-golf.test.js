import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { COURSE_WIDTH, courses } from "../src/games/mini-golf/courses.js";
import {
  advanceTime, BALL_RADIUS, createHole, CUP_MAX_SPEED, CUP_RADIUS,
  isBallInCup, shoot, STEP_MS,
} from "../src/games/mini-golf/physics.js";

const straight = courses[0];

test("外周と障害物で反射し、ボールの端が壁を越えない", () => {
  const edge = createHole({ start: { x: COURSE_WIDTH - BALL_RADIUS - 1, y: 150 } });
  shoot(edge, 0, 10);
  advanceTime(edge, straight, STEP_MS);
  assert.equal(edge.x, COURSE_WIDTH - BALL_RADIUS);
  assert.ok(edge.vx < 0);

  const obstacle = courses[1];
  const state = createHole({ start: { x: obstacle.walls[0].x - BALL_RADIUS - 1, y: 150 } });
  shoot(state, 0, 10);
  advanceTime(state, obstacle, STEP_MS);
  assert.equal(state.x, obstacle.walls[0].x - BALL_RADIUS);
  assert.ok(state.vx < 0);
  advanceTime(state, obstacle, STEP_MS);
  assert.ok(state.x < obstacle.walls[0].x - BALL_RADIUS);
});

test("ショット後は減速して停止し、移動中の追加ショットでは打数が増えない", () => {
  const state = createHole(straight);
  assert.equal(shoot(state, 0, 0), false);
  assert.equal(shoot(state, 0, 3), true);
  assert.equal(shoot(state, 90, 10), false);
  const speed = state.vx;
  advanceTime(state, straight, 160);
  assert.ok(state.vx > 0 && state.vx < speed);
  advanceTime(state, straight, 10_000);
  assert.equal(state.phase, "ready");
  assert.equal(state.vx, 0);
  assert.equal(state.vy, 0);
  assert.equal(state.strokes, 1);
  assert.equal(shoot(state, 90, 1), true);
  assert.equal(state.strokes, 2);
  assert.equal(createHole(straight).strokes, 0);
});

test("カップに入るには距離と速度の両方が範囲内にある必要がある", () => {
  const cup = { x: 100, y: 100 };
  const justInside = { x: cup.x + CUP_RADIUS, y: cup.y, vx: CUP_MAX_SPEED, vy: 0 };
  assert.equal(isBallInCup(justInside, cup), true);
  assert.equal(isBallInCup({ ...justInside, x: justInside.x + 0.01 }, cup), false);
  assert.equal(isBallInCup({ ...justInside, vx: CUP_MAX_SPEED + 0.01 }, cup), false);
  const fast = createHole({ start: { x: straight.cup.x - 1, y: straight.cup.y } });
  shoot(fast, 0, 10);
  advanceTime(fast, straight, STEP_MS);
  assert.equal(fast.phase, "moving");
});

test("描画間隔を変えても同じ経過時間で同じ状態になる", () => {
  const course = courses[1];
  const regular = createHole(course);
  const uneven = createHole(course);
  shoot(regular, 315, 8);
  shoot(uneven, 315, 8);
  for (let i = 0; i < 100; i += 1) advanceTime(regular, course, 8);
  for (let i = 0; i < 20; i += 1) {
    for (const elapsed of [3, 13, 24]) advanceTime(uneven, course, elapsed);
  }
  assert.deepEqual(uneven, regular);
  assert.equal(regular.phase, "moving");
});

test("全3ホールをクリアでき、バンクショットでは上の壁で反射する", () => {
  const solutions = [[[0, 6]], [[315, 8]], [[40, 8], [290, 10]]];
  assert.equal(courses.length, solutions.length);
  courses.forEach((course, index) => {
    const state = createHole(course);
    let bouncedOffTop = false;
    for (const [angle, power] of solutions[index]) {
      assert.equal(shoot(state, angle, power), true, course.name);
      for (let i = 0; i < 1000 && state.phase === "moving"; i += 1) {
        advanceTime(state, course, STEP_MS);
        bouncedOffTop ||= state.y === BALL_RADIUS && state.vy > 0;
      }
    }
    assert.equal(state.phase, "cleared", course.name);
    assert.equal(state.strokes, solutions[index].length);
    assert.deepEqual({ x: state.x, y: state.y }, course.cup);
    assert.equal(shoot(state, 0, 6), false);
    if (index === 1) assert.equal(bouncedOffTop, true);
  });
});

test("ホームから開け、コースと操作に読み上げ用の名前がある", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/mini-golf/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="ミニゴルフのゲームで遊ぶ" href="\.\/src\/games\/mini-golf\/"/);
  assert.match(page, /<label for="golf-hole">ホール<\/label>/);
  assert.match(page, /<canvas[^>]*tabindex="0"/);
  assert.match(page, /id="golf-shot">ショット/);
  assert.match(page, /role="status" aria-live="polite"/);
});
