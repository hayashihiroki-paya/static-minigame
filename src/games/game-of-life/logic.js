// 盤面のルールだけを扱い、描画やタイマーから独立して世代を計算します。
export const BOARD_SIZE = 20;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const DEAD = false;
export const ALIVE = true;

/** 20×20の空盤面を、生死のboolean値で作ります。 */
export function createEmptyBoard() {
  return Array(CELL_COUNT).fill(DEAD);
}

function assertBoard(board) {
  if (
    !Array.isArray(board) ||
    board.length !== CELL_COUNT ||
    board.some((cell) => cell !== DEAD && cell !== ALIVE)
  ) {
    throw new RangeError("盤面は生死を表すboolean値が400個必要です。");
  }
}

function assertIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
    throw new RangeError("セルの位置は0から399までの整数で指定してください。");
  }
}

function countNeighborsUnchecked(board, index) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  let count = 0;
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;

      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;
      // 有限盤面の外側にはセルがないため、反対側から回り込ませません。
      if (
        neighborRow < 0 || neighborRow >= BOARD_SIZE ||
        neighborColumn < 0 || neighborColumn >= BOARD_SIZE
      ) {
        continue;
      }
      const neighborIndex = neighborRow * BOARD_SIZE + neighborColumn;
      if (board[neighborIndex] === ALIVE) count += 1;
    }
  }
  return count;
}

/** 現在の盤面を変更せず、指定セルのまわりにある生存セルを数えます。 */
export function countLiveNeighbors(board, index) {
  assertBoard(board);
  assertIndex(index);
  return countNeighborsUnchecked(board, index);
}

/** セルを切り替えた新しい盤面を返し、元の配列はそのまま保ちます。 */
export function toggleCell(board, index) {
  assertBoard(board);
  assertIndex(index);
  const nextBoard = [...board];
  nextBoard[index] = !nextBoard[index];
  return nextBoard;
}

/** 生存セルの総数を数えます。 */
export function countLiveCells(board) {
  assertBoard(board);
  return board.reduce((count, cell) => count + Number(cell === ALIVE), 0);
}

/**
 * B3/S23規則で次世代を作ります。
 * 全セルを現在の盤面から読み、新しい配列へ書くことで更新順の影響を防ぎます。
 */
export function nextGeneration(board) {
  assertBoard(board);
  const nextBoard = Array(CELL_COUNT).fill(DEAD);

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const neighbors = countNeighborsUnchecked(board, index);
    if (board[index] === ALIVE) {
      nextBoard[index] = neighbors === 2 || neighbors === 3;
    } else {
      nextBoard[index] = neighbors === 3;
    }
  }

  return nextBoard;
}
