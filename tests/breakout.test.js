import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BLOCK_POINTS,
  BLOCK_COLUMNS,
  BLOCK_ROWS,
  GAME_HEIGHT,
  GAME_WIDTH,
  INITIAL_LIVES,
  createInitialGame,
  launchBall,
  movePaddleBy,
  resetGame,
  updateGame,
} from "../src/games/breakout/logic.js";

/**
 * ゲーム状態を直接用意し、CanvasやrequestAnimationFrameに依存せずにルールを確かめます。
 * ボールとブロックの位置を固定すれば、衝突の再現と結果の比較ができます。
 */
function playingGame({ ball, blocks, lives = INITIAL_LIVES } = {}) {
  const initial = createInitialGame();

  return {
    ...initial,
    status: "playing",
    ball: { ...initial.ball, ...ball },
    blocks: blocks ?? initial.blocks,
    lives,
  };
}

test("初期状態は固定配置の32個のブロックと残機3つを持つ", () => {
  // 8列×4段の盤面と発射待ちを確認し、ゲームを毎回同じ状態から始めます。
  const game = createInitialGame();

  assert.equal(game.status, "ready");
  assert.equal(game.blocks.length, BLOCK_COLUMNS * BLOCK_ROWS);
  assert.equal(game.blocks.every((block) => block.active), true);
  assert.equal(game.score, 0);
  assert.equal(game.lives, INITIAL_LIVES);
  assert.equal(game.ball.x, game.paddle.x + game.paddle.width / 2);
  assert.equal(game.ball.velocityX, 0);
  assert.equal(game.ball.velocityY, 0);
});

test("ボールを発射するとplay状態になり、発射済みの再発射は無視する", () => {
  // ready状態でだけ速度を与え、ゲーム中に発射ボタンを押しても軌道を変えません。
  const readyGame = createInitialGame();
  const launchedGame = launchBall(readyGame);

  assert.equal(launchedGame.status, "playing");
  assert.notEqual(launchedGame.ball.velocityY, 0);
  assert.equal(readyGame.status, "ready");
  assert.equal(launchBall(launchedGame), launchedGame);
});

test("パドルを移動しても盤面の外へ出ず、ready中はボールが追従する", () => {
  // 画面端での移動を止め、発射前のボールとパドルの位置を一致させます。
  const initial = createInitialGame();
  const atLeftEdge = movePaddleBy(initial, -1, GAME_WIDTH);
  const atRightEdge = movePaddleBy(initial, 1, GAME_WIDTH);

  assert.equal(atLeftEdge.paddle.x, 0);
  assert.equal(atLeftEdge.ball.x, atLeftEdge.paddle.x + atLeftEdge.paddle.width / 2);
  assert.equal(
    atRightEdge.paddle.x + atRightEdge.paddle.width,
    GAME_WIDTH,
  );
  assert.equal(movePaddleBy(initial, 0, 50), initial);
});

test("1秒あたりの移動距離はパドル速度と経過時間から決まる", () => {
  // フレーム数ではなく秒数から移動量を計算し、画面更新頻度に依存しないようにします。
  const initial = createInitialGame();
  const movedGame = updateGame(initial, 1, 0.1);

  assert.equal(movedGame.paddle.x - initial.paddle.x, initial.paddle.speed * 0.1);
  assert.equal(movedGame.ball.x, movedGame.paddle.x + movedGame.paddle.width / 2);
});

test("左右の壁に当たるとボールを内側へ戻して反射する", () => {
  // 盤面の左壁へ向かうボールを1回進め、位置補正と速度反転を確認します。
  const game = playingGame({
    ball: { x: 9, y: 220, velocityX: -180, velocityY: 0 },
  });
  const nextGame = updateGame(game, 0, 1 / 120);

  assert.equal(nextGame.ball.x, nextGame.ball.radius);
  assert.ok(nextGame.ball.velocityX > 0);
  assert.equal(nextGame.score, 0);
});

test("パドル上面でボールが反射し、当たった位置に応じた角度になる", () => {
  // パドル中央から返球し、ボールが上向きになることを確認します。
  const initial = createInitialGame();
  const game = playingGame({
    ball: {
      x: initial.paddle.x + initial.paddle.width / 2,
      y: initial.paddle.y - initial.ball.radius - 1,
      velocityX: 0,
      velocityY: 180,
    },
  });
  const nextGame = updateGame(game, 0, 1 / 120);

  assert.ok(nextGame.ball.velocityY < 0);
  assert.equal(nextGame.ball.y, nextGame.paddle.y - nextGame.ball.radius);
});

