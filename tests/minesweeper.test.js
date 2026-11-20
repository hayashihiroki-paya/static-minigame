import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOARD_SIZE,
  MINE_COUNT,
  countAdjacentMines,
  createInitialGame,
  revealCell,
  toggleFlag,
} from "../src/games/minesweeper/logic.js";

const FIXTURE_MINES = [
  [0, 0], [0, 1], [0, 2],
  [1, 0], [1, 2],
  [2, 0], [2, 1], [2, 2],
  [4, 4], [4, 5],
];

function createGameWithMines(positions = FIXTURE_MINES) {
  const initial = createInitialGame();
  const board = initial.board.map((row) => row.map((cell) => ({ ...cell })));
  for (const [row, column] of positions) board[row][column].hasMine = true;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      board[row][column].adjacentMines = countAdjacentMines(board, row, column);
    }
  }
  return { ...initial, board, initialized: true, status: "playing" };
}

test("開始前は9×9の未開封盤面を作り、地雷配置をまだ決めない", () => {
  const game = createInitialGame();
  assert.equal(game.board.length, BOARD_SIZE);
  assert.equal(game.board.flat().length, BOARD_SIZE * BOARD_SIZE);
  assert.equal(game.board.flat().some((cell) => cell.hasMine), false);
  assert.equal(game.initialized, false);
  assert.equal(game.status, "ready");
});

test("最初に開いた場所を避けて地雷を10個配置し、隣接数を計算する", () => {
  const game = createInitialGame();
  const started = revealCell(game, 4, 4, () => 0.5);
  assert.equal(started.initialized, true);
  assert.equal(started.board.flat().filter((cell) => cell.hasMine).length, MINE_COUNT);
  assert.equal(started.board[4][4].hasMine, false);
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      assert.equal(
        started.board[row][column].adjacentMines,
        countAdjacentMines(started.board, row, column),
      );
    }
  }
});

test("旗を付けたマスは最初に開かず、旗を外すと操作できる", () => {
  const game = createInitialGame();
  const flagged = toggleFlag(game, 4, 4);
  assert.equal(flagged.status, "ready");
  assert.equal(flagged.flagCount, 1);
  assert.equal(revealCell(flagged, 4, 4), flagged);

  const unflagged = toggleFlag(flagged, 4, 4);
  assert.equal(unflagged.flagCount, 0);
  assert.equal(revealCell(unflagged, 4, 4, () => 0.5).initialized, true);
});

test("旗や開いたマスは変更せず、無効な座標も無視する", () => {
  const game = createGameWithMines();
  const opened = revealCell(game, 8, 8);
  assert.equal(toggleFlag(opened, 8, 8), opened);
  assert.equal(toggleFlag(game, -1, 0), game);
  assert.equal(revealCell(game, BOARD_SIZE, 0), game);
});

test("乱数が0以上1未満でなければ盤面を生成しない", () => {
  assert.throws(() => revealCell(createInitialGame(), 0, 0, () => 1), RangeError);
  assert.throws(() => revealCell(createInitialGame(), 0, 0, () => Number.NaN), RangeError);
});

test("隣接地雷数は角の範囲で正しく数え、盤面外へは回り込まない", () => {
  const game = createGameWithMines();
  assert.equal(countAdjacentMines(game.board, 0, 0), 2);
  assert.equal(countAdjacentMines(game.board, 8, 8), 0);
  assert.equal(countAdjacentMines(game.board, -1, 0), 0);
});

test("空白を開くとFlood Fillが数字の境界まで広がり、旗と地雷を開かない", () => {
  const game = createGameWithMines();
  const board = game.board.map((row) => row.map((cell) => ({ ...cell })));
  board[8][7].isFlagged = true;
  const flaggedGame = { ...game, board, flagCount: 1 };

  const next = revealCell(flaggedGame, 8, 8);
  assert.equal(next.board[8][8].isRevealed, true);
  assert.equal(next.board[3][3].adjacentMines, 2);
  assert.equal(next.board[3][3].isRevealed, true);
  assert.equal(next.board[8][7].isFlagged, true);
  assert.equal(next.board[8][7].isRevealed, false);
  assert.equal(next.board[4][4].hasMine, true);
  assert.equal(next.board[4][4].isRevealed, false);
  assert.equal(next.status, "playing");
});

test("安全なマスを最後まで開くとクリアし、その後の入力を無視する", () => {
  const game = createGameWithMines();
  const board = game.board.map((row) =>
    row.map((cell) => ({ ...cell, isRevealed: !cell.hasMine })),
  );
  const lastSafe = board.flatMap((row, rowIndex) =>
    row.map((cell, columnIndex) => ({ cell, rowIndex, columnIndex })),
  ).find(({ cell }) => !cell.hasMine);
  lastSafe.cell.isRevealed = false;
  const almostWon = {
    ...game,
    board,
    revealedSafeCount: BOARD_SIZE * BOARD_SIZE - MINE_COUNT - 1,
  };

  const won = revealCell(almostWon, lastSafe.rowIndex, lastSafe.columnIndex);
  assert.equal(won.status, "won");
  assert.equal(won.revealedSafeCount, BOARD_SIZE * BOARD_SIZE - MINE_COUNT);
  assert.equal(revealCell(won, 8, 8), won);
  assert.equal(toggleFlag(won, 8, 8), won);
});

test("地雷を開くとゲームオーバーになり、終了後の操作を無視する", () => {
  const game = createGameWithMines();
  const lost = revealCell(game, 0, 0);
  assert.equal(lost.status, "lost");
  assert.equal(lost.board[0][0].isRevealed, true);
  assert.equal(revealCell(lost, 8, 8), lost);
  assert.equal(toggleFlag(lost, 8, 8), lost);
});
