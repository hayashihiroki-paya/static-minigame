/**
 * 迷路生成とプレイヤー移動のルールを画面表示から分けます。
 * 生成には反復型の深さ優先探索を使い、乱数を外から渡して結果をテスト可能にします。
 */
export const MAZE_SIZE = 11;

// 探索順を固定しておくと、同じ乱数列から同じ迷路を再現できます。
const DIRECTIONS = [
  { name: "up", rowChange: -1, columnChange: 0, opposite: "down" },
  { name: "right", rowChange: 0, columnChange: 1, opposite: "left" },
  { name: "down", rowChange: 1, columnChange: 0, opposite: "up" },
  { name: "left", rowChange: 0, columnChange: -1, opposite: "right" },
];

const DIRECTION_BY_NAME = new Map(DIRECTIONS.map((direction) => [direction.name, direction]));

/**
 * すべての方向に壁を持つ部屋を作ります。
 * 迷路を生成するときに、通路になった方向だけ両側の壁を開きます。
 * @returns {{up: boolean, right: boolean, down: boolean, left: boolean}} 初期壁
 */
function createClosedWalls() {
  return {
    up: true,
    right: true,
    down: true,
    left: true,
  };
}

/**
 * 迷路の範囲内にある座標かを調べます。
 * @param {number} row 行番号
 * @param {number} column 列番号
 * @returns {boolean} 盤面内ならtrue
 */
function isInsideMaze(row, column) {
  return row >= 0 && row < MAZE_SIZE && column >= 0 && column < MAZE_SIZE;
}

/**
 * 乱数の契約を確認して、候補配列の添字に変換します。
 * @param {() => number} random 0以上1未満を返す乱数関数
 * @param {number} length 候補数
 * @returns {number} 候補の添字
 * @throws {RangeError} 乱数関数が0以上1未満を返さない場合
 */
function chooseRandomIndex(random, length) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }

  return Math.floor(value * length);
}

/**
 * 深さ優先探索で、11×11の部屋をすべてつなぐ迷路を生成します。
 * 未訪問の隣室があれば壁を開けて奥へ進み、行き止まりではスタックから戻ります。
 * 再帰を使わないため、盤面を大きくしても呼び出しスタックを使い切りません。
 * @param {() => number} [random] 0以上1未満を返す乱数関数
 * @returns {Array<Array<{walls: {up: boolean, right: boolean, down: boolean, left: boolean}}>>} 部屋と壁の一覧
 */
export function createMaze(random = Math.random) {
  const maze = Array.from({ length: MAZE_SIZE }, () =>
    Array.from({ length: MAZE_SIZE }, () => ({ walls: createClosedWalls() })),
  );
  const visited = Array.from({ length: MAZE_SIZE }, () => Array(MAZE_SIZE).fill(false));
  const pathStack = [{ row: 0, column: 0 }];
  visited[0][0] = true;

  while (pathStack.length > 0) {
    const current = pathStack[pathStack.length - 1];
    const availableNeighbors = [];

    // 現在の部屋から一歩で行ける、まだ訪問していない部屋だけを候補にします。
    for (const direction of DIRECTIONS) {
      const row = current.row + direction.rowChange;
      const column = current.column + direction.columnChange;
      if (isInsideMaze(row, column) && !visited[row][column]) {
        availableNeighbors.push({ row, column, direction });
      }
    }

    if (availableNeighbors.length === 0) {
      // 行き止まりなら直前の分岐地点へ戻り、別の未訪問方向を探します。
      pathStack.pop();
      continue;
    }

    const next = availableNeighbors[chooseRandomIndex(random, availableNeighbors.length)];
    maze[current.row][current.column].walls[next.direction.name] = false;
    maze[next.row][next.column].walls[next.direction.opposite] = false;
    visited[next.row][next.column] = true;
    pathStack.push({ row: next.row, column: next.column });
  }

  return maze;
}

/**
 * 新しい迷路とスタート位置を含むゲーム状態を作ります。
 * @param {() => number} [random] 迷路生成に使う乱数関数
 * @returns {{maze: Array<Array<{walls: object}>>, player: {row: number, column: number}, moves: number, isWon: boolean}} 初期状態
 */
export function createInitialGame(random = Math.random) {
  return {
    maze: createMaze(random),
    player: { row: 0, column: 0 },
    moves: 0,
    isWon: false,
  };
}

/**
 * 壁と盤面の境界を確認して、プレイヤーを一部屋だけ移動させます。
 * 状態を直接書き換えないため、前の状態を残したまま次の状態と比較できます。
 * @param {{maze: Array<Array<{walls: object}>>, player: {row: number, column: number}, moves: number, isWon: boolean}} game 現在の状態
 * @param {string} directionName 移動方向
 * @returns {object} 移動後の状態。移動できない場合は元の状態
 */
export function movePlayer(game, directionName) {
  const direction = DIRECTION_BY_NAME.get(directionName);
  if (!direction || game.isWon) return game;

  const nextRow = game.player.row + direction.rowChange;
  const nextColumn = game.player.column + direction.columnChange;
  if (
    !isInsideMaze(nextRow, nextColumn) ||
    game.maze[game.player.row][game.player.column].walls[direction.name]
  ) {
    return game;
  }

  const isGoal = nextRow === MAZE_SIZE - 1 && nextColumn === MAZE_SIZE - 1;
  return {
    ...game,
    player: { row: nextRow, column: nextColumn },
    moves: game.moves + 1,
    isWon: isGoal,
  };
}
