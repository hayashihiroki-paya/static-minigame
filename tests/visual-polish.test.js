import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const sharedStyles = await readFile(new URL("../src/style.css", import.meta.url), "utf8");

test("共通スタイルはキーボード操作中のフォーカス位置を表示する", () => {
  // ゲームごとの見た目を保ちながら、共通CSSが入力部品のフォーカスを補います。
  assert.match(
    sharedStyles,
    /:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*\{[^}]*outline: 3px solid/,
  );
});

test("ボタンの押下反応は有効なボタンだけに適用する", () => {
  // ゲーム中に使えない操作へ、押せると誤解するアニメーションを出しません。
  assert.match(sharedStyles, /:where\(button\):not\(:disabled\):active\s*\{[^}]*transform: translateY\(1px\)/);
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
