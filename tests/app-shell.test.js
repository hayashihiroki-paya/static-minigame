import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const numberGuessPage = await readFile(
  new URL("../src/games/number-guess/index.html", import.meta.url),
  "utf8",
);

test("home page declares Japanese as its language", () => {
  assert.match(page, /<html lang="ja">/);
});

test("home page has a main landmark and a descriptive heading", () => {
  assert.match(page, /<main\b/);
  assert.match(page, /<h1>ミニゲーム集<\/h1>/);
});

test("home page loads its local stylesheet", () => {
  assert.match(page, /<link rel="stylesheet" href="\.\/src\/style\.css" \/>/);
});

test("home page links to the first game", () => {
  // 一覧にカードが追加されているだけでなく、リンクの行き先も実在するゲームページに向けます。
  assert.match(page, /href="\.\/src\/games\/number-guess\/"/);
  assert.match(page, /数字当て/);
});

test("number guessing page connects its input to an accessible label", () => {
  // labelとinputのIDを結び、見た目だけでなく読み上げ環境でも入力目的を伝えます。
  assert.match(numberGuessPage, /<label for="guess-input">予想する数字<\/label>/);
  assert.match(numberGuessPage, /id="guess-input"[\s\S]*?aria-describedby="input-help"/);
});

test("number guessing page announces feedback and loads its local module", () => {
  // 結果をライブ領域で通知し、ルールとは分離した画面モジュールだけを読み込みます。
  assert.match(numberGuessPage, /role="status" aria-live="polite"/);
  assert.match(numberGuessPage, /<script type="module" src="\.\/main\.js"><\/script>/);
});
