import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const sharedStyles = await readFile(new URL("../src/style.css", import.meta.url), "utf8");
const homePage = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("共通スタイルはキーボード操作中のフォーカス位置を表示する", () => {
  // ゲームごとの見た目を保ちながら、共通CSSが入力部品のフォーカスを補います。
  assert.match(
    sharedStyles,
    /:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*\{[^}]*outline: 3px solid/,
  );
});

test("ボタンの押下反応は固有の変形を保ち、動きを減らす設定にも従う", () => {
  const pressRule = sharedStyles.match(
    /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*:where\(button:not\(:disabled\)\):active\s*\{([^}]*)\}/,
  );
  assert.ok(pressRule);
  assert.match(pressRule[1], /translate:\s*0 1px;/);
  assert.doesNotMatch(pressRule[1], /transform\s*:/);
});

test("ホームの各ゲームリンクは見出しのゲーム名で区別できる", () => {
  const cards = [...homePage.matchAll(/<article class="game-card">([\s\S]*?)<\/article>/g)];
  assert.ok(cards.length > 0);
  const names = new Set();

  for (const [, card] of cards) {
    const title = card.match(/<h3>([^<]+)<\/h3>/)?.[1];
    const name = card.match(/<a class="game-card__link"[^>]*aria-label="([^"]+)"/)?.[1];
    assert.ok(title);
    assert.equal(name, title + "のゲームで遊ぶ");
    names.add(name);
  }
  assert.equal(names.size, cards.length);
});

test("ホームカードはポインターとキーボードの選択状態を示す", () => {
  // フォーカス強調はタッチ端末にも適用し、hoverだけを対応ポインターに限定します。
  const focusWithinPosition = sharedStyles.indexOf(".game-card:focus-within {");
  const hoverMediaPosition = sharedStyles.indexOf("@media (hover: hover)");

  assert.notEqual(focusWithinPosition, -1);
  assert.ok(focusWithinPosition < hoverMediaPosition);
  assert.match(sharedStyles.slice(hoverMediaPosition), /\.game-card:hover\s*\{/);
});

test("共通スタイルはOSの動きを抑える設定を尊重する", () => {
  // 動きを減らす利用者には、押下やカード選択の遷移を短くして即時に状態を伝えます。
  assert.match(sharedStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(sharedStyles, /transition-duration: 0\.01ms !important/);
});
