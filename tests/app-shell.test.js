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
const rockPaperScissorsPage = await readFile(
  new URL("../src/games/rock-paper-scissors/index.html", import.meta.url),
  "utf8",
);
const memoryMatchPage = await readFile(
  new URL("../src/games/memory-match/index.html", import.meta.url),
  "utf8",
);
const ticTacToePage = await readFile(
  new URL("../src/games/tic-tac-toe/index.html", import.meta.url),
  "utf8",
);
const lightsOutSourcePage = await readFile(
  new URL("../src/games/lights-out/index.html", import.meta.url),
  "utf8",
);
const breakoutPage = await readFile(
  new URL("../src/games/breakout/index.html", import.meta.url),
  "utf8",
);
const snakePage = await readFile(new URL("../src/games/snake/index.html", import.meta.url), "utf8");
const snakeApp = await readFile(new URL("../src/games/snake/SnakeApp.svelte", import.meta.url), "utf8");
const simonPage = await readFile(new URL("../src/games/simon/index.html", import.meta.url), "utf8");
const simonStyles = await readFile(new URL("../src/games/simon/style.css", import.meta.url), "utf8");
const minesweeperPage = await readFile(
  new URL("../src/games/minesweeper/index.html", import.meta.url),
  "utf8",
);
const minesweeperMain = await readFile(
  new URL("../src/games/minesweeper/main.js", import.meta.url),
  "utf8",
);
const minesweeperStyles = await readFile(
  new URL("../src/games/minesweeper/style.css", import.meta.url),
  "utf8",
);
const game2048Page = await readFile(
  new URL("../src/games/2048/index.html", import.meta.url),
  "utf8",
);
const game2048Main = await readFile(
  new URL("../src/games/2048/main.js", import.meta.url),
  "utf8",
);
const game2048Styles = await readFile(
  new URL("../src/games/2048/style.css", import.meta.url),
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

test("home page links to the rock paper scissors game", () => {
  // ゲームカードからページを開けるようにし、静的ホスト上の実在する相対パスを使います。
  assert.match(page, /href="\.\/src\/games\/rock-paper-scissors\/"/);
  assert.match(page, /じゃんけん/);
});

test("home page links to the memory match game", () => {
  // 追加したゲームを一覧から開けることと、リンク名が日本語で読めることを確認します。
  assert.match(page, /href="\.\/src\/games\/memory-match\/"/);
  assert.match(page, /神経衰弱/);
});

test("home page links to the tic-tac-toe game", () => {
  // マルバツゲームを一覧から開けることを、日本語名と相対リンクで確認します。
  assert.match(page, /href="\.\/src\/games\/tic-tac-toe\/"/);
  assert.match(page, /マルバツゲーム/);
});

test("home page links to the built lights-out game", () => {
  // TypeScriptは直接配信できないため、ホームはViteの静的出力先へ案内します。
  assert.match(page, /href="\.\/dist\/games\/lights-out\/"/);
  assert.match(page, /ライツアウト/);
});

test("home page links to the Canvas breakout game", () => {
  // 新しいゲームも一覧から直接開けるように、静的なゲームページへのリンクを確認します。
  assert.match(page, /href="\.\/src\/games\/breakout\/"/);
  assert.match(page, /ブロック崩し/);
});

test("home page links to the built Svelte snake game", () => {
  // Svelteは静的出力を必要とするため、ホームからビルド済みのゲームを開きます。
  assert.match(page, /href="\.\/dist\/games\/snake\/"/);
  assert.match(page, /スネーク/);
});

test("home page links to the Simon game", () => {
  // 新しいゲームを一覧に追加し、既存の静的なソースページへ案内します。
  assert.match(page, /href="\.\/src\/games\/simon\/"/);
  assert.match(page, /サイモンゲーム/);
});

test("home page links to the Minesweeper game", () => {
  // 追加したマインスイーパーを静的なゲームページへの相対リンクで案内します。
  assert.match(page, /href="\.\/src\/games\/minesweeper\/"/);
  assert.match(page, /マインスイーパー/);
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

test("rock paper scissors page has accessible hand buttons and live results", () => {
  // 手のボタンはキーボードで操作でき、勝敗はライブ領域で通知されることを確認します。
  assert.match(rockPaperScissorsPage, /<html lang="ja">/);
  assert.match(rockPaperScissorsPage, /data-hand="rock" aria-label="グーを出す"/);
  assert.match(rockPaperScissorsPage, /data-hand="scissors" aria-label="チョキを出す"/);
  assert.match(rockPaperScissorsPage, /data-hand="paper" aria-label="パーを出す"/);
  assert.match(rockPaperScissorsPage, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(rockPaperScissorsPage, /<script type="module" src="\.\/main\.js"><\/script>/);
});

test("memory match page has a named card board, live status and reset control", () => {
  // カード状態を伝える盤面と進行状況を読み上げ、リセットにも標準button操作を使います。
  assert.match(memoryMatchPage, /<html lang="ja">/);
  assert.match(memoryMatchPage, /id="card-grid"[^>]*aria-label="神経衰弱のカード"/);
  assert.match(memoryMatchPage, /id="game-feedback"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(memoryMatchPage, /id="reset-button"[^>]*type="button"/);
  assert.match(memoryMatchPage, /<script type="module" src="\.\/main\.js"><\/script>/);
});

test("tic-tac-toe page has a named board, live status and reset control", () => {
  // 9個の操作ボタンをまとめる盤面と、手番通知・リセット操作があることを確認します。
  assert.match(ticTacToePage, /<html lang="ja">/);
  assert.match(ticTacToePage, /id="tic-tac-toe-board"[^>]*aria-label="マルバツゲームの盤面"/);
  assert.match(ticTacToePage, /id="game-feedback"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(ticTacToePage, /id="reset-button"[^>]*type="button"/);
  assert.match(ticTacToePage, /<script type="module" src="\.\/main\.js"><\/script>/);
});

test("lights-out source page loads the TypeScript entry and names the game controls", () => {
  // ビルド元のHTMLがTypeScriptの入口・盤面・状態通知・リセットを持つことを確認します。
  assert.match(lightsOutSourcePage, /<html lang="ja">/);
  assert.match(lightsOutSourcePage, /id="lights-out-board"[^>]*aria-label="ライツアウトの盤面"/);
  assert.match(lightsOutSourcePage, /id="game-feedback"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(lightsOutSourcePage, /id="reset-button"[^>]*type="button"/);
  assert.match(lightsOutSourcePage, /<script type="module" src="\.\/main\.ts"><\/script>/);
});

test("breakout page exposes a labeled canvas, keyboard help and accessible controls", () => {
  // Canvasの状態を外側のテキストでも伝え、標準ボタンでタッチとキーボードを操作できます。
  assert.match(breakoutPage, /<html lang="ja">/);
  assert.match(breakoutPage, /<canvas[^>]*aria-label="ブロック崩しのゲーム画面"/);
  assert.match(breakoutPage, /id="game-feedback"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(breakoutPage, /id="move-left"[^>]*data-direction="left"/);
  assert.match(breakoutPage, /id="move-right"[^>]*data-direction="right"/);
  assert.match(breakoutPage, /id="launch-button"[^>]*type="button"/);
  assert.match(breakoutPage, /id="reset-button"[^>]*type="button"/);
  assert.match(breakoutPage, /<script type="module" src="\.\/main\.js"><\/script>/);
});

test("snake page loads the Svelte entry and offers keyboard and touch controls", () => {
  // Svelteの入口、状態通知、開始と方向操作のボタンをソース画面で確認します。
  assert.match(snakePage, /<html lang="ja">/);
  assert.match(snakePage, /<script type="module" src="\.\/main\.js"><\/script>/);
  assert.match(snakeApp, /role="status" aria-live="polite"/);
  assert.match(snakeApp, /矢印キーまたはW・A・S・D/);
  assert.match(snakeApp, /aria-label="上へ"/);
  assert.match(snakeApp, /onclick=\{beginGame\}/);
});

test("Simon page has named pads, audio controls and a local JavaScript entry", () => {
  // 色だけに頼らないパッド名、消音、状態通知、入力説明をページ構造から確認します。
  assert.match(simonPage, /<html lang="ja">/);
  assert.match(simonPage, /data-pad="red" aria-label="赤・丸のパッド"/);
  assert.match(simonPage, /data-pad="blue" aria-label="青・三角のパッド"/);
  assert.doesNotMatch(simonPage, /data-pad="(?:red|blue|yellow|green)"[^>]*aria-pressed/);
  assert.match(simonPage, /id="mute-button"[^>]*aria-pressed="false"/);
  assert.match(simonPage, /id="game-feedback"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(simonPage, /キーボードでは1〜4キー/);
  assert.match(simonPage, /<script type="module" src="\.\/main\.js"><\/script>/);
  assert.match(simonStyles, /@media \(max-width: 520px\)/);
  assert.match(simonStyles, /touch-action: manipulation/);
});

test("Minesweeper page exposes its board and accessible input modes", () => {
  // 標準ボタンの開く・旗モードとライブ通知を用意し、盤面をキーボードでも移動できます。
  assert.match(minesweeperPage, /<html lang="ja">/);
  assert.match(minesweeperPage, /id="reveal-mode-button"[^>]*aria-pressed="true"/);
  assert.match(minesweeperPage, /id="flag-mode-button"[^>]*aria-pressed="false"/);
  assert.match(minesweeperPage, /role="grid"/);
  assert.match(minesweeperPage, /role="status" aria-live="polite"/);
  assert.match(minesweeperPage, /タブでマスを選び|マスを選んでEnter/);
  assert.match(minesweeperPage, /<script type="module" src="\.\/main\.js"><\/script>/);
  assert.match(minesweeperMain, /ArrowRight/);
  assert.match(minesweeperStyles, /grid-template-columns: repeat\(9, minmax\(0, 1fr\)\)/);
  assert.match(minesweeperStyles, /@media \(max-width: 520px\)/);
  assert.match(minesweeperStyles, /touch-action: manipulation/);
});

test("開いたセルと旗セルには未開封セル用のhover色を適用しない", () => {
  // 開いた直後も数字が読めるように、hover背景を閉じたセルにだけ限定します。
  assert.match(
    minesweeperStyles,
    /\.minesweeper-cell:not\(\.minesweeper-cell--revealed\):not\(\.minesweeper-cell--flagged\):hover:not\(:disabled\)\s*\{\s*background: #435273;/,
  );
  assert.doesNotMatch(minesweeperStyles, /\.minesweeper-cell:hover:not\(:disabled\)\s*\{/);
  assert.match(minesweeperStyles, /\.minesweeper-cell--revealed\s*\{[^}]*background: #f0f3fa;/s);
});


test("2048は一覧から開け、盤面とタッチ可能な方向ボタンを持つ", () => {
  // ゲーム一覧、4×4盤面、方向ボタン、状態読み上げを日本語ページに揃えます。
  assert.match(page, /href="\.\/src\/games\/2048\/"/);
  assert.match(page, /<h3>2048<\/h3>/);
  assert.match(game2048Page, /<html lang="ja">/);
  assert.match(game2048Page, /role="grid"[^>]*aria-label="2048の4行4列の盤面"/);
  assert.match(game2048Page, /data-direction="up"/);
  assert.match(game2048Page, /data-direction="left"/);
  assert.match(game2048Page, /data-direction="down"/);
  assert.match(game2048Page, /data-direction="right"/);
  assert.match(game2048Page, /role="status" aria-live="polite"/);
  assert.match(game2048Page, /<script type="module" src="\.\/main\.js"><\/script>/);
});

test("2048は矢印キーと狭い画面の操作に対応する", () => {
  // キー入力を盤面に結び、4列表示とタッチ操作を専用CSSで整えます。
  assert.match(game2048Main, /ArrowUp/);
  assert.match(game2048Main, /ArrowDown/);
  assert.match(game2048Main, /ArrowLeft/);
  assert.match(game2048Main, /ArrowRight/);
  assert.match(game2048Styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(game2048Styles, /@media \(max-width: 520px\)/);
  assert.match(game2048Styles, /touch-action: manipulation/);
});
