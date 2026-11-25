import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  answerQuestion, currentPrompt, isAnswerEnter, remainingMs, ROUND_MS, startRound,
} from "../src/games/typing-game/logic.js";
import { prompts } from "../src/games/typing-game/prompts.js";

test("ひらがなのお題と完全に一致したときだけ加点して出題を進める", () => {
  const round = startRound(100);
  const first = currentPrompt(round);
  assert.equal(answerQuestion(round, " " + first, 101), "incorrect");
  assert.equal(round.score, 0);
  assert.equal(currentPrompt(round), first);

  for (const word of prompts) {
    assert.match(word, /^[ぁ-ゖ]+$/u);
    assert.equal(currentPrompt(round), word);
    assert.equal(answerQuestion(round, word, 102), "correct");
  }
  assert.equal(round.score, prompts.length);
  assert.equal(currentPrompt(round), first);
});

test("30秒の直前まで受理し、締め切りちょうどと超過後は加点しない", () => {
  const round = startRound(1000);
  assert.equal(ROUND_MS, 30_000);
  assert.equal(remainingMs(round, 1000), 30_000);
  assert.equal(remainingMs(round, 30_999), 1);
  assert.equal(answerQuestion(round, currentPrompt(round), 30_999), "correct");
  assert.equal(answerQuestion(round, currentPrompt(round), 31_000), "expired");
  assert.equal(answerQuestion(round, currentPrompt(round), 32_000), "expired");
  assert.equal(remainingMs(round, 32_000), 0);
  assert.equal(round.score, 1);
});

test("再挑戦では得点・出題位置・残り時間が初期値に戻る", () => {
  const first = startRound(0);
  answerQuestion(first, currentPrompt(first), 1);
  const second = startRound(30_500);
  assert.equal(second.score, 0);
  assert.equal(currentPrompt(second), prompts[0]);
  assert.equal(remainingMs(second, 30_500), ROUND_MS);
});

test("IMEの変換確定や長押しのEnterを回答から除外する", () => {
  const enter = { key: "Enter", isComposing: false, keyCode: 13, repeat: false };
  assert.equal(isAnswerEnter(enter, false), true);
  assert.equal(isAnswerEnter(enter, true), false);
  assert.equal(isAnswerEnter({ ...enter, isComposing: true }, false), false);
  assert.equal(isAnswerEnter({ ...enter, keyCode: 229 }, false), false);
  assert.equal(isAnswerEnter({ ...enter, repeat: true }, false), false);
  assert.equal(isAnswerEnter({ ...enter, key: "Escape" }, false), false);
});

test("ホームにリンクがあり、入力欄と結果の通知に名前がある", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/typing-game/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="日本語タイピングのゲームで遊ぶ" href="\.\/src\/games\/typing-game\/"/);
  assert.match(page, /<label for="typing-answer">ひらがなで入力<\/label>/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /id="typing-submit" type="button" disabled/);
});
