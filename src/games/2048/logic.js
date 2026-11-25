/**
 * 2048の盤面、移動、合成、得点、終了判定を画面表示から分けて扱います。
 * 盤面は4行×4列の数値配列で、0は空きマス、正の数はタイルの値です。
 * 乱数を引数で受け取るため、開始盤面と移動後のタイルをテストで再現できます。
 */
export const BOARD_SIZE = 4;
export const TARGET_TILE = 2048;
const DIRECTIONS = ["up", "down", "left", "right"];

/**
 * 0だけを持つ新しい4×4盤面を作ります。
 * 行ごとに別配列を作ることで、一行の更新がほかの行へ影響しないようにします。
 * @returns {number[][]} 空の盤面
 */
function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
}

/**
 * 盤面の外側の配列と各行を複製します。
 * 状態遷移前の盤面を変更せず、新旧の状態を比べられるようにします。
 * @param {number[][]} board 複製元の盤面
 * @returns {number[][]} 独立した盤面
 */
function cloneBoard(board) {
  return board.map((row) => row.slice());
}

/**
 * 乱数の契約を確認し、0以上1未満の値を返します。
 * @param {() => number} random 乱数を返す関数
 * @returns {number} 0以上1未満の値
 * @throws {RangeError} 乱数が0以上1未満でない場合
 */
function getRandomValue(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }
  return value;
}

/**
 * 空きマスをひとつ選び、2または4のタイルを置いた盤面を返します。
 * 先に位置と値を別々に抽選し、乱数を固定したテストで両方を制御できます。
 * @param {number[][]} board 現在の盤面
 * @param {() => number} random 0以上1未満を返す乱数関数
 * @returns {number[][]} タイルを追加した盤面。空きがなければ元の盤面
 */
function addRandomTile(board, random) {
  const emptyCells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      if (board[row][column] === 0) {
        emptyCells.push([row, column]);
      }
    }
  }

  if (emptyCells.length === 0) return board;

  const selectedIndex = Math.floor(getRandomValue(random) * emptyCells.length);
  const [selectedRow, selectedColumn] = emptyCells[selectedIndex];
  const tileValue = getRandomValue(random) < 0.9 ? 2 : 4;
  const nextBoard = cloneBoard(board);
  nextBoard[selectedRow][selectedColumn] = tileValue;
  return nextBoard;
}

/**
 * 新しいゲームを作り、空きマスを選んでタイルを2つ置きます。
 * @param {() => number} random 0以上1未満を返す乱数関数
 * @returns {{board: number[][], score: number, hasWon: boolean, isGameOver: boolean}} 初期状態
 */
export function createInitialGame(random = Math.random) {
  const emptyBoard = createEmptyBoard();
  const boardWithFirstTile = addRandomTile(emptyBoard, random);
  const board = addRandomTile(boardWithFirstTile, random);
  return {
    board,
    score: 0,
    hasWon: false,
    isGameOver: false,
  };
}

/**
 * 指定した行または列を移動方向の先頭から読む座標列にします。
 * 先頭側から圧縮して合成すれば、4方向の処理を同じ関数で行えます。
 * @param {"up"|"down"|"left"|"right"} direction 移動方向
 * @param {number} lineIndex 対象行または列
 * @returns {Array<[number, number]>} 移動方向の先頭から並んだ座標
 */
function getLineCoordinates(direction, lineIndex) {
  if (direction === "left") {
    return Array.from({ length: BOARD_SIZE }, (_, column) => [lineIndex, column]);
  }
  if (direction === "right") {
    return Array.from({ length: BOARD_SIZE }, (_, offset) => [
      lineIndex,
      BOARD_SIZE - 1 - offset,
    ]);
  }
  if (direction === "up") {
    return Array.from({ length: BOARD_SIZE }, (_, row) => [row, lineIndex]);
  }
  return Array.from({ length: BOARD_SIZE }, (_, offset) => [
    BOARD_SIZE - 1 - offset,
    lineIndex,
  ]);
}

/**
 * 1行分の0を詰め、隣り合う同じ値を先頭側から一度だけ合成します。
 * 合成した値は次の比較へ再投入しないため、同じ手で二度合成されません。
 * @param {number[]} values 移動方向の先頭から並んだ4マス
 * @returns {{tiles: number[], scoreGain: number}} 更新後の行と今回の得点
 */
function compressAndMergeLine(values) {
  const compacted = values.filter((value) => value !== 0);
  const mergedValues = [];
  let scoreGain = 0;

  for (let index = 0; index < compacted.length; index += 1) {
    const currentValue = compacted[index];
    const nextValue = compacted[index + 1];

    if (currentValue === nextValue) {
      const mergedValue = currentValue * 2;
      mergedValues.push(mergedValue);
      scoreGain += mergedValue;
      index += 1;
    } else {
      mergedValues.push(currentValue);
    }
  }

  while (mergedValues.length < BOARD_SIZE) {
    mergedValues.push(0);
  }

  return { tiles: mergedValues, scoreGain };
}

