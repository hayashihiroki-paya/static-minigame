/**
 * 画面表示から独立して、マインスイーパーの盤面と状態遷移だけを扱うモジュールです。
 * 行・列は0始まりで、盤面の各セルは地雷・隣接数・開閉・旗の状態を持ちます。
 * 乱数を引数で受け取り、テストで同じ盤面を再現できる形にしています。
 */
// 盤面の大きさと地雷数を固定し、ルールと画面を別々に確認できるようにします。
export const BOARD_SIZE = 9;
export const MINE_COUNT = 10;
const SAFE_CELL_COUNT = BOARD_SIZE * BOARD_SIZE - MINE_COUNT;

// 8方向を同じ配列で扱うと、隣接数とFlood Fillの境界処理を揃えられます。
/**
 * セル座標を受け取り、盤面内にある上下左右と斜めの隣接座標を返します。
 * 境界で範囲外の座標を除くため、角や辺から盤面外へ探索が広がりません。
 * @param {number} row 0から始まる行番号
 * @param {number} column 0から始まる列番号
 * @returns {Array<[number, number]>} 盤面内の隣接座標
 */
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

/**
 * 行・列が整数かつ9×9盤面内にあるかを調べます。
 * 隣接数やプレイヤー操作の入口で呼び、範囲外の配列参照を防ぎます。
 */
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

/**
 * 地雷を置く前の盤面を作ります。
 * 各セルを別オブジェクトにして、旗や開閉状態がマスごとに独立するようにします。
 */
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

/**
 * 盤面の行とセルを複製し、状態遷移の前後で元のゲーム状態を変更しません。
 * @param {Array<Array<object>>} board 現在の盤面
 * @returns {Array<Array<object>>} セル状態を複製した盤面
 */
function cloneBoard(board) {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * 指定したマスの周囲8マスにある地雷を数えます。
 * @param {Array<Array<object>>} board 地雷配置済みの盤面
 * @param {number} row 調べる行番号
 * @param {number} column 調べる列番号
 * @returns {number} 隣接する地雷数。無効な座標では0
 */

export function countAdjacentMines(board, row, column) {
  if (!isValidCell(row, column)) return 0;
  return getNeighbors(row, column).reduce(
    (count, [nextRow, nextColumn]) => count + Number(board[nextRow][nextColumn].hasMine),
    0,
  );
}

/**
 * 開始前のゲーム状態を返します。地雷を遅延配置することで、初手の安全を保証できます。
 * @returns {{board: Array<Array<object>>, initialized: boolean, status: string, revealedSafeCount: number, flagCount: number}}
 */

export function createInitialGame() {
  return {
    board: createEmptyBoard(),
    initialized: false,
    status: "ready",
    revealedSafeCount: 0,
    flagCount: 0,
  };
}

/**
 * 0以上1未満の乱数を、0以上upperBound未満の整数へ変換します。
 * 乱数の契約違反は範囲エラーにして、不正な盤面ができたまま進行しないようにします。
 */
function getRandomIndex(random, upperBound) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }
  return Math.floor(value * upperBound);
}

/**
 * 初手のセルを除いて地雷候補を作り、Fisher–Yates法で並べ替えて盤面を初期化します。
 * 旗はプレイヤーが先に付けた可能性があるため残し、地雷と隣接数だけを再計算します。
 * @param {Array<Array<object>>} currentBoard 地雷未配置の盤面
 * @param {number} firstRow 最初に開く行
 * @param {number} firstColumn 最初に開く列
 * @param {() => number} random 0以上1未満を返す乱数関数
 * @returns {Array<Array<object>>} 初手の安全が保証された盤面
 */
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

/**
 * 空白セルから幅優先探索し、連続する空白とその境界の数字セルを開きます。
 * @param {Array<Array<object>>} board 更新対象の複製盤面
 * @param {number} startRow 開始セルの行
 * @param {number} startColumn 開始セルの列
 * @returns {number} 今回新しく開いた安全セルの数
 */
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

/**
 * 指定マスを開く純粋な状態遷移を行います。
 * 最初の操作では乱数で盤面を作り、地雷なら敗北、空白ならFlood Fill、最後の安全マスなら勝利です。
 * @param {object} game 現在のゲーム状態
 * @param {number} row 開く行
 * @param {number} column 開く列
 * @param {() => number} random 地雷配置用の乱数関数
 * @returns {object} 新しいゲーム状態。無効・完了済みの入力では元の状態
 */

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

/**
 * 閉じたセルの旗を付け外しします。
 * 開いたセル、盤面外、ゲーム終了後の入力は状態を変えず、変更時は旗数を再計算します。
 * @param {object} game 現在のゲーム状態
 * @param {number} row 旗を切り替える行
 * @param {number} column 旗を切り替える列
 * @returns {object} 旗数を含む新しい状態、または変更のない元の状態
 */

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
