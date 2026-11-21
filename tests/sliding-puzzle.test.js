// 固定乱数と既知の盤面を使い、合法手、完成状態、A*最短経路を確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOAL_BOARD,
  createGameFromBoard,
  createInitialGame,
  createShuffledBoard,
  findShortestPath,
  getManhattanDistance,
  getMovableTileIndices,
  isSolvable,
  isSolved,
  moveBlank,
  moveTile,
  requestHint,
} from "../src/games/sliding-puzzle/logic.js";

test("ゴール盤面のマンハッタン距離は0で、完成状態になる", () => {
  // マンハッタン距離は各タイルがゴールへ行くために最低限必要な手数です。
  assert.equal(getManhattanDistance(GOAL_BOARD), 0);
  assert.equal(isSolved(GOAL_BOARD), true);
  assert.equal(isSolvable(GOAL_BOARD), true);
  assert.deepEqual(findShortestPath(GOAL_BOARD), []);
});

test("完成状態の一手手前では距離1、空きマスに隣り合うタイルだけを選べる", () => {
  const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];
  assert.equal(getManhattanDistance(board), 1);
  assert.deepEqual(getMovableTileIndices(board), [4, 8, 6]);
});

test("ゴールから合法手で混ぜた盤面は固定乱数で再現でき、必ず解ける", () => {
  let randomCalls = 0;
  const first = createShuffledBoard(() => {
    randomCalls += 1;
    return 0.37;
  });
  const second = createShuffledBoard(() => 0.37);

  assert.deepEqual(first, second);
  assert.equal(randomCalls, 24);
  assert.equal(first.length, 9);
  assert.equal(isSolved(first), false);
  assert.equal(isSolvable(first), true);
  assert.ok(findShortestPath(first).length > 0);
});

test("不正な乱数や混ぜ手数は盤面生成時にエラーにする", () => {
  assert.throws(() => createShuffledBoard(() => 1), RangeError);
  assert.throws(() => createShuffledBoard(() => 0.5, 0), RangeError);
});

test("空きマスに隣接するタイルだけ動かせて、移動数を一つ増やす", () => {
  const initial = createGameFromBoard([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  const moved = moveTile(initial, 8);

  assert.deepEqual(moved.board, [...GOAL_BOARD]);
  assert.equal(moved.moves, 1);
  assert.equal(moved.isWon, true);
  assert.deepEqual(initial.board, [1, 2, 3, 4, 5, 6, 7, 0, 8]);
  assert.equal(initial.moves, 0);
});

test("隣り合わないタイルや盤面外への方向は状態を変えない", () => {
  const game = createGameFromBoard([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  assert.strictEqual(moveTile(game, 0), game);
  assert.strictEqual(moveBlank(game, "down"), game);
  assert.strictEqual(moveBlank(game, "diagonal"), game);
});

test("完成後は追加移動を受け付けない", () => {
  const oneMoveAway = createGameFromBoard([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  const solved = moveTile(oneMoveAway, 8);

  assert.equal(solved.isWon, true);
  assert.strictEqual(moveTile(solved, 7), solved);
  assert.strictEqual(moveBlank(solved, "left"), solved);
});

test("A*探索は既知の盤面に対する最短手順を返す", () => {
  const board = [1, 2, 3, 4, 5, 6, 0, 7, 8];
  const path = findShortestPath(board);
  let game = createGameFromBoard(board);

  assert.equal(path.length, 2);
  for (const tileIndex of path) game = moveTile(game, tileIndex);
  assert.deepEqual(game.board, [...GOAL_BOARD]);
  assert.equal(game.isWon, true);
});

test("奇数反転数の盤面は解けないと判定しA*探索を始めない", () => {
  const unsolvableBoard = [1, 2, 3, 4, 5, 6, 8, 7, 0];
  assert.equal(isSolvable(unsolvableBoard), false);
  assert.equal(findShortestPath(unsolvableBoard), null);
});

test("ヒントは最短手順の最初のタイルを示し、盤面と移動数を変えない", () => {
  const initial = createGameFromBoard([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  const hinted = requestHint(initial);

  assert.equal(hinted.hintTileIndex, 8);
  assert.match(hinted.hintText, /8のタイルを左へ/);
  assert.deepEqual(hinted.board, initial.board);
  assert.equal(hinted.moves, initial.moves);
});

test("リスタート用の初期状態は移動数とヒントを初期化する", () => {
  const initial = createInitialGame(() => 0.37);
  const hinted = requestHint(initial);
  const restarted = createInitialGame(() => 0.9);

  assert.equal(hinted.hintText.length > 0, true);
  assert.equal(restarted.moves, 0);
  assert.equal(restarted.hintTileIndex, null);
  assert.equal(restarted.hintText, "");
  assert.equal(restarted.isWon, false);
});

test("A*探索と盤面生成は不正な盤面を拒否する", () => {
  assert.throws(() => findShortestPath([1, 2, 3]), RangeError);
  assert.throws(() => createGameFromBoard([1, 1, 2, 3, 4, 5, 6, 7, 0]), RangeError);
});
