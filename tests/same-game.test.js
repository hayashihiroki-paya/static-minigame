import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import initializeWasm, { SameGame } from "../src/games/same-game/pkg/same_game.js";

// Nodeの組み込みテストでも本物のWASMを初期化し、ブラウザーと同じ公開APIを確認します。
const wasmBytes = await readFile(
  new URL("../src/games/same-game/pkg/same_game_bg.wasm", import.meta.url),
);
await initializeWasm({ module_or_path: wasmBytes });

const homePage = await readFile(new URL("../index.html", import.meta.url), "utf8");
const gamePage = await readFile(new URL("../src/games/same-game/index.html", import.meta.url), "utf8");
const gameStyles = await readFile(new URL("../src/games/same-game/style.css", import.meta.url), "utf8");

test("WebAssemblyの初期盤面は固定の10×10で5種類のタイルを持つ", () => {
  const game = new SameGame();
  const tiles = Array.from(game.tiles());

  assert.equal(tiles.length, 100);
  assert.deepEqual([...new Set(tiles)].sort(), [1, 2, 3, 4, 5]);
  assert.equal(game.score(), 0);
  assert.equal(game.phase(), 0);
  assert.equal(game.group_at(0).length, 4);
});

test("WASMのグループ除去で得点とタイル数が更新され、リセットで元に戻る", () => {
  const game = new SameGame();
  const initialTiles = Array.from(game.tiles());

  assert.equal(game.remove_at(0), 4);
  assert.equal(game.score(), 16);
  assert.equal(Array.from(game.tiles()).filter((tile) => tile !== 0).length, 96);
  assert.equal(game.remove_at(100), 0);
  game.reset();

  assert.deepEqual(Array.from(game.tiles()), initialTiles);
  assert.equal(game.score(), 0);
  assert.equal(game.phase(), 0);
});

test("ページはホームから開け、WASMを使うキーボード・タッチ用の盤面を持つ", () => {
  assert.match(homePage, /href="\.\/dist\/games\/same-game\/"/);
  assert.match(homePage, /<h3>さめがめ<\/h3>/);
  assert.match(gamePage, /<html lang="ja">/);
  assert.match(gamePage, /id="same-board"[^>]*role="group"/);
  assert.match(gamePage, /role="status" aria-live="polite"/);
  assert.match(gamePage, /EnterまたはSpace/);
  assert.match(gameStyles, /overflow-x: auto/);
  assert.match(gameStyles, /touch-action: manipulation/);
  assert.match(gameStyles, /@media \(max-width: 520px\)/);
  assert.match(gameStyles, /:focus-visible/);
});
