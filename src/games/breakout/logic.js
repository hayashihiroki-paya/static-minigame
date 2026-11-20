/**
 * ブロック崩しの盤面、入力、衝突判定をCanvas描画から分けます。
 * Node.jsのテストでは時間と入力を固定し、ブラウザーなしでルールを確かめられます。
 */
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 420;
export const INITIAL_LIVES = 3;
export const BLOCK_POINTS = 10;

export const BLOCK_COLUMNS = 8;
export const BLOCK_ROWS = 4;

const PADDLE_WIDTH = 92;
const PADDLE_HEIGHT = 12;
const PADDLE_SPEED = 420;
const BALL_RADIUS = 8;
const MAX_SIMULATION_STEP = 1 / 120;
const MAX_UPDATE_SECONDS = 0.25;
const BLOCK_WIDTH = 62;
const BLOCK_HEIGHT = 18;
const BLOCK_GAP_X = 7;
const BLOCK_GAP_Y = 8;
const BLOCK_TOP = 54;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * 4段×8列のブロックを同じ間隔で作ります。
 * IDと段番号を持たせると、ロジックテストとCanvasの色分けで同じ配置を使えます。
 */
function createBlocks() {
  const rowWidth = BLOCK_COLUMNS * BLOCK_WIDTH + (BLOCK_COLUMNS - 1) * BLOCK_GAP_X;
  const left = (GAME_WIDTH - rowWidth) / 2;
  const blocks = [];

  for (let row = 0; row < BLOCK_ROWS; row += 1) {
    for (let column = 0; column < BLOCK_COLUMNS; column += 1) {
      blocks.push({
        id: `${row}-${column}`,
        row,
        x: left + column * (BLOCK_WIDTH + BLOCK_GAP_X),
        y: BLOCK_TOP + row * (BLOCK_HEIGHT + BLOCK_GAP_Y),
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        active: true,
      });
    }
  }

  return blocks;
}

/**
 * ゲーム開始前のボールをパドルの中央に置きます。
 * 発射前はボールを動かさず、左右移動中もパドルに付いてくる状態です。
 */
function createAttachedBall(paddle) {
  return {
    x: paddle.x + paddle.width / 2,
    y: paddle.y - BALL_RADIUS - 2,
    radius: BALL_RADIUS,
    velocityX: 0,
    velocityY: 0,
  };
}

/**
 * パドル中央にボールを置き、固定のブロック配置と残機を作ります。
 * 同じ初期値から始めるので、リセットとテストを毎回再現できます。
 */
export function createInitialGame() {
  const paddle = {
    x: (GAME_WIDTH - PADDLE_WIDTH) / 2,
    y: GAME_HEIGHT - 40,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: PADDLE_SPEED,
  };

  return {
    paddle,
    ball: createAttachedBall(paddle),
    blocks: createBlocks(),
    score: 0,
    lives: INITIAL_LIVES,
    status: "ready",
  };
}

/**
 * パドルを指定方向へ距離分だけ動かし、盤面の外へ出ないようにします。
 * ready中はボールもパドル中央へ合わせ、発射前の位置関係を保ちます。
 */
export function movePaddleBy(game, direction, distance) {
  if (
    (game.status !== "ready" && game.status !== "playing") ||
    !Number.isFinite(direction) ||
    !Number.isFinite(distance) ||
    distance < 0
  ) {
    return game;
  }

  const horizontalDirection = Math.sign(direction);

  if (horizontalDirection === 0 || distance === 0) {
    return game;
  }

  const x = clamp(
    game.paddle.x + horizontalDirection * distance,
    0,
    GAME_WIDTH - game.paddle.width,
  );

  if (x === game.paddle.x) {
    return game;
  }

  const paddle = { ...game.paddle, x };
  const ball = game.status === "ready" ? createAttachedBall(paddle) : game.ball;

  return { ...game, paddle, ball };
}

