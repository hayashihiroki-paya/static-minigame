import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOARD_WIDTH,
  CELL_COUNT,
  RESET_SEQUENCE,
  createGame,
  createInitialBoard,
  pressCell,
  resetGame,
  toggleCross,
} from "../src/games/lights-out/logic.ts";

/**
 * TypeScriptのルール関数をNode.js組み込みテストランナーで直接確認します。
 * 固定盤面と固定した操作手順で、表示やブラウザーに依存しない結果を比べます。
 */

test("初期盤面は5×5で点灯マスを含み、固定手順で解ける", () => {
  // 初期盤面は消灯状態から既知の操作で作られるので、その操作を重ねると必ず解けます。
  const initialBoard = createInitialBoard();
  let solvedBoard = initialBoard;

  assert.equal(BOARD_WIDTH, 5);
  assert.equal(initialBoard.length, CELL_COUNT);
  assert.equal(initialBoard.some(Boolean), true);

  for (const cellIndex of RESET_SEQUENCE) {
    solvedBoard = toggleCross(solvedBoard, cellIndex);
  }

  assert.deepEqual(solvedBoard, Array(CELL_COUNT).fill(false));
});

test("中央を選ぶとそのマスと上下左右だけが反転する", () => {
  // 中央の12番を押したとき、中央と4つの直交位置だけが変わります。
  const initialBoard = Array(CELL_COUNT).fill(false);
  const nextBoard = toggleCross(initialBoard, 12);
  const changedCells = nextBoard.flatMap((isLit, index) => (isLit ? [index] : []));

  assert.deepEqual(changedCells, [7, 11, 12, 13, 17]);
  assert.deepEqual(initialBoard, Array(CELL_COUNT).fill(false));
});

test("角では盤面外の上下左右へ回り込まない", () => {
  // 左上の角は0・1・5だけを変え、反対側の行や列には影響しません。
  const nextBoard = toggleCross(Array(CELL_COUNT).fill(false), 0);
  const changedCells = nextBoard.flatMap((isLit, index) => (isLit ? [index] : []));

  assert.deepEqual(changedCells, [0, 1, 5]);
  assert.equal(nextBoard[4], false);
  assert.equal(nextBoard[20], false);
  assert.equal(nextBoard[24], false);
});

test("辺のマスは実在する隣接マスだけを反転する", () => {
  // 最上段の右端は左と下だけを隣接マスとして扱い、右端から左端へ回り込みません。
  const nextBoard = toggleCross(Array(CELL_COUNT).fill(false), 4);
  const changedCells = nextBoard.flatMap((isLit, index) => (isLit ? [index] : []));

  assert.deepEqual(changedCells, [3, 4, 9]);
});

test("無効なマス選択と不正な盤面を明示的に扱う", () => {
  // 画面操作の無効な番号は無視し、ロジックを直接誤用した場合は早めに知らせます。
  const game = createGame();

  assert.equal(pressCell(game, -1), game);
  assert.equal(pressCell(game, CELL_COUNT), game);
  assert.equal(pressCell(game, 1.5), game);
  assert.throws(() => toggleCross([], 0), RangeError);
  assert.throws(() => toggleCross(Array(CELL_COUNT).fill(false), CELL_COUNT), RangeError);
});

test("固定手順で全マスを消すとクリアになり、以後の操作を無視する", () => {
  // 初期盤面の解法手順を再生し、クリア状態では盤面が変わらないことを確認します。
  let game = createGame();

  for (const cellIndex of RESET_SEQUENCE) {
    game = pressCell(game, cellIndex);
  }

  assert.equal(game.status, "cleared");
  assert.deepEqual(game.board, Array(CELL_COUNT).fill(false));
  assert.equal(pressCell(game, 0), game);
});

test("リセットで同じ解ける盤面と進行中状態へ戻る", () => {
  // リセットは以前の盤面を変更せず、固定初期配置の新しい状態を返します。
  const initialGame = createGame();
  const playedGame = pressCell(initialGame, 12);
  const reset = resetGame();

  assert.notEqual(reset, playedGame);
  assert.deepEqual(reset.board, initialGame.board);
  assert.equal(reset.status, "playing");
  assert.notDeepEqual(playedGame.board, initialGame.board);
});
