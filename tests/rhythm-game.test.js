import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { scheduleChart } from "../src/games/rhythm-game/audio.js";
import { chart } from "../src/games/rhythm-game/chart.js";
import {
  createRound, expireNotes, HIT_MS, isRoundOver, judgeInput, PERFECT_MS,
} from "../src/games/rhythm-game/logic.js";

const oneNote = [{ lane: 0, timeMs: 1000 }];

test("判定幅の直前・境界・直後を早押しと遅押しの両方で判定する", () => {
  for (const sign of [-1, 1]) {
    for (const [offset, result] of [
      [PERFECT_MS - 1, "perfect"], [PERFECT_MS, "perfect"], [PERFECT_MS + 1, "good"],
      [HIT_MS - 1, "good"], [HIT_MS, "good"], [HIT_MS + 1, null],
    ]) {
      const round = createRound(oneNote);
      assert.equal(judgeInput(round, 0, 1000 + sign * offset), result);
    }
  }
});

test("レーン違いと空打ちは加点せず、同じノーツを二度判定できない", () => {
  const round = createRound(oneNote);
  assert.equal(judgeInput(round, 1, 1000), null);
  assert.equal(judgeInput(round, 0, 500), null);
  assert.equal(judgeInput(round, 0, 1000), "perfect");
  assert.equal(judgeInput(round, 0, 1001), null);
  assert.deepEqual(round.counts, { perfect: 1, good: 0, miss: 0 });
});

test("複数のノーツが受付範囲にあるときは最も近いノーツを選ぶ", () => {
  const round = createRound([...oneNote, { lane: 0, timeMs: 1250 }]);
  assert.equal(judgeInput(round, 0, 1140), "good");
  assert.equal(round.notes[0].result, null);
  assert.equal(round.notes[1].result, "good");
});

test("未入力のノーツは受付終了後に一度だけミスになり、最後の受付終了後にラウンドを終える", () => {
  const round = createRound(oneNote);
  assert.equal(expireNotes(round, 1160), 0);
  assert.equal(isRoundOver(round, 1160), false);
  assert.equal(expireNotes(round, 1161), 1);
  assert.equal(expireNotes(round, 1200), 0);
  assert.equal(isRoundOver(round, 1161), true);
  assert.deepEqual(round.counts, { perfect: 0, good: 0, miss: 1 });
});

test("譜面は4レーンを使い、再挑戦の状態を前の結果から独立に作れる", () => {
  assert.deepEqual([...new Set(chart.map((note) => note.lane))].sort(), [0, 1, 2, 3]);
  assert.ok(chart.every((note, index) => index === 0 || note.timeMs > chart[index - 1].timeMs));
  assert.ok(chart.at(-1).timeMs >= 19_000 && chart.at(-1).timeMs <= 21_000);
  const first = createRound(chart);
  assert.equal(expireNotes(first, first.endMs + 1), chart.length);
  const retry = createRound(chart);
  assert.deepEqual(retry.counts, { perfect: 0, good: 0, miss: 0 });
  assert.ok(retry.notes.every((note) => note.result === null));
});

test("合成音は譜面の相対時刻を音声時計の絶対時刻に変換して予約する", () => {
  const starts = [];
  const stops = [];
  const disconnects = [];
  const ended = [];
  const context = {
    destination: {},
    createOscillator: () => ({
      frequency: {}, connect() {}, start: (time) => starts.push(time),
      stop: (time) => stops.push(time), disconnect: () => disconnects.push("tone"),
      addEventListener: (event, callback) => {
        assert.equal(event, "ended");
        ended.push(callback);
      },
    }),
    createGain: () => ({
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {}, disconnect: () => disconnects.push("volume"),
    }),
  };
  scheduleChart(context, [...oneNote, { lane: 2, timeMs: 1250 }], 3);
  assert.deepEqual(starts, [4, 4.25]);
  assert.deepEqual(stops, [4.1, 4.35]);
  ended[0]();
  assert.deepEqual(disconnects, ["tone", "volume"]);
});

test("ホームから開け、4レーンの標準ボタンと結果の通知がある", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/rhythm-game/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="4レーンリズムのゲームで遊ぶ" href="\.\/src\/games\/rhythm-game\/"/);
  assert.deepEqual([...page.matchAll(/<button type="button"[^>]*data-key="([dfjk])"/g)].map((match) => match[1]), ["d", "f", "j", "k"]);
  assert.match(page, /role="status" aria-live="polite"/);
});
