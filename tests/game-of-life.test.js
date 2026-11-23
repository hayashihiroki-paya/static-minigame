// 定番のセル配置を使い、近傍数と二重バッファの世代更新を確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALIVE,
  BOARD_SIZE,
  CELL_COUNT,
  createEmptyBoard,
  countLiveCells,
  countLiveNeighbors,
  nextGeneration,
  toggleCell,
} from "../src/games/game-of-life/logic.js";

function boardWithCells(coordinates) {
  const board = createEmptyBoard();
  for (const [row, column] of coordinates) {
    board[row * BOARD_SIZE + column] = ALIVE;
  }
  return board;
}

function around(row, column, offsets) {
  return offsets.map(([rowOffset, columnOffset]) => [row + rowOffset, column + columnOffset]);
}

test("空盤面とセルの切り替えは元の状態を変更しない", () => {
  const empty = createEmptyBoard();
  const toggled = toggleCell(empty, 42);

  assert.equal(empty.length, CELL_COUNT);
  assert.equal(countLiveCells(empty), 0);
  assert.equal(toggled[42], true);
  assert.equal(countLiveCells(toggled), 1);
  assert.equal(empty[42], false);
  assert.equal(toggleCell(toggled, 42)[42], false);
});

test("近傍数は周囲8セルを数え、盤面の端を越えて回り込まない", () => {
  const center = boardWithCells(around(10, 10, [
    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
  ]));
  const edge = createEmptyBoard();
  edge[0] = true;

  assert.equal(countLiveNeighbors(center, 10 * BOARD_SIZE + 10), 8);
  assert.equal(countLiveNeighbors(edge, 1), 1);
  assert.equal(countLiveNeighbors(edge, 19), 0);
});

test("死亡セルは生存近傍がちょうど3個のときだけ誕生する", () => {
  const center = 10 * BOARD_SIZE + 10;
  const threeNeighbors = boardWithCells(around(10, 10, [[-1, 0], [0, -1], [1, 1]]));
  const twoNeighbors = boardWithCells(around(10, 10, [[-1, 0], [0, -1]]));
  const fourNeighbors = boardWithCells(around(10, 10, [[-1, 0], [0, -1], [1, 1], [1, 0]]));

  assert.equal(nextGeneration(threeNeighbors)[center], true);
  assert.equal(nextGeneration(twoNeighbors)[center], false);
  assert.equal(nextGeneration(fourNeighbors)[center], false);
});

test("生存セルは近傍が2個または3個なら残り、それ以外は消える", () => {
  const center = 10 * BOARD_SIZE + 10;
  const oneNeighbor = boardWithCells([[10, 10], ...around(10, 10, [[0, 1]])]);
  const twoNeighbors = boardWithCells([[10, 10], ...around(10, 10, [[0, 1], [1, 0]])]);
  const threeNeighbors = boardWithCells([[10, 10], ...around(10, 10, [[0, 1], [1, 0], [1, 1]])]);
  const fourNeighbors = boardWithCells([[10, 10], ...around(10, 10, [[0, 1], [1, 0], [1, 1], [-1, 0]])]);

  assert.equal(nextGeneration(oneNeighbor)[center], false);
  assert.equal(nextGeneration(twoNeighbors)[center], true);
  assert.equal(nextGeneration(threeNeighbors)[center], true);
  assert.equal(nextGeneration(fourNeighbors)[center], false);
});

test("ブロックは安定し、ブリンカーは2世代で元に戻る", () => {
  const block = boardWithCells([[8, 8], [8, 9], [9, 8], [9, 9]]);
  const blinker = boardWithCells([[9, 9], [9, 10], [9, 11]]);
  const originalBlinker = [...blinker];
  const verticalBlinker = boardWithCells([[8, 10], [9, 10], [10, 10]]);

  assert.deepEqual(nextGeneration(block), block);
  assert.deepEqual(nextGeneration(blinker), verticalBlinker);
  assert.deepEqual(nextGeneration(nextGeneration(blinker)), blinker);
  assert.deepEqual(blinker, originalBlinker);
});

test("不正な盤面やセル番号は明示的に拒否する", () => {
  assert.throws(() => countLiveCells([true]), RangeError);
  assert.throws(() => countLiveNeighbors(createEmptyBoard(), CELL_COUNT), RangeError);
  assert.throws(() => toggleCell(createEmptyBoard(), -1), RangeError);
});
