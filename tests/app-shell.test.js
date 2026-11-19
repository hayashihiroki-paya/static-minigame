import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
// トップの案内とメタ説明だけを調べ、学習目的を残すフッターは別のテストで確認します。
const homeIntro = page.match(/<header class="intro">([\s\S]*?)<\/header>/)?.[1] ?? "";
const homeDescription =
  page.match(/<meta\s+name="description"\s+content="([^"]+)"\s*\/>/)?.[1] ?? "";
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

test("home page invites visitors to choose a game without explaining its learning purpose", () => {
  // 最初の画面では遊び方の入口を伝え、学習目的の説明はフッターに分けて残します。
  assert.match(homeIntro, /<p class="lead">遊びたいゲームを選んでください。<\/p>/);
  assert.doesNotMatch(homeIntro, /PLAY AND LEARN|学び|学習|仕組み/);
});

test("home page metadata describes the mini-game collection", () => {
  // 検索結果や共有時の説明も、ページを開く前からミニゲーム集だと伝えます。
  assert.equal(homeDescription, "遊びたいゲームを選んで楽しめるミニゲーム集です。");
  assert.doesNotMatch(homeDescription, /学び|学習|仕組み/);
});

test("home page keeps the learning purpose note in its footer", () => {
  // 依頼どおり、サイトの目的を示すフッターの表記は従来のまま維持します。
  assert.match(page, /<footer class="site-footer">\s*<p>このサイトは学習を目的に作っています。<\/p>/);
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