/**
 * 盤面を指定方向へ移動し、合成による得点を返します。
 * ここでは新しいタイルを置かず、移動処理と乱数による出現処理を分けます。
 * @param {number[][]} board 現在の盤面
 * @param {"up"|"down"|"left"|"right"} direction 移動方向
 * @returns {{board: number[][], scoreGain: number}} 移動後の盤面と得点
 */
function moveBoard(board, direction) {
  const nextBoard = createEmptyBoard();
  let scoreGain = 0;

  for (let lineIndex = 0; lineIndex < BOARD_SIZE; lineIndex += 1) {
    const coordinates = getLineCoordinates(direction, lineIndex);
    const values = coordinates.map(([row, column]) => board[row][column]);
    const result = compressAndMergeLine(values);
    scoreGain += result.scoreGain;

    coordinates.forEach(([row, column], index) => {
      nextBoard[row][column] = result.tiles[index];
    });
  }

  return { board: nextBoard, scoreGain };
}

/**
 * 盤面をセルごとに比べ、移動で見た目が変化したかを判定します。
 * 無効な移動でタイルを増やさないため、出現処理より前に使います。
 * @param {number[][]} first 比較する盤面
 * @param {number[][]} second 比較する盤面
 * @returns {boolean} すべてのセルが同じならtrue
 */
function boardsAreEqual(first, second) {
  return first.every((row, rowIndex) =>
    row.every((value, columnIndex) => value === second[rowIndex][columnIndex]),
  );
}

/**
 * 空きマスまたは隣接する同じ値があるかを調べます。
 * 空きがなければ上下左右の組だけを比べ、斜め同士は合成できない規則を保ちます。
 * @param {number[][]} board 現在の盤面
 * @returns {boolean} 1手以上動ける場合はtrue
 */
export function hasAvailableMoves(board) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const value = board[row][column];
      if (value === 0) return true;

      if (
        column + 1 < BOARD_SIZE &&
        value === board[row][column + 1]
      ) {
        return true;
      }
      if (
        row + 1 < BOARD_SIZE &&
        value === board[row + 1][column]
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 2048以上のタイルがあるかを判定します。
 * @param {number[][]} board 判定する盤面
 * @returns {boolean} 目標値に達したタイルがある場合はtrue
 */
function containsTargetTile(board) {
  return board.some((row) => row.some((value) => value >= TARGET_TILE));
}

/**
 * ゲーム状態を指定方向へ進めます。
 * 盤面が変わらないときは元の状態を返し、タイル生成や乱数消費を行いません。
 * @param {{board: number[][], score: number, hasWon: boolean, isGameOver: boolean}} game 現在の状態
 * @param {"up"|"down"|"left"|"right"} direction 移動方向
 * @param {() => number} random 新しいタイルを決める乱数関数
 * @returns {{board: number[][], score: number, hasWon: boolean, isGameOver: boolean}} 次の状態
 */
export function moveGame(game, direction, random = Math.random) {
  if (game.isGameOver || !["up", "down", "left", "right"].includes(direction)) {
    return game;
  }

  const { board: movedBoard, scoreGain } = moveBoard(game.board, direction);
  if (boardsAreEqual(game.board, movedBoard)) {
    // 現在の盤面に移動手段がない場合は、入力を受けた時点で終了状態を確定します。
    return hasAvailableMoves(game.board) ? game : { ...game, isGameOver: true };
  }

  const board = addRandomTile(movedBoard, random);
  return {
    board,
    score: game.score + scoreGain,
    hasWon: game.hasWon || containsTargetTile(board),
    isGameOver: !hasAvailableMoves(board),
  };
}

/** 履歴が空のプレイを作ります。新しいゲームでも同じ初期化を使います。 */
export function createPlaySession(game = createInitialGame()) {
  return { game, previousGame: null };
}

/** 有効な移動の直前だけを記録します。moveGameは元の盤面を変更しません。 */
export function movePlaySession(session, direction, random = Math.random) {
  const game = moveGame(session.game, direction, random);
  if (game === session.game) return session;

  // 盤面が同じまま終了判定だけが更新された場合は、最後の有効な手を残します。
  const previousGame = game.board === session.game.board ? session.previousGame : session.game;
  return { game, previousGame };
}

/** 盤面・得点・達成と終了の状態を一緒に戻し、使った履歴を消します。 */
export function undoPlaySession(session) {
  return session.previousGame === null ? session : createPlaySession(session.previousGame);
}
