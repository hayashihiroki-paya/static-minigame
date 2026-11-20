import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PAD_IDS,
  createInitialGame,
  finishSequencePlayback,
  resetGame,
  startGame,
  submitPad,
} from "../src/games/simon/logic.js";

test("初期状態は開始前で、得点と順番が空になっている", () => {
  assert.deepEqual(createInitialGame(), {
    sequence: [],
    inputIndex: 0,
    score: 0,
    status: "ready",
  });
});

test("開始時に乱数で1つ目のパッドを選び、提示状態になる", () => {
  const game = startGame(createInitialGame(), () => 0.25);

  assert.deepEqual(game.sequence, ["blue"]);
  assert.equal(game.status, "showing");
  assert.equal(game.score, 0);
});

test("順番の再生完了でだけプレイヤー入力を受け付ける", () => {
  const showing = startGame(createInitialGame(), () => 0);
  const input = finishSequencePlayback(showing);

  assert.equal(input.status, "input");
  assert.equal(input.inputIndex, 0);
  assert.equal(finishSequencePlayback(input), input);
});

test("順番の途中で正解すると次の入力位置へ進む", () => {
  const showing = { ...startGame(createInitialGame(), () => 0), sequence: ["red", "green"] };
  const input = finishSequencePlayback(showing);
  const next = submitPad(input, "red", () => 0.5);

  assert.equal(next.status, "input");
  assert.equal(next.inputIndex, 1);
  assert.equal(next.score, 0);
});

test("1ラウンドを最後まで正解すると得点が増え、次の音が追加される", () => {
  const first = finishSequencePlayback(startGame(createInitialGame(), () => 0));
  const nextRound = submitPad(first, "red", () => 0.75);

  assert.deepEqual(nextRound.sequence, ["red", "green"]);
  assert.equal(nextRound.status, "showing");
  assert.equal(nextRound.score, 1);
  assert.equal(nextRound.inputIndex, 0);
});

test("複数ラウンドを正解すると順番と得点が進む", () => {
  const firstInput = finishSequencePlayback(startGame(createInitialGame(), () => 0));
  const secondRound = submitPad(firstInput, "red", () => 0.5);
  const secondInput = finishSequencePlayback(secondRound);
  const partial = submitPad(secondInput, "red", () => 0.5);
  const completed = submitPad(partial, "yellow", () => 0.25);

  assert.deepEqual(completed.sequence, ["red", "yellow", "blue"]);
  assert.equal(completed.score, 2);
  assert.equal(completed.status, "showing");
});

test("間違ったパッドはゲームオーバーにし、得点を変えない", () => {
  const input = finishSequencePlayback(startGame(createInitialGame(), () => 0));
  const lost = submitPad(input, "green", () => 0.5);

  assert.equal(lost.status, "lost");
  assert.equal(lost.score, 0);
  assert.deepEqual(lost.sequence, ["red"]);
});

test("提示中や終了後の入力と未知のパッドは無視する", () => {
  const showing = startGame(createInitialGame(), () => 0);
  const input = finishSequencePlayback(showing);
  const lost = submitPad(input, "blue", () => 0);

  assert.equal(submitPad(showing, "red"), showing);
  assert.equal(submitPad(lost, "red"), lost);
  assert.equal(submitPad(input, "unknown"), input);
});

test("リセットは得点と順番を消し、再挑戦は新しい順番から始める", () => {
  const input = finishSequencePlayback(startGame(createInitialGame(), () => 0));
  const lost = submitPad(input, "green", () => 0.5);
  const reset = resetGame();
  const replay = startGame(lost, () => 0.5);

  assert.equal(reset.status, "ready");
  assert.equal(reset.score, 0);
  assert.deepEqual(reset.sequence, []);
  assert.equal(replay.status, "showing");
  assert.deepEqual(replay.sequence, ["yellow"]);
  assert.equal(replay.score, 0);
});

test("4つのパッドだけを扱い、乱数範囲外はエラーにする", () => {
  assert.deepEqual(PAD_IDS, ["red", "blue", "yellow", "green"]);
  assert.throws(() => startGame(createInitialGame(), () => 1), RangeError);
  assert.throws(() => startGame(createInitialGame(), () => Number.NaN), RangeError);
});