test("ブロックに当たるとブロックを消し、得点を一度だけ加算する", () => {
  // 2個あるうちの1個へ下から当て、得点と残りの盤面を確認します。
  const block = {
    id: "target",
    row: 0,
    x: 240,
    y: 100,
    width: 60,
    height: 18,
    active: true,
  };
  const remainingBlock = { ...block, id: "remaining", x: 400 };
  const game = playingGame({
    ball: { x: 270, y: 127, velocityX: 0, velocityY: -180 },
    blocks: [block, remainingBlock],
  });
  const nextGame = updateGame(game, 0, 1 / 30);

  assert.equal(nextGame.blocks[0].active, false);
  assert.equal(nextGame.blocks[1].active, true);
  assert.equal(nextGame.score, BLOCK_POINTS);
  assert.equal(nextGame.status, "playing");
});

test("最後のブロックを消すとクリアになり、追加操作を無視する", () => {
  // 残り1個のブロックを消した時点でゲームを止め、終了後の得点を防ぎます。
  const lastBlock = {
    id: "last",
    row: 0,
    x: 240,
    y: 100,
    width: 60,
    height: 18,
    active: true,
  };
  const game = playingGame({
    ball: { x: 270, y: 127, velocityX: 0, velocityY: -180 },
    blocks: [lastBlock],
  });
  const wonGame = updateGame(game, 0, 1 / 30);

  assert.equal(wonGame.status, "won");
  assert.equal(wonGame.score, BLOCK_POINTS);
  assert.equal(wonGame.ball.velocityY, 0);
  assert.equal(updateGame(wonGame, 0, 1 / 30), wonGame);
});

test("ボールを落とすと残機が減り、残りがあればready状態に戻る", () => {
  // 最後の境界を越えたときだけ残機を減らし、次の発射位置へ戻します。
  const game = playingGame({
    ball: { x: 40, y: GAME_HEIGHT + 9, velocityX: 0, velocityY: 180 },
  });
  const nextGame = updateGame(game, 0, 1 / 30);

  assert.equal(nextGame.lives, INITIAL_LIVES - 1);
  assert.equal(nextGame.status, "ready");
  assert.equal(nextGame.ball.x, nextGame.paddle.x + nextGame.paddle.width / 2);
  assert.equal(nextGame.ball.velocityY, 0);
});

test("最後の残機を失うとlost状態になり、入力後も終端状態を保つ", () => {
  // 残機が0になると終了し、パドル操作や物理更新を受け付けないことを確認します。
  const game = playingGame({
    ball: { x: 40, y: GAME_HEIGHT + 9, velocityX: 0, velocityY: 180 },
    lives: 1,
  });
  const lostGame = updateGame(game, 0, 1 / 30);

  assert.equal(lostGame.lives, 0);
  assert.equal(lostGame.status, "lost");
  assert.equal(updateGame(lostGame, 1, 0.1), lostGame);
  assert.equal(movePaddleBy(lostGame, 1, 50), lostGame);
});

test("リセットで得点・残機・ブロック・状態が初期化される", () => {
  // 新しい盤面を作って以前の終了状態を引き継がないことを確認します。
  const oldGame = playingGame({ lives: 1 });
  const freshGame = resetGame();

  assert.notEqual(freshGame, oldGame);
  assert.equal(freshGame.status, "ready");
  assert.equal(freshGame.score, 0);
  assert.equal(freshGame.lives, INITIAL_LIVES);
  assert.equal(freshGame.blocks.length, BLOCK_COLUMNS * BLOCK_ROWS);
  assert.equal(freshGame.blocks.every((block) => block.active), true);
});

test("無効な時間・方向ではゲーム状態を変更しない", () => {
  // 不正な時間差を渡された場合もNaNを位置へ混ぜず、同じ状態を返します。
  const game = createInitialGame();

  assert.equal(updateGame(game, Number.NaN, 0.1), game);
  assert.equal(updateGame(game, 1, 0), game);
  assert.equal(updateGame(game, 1, Number.POSITIVE_INFINITY), game);
});
