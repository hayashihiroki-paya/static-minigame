import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  DISK_COUNT,
  GOAL_ROD,
  MINIMUM_MOVE_COUNT,
  START_ROD,
  createInitialGameState,
  moveDisk,
  resetGame,
  selectRod,
  solveHanoi,
  toggleSolution,
} from "../src/games/hanoi-tower/logic.js";

const homePage = await readFile(new URL("../index.html", import.meta.url), "utf8");
const gamePage = await readFile(new URL("../src/games/hanoi-tower/index.html", import.meta.url), "utf8");
const gameStyles = await readFile(new URL("../src/games/hanoi-tower/style.css", import.meta.url), "utf8");

test("初期状態は左の棒に4枚を積み、移動数と選択を初期化する", () => {
  const game = createInitialGameState();

  assert.deepEqual(game.rods, [[4, 3, 2, 1], [], []]);
  assert.equal(game.moveCount, 0);
  assert.equal(game.selectedRod, null);
  assert.equal(game.solutionVisible, false);
  assert.equal(game.isComplete, false);
});

test("合法な移動は一番上の円盤だけを移し、元の状態を変更しない", () => {
  const initial = createInitialGameState();
  const selected = selectRod(initial, START_ROD);
  const moved = moveDisk(selected, START_ROD, 1);

  assert.deepEqual(initial.rods, [[4, 3, 2, 1], [], []]);
  assert.deepEqual(moved.rods, [[4, 3, 2], [1], []]);
  assert.equal(moved.moveCount, 1);
  assert.equal(moved.selectedRod, null);
});

test("空の棒・同じ棒・より大きい円盤への移動は盤面と手数を変えない", () => {
  const initial = createInitialGameState();
  let game = initial;
  game = moveDisk(game, START_ROD, 1);
  game = moveDisk(game, START_ROD, 2);
  const beforeInvalidMoves = game;

  assert.equal(moveDisk(initial, 1, 0), initial);
  assert.equal(moveDisk(game, 0, 0), game);
  assert.equal(moveDisk(game, 2, 1), game);
  assert.equal(game, beforeInvalidMoves);
  assert.equal(game.moveCount, 2);
});

test("右の棒に全円盤を移すと完成になり、その後の移動を受け付けない", () => {
  let game = createInitialGameState();
  for (const move of solveHanoi()) {
    const nextGame = moveDisk(game, move.from, move.to);
    assert.equal(nextGame.moveCount, game.moveCount + 1, "解法の各移動は合法であること");
    game = nextGame;
  }

  assert.equal(game.rods[GOAL_ROD].length, DISK_COUNT);
  assert.equal(game.isComplete, true);
  assert.equal(game.moveCount, MINIMUM_MOVE_COUNT);
  assert.equal(moveDisk(game, GOAL_ROD, START_ROD), game);
});

test("再帰ソルバーは4枚で最短15手を返し、解法表示は盤面に影響しない", () => {
  const initial = createInitialGameState();
  const moves = solveHanoi();
  const withSolutionOpen = toggleSolution(initial);

  assert.equal(moves.length, 15);
  assert.deepEqual(withSolutionOpen.rods, initial.rods);
  assert.equal(withSolutionOpen.moveCount, initial.moveCount);
  assert.equal(withSolutionOpen.solutionVisible, true);
  assert.equal(toggleSolution(withSolutionOpen).solutionVisible, false);
  assert.equal(solveHanoi(0).length, 0);
  assert.throws(() => solveHanoi(-1), RangeError);
});

test("リセットで盤面・選択・移動数・解法表示を初期状態へ戻す", () => {
  let game = selectRod(createInitialGameState(), START_ROD);
  game = moveDisk(game, START_ROD, 1);
  game = toggleSolution(game);
  const initial = resetGame();

  assert.notEqual(initial, game);
  assert.deepEqual(initial.rods, [[4, 3, 2, 1], [], []]);
  assert.equal(initial.selectedRod, null);
  assert.equal(initial.moveCount, 0);
  assert.equal(initial.solutionVisible, false);
  assert.equal(initial.isComplete, false);
});

test("ハノイの塔はホームにあり、棒のボタンと狭い画面用スタイルを持つ", () => {
  assert.match(homePage, /href="\.\/src\/games\/hanoi-tower\/"/);
  assert.match(homePage, /<h3>ハノイの塔<\/h3>/);
  assert.match(gamePage, /<html lang="ja">/);
  assert.match(gamePage, /data-rod-index="0"/);
  assert.match(gamePage, /data-rod-index="1"/);
  assert.match(gamePage, /data-rod-index="2"/);
  assert.match(gamePage, /role="status" aria-live="polite"/);
  assert.match(gamePage, /id="solution-button"/);
  assert.match(gamePage, /最短手順を見る/);
  assert.match(gamePage, /Tabで棒を選び、EnterまたはSpace/);
  assert.match(gameStyles, /@media \(max-width: 520px\)/);
  assert.match(gameStyles, /touch-action: manipulation/);
  assert.match(gameStyles, /:focus-visible/);
});
