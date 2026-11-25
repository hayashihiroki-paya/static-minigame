// 盤面を固定し、圧縮・合成・得点・乱数の境界を決定的に確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOARD_SIZE,
  TARGET_TILE,
  createInitialGame,
  createPlaySession,
  hasAvailableMoves,
  moveGame,
  movePlaySession,
  undoPlaySession,
} from "../src/games/2048/logic.js";

/**
 * 4×4のテスト盤面から、任意のスコアと状態を持つゲームを作ります。
 * @param {number[][]} rows 盤面の行
 * @param {object} overrides 初期状態から上書きする値
 * @returns {object} 固定盤面を持つゲーム状態
 */
function gameFromRows(rows, overrides = {}) {
  return {
    board: rows.map((row) => row.slice()),
    score: 0,
    hasWon: false,
    isGameOver: false,
    ...overrides,
  };
}

/**
 * 位置選択に0.999、値選択に0.5を返し、末尾の空きへ2を置きます。
 * @returns {() => number} 何度呼んでも末尾の空きセルに2を置く乱数
 */
function spawnAtLastEmptyWithTwo() {
  let callCount = 0;
  return () => {
    callCount += 1;
    return callCount % 2 === 1 ? 0.999 : 0.5;
  };
}

// 初期化時は全て別の空マスから2個のタイルを作ることを確認します。
test("開始時は4×4盤面に2個のタイルを置き、スコアを0にする", () => {
  const game = createInitialGame(() => 0.5);
  assert.equal(game.board.length, BOARD_SIZE);
  assert.equal(game.board.flat().length, BOARD_SIZE * BOARD_SIZE);
  assert.equal(game.board.flat().filter((value) => value !== 0).length, 2);
  assert.ok(game.board.flat().filter((value) => value !== 0).every((value) => value === 2));
  assert.equal(game.score, 0);
  assert.equal(game.hasWon, false);
  assert.equal(game.isGameOver, false);
});

