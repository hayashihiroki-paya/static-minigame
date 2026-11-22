// 固定盤面からルールの境界を確かめ、探索結果も毎回同じになることを確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AI_SEARCH_DEPTH,
  BLACK,
  BOARD_SIZE,
  CELL_COUNT,
  EMPTY,
  WHITE,
  applyMove,
  chooseBestMove,
  countDiscs,
  createGameState,
  createInitialBoard,
  getFlippedCells,
  getGameResult,
  getLegalMoves,
  playMove,
  resolveTurnAfterMove,
} from "../src/games/reversi/logic.js";

test("標準の初期盤面と黒白それぞれの合法手を作る", () => {
  const board = createInitialBoard();

  assert.equal(board.length, CELL_COUNT);
  assert.deepEqual(countDiscs(board), { black: 2, white: 2 });
  assert.deepEqual(getLegalMoves(board, BLACK), [20, 29, 34, 43]);
  assert.deepEqual(getLegalMoves(board, WHITE), [19, 26, 37, 44]);
});

test("8方向すべてで挟んだ相手石を裏返す", () => {
  const board = Array(CELL_COUNT).fill(EMPTY);
  const center = 3 * BOARD_SIZE + 3;
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [rowStep, columnStep] of directions) {
    const adjacent = (3 + rowStep) * BOARD_SIZE + 3 + columnStep;
    const bounding = (3 + rowStep * 2) * BOARD_SIZE + 3 + columnStep * 2;
    board[adjacent] = WHITE;
    board[bounding] = BLACK;
  }

  const flips = getFlippedCells(board, center, BLACK);
  const nextBoard = applyMove(board, center, BLACK);

  assert.equal(flips.length, 8);
  assert.equal(nextBoard[center], BLACK);
  assert.ok(flips.every((index) => nextBoard[index] === BLACK));
  assert.ok(flips.every((index) => board[index] === WHITE));
});

test("挟めない場所や占有済みの場所には置けず、元盤面を変更しない", () => {
  const board = createInitialBoard();
  const original = [...board];

  assert.equal(applyMove(board, 0, BLACK), null);
  assert.equal(applyMove(board, 27, BLACK), null);
  assert.deepEqual(board, original);
});

test("相手に合法手がない場合はパスし、直前の手番へ戻す", () => {
  // 2番へ置くと1番の白を裏返し、4番の白だけが残るため、白がパスして黒が5番へ続けます。
  const board = Array(CELL_COUNT).fill(BLACK);
  board[1] = WHITE;
  board[2] = EMPTY;
  board[4] = WHITE;
  board[5] = EMPTY;
  const nextBoard = applyMove(board, 2, BLACK);
  const turn = resolveTurnAfterMove(nextBoard, BLACK);
  const state = playMove(
    { board, currentPlayer: BLACK, passedPlayer: null, isGameOver: false },
    2,
  );

  assert.deepEqual(turn, { currentPlayer: BLACK, passedPlayer: WHITE, isGameOver: false });
  assert.deepEqual(getLegalMoves(nextBoard, BLACK), [5]);
  assert.deepEqual(getLegalMoves(nextBoard, WHITE), []);
  assert.equal(state.currentPlayer, BLACK);
  assert.equal(state.passedPlayer, WHITE);
});

test("両者に合法手がなくなったら石数で勝者を判定する", () => {
  const board = Array(CELL_COUNT).fill(BLACK);
  board[63] = EMPTY;

  assert.deepEqual(getGameResult(board), { black: 63, white: 0, winner: BLACK });
  assert.equal(getGameResult(createInitialBoard()), null);
});

test("ミニマックスAIは合法手を選び、同じ盤面では同じ手を返す", () => {
  const board = createInitialBoard();
  const original = [...board];
  const first = chooseBestMove(board, WHITE, 3);
  const second = chooseBestMove(board, WHITE, 3);

  assert.ok(getLegalMoves(board, WHITE).includes(first.move));
  assert.deepEqual(second, first);
  assert.ok(first.nodesVisited > 0);
  assert.deepEqual(board, original);
  assert.equal(AI_SEARCH_DEPTH, 4);
});

test("合法手がないAIはパスを返し、不正な探索深さを拒否する", () => {
  const board = Array(CELL_COUNT).fill(BLACK);

  assert.deepEqual(chooseBestMove(board, WHITE), { move: null, score: null, nodesVisited: 0 });
  assert.throws(() => chooseBestMove(createInitialBoard(), WHITE, 0), RangeError);
  assert.deepEqual(createGameState().board, createInitialBoard());
});
