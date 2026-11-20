/**
 * ライツアウトの盤面ルールとゲーム状態を画面表示から分けます。
 * 配列を直接変更せず新しい状態を返すため、Node.jsで各操作を再現して確認できます。
 */
export const BOARD_WIDTH = 5;
export const CELL_COUNT = BOARD_WIDTH * BOARD_WIDTH;

/**
 * 消灯状態からこの手順で初期盤面を作ります。
 * ライツアウトの反転操作は自分自身が逆操作になるため、同じ手順で必ず解けます。
 */
export const RESET_SEQUENCE: readonly number[] = Object.freeze([
  0, 2, 6, 12, 18, 22, 24, 10,
]);

export type Board = readonly boolean[];
export type GameStatus = "playing" | "cleared";

export interface GameState {
  board: Board;
  status: GameStatus;
}

/**
 * 指定したマスと盤面内の上下左右だけを反転して、新しい盤面を返します。
 * 行と列を別々に調べることで、端から反対側へ回り込む誤りを避けます。
 */
export function toggleCross(board: Board, cellIndex: number): boolean[] {
  if (board.length !== CELL_COUNT) {
    throw new RangeError(`盤面は${CELL_COUNT}マスである必要があります。`);
  }

  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= CELL_COUNT) {
    throw new RangeError("選択位置は0から24の整数である必要があります。");
  }

  const row = Math.floor(cellIndex / BOARD_WIDTH);
  const column = cellIndex % BOARD_WIDTH;
  const affectedCells = [cellIndex];

  if (row > 0) affectedCells.push(cellIndex - BOARD_WIDTH);
  if (row < BOARD_WIDTH - 1) affectedCells.push(cellIndex + BOARD_WIDTH);
  if (column > 0) affectedCells.push(cellIndex - 1);
  if (column < BOARD_WIDTH - 1) affectedCells.push(cellIndex + 1);

  const nextBoard = [...board];
  for (const affectedCell of affectedCells) {
    nextBoard[affectedCell] = !nextBoard[affectedCell];
  }

  return nextBoard;
}

/**
 * 消灯状態から解法手順を適用して、毎回同じ解ける初期盤面を作ります。
 * 初期盤面を固定すると、リセット後もプレイヤーが同じ条件で遊び直せます。
 */
export function createInitialBoard(): boolean[] {
  let board: boolean[] = Array(CELL_COUNT).fill(false);

  for (const cellIndex of RESET_SEQUENCE) {
    board = toggleCross(board, cellIndex);
  }

  return board;
}

/**
 * ゲーム開始時の盤面と状態を作ります。
 * 初期盤面は必ず点灯マスを含み、クリア状態から始まらないようにします。
 */
export function createGame(): GameState {
  return { board: createInitialBoard(), status: "playing" };
}

/**
 * 1マスを選んだ状態を進め、すべて消灯したらクリアとして固定します。
 * 無効な選択やクリア後の選択は元の状態を返し、盤面を変えません。
 */
export function pressCell(game: GameState, cellIndex: number): GameState {
  const isValidCell =
    Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < CELL_COUNT;

  if (game.status !== "playing" || !isValidCell) {
    return game;
  }

  const board = toggleCross(game.board, cellIndex);
  const status: GameStatus = board.every((isLit) => !isLit) ? "cleared" : "playing";

  return { board, status };
}

/**
 * リセットで固定の初期盤面を新しく作り、クリア状態も解除します。
 * 新しい配列を使うため、画面側に残った前の状態を誤って再利用しません。
 */
export function resetGame(): GameState {
  return createGame();
}
