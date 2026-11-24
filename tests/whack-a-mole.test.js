import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advanceOneSecond,
  chooseNextHole,
  createInitialGameState,
  hitHole,
  startGame,
} from "../src/games/whack-a-mole/logic.js";

test("前回とは異なる穴から乱数でモグラの位置を選ぶ", () => {
  assert.equal(chooseNextHole(null, () => 0), 0);
  assert.equal(chooseNextHole(4, () => 0), 0);
  assert.equal(chooseNextHole(4, () => 0.999), 8);
  assert.notEqual(chooseNextHole(4, () => 0.5), 4);
});

test("ゲーム開始で得点・時間を初期化してモグラを表示する", () => {
  const game = startGame(() => 0.5);

  assert.equal(game.phase, "playing");
  assert.equal(game.score, 0);
  assert.equal(game.remainingSeconds, 30);
  assert.equal(game.activeHole, 4);
  assert.equal(game.previousHole, 4);
});

test("表示中のモグラだけ1回得点でき、叩いたあとは消える", () => {
  const game = startGame(() => 0);
  const hit = hitHole(game, 0);

  assert.equal(hit.score, 1);
  assert.equal(hit.activeHole, null);
  assert.equal(hitHole(hit, 0), hit);
  assert.equal(hitHole(game, 1), game);
  assert.equal(hitHole(createInitialGameState(), 0).score, 0);
});

test("1秒進むと残り時間が減り、直前とは異なる穴に移動する", () => {
  const game = startGame(() => 0);
  const next = advanceOneSecond(game, 8);

  assert.equal(next.remainingSeconds, 29);
  assert.equal(next.activeHole, 8);
  assert.equal(next.previousHole, 8);
  assert.throws(() => advanceOneSecond(next, 8), RangeError);
});

test("残り1秒の更新でゲームが終了し、得点入力を受け付けなくなる", () => {
  const playing = { ...startGame(() => 0), remainingSeconds: 1 };
  const finished = advanceOneSecond(playing, null);

  assert.equal(finished.phase, "finished");
  assert.equal(finished.remainingSeconds, 0);
  assert.equal(finished.activeHole, null);
  assert.equal(hitHole(finished, 0), finished);
});

test("リセット状態は開始前、得点0、残り30秒に戻る", () => {
  assert.deepEqual(createInitialGameState(), {
    phase: "ready",
    score: 0,
    remainingSeconds: 30,
    activeHole: null,
    previousHole: null,
  });
});

test("不正な穴番号や乱数値を拒否する", () => {
  assert.throws(() => chooseNextHole(null, () => 1), RangeError);
  assert.throws(() => hitHole(createInitialGameState(), 9), RangeError);
  assert.throws(() => advanceOneSecond(startGame(() => 0), 0), RangeError);
});
