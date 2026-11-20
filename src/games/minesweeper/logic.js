// 盤面の大きさと地雷数を固定し、ルールと画面を別々に確認できるようにします。
export const BOARD_SIZE = 9;
export const MINE_COUNT = 10;
const SAFE_CELL_COUNT = BOARD_SIZE * BOARD_SIZE - MINE_COUNT;

// 8方向を同じ配列で扱うと、隣接数とFlood Fillの境界処理を揃えられます。
function getNeighbors(row, column) {
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (
        nextRow >= 0 &&
        nextRow < BOARD_SIZE &&
        nextColumn >= 0 &&
        nextColumn < BOARD_SIZE
      ) {
        neighbors.push([nextRow, nextColumn]);
      }
    }
  }
  return neighbors;
}

function isValidCell(row, column) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(column) &&
    row >= 0 &&
    row < BOARD_SIZE &&
    column >= 0 &&
    column < BOARD_SIZE
  );
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      hasMine: false,
      adjacentMines: 0,
      isRevealed: false,
      isFlagged: false,
    })),
  );
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** 指定したマスの周囲8マスにある地雷を数えます。 */
export function countAdjacentMines(board, row, column) {
  if (!isValidCell(row, column)) return 0;
  return getNeighbors(row, column).reduce(
    (count, [nextRow, nextColumn]) => count + Number(board[nextRow][nextColumn].hasMine),
    0,
  );
}

/** 開始前の盤面を作り、地雷は最初の操作時まで決めません。 */
export function createInitialGame() {
  return {
    board: createEmptyBoard(),
    initialized: false,
    status: "ready",
    revealedSafeCount: 0,
    flagCount: 0,
  };
}

function getRandomIndex(random, upperBound) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }
  return Math.floor(value * upperBound);
}

function createBoardForFirstReveal(currentBoard, firstRow, firstColumn, random) {
  const board = cloneBoard(currentBoard);
  const candidates = [];

  // 最初に開くマスを候補から外してから混ぜ、初手の地雷だけを確実に避けます。
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const cell = board[row][column];
      cell.hasMine = false;
      cell.adjacentMines = 0;
      cell.isRevealed = false;
      if (row !== firstRow || column !== firstColumn) {
        candidates.push([row, column]);
      }
    }
  }

  // Fisher–Yates法で候補を混ぜ、先頭から地雷数ぶんだけ配置します。
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(random, index + 1);
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  for (const [row, column] of candidates.slice(0, MINE_COUNT)) {
    board[row][column].hasMine = true;
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      board[row][column].adjacentMines = countAdjacentMines(board, row, column);
    }
  }
  return board;
}

function revealSafeRegion(board, startRow, startColumn) {
  const pending = [[startRow, startColumn]];
  const queued = new Set([startRow + "," + startColumn]);
  let revealedCount = 0;

  // 配列の先頭を読み進めるキューで、再帰の深さに頼らず空白領域を探索します。
  for (let index = 0; index < pending.length; index += 1) {
    const [row, column] = pending[index];
    const cell = board[row][column];
    if (cell.isRevealed || cell.isFlagged || cell.hasMine) continue;

    cell.isRevealed = true;
    revealedCount += 1;

    // 数字マスは境界として開くだけにし、隣のマスへ探索を広げません。
    if (cell.adjacentMines !== 0) continue;

    for (const [nextRow, nextColumn] of getNeighbors(row, column)) {
      const nextCell = board[nextRow][nextColumn];
      const key = nextRow + "," + nextColumn;
      if (nextCell.isRevealed || nextCell.isFlagged || nextCell.hasMine || queued.has(key)) {
        continue;
      }
      queued.add(key);
      pending.push([nextRow, nextColumn]);
    }
  }
  return revealedCount;
}

/** マスを開き、空白ならキューによる幅優先探索で接続する範囲を展開します。 */
export function revealCell(game, row, column, random = Math.random) {
  if (
    (game.status !== "ready" && game.status !== "playing") ||
    !isValidCell(row, column)
  ) {
    return game;
  }

  const existingCell = game.board[row][column];
  if (existingCell.isRevealed || existingCell.isFlagged) return game;

  const board = game.initialized
    ? cloneBoard(game.board)
    : createBoardForFirstReveal(game.board, row, column, random);
  const target = board[row][column];

  if (target.hasMine) {
    target.isRevealed = true;
    return { ...game, board, initialized: true, status: "lost" };
  }

  const newlyRevealed = revealSafeRegion(board, row, column);
  const revealedSafeCount = game.revealedSafeCount + newlyRevealed;
  return {
    ...game,
    board,
    initialized: true,
    revealedSafeCount,
    status: revealedSafeCount === SAFE_CELL_COUNT ? "won" : "playing",
  };
}

/** 旗は閉じたマスにだけ付けられ、旗モードでは地雷を開かないようにします。 */
export function toggleFlag(game, row, column) {
  if (
    (game.status !== "ready" && game.status !== "playing") ||
    !isValidCell(row, column) ||
    game.board[row][column].isRevealed
  ) {
    return game;
  }

  const board = cloneBoard(game.board);
  board[row][column].isFlagged = !board[row][column].isFlagged;
  const flagCount = board.flat().filter((cell) => cell.isFlagged).length;
  return {
    ...game,
    board,
    flagCount,
    status: game.initialized ? "playing" : "ready",
  };
}
