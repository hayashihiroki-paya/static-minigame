// 盤面の大きさと移動間隔を画面側と共有し、ルールの値を一か所にまとめます。
export const GRID_SIZE = 15;
export const MOVE_INTERVAL_MS = 160;

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const OPPOSITE_DIRECTIONS = {
  up: "down",
  right: "left",
  down: "up",
  left: "right",
};

/**
 * 空いているマスから食べ物を選びます。乱数を引数で受け取り、テストで位置を固定します。
 */
function createFood(snake, random) {
  const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`));
  const available = [];

  // 盤面を上から順に調べるため、同じ乱数なら同じ位置に食べ物が出ます。
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return null;
  }

  const randomValue = random();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }

  return available[Math.floor(randomValue * available.length)];
}

/** 新しいゲームの初期状態を作り、盤面の真ん中から右へ進めます。 */
export function createInitialGame(random = Math.random) {
  const snake = [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ];

  return {
    snake,
    direction: "right",
    nextDirection: null,
    food: createFood(snake, random),
    score: 0,
    status: "ready",
  };
}

/** 開始ボタンから呼び、準備中だけをプレイ中へ進めます。 */
export function startGame(game) {
  if (game.status !== "ready") {
    return game;
  }

  return { ...game, status: "playing" };
}

/**
 * 次の移動方向を予約します。1マスの移動途中に真後ろへ折り返せないようにします。
 */
export function changeDirection(game, direction) {
  if (game.status !== "ready" && game.status !== "playing") {
    return game;
  }

  if (!Object.hasOwn(DIRECTIONS, direction)) {
    return game;
  }

  const currentDirection = game.nextDirection ?? game.direction;
  if (OPPOSITE_DIRECTIONS[currentDirection] === direction) {
    return game;
  }

  return { ...game, nextDirection: direction };
}

/**
 * タイマー1回分だけ蛇を進めます。壁・自分との衝突、成長、盤面クリアをここで判定します。
 */
export function advanceGame(game, random = Math.random) {
  if (game.status !== "playing") {
    return game;
  }

  const direction = game.nextDirection ?? game.direction;
  const vector = DIRECTIONS[direction];
  const head = game.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
  const outsideBoard =
    nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE;

  if (outsideBoard) {
    return { ...game, direction, nextDirection: null, status: "lost" };
  }

  const eating = game.food?.x === nextHead.x && game.food?.y === nextHead.y;
  // 食べ物を取らない移動では尾が同時に離れるため、その尾のマスには進入できます。
  const bodyToCheck = eating ? game.snake : game.snake.slice(0, -1);
  const hitsBody = bodyToCheck.some(({ x, y }) => x === nextHead.x && y === nextHead.y);

  if (hitsBody) {
    return { ...game, direction, nextDirection: null, status: "lost" };
  }

  const snake = [nextHead, ...game.snake.slice(0, eating ? undefined : -1)];
  const food = eating ? createFood(snake, random) : game.food;

  return {
    snake,
    direction,
    nextDirection: null,
    food,
    score: game.score + (eating ? 1 : 0),
    status: eating && food === null ? "won" : "playing",
  };
}

/** 終了状態も含めて、同じ初期状態を作るリセット用の関数です。 */
export function resetGame(random = Math.random) {
  return createInitialGame(random);
}
