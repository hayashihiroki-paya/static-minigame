/**
 * マルバツゲームの勝敗ルールと盤面状態を画面表示から分けます。
 * ここではDOMを使わず、新しい状態を返すためNode.jsだけでルールを確認できます。
 */
export const MARKS = Object.freeze({ FIRST: "×", SECOND: "○" });
export const BOARD_CELL_COUNT = 9;

/**
 * 横3列、縦3列、斜め2列の勝ち筋を盤面の位置番号で表します。
 * 位置番号は左上から右へ0〜2、次の行が3〜5、最後の行が6〜8です。
 */
export const WINNING_LINES = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([3, 4, 5]),
  Object.freeze([6, 7, 8]),
  Object.freeze([0, 3, 6]),
  Object.freeze([1, 4, 7]),
  Object.freeze([2, 5, 8]),
  Object.freeze([0, 4, 8]),
  Object.freeze([2, 4, 6]),
]);

/**
 * 盤面と手番を初期状態にします。
 * resultは進行中・勝利・引き分けを区別し、winnerとwinningLineは結果表示に使います。
 */
export function createInitialGame() {
  return {
    board: Array(BOARD_CELL_COUNT).fill(null),
    currentMark: MARKS.FIRST,
    result: "playing",
    winner: null,
    winningLine: null,
  };
}

/**
 * 指定した記号が勝ち筋を完成させている場合、その位置番号を返します。
 * 1本も完成していなければnullを返し、盤面の走査を一か所にまとめます。
 */
export function findWinningLine(board, mark) {
  return (
    WINNING_LINES.find((line) => line.every((cellIndex) => board[cellIndex] === mark)) ?? null
  );
}

/**
 * 空いているマスに現在の記号を置き、勝利・引き分け・次の手番を計算します。
 * 使用済みのマス、無効な位置、ゲーム終了後の操作は状態を変えずに無視します。
 */
export function playMove(game, cellIndex) {
  const isValidCell =
    Number.isInteger(cellIndex) &&
    cellIndex >= 0 &&
    cellIndex < BOARD_CELL_COUNT &&
    game.board[cellIndex] === null;

  if (game.result !== "playing" || !isValidCell) {
    return game;
  }

  const board = [...game.board];
  board[cellIndex] = game.currentMark;

  const winningLine = findWinningLine(board, game.currentMark);

  if (winningLine !== null) {
    // 勝者が決まったら次の手番へ進めず、完成した3マスを画面で強調できるよう保存します。
    return {
      ...game,
      board,
      result: "won",
      winner: game.currentMark,
      winningLine,
    };
  }

  if (board.every((mark) => mark !== null)) {
    // 9マスが埋まっても勝ち筋がなければ、勝者のない終了状態にします。
    return { ...game, board, result: "draw" };
  }

  const nextMark = game.currentMark === MARKS.FIRST ? MARKS.SECOND : MARKS.FIRST;
  return { ...game, board, currentMark: nextMark };
}

/**
 * リセットでは盤面・結果・手番をすべて初期化し、先手を毎回「×」に戻します。
 * 新しいオブジェクトを返すので、リセット前の状態を参照しているテストにも影響しません。
 */
export function resetGame() {
  return createInitialGame();
}
