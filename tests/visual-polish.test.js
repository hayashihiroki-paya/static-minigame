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
  // タッチ端末ではhoverに依存せず、キーボードではリンクに合わせてカードを強調します。
  assert.match(sharedStyles, /@media \(hover: hover\)\s*\{\s*\.game-card:hover,\s*\.game-card:focus-within/);
});

test("共通スタイルはOSの動きを抑える設定を尊重する", () => {
  // 動きを減らす利用者には、押下やカード選択の遷移を短くして即時に状態を伝えます。
  assert.match(sharedStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(sharedStyles, /transition-duration: 0\.01ms !important/);
});
