import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOARD_CELL_COUNT,
  MARKS,
  WINNING_LINES,
  createInitialGame,
  findWinningLine,
  playMove,
  resetGame,
} from "../src/games/tic-tac-toe/logic.js";

/**
 * 盤面ルールはDOMから切り離し、固定した位置選択で状態の変化を確認します。
 * 勝利条件や引き分けをブラウザー操作なしで再現できるようにするためです。
 */

test("初期状態は9マスが空で、先手が×", () => {
  // ゲームを始めたとき、盤面と手番がIssueに記載した状態であることを確認します。
  const game = createInitialGame();

  assert.equal(game.board.length, BOARD_CELL_COUNT);
  assert.deepEqual(game.board, Array(BOARD_CELL_COUNT).fill(null));
  assert.equal(game.currentMark, MARKS.FIRST);
  assert.equal(game.result, "playing");
  assert.equal(game.winner, null);
  assert.equal(game.winningLine, null);
});

test("空きマスに置くと記号が入り、手番が交代する", () => {
  // 1手ごとに新しい盤面を返し、交互に記号を置く流れを確認します。
  const initial = createInitialGame();
  const afterFirst = playMove(initial, 0);
  const afterSecond = playMove(afterFirst, 4);

  assert.deepEqual(afterFirst.board, ["×", null, null, null, null, null, null, null, null]);
  assert.equal(afterFirst.currentMark, "○");
  assert.equal(afterSecond.board[4], "○");
  assert.equal(afterSecond.currentMark, "×");
  assert.equal(afterFirst.result, "playing");
  assert.equal(initial.board[0], null);
});

test("使用済みマスと盤面外の位置を選んでも状態を変えない", () => {
  // 既に記号がある位置や無効な位置では、手番を進めずに同じ状態を返します。
  const game = playMove(createInitialGame(), 3);

  assert.equal(playMove(game, 3), game);
  assert.equal(playMove(game, -1), game);
  assert.equal(playMove(game, 9), game);
  assert.equal(playMove(game, 1.5), game);
});

test("8通りすべての縦・横・斜めの勝ち筋を見つける", () => {
  // 各勝ち筋に×を置いた盤面を作り、8パターンを取りこぼさないことを確認します。
  assert.equal(WINNING_LINES.length, 8);

  for (const line of WINNING_LINES) {
    const board = Array(BOARD_CELL_COUNT).fill(null);
    for (const cellIndex of line) {
      board[cellIndex] = MARKS.FIRST;
    }

    assert.deepEqual(findWinningLine(board, MARKS.FIRST), line);
  }

  assert.equal(findWinningLine(Array(BOARD_CELL_COUNT).fill(null), MARKS.FIRST), null);
});

test("勝利すると勝者と完成したラインを保存して、以後の手を無視する", () => {
  // 1行目を×でそろえ、勝利後に盤面が更新されないことも確認します。
  let game = createInitialGame();
  for (const cellIndex of [0, 3, 1, 4, 2]) {
    game = playMove(game, cellIndex);
  }

  assert.equal(game.result, "won");
  assert.equal(game.winner, "×");
  assert.deepEqual(game.winningLine, [0, 1, 2]);
  assert.equal(playMove(game, 8), game);
});

test("勝者がいないまま9マスが埋まると引き分けになる", () => {
  // 勝ち筋のない合法な手順で全マスを埋め、引き分けの終了条件を確認します。
  let game = createInitialGame();
  for (const cellIndex of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
    game = playMove(game, cellIndex);
  }

  assert.equal(game.result, "draw");
  assert.equal(game.winner, null);
  assert.equal(game.board.every((mark) => mark !== null), true);
  assert.equal(playMove(game, 0), game);
});

test("リセットで盤面と結果を消し、×先手に戻る", () => {
  // 勝敗が決まった後でも新しい初期状態を作り、古い盤面を変更しません。
  let oldGame = createInitialGame();
  for (const cellIndex of [0, 3, 1, 4, 2]) {
    oldGame = playMove(oldGame, cellIndex);
  }
  const freshGame = resetGame();

  assert.notEqual(freshGame, oldGame);
  assert.deepEqual(freshGame.board, Array(BOARD_CELL_COUNT).fill(null));
  assert.equal(freshGame.currentMark, MARKS.FIRST);
  assert.equal(freshGame.result, "playing");
  assert.equal(freshGame.winner, null);
  assert.equal(oldGame.result, "won");
});
