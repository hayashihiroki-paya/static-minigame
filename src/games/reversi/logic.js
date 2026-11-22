// 盤面と探索をDOMから分け、同じルールをテストと画面の両方で使います。
export const BOARD_SIZE = 8;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = -1;

// 4手先まで見ることで、相手と自分の応手を2回ずつ比較します。
export const AI_SEARCH_DEPTH = 4;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];
const CORNER_CELLS = [0, BOARD_SIZE - 1, CELL_COUNT - BOARD_SIZE, CELL_COUNT - 1];
const CORNER_WEIGHT = 30;
const MOBILITY_WEIGHT = 5;
const DISC_WEIGHT = 1;
const TERMINAL_SCORE = 10_000;

/** 標準の初期配置を、0=空き・1=黒・-1=白の一次元配列で作ります。 */
export function createInitialBoard() {
  const board = Array(CELL_COUNT).fill(EMPTY);
  board[27] = BLACK;
  board[28] = WHITE;
  board[35] = WHITE;
  board[36] = BLACK;
  return board;
}

function assertBoard(board) {
  if (
    !Array.isArray(board) ||
    board.length !== CELL_COUNT ||
    board.some((cell) => cell !== EMPTY && cell !== BLACK && cell !== WHITE)
  ) {
    throw new RangeError("盤面は空き・黒・白の64マスで指定してください。");
  }
}

function assertPlayer(player) {
  if (player !== BLACK && player !== WHITE) {
    throw new RangeError("手番は黒または白で指定してください。");
  }
}

/** 指定したマスに置いたとき、挟んで裏返せる相手のマス番号を集めます。 */
export function getFlippedCells(board, index, player) {
  assertBoard(board);
  assertPlayer(player);
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT || board[index] !== EMPTY) {
    return [];
  }

  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const flips = [];

  for (const [rowStep, columnStep] of DIRECTIONS) {
    const line = [];
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;

    while (
      nextRow >= 0 && nextRow < BOARD_SIZE &&
      nextColumn >= 0 && nextColumn < BOARD_SIZE
    ) {
      const nextIndex = nextRow * BOARD_SIZE + nextColumn;
      if (board[nextIndex] === -player) {
        line.push(nextIndex);
      } else {
        // 相手石が1個以上続いたあと、自分の石に届いた線だけが有効です。
        if (board[nextIndex] === player && line.length > 0) flips.push(...line);
        break;
      }
      nextRow += rowStep;
      nextColumn += columnStep;
    }
  }

  return flips;
}

/** 盤面を左上から調べ、指定プレイヤーの合法手をマス番号で返します。 */
export function getLegalMoves(board, player) {
  assertBoard(board);
  assertPlayer(player);
  const moves = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] === EMPTY && getFlippedCells(board, index, player).length > 0) {
      moves.push(index);
    }
  }
  return moves;
}

/** 合法手だけを適用し、元の盤面を変更せず新しい盤面を返します。 */
export function applyMove(board, index, player) {
  const flips = getFlippedCells(board, index, player);
  if (flips.length === 0) return null;

  const nextBoard = [...board];
  nextBoard[index] = player;
  for (const flippedIndex of flips) nextBoard[flippedIndex] = player;
  return nextBoard;
}

/** 1手のあとにパスが必要か、対局が終わったかを決めます。 */
export function resolveTurnAfterMove(board, justPlayed) {
  assertBoard(board);
  assertPlayer(justPlayed);
  const opponent = -justPlayed;
  if (getLegalMoves(board, opponent).length > 0) {
    return { currentPlayer: opponent, passedPlayer: null, isGameOver: false };
  }
  if (getLegalMoves(board, justPlayed).length > 0) {
    return { currentPlayer: justPlayed, passedPlayer: opponent, isGameOver: false };
  }
  return { currentPlayer: null, passedPlayer: null, isGameOver: true };
}

/** 盤面と手番をまとめた、画面から独立したゲーム状態を作ります。 */
export function createGameState() {
  return {
    board: createInitialBoard(),
    currentPlayer: BLACK,
    passedPlayer: null,
    isGameOver: false,
  };
}

/** 人またはAIの手を適用し、パス・終局も含む次の状態を返します。 */
export function playMove(state, index) {
  if (!state || state.isGameOver || state.currentPlayer === null) return state;
  const nextBoard = applyMove(state.board, index, state.currentPlayer);
  if (!nextBoard) return state;

  return {
    board: nextBoard,
    ...resolveTurnAfterMove(nextBoard, state.currentPlayer),
  };
}