// 方向ごとの座標順を確認し、移動結果と乱数で選んだ出現位置を全盤面で比べます。
test("上下左右に動かすと、それぞれの端へタイルを詰める", () => {
  const cases = [
    {
      direction: "left",
      board: [[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      expected: [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]],
    },
    {
      direction: "right",
      board: [[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      expected: [[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]],
    },
    {
      direction: "up",
      board: [[0, 0, 0, 0], [0, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      expected: [[0, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]],
    },
    {
      direction: "down",
      board: [[0, 0, 0, 0], [0, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      expected: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 2, 2]],
    },
  ];

  for (const { direction, board, expected } of cases) {
    const next = moveGame(gameFromRows(board), direction, spawnAtLastEmptyWithTwo());
    assert.deepEqual(next.board, expected);
  }
});

// 1手の中でできた合成タイルを次の比較に再投入しないことを確認します。
test("3つ並ぶ同じ値は1回だけ合成する", () => {
  const game = gameFromRows([[2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const next = moveGame(game, "left", spawnAtLastEmptyWithTwo());
  assert.deepEqual(next.board[0], [4, 2, 0, 0]);
  assert.equal(next.score, 4);
});

// 4個のタイルが左詰め時に2組として合成されることを確認します。
test("同じ値が4つ並ぶと2組を合成し、両方の値を得点に足す", () => {
  const game = gameFromRows([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const next = moveGame(game, "left", spawnAtLastEmptyWithTwo());
  assert.deepEqual(next.board[0], [4, 4, 0, 0]);
  assert.equal(next.score, 8);
});

// 異なる行で合成した得点がどちらもスコアに加算されることを確認します。
test("複数行の合成値をすべてスコアへ加算する", () => {
  const game = gameFromRows([
    [2, 2, 0, 0],
    [4, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const next = moveGame(game, "left", spawnAtLastEmptyWithTwo());
  assert.equal(next.board[0][0], 4);
  assert.equal(next.board[1][0], 8);
  assert.equal(next.score, 12);
});

// 動きのない入力では、乱数を使わず元の状態をそのまま返すことを確認します。
test("変化しない移動では盤面・スコア・乱数消費を変えない", () => {
  const game = gameFromRows([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], {
    score: 12,
  });
  let randomCalls = 0;
  const next = moveGame(game, "left", () => {
    randomCalls += 1;
    return 0.5;
  });
  assert.equal(next, game);
  assert.equal(next.score, 12);
  assert.equal(randomCalls, 0);
});

// 成功した移動の後だけ、新しいタイルをひとつ空きマスへ置くことを確認します。
test("有効な移動後にタイルを1つ追加する", () => {
  const game = gameFromRows([[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const beforeCount = game.board.flat().filter((value) => value !== 0).length;
  const next = moveGame(game, "left", spawnAtLastEmptyWithTwo());
  const afterCount = next.board.flat().filter((value) => value !== 0).length;
  assert.equal(afterCount, beforeCount + 1);
  assert.equal(next.board[3][3], 2);
});

// 乱数の値によって2と4を分け、開始時の生成順を固定できることを確認します。
test("乱数の0.9境界で4と2のタイルを再現する", () => {
  const values = [0, 0.95, 0, 0.5];
  const game = createInitialGame(() => values.shift());
  assert.equal(game.board[0][0], 4);
  assert.equal(game.board[0][1], 2);
});

// 目標値達成を記録し、その後の移動も引き続き受け付けることを確認します。
test("2048達成後も移動できる", () => {
  const game = gameFromRows([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const won = moveGame(game, "left", spawnAtLastEmptyWithTwo());
  assert.equal(won.board[0][0], TARGET_TILE);
  assert.equal(won.hasWon, true);
  assert.equal(won.isGameOver, false);

  const continued = moveGame(won, "right", spawnAtLastEmptyWithTwo());
  assert.equal(continued.board[0][3], TARGET_TILE);
  assert.equal(continued.hasWon, true);
  assert.equal(continued.isGameOver, false);
});

// 盤面が満杯になり隣接同値もなくなった時に終了し、以後の移動を無視します。
test("有効な移動後に可能な手がなくなるとゲームオーバーになる", () => {
  const game = gameFromRows([
    [2, 2, 8, 4],
    [8, 4, 2, 4],
    [4, 2, 8, 2],
    [8, 4, 2, 8],
  ]);
  const over = moveGame(game, "left", () => 0.5);
  assert.equal(over.board[0][3], 2);
  assert.equal(hasAvailableMoves(over.board), false);
  assert.equal(over.isGameOver, true);

  let randomCalls = 0;
  assert.equal(
    moveGame(over, "right", () => {
      randomCalls += 1;
      return 0.5;
    }),
    over,
  );
  assert.equal(randomCalls, 0);
});

// 盤面更新が元状態を直接変更せず、取り消し可能な値として返ることを確認します。
test("移動しても元の盤面配列を変更しない", () => {
  const game = gameFromRows([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const originalBoard = game.board.map((row) => row.slice());
  moveGame(game, "right", spawnAtLastEmptyWithTwo());
  assert.deepEqual(game.board, originalBoard);
});

// 不明な方向は状態を変えず、誤った座標変換を行わないことを確認します。
test("不明な移動方向は同じ状態を返す", () => {
  const game = gameFromRows([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.equal(moveGame(game, "diagonal", () => 0.5), game);
});

test("合成と新規タイルの出現を取り消し、得点と達成状態を復元する", () => {
  const game = gameFromRows([
    [1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
  ], { score: 12 });
  const initial = createPlaySession(game);
  assert.equal(undoPlaySession(initial), initial);

  const moved = movePlaySession(initial, "left", spawnAtLastEmptyWithTwo());
  assert.equal(moved.game.board[3][3], 2);
  assert.equal(moved.game.score, 2060);
  assert.equal(moved.game.hasWon, true);

  const restored = undoPlaySession(moved);
  assert.deepEqual(restored, initial);
  assert.equal(undoPlaySession(restored), restored);
  assert.equal(movePlaySession(restored, "right", () => 0).previousGame, game);
});

test("無効な方向では履歴を保持し、次の有効な移動で履歴を置き換える", () => {
  const initial = createPlaySession(gameFromRows([
    [0, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
  ]));
  const first = movePlaySession(initial, "left", () => 0);
  const unchanged = movePlaySession(first, "left", () => assert.fail("乱数は使われない"));
  assert.equal(unchanged, first);
  assert.equal(undoPlaySession(unchanged).game, initial.game);

  const second = movePlaySession(unchanged, "down", () => 0);
  assert.equal(undoPlaySession(second).game, first.game);
});

test("ゲームオーバーの最後の手を戻してプレイを再開できる", () => {
  const initial = createPlaySession(gameFromRows([
    [2, 2, 8, 4], [8, 4, 2, 4], [4, 2, 8, 2], [8, 4, 2, 8],
  ]));
  const over = movePlaySession(initial, "left", () => 0.5);
  assert.equal(over.game.isGameOver, true);
  assert.equal(movePlaySession(over, "right"), over);
  assert.deepEqual(undoPlaySession(over), initial);
  assert.equal(movePlaySession(undoPlaySession(over), "right", () => 0).previousGame, initial.game);
});

test("新しいゲームの履歴は空になり、得点は0になる", () => {
  const newSession = createPlaySession();
  assert.equal(newSession.game.score, 0);
  assert.equal(undoPlaySession(newSession), newSession);
});