/**
 * ready状態のときだけボールを発射します。
 * 初速を固定しておき、得点や残機のテストが乱数に左右されないようにします。
 */
export function launchBall(game) {
  if (game.status !== "ready") {
    return game;
  }

  return {
    ...game,
    status: "playing",
    ball: {
      ...game.ball,
      velocityX: 160,
      velocityY: -240,
    },
  };
}

/**
 * 円形ボールと矩形ブロックの接触を、最も近い矩形上の点で判定します。
 * 中心点だけを調べるより、ブロックの角に当たるケースも拾えます。
 */
function circleTouchesBlock(ball, block) {
  const closestX = clamp(ball.x, block.x, block.x + block.width);
  const closestY = clamp(ball.y, block.y, block.y + block.height);
  const distanceX = ball.x - closestX;
  const distanceY = ball.y - closestY;

  return distanceX * distanceX + distanceY * distanceY <= ball.radius * ball.radius;
}

/**
 * 1回分の小さな時間刻みで、パドル・ボール・衝突を更新します。
 * Canvasのフレーム頻度に直接依存させず、同じ秒数なら同じ距離だけ進めます。
 */
function stepGame(game, direction, seconds) {
  const movedGame = movePaddleBy(game, direction, game.paddle.speed * seconds);

  // 発射前はパドルだけを動かし、ボールをパドルに載せたままにします。
  if (movedGame.status === "ready") {
    return movedGame;
  }

  if (movedGame.status !== "playing") {
    return movedGame;
  }

  const previousBall = movedGame.ball;
  const ball = {
    ...previousBall,
    x: previousBall.x + previousBall.velocityX * seconds,
    y: previousBall.y + previousBall.velocityY * seconds,
  };

  // 左右と上の壁で反射し、ボールを盤面の内側へ戻します。
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.velocityX = Math.abs(ball.velocityX);
  } else if (ball.x + ball.radius > GAME_WIDTH) {
    ball.x = GAME_WIDTH - ball.radius;
    ball.velocityX = -Math.abs(ball.velocityX);
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.velocityY = Math.abs(ball.velocityY);
  }

  // パドル上面を上から通過したときだけ反射し、当たった位置で返球角度を変えます。
  const crossesPaddleTop =
    previousBall.velocityY > 0 &&
    previousBall.y + previousBall.radius <= movedGame.paddle.y &&
    ball.y + ball.radius >= movedGame.paddle.y;
  const overlapsPaddle =
    ball.x + ball.radius >= movedGame.paddle.x &&
    ball.x - ball.radius <= movedGame.paddle.x + movedGame.paddle.width;

  if (crossesPaddleTop && overlapsPaddle) {
    const hitPosition =
      (ball.x - (movedGame.paddle.x + movedGame.paddle.width / 2)) /
      (movedGame.paddle.width / 2);
    const speed = Math.hypot(ball.velocityX, ball.velocityY);

    // 水平方向を最大85%に抑え、返球が真横になってゲームが進まなくなるのを防ぎます。
    ball.velocityX = speed * clamp(hitPosition, -1, 1) * 0.85;
    ball.velocityY = -Math.sqrt(speed * speed - ball.velocityX * ball.velocityX);
    ball.y = movedGame.paddle.y - ball.radius;
  }

  let blocks = movedGame.blocks;
  let score = movedGame.score;

  for (let index = 0; index < movedGame.blocks.length; index += 1) {
    const block = movedGame.blocks[index];

    if (!block.active || !circleTouchesBlock(ball, block)) {
      continue;
    }

    const blockCenterX = block.x + block.width / 2;
    const blockCenterY = block.y + block.height / 2;
    const cameFromSide =
      previousBall.x + previousBall.radius <= block.x ||
      previousBall.x - previousBall.radius >= block.x + block.width;
    const cameFromTopOrBottom =
      previousBall.y + previousBall.radius <= block.y ||
      previousBall.y - previousBall.radius >= block.y + block.height;

    if (cameFromSide) {
      ball.velocityX = previousBall.x < blockCenterX
        ? -Math.abs(ball.velocityX)
        : Math.abs(ball.velocityX);
      ball.x = previousBall.x < blockCenterX
        ? block.x - ball.radius
        : block.x + block.width + ball.radius;
    } else if (cameFromTopOrBottom) {
      ball.velocityY = previousBall.y < blockCenterY
        ? -Math.abs(ball.velocityY)
        : Math.abs(ball.velocityY);
      ball.y = previousBall.y < blockCenterY
        ? block.y - ball.radius
        : block.y + block.height + ball.radius;
    } else {
      // 直前の中心位置で面を特定できない角接触では、浅い方の重なりを押し戻します。
      const overlapX = block.width / 2 + ball.radius - Math.abs(ball.x - blockCenterX);
      const overlapY = block.height / 2 + ball.radius - Math.abs(ball.y - blockCenterY);

      if (overlapX < overlapY) {
        ball.velocityX = previousBall.x < blockCenterX
          ? -Math.abs(ball.velocityX)
          : Math.abs(ball.velocityX);
        ball.x = previousBall.x < blockCenterX
          ? block.x - ball.radius
          : block.x + block.width + ball.radius;
      } else {
        ball.velocityY = previousBall.y < blockCenterY
          ? -Math.abs(ball.velocityY)
          : Math.abs(ball.velocityY);
        ball.y = previousBall.y < blockCenterY
          ? block.y - ball.radius
          : block.y + block.height + ball.radius;
      }
    }

    // 1刻みで消すブロックを1つに絞り、同じ接触で得点が重複しないようにします。
    blocks = movedGame.blocks.map((candidate, candidateIndex) =>
      candidateIndex === index ? { ...candidate, active: false } : candidate,
    );
    score += BLOCK_POINTS;
    break;
  }

  const nextGame = { ...movedGame, ball, blocks, score };

  if (blocks !== movedGame.blocks && blocks.every((block) => !block.active)) {
    // 最後のブロックを消した時点で停止し、終了後に追加得点されないようにします。
    return {
      ...nextGame,
      status: "won",
      ball: { ...ball, velocityX: 0, velocityY: 0 },
    };
  }

  if (ball.y - ball.radius > GAME_HEIGHT) {
    const lives = movedGame.lives - 1;
    const paddle = movedGame.paddle;
    const status = lives === 0 ? "lost" : "ready";

    // 残機があればボールをパドルへ戻し、最後の1機なら操作を終了します。
    return {
      ...nextGame,
      ball: createAttachedBall(paddle),
      lives,
      status,
    };
  }

  return nextGame;
}

/**
 * 経過時間を小さな固定刻みに分けて盤面を進めます。
 * 大きな時間差をそのまま使うとボールがブロックを飛び越えるため、刻み幅を抑えます。
 */
export function updateGame(game, direction, deltaSeconds) {
  if (
    !Number.isFinite(direction) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0 ||
    (game.status !== "ready" && game.status !== "playing")
  ) {
    return game;
  }

  const safeSeconds = Math.min(deltaSeconds, MAX_UPDATE_SECONDS);
  const stepCount = Math.ceil(safeSeconds / MAX_SIMULATION_STEP);
  const stepSeconds = safeSeconds / stepCount;
  const horizontalDirection = Math.sign(direction);
  let nextGame = game;

  for (let step = 0; step < stepCount; step += 1) {
    nextGame = stepGame(nextGame, horizontalDirection, stepSeconds);

    if (nextGame.status === "won" || nextGame.status === "lost") {
      break;
    }
  }

  return nextGame;
}

/**
 * 盤面と得点を初期化し、残機3つの発射待ちに戻します。
 * 前の状態を変更しないので、ゲーム終了後も同じ初期条件から再開できます。
 */
export function resetGame() {
  return createInitialGame();
}