/** 石数を数えます。空きマスはどちらにも加えません。 */
export function countDiscs(board) {
  assertBoard(board);
  return board.reduce(
    (counts, cell) => {
      if (cell === BLACK) counts.black += 1;
      if (cell === WHITE) counts.white += 1;
      return counts;
    },
    { black: 0, white: 0 },
  );
}

/** 両者に合法手がない盤面の勝者と石数を返し、対局中ならnullを返します。 */
export function getGameResult(board) {
  assertBoard(board);
  if (getLegalMoves(board, BLACK).length > 0 || getLegalMoves(board, WHITE).length > 0) {
    return null;
  }

  const discs = countDiscs(board);
  return {
    ...discs,
    winner: discs.black === discs.white ? null : discs.black > discs.white ? BLACK : WHITE,
  };
}

/** 指定プレイヤーから見た盤面の良さを、石数・角・合法手数で評価します。 */
export function evaluateBoard(board, player) {
  assertBoard(board);
  assertPlayer(player);

  const result = getGameResult(board);
  const counts = countDiscs(board);
  const discDifference = player === BLACK
    ? counts.black - counts.white
    : counts.white - counts.black;

  // 終局では通常の位置評価より勝敗を優先し、勝ち筋を探索しやすくします。
  if (result) {
    if (result.winner === null) return 0;
    return result.winner === player
      ? TERMINAL_SCORE + discDifference * 100
      : -TERMINAL_SCORE + discDifference * 100;
  }

  const cornerDifference = CORNER_CELLS.reduce((difference, index) => {
    if (board[index] === player) return difference + 1;
    if (board[index] === -player) return difference - 1;
    return difference;
  }, 0);
  const mobilityDifference =
    getLegalMoves(board, player).length - getLegalMoves(board, -player).length;

  return (
    discDifference * DISC_WEIGHT +
    cornerDifference * CORNER_WEIGHT +
    mobilityDifference * MOBILITY_WEIGHT
  );
}

/** 角を先に調べるとαβ枝刈りが働きやすくなり、同点時は順序が一定です。 */
function orderMoves(moves) {
  return [...moves].sort((left, right) => {
    const leftIsCorner = CORNER_CELLS.includes(left) ? 1 : 0;
    const rightIsCorner = CORNER_CELLS.includes(right) ? 1 : 0;
    return rightIsCorner - leftIsCorner || left - right;
  });
}

function minimax(board, currentPlayer, rootPlayer, depth, alpha, beta, stats) {
  stats.nodesVisited += 1;
  const terminal = getGameResult(board);
  if (terminal || depth === 0) {
    return evaluateBoard(board, rootPlayer);
  }

  const moves = getLegalMoves(board, currentPlayer);
  if (moves.length === 0) {
    // パスは盤面を変えないので、探索深さを消費せずに相手の手番へ進みます。
    return minimax(board, -currentPlayer, rootPlayer, depth, alpha, beta, stats);
  }

  const maximizing = currentPlayer === rootPlayer;
  let bestScore = maximizing ? -Infinity : Infinity;
  for (const move of orderMoves(moves)) {
    const nextBoard = applyMove(board, move, currentPlayer);
    const score = minimax(nextBoard, -currentPlayer, rootPlayer, depth - 1, alpha, beta, stats);
    if (maximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, bestScore);
    }
    if (alpha >= beta) break;
  }
  return bestScore;
}

/** 深さ制限付きミニマックス法とαβ枝刈りで、決定的な最善手を選びます。 */
export function chooseBestMove(board, player, depth = AI_SEARCH_DEPTH) {
  assertBoard(board);
  assertPlayer(player);
  if (!Number.isInteger(depth) || depth < 1) {
    throw new RangeError("探索深さは1以上の整数で指定してください。");
  }

  const moves = orderMoves(getLegalMoves(board, player));
  if (moves.length === 0) return { move: null, score: null, nodesVisited: 0 };

  const stats = { nodesVisited: 0 };
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const move of moves) {
    const nextBoard = applyMove(board, move, player);
    const score = minimax(nextBoard, -player, player, depth - 1, alpha, Infinity, stats);
    // 同点では更新しないため、固定された探索順の先頭を必ず選びます。
    if (score > bestScore) {
      bestMove = move;
      bestScore = score;
    }
    alpha = Math.max(alpha, bestScore);
  }

  return { move: bestMove, score: bestScore, nodesVisited: stats.nodesVisited };
}
