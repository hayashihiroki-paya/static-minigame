// 時計・乱数・タイマーを固定し、反応待ちの状態遷移を実時間なしで確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_WAIT_MS,
  MIN_WAIT_MS,
  ROUND_COUNT,
  createReactionGameController,
  summarizeResults,
} from "../src/games/reaction-test/logic.js";

/**
 * タイマーを配列で記録し、テストから合図の時刻を自由に進めます。
 * 取消後のコールバックも直接呼べるため、すでに実行待ちの処理が復活しないか確認できます。
 * @param {number} randomValue 待ち時間選択に使う固定乱数
 * @returns {object} 時計、タイマー一覧、ゲーム操作
 */
function createHarness(randomValue = 0) {
  let currentTime = 5000;
  let nextTimerId = 1;
  const timers = [];
  const stateChanges = [];

  const controller = createReactionGameController({
    now: () => currentTime,
    random: () => randomValue,
    schedule: (callback, delay) => {
      const timer = {
        id: nextTimerId,
        callback,
        delay,
        canceled: false,
        fired: false,
      };
      nextTimerId += 1;
      timers.push(timer);
      return timer.id;
    },
    cancel: (timerId) => {
      const timer = timers.find((entry) => entry.id === timerId);
      if (timer) timer.canceled = true;
    },
    onChange: (state) => stateChanges.push(state),
  });

  return {
    controller,
    timers,
    stateChanges,
    now: () => currentTime,
    setNow: (value) => {
      currentTime = value;
    },
    runNextTimer: () => {
      const timer = timers.find((entry) => !entry.canceled && !entry.fired);
      assert.ok(timer, "実行できる待機タイマーが必要です");
      timer.fired = true;
      timer.callback();
      return timer;
    },
  };
}

// 待ち時間を固定し、タイマー発火時の時計を合図の基準時刻に使います。
test("開始後に待機し、タイマー発火時に合図を記録する", () => {
  const harness = createHarness(0);
  const waiting = harness.controller.startRound();

  assert.equal(waiting.phase, "waiting");
  assert.equal(harness.timers[0].delay, MIN_WAIT_MS);

  harness.setNow(6234.5);
  harness.runNextTimer();
  const signaled = harness.controller.getState();
  assert.equal(signaled.phase, "go");
  assert.equal(signaled.signaledAt, 6234.5);
});

// 乱数の上端を含めず、仕様どおり1000以上3000未満の待機時間にします。
test("最大側の待機時間は2999ミリ秒になる", () => {
  const harness = createHarness(0.9999);
  harness.controller.startRound();

  assert.equal(harness.timers[0].delay, MAX_WAIT_MS - 1);
});

// 合図前入力をフライングにし、遅れて実行される古いタイマーも無効化します。
test("待機中の入力はフライングになり、古いタイマーは合図を出さない", () => {
  const harness = createHarness();
  harness.controller.startRound();
  const staleTimer = harness.timers[0];

  const falseStart = harness.controller.submitResponse();
  assert.equal(falseStart.phase, "false-start");
  assert.equal(staleTimer.canceled, true);

  staleTimer.callback();
  assert.equal(harness.controller.getState().phase, "false-start");
});

// 合図前の準備状態では入力を記録せず、合図後だけ経過時間を丸めて保存します。
test("合図後の入力だけを反応時間としてミリ秒単位で記録する", () => {
  const harness = createHarness();
  const readyState = harness.controller.submitResponse();
  assert.equal(readyState.phase, "ready");
  assert.deepEqual(readyState.results, []);

  harness.controller.startRound();
  harness.runNextTimer();
  harness.setNow(5234.6);
  const result = harness.controller.submitResponse();

  assert.equal(result.phase, "result");
  assert.deepEqual(result.results, [235]);
  assert.equal(result.signaledAt, null);
});

// 明示的に次へ進む5ラウンドを完了し、全回の平均・最速を集計します。
test("5ラウンド後に平均値と最速値を集計する", () => {
  const harness = createHarness();
  const reactionTimes = [101, 300, 200, 450, 150];

  for (const duration of reactionTimes) {
    harness.controller.startRound();
    harness.runNextTimer();
    harness.setNow(harness.now() + duration);
    harness.controller.submitResponse();
  }

  const finished = harness.controller.getState();
  assert.equal(finished.phase, "finished");
  assert.equal(finished.results.length, ROUND_COUNT);
  assert.deepEqual(finished.results, reactionTimes);
  assert.deepEqual(summarizeResults(finished.results), {
    averageMs: 240,
    fastestMs: 101,
  });
  assert.deepEqual(summarizeResults([]), { averageMs: 0, fastestMs: 0 });
});

// 新しい記録を始める操作は、確定済みの各ラウンドも初期化します。
test("リセットで反応時間とラウンド数を初期化する", () => {
  const harness = createHarness();
  harness.controller.startRound();
  harness.runNextTimer();
  harness.setNow(5100);
  harness.controller.submitResponse();
  assert.deepEqual(harness.controller.getState().results, [100]);

  const reset = harness.controller.reset();
  assert.equal(reset.phase, "ready");
  assert.deepEqual(reset.results, []);
  assert.equal(reset.signaledAt, null);
});

// 待機中に新しい記録を始めた場合、取消済みの合図が後から復活しません。
test("待機中のリセットはタイマーを取消し、古い合図を無効にする", () => {
  const harness = createHarness();
  harness.controller.startRound();
  const staleTimer = harness.timers[0];

  const reset = harness.controller.reset();
  staleTimer.callback();

  assert.equal(staleTimer.canceled, true);
  assert.equal(reset.phase, "ready");
  assert.equal(harness.controller.getState().phase, "ready");
  assert.deepEqual(harness.controller.getState().results, []);
});

// 公開状態を変更してもコントローラーの内部ラウンド記録は変わりません。
test("取得した状態の配列を書き換えても内部状態を変更しない", () => {
  const harness = createHarness();
  const exposed = harness.controller.getState();
  exposed.results.push(999);

  assert.deepEqual(harness.controller.getState().results, []);
});
