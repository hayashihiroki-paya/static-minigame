import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  countPlacedBoxes, createGame, isCleared, movePlayer, undoMove,
} from "../src/games/warehouse-puzzle/logic.js";
import { stages } from "../src/games/warehouse-puzzle/stages.js";

test("壁や盤面の境界で止まり、列の端から隣の行へ移動しない", () => {
  const game = createGame(["# @", "  #", "#$."]);
  for (const direction of ["right", "up", "down"]) {
    assert.equal(movePlayer(game, direction), false);
  }
  assert.equal(movePlayer(game, "left"), true);
  assert.equal(movePlayer(game, "down"), true);
  assert.equal(movePlayer(game, "left"), true);
  assert.equal(movePlayer(game, "up"), false);
  assert.equal(game.history.length, 3);
});

test("箱の先が壁・境界・別の箱なら押せず、離れる方向に歩いても箱は動かない", () => {
  for (const rows of [
    [" @$#", ".   "],
    [" @$", " . "],
    [" @$$", " .. "],
  ]) {
    const game = createGame(rows);
    const before = game.position;
    assert.equal(movePlayer(game, "right"), false);
    assert.equal(game.position, before);
    assert.equal(game.history.length, 0);
    assert.equal(movePlayer(game, "left"), true);
    assert.deepEqual(game.position.boxes, before.boxes);
  }
});

test("歩行と箱押しを順に取り消し、クリアした手からも戻れる", () => {
  const game = createGame(stages[0].rows);
  const original = game.position;
  assert.equal(movePlayer(game, "left"), true);
  assert.equal(movePlayer(game, "right"), true);
  assert.equal(movePlayer(game, "right"), true);
  const beforeClear = game.position;
  assert.equal(movePlayer(game, "right"), true);
  assert.equal(countPlacedBoxes(game), 1);
  assert.equal(isCleared(game), true);
  assert.equal(movePlayer(game, "up"), false);

  assert.equal(undoMove(game), true);
  assert.equal(game.position, beforeClear);
  assert.equal(isCleared(game), false);
  for (let i = 0; i < 3; i += 1) assert.equal(undoMove(game), true);
  assert.equal(game.position, original);
  assert.equal(undoMove(game), false);
});

test("最初から、または別ステージを始めると履歴は空になる", () => {
  const game = createGame(stages[0].rows);
  assert.equal(movePlayer(game, "right"), true);
  const restarted = createGame(stages[0].rows);
  const switched = createGame(stages[1].rows);
  assert.equal(undoMove(restarted), false);
  assert.equal(undoMove(switched), false);
  assert.notDeepEqual(game.position, restarted.position);
  assert.equal(switched.goals.size, 2);
});

test("形や記号、箱とゴールの数がおかしいステージを拒否する", () => {
  for (const rows of [["@$.", "##"], ["@$?"], ["@@$."], ["@$.."]]) {
    assert.throws(() => createGame(rows));
  }
});

const solutions = ["RR", "URDLDRRUU", "ULUURDDDRRRDRULUUU"];
const directions = { U: "up", D: "down", L: "left", R: "right" };

test("3ステージすべての解答手順を再生できる", () => {
  assert.equal(stages.length, solutions.length);
  stages.forEach((stage, index) => {
    const game = createGame(stage.rows);
    assert.equal(isCleared(game), false);
    for (const step of solutions[index]) {
      assert.equal(movePlayer(game, directions[step]), true, stage.name + "の手順");
    }
    assert.equal(isCleared(game), true, stage.name);
    assert.equal(countPlacedBoxes(game), game.goals.size);
  });
});

test("ホームから開け、盤面と操作ボタンに読み上げ用の名前がある", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/warehouse-puzzle/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="倉庫パズルのゲームで遊ぶ" href="\.\/src\/games\/warehouse-puzzle\/"/);
  assert.match(page, /<label for="warehouse-stage">ステージ<\/label>/);
  assert.match(page, /id="warehouse-board" role="grid"[^>]*tabindex="0"/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /id="warehouse-undo" type="button" disabled/);
});
