/**
 * マッチ3の盤面ルールを画面表示から分けます。
 * 盤面は左上から右下へ読む一次元配列にして、行・列を同じ番号計算で扱います。
 */
export const GRID_SIZE = 8;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

// 色名を内部値として使うため、表示色や記号を変えてもルールを変更せずに済みます。
export const PIECE_TYPES = Object.freeze(["ruby", "sapphire", "leaf", "sun", "grape"]);
export const PIECE_LABELS = Object.freeze({
  ruby: "赤",
  sapphire: "青",
  leaf: "緑",
  sun: "黄",
  grape: "紫",
});

const VALID_PIECES = new Set(PIECE_TYPES);

/**
 * 盤面配列が8×8のピースだけでできているか検査します。
 * 消去途中の盤面は空マス（null）を許可し、画面へ返す完成盤面では許可しません。
 * @param {unknown} board 検査する盤面
 * @param {boolean} [allowEmpty] 消去・落下途中のnullを許可するか
 */
function assertBoard(board, allowEmpty = false) {
  if (
    !Array.isArray(board) ||
    board.length !== CELL_COUNT ||
    board.some((piece) => !(allowEmpty && piece === null) && !VALID_PIECES.has(piece))
  ) {
    throw new RangeError("盤面には8×8個の有効なピースを指定してください。");
  }
}

/**
 * 乱数関数の戻り値が0以上1未満であることを確かめます。
 * 乱数を引数で受け取ると、同じ値列をテストで再生できます。
 * @param {() => number} random 0以上1未満を返す関数
 * @returns {number} 検査済みの乱数
 */
function nextRandom(random) {
  if (typeof random !== "function") {
    throw new TypeError("乱数関数を指定してください。");
  }
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の数を返してください。");
  }
  return value;
}

/**
 * 仮置きした色が、そのマスを通る3連続以上の並びを作るか調べます。
 * 行と列で共通の方向走査を使うことで、横・縦の判定条件を揃えます。
 * @param {(string|null)[]} board ピースまたは空マスを含む盤面
 * @param {number} index 色を仮置きするマス
 * @param {string} piece 仮置きする色
 * @returns {boolean} その場でマッチができる場合はtrue
 */
function wouldCreateMatch(board, index, piece) {
  const row = Math.floor(index / GRID_SIZE);
  const column = index % GRID_SIZE;
  const directions = [
    { rowStep: 0, columnStep: -1 },
    { rowStep: 0, columnStep: 1 },
    { rowStep: -1, columnStep: 0 },
    { rowStep: 1, columnStep: 0 },
  ];

  for (let direction = 0; direction < directions.length; direction += 2) {
    let matchingNeighbors = 1;
    for (const side of [direction, direction + 1]) {
      const { rowStep, columnStep } = directions[side];
      let nextRow = row + rowStep;
      let nextColumn = column + columnStep;
      while (
        nextRow >= 0 && nextRow < GRID_SIZE &&
        nextColumn >= 0 && nextColumn < GRID_SIZE &&
        board[nextRow * GRID_SIZE + nextColumn] === piece
      ) {
        matchingNeighbors += 1;
        nextRow += rowStep;
        nextColumn += columnStep;
      }
    }
    if (matchingNeighbors >= 3) return true;
  }
  return false;
}

/**
 * 直前までに置いた色と3つ並ばない色から、乱数で一つ選びます。
 * 初期配置や補充が勝手に消え続けるのを防ぎ、連鎖は落下で生じた組み合わせに絞ります。
 * @param {(string|null)[]} board 色を選ぶ途中の盤面
 * @param {number} index 色を置くマス
 * @param {() => number} random 乱数関数
 * @returns {string} 選んだピースの種類
 */
function choosePiece(board, index, random) {
  const candidates = PIECE_TYPES.filter((piece) => !wouldCreateMatch(board, index, piece));
  // 5色なら、縦と横の両方で同時に3つ目を作る場合でも選択肢が残ります。
  if (candidates.length === 0) {
    throw new Error("マッチを避けるピースを選べませんでした。");
  }
  return candidates[Math.floor(nextRandom(random) * candidates.length)];
}

/**
 * 3つ以上連続する同色ピースのインデックスを、横・縦まとめて返します。
 * Setを使うため、T字や十字で交差したマッチも重複して数えません。
 * @param {string[]} board 8×8の盤面
 * @returns {Set<number>} 消去対象のマス番号
 */
export function findMatches(board) {
  assertBoard(board);
  const matches = new Set();

  // 横方向は各行の連続区間を一度だけ走査します。
  for (let row = 0; row < GRID_SIZE; row += 1) {
    let column = 0;
    while (column < GRID_SIZE) {
      const piece = board[row * GRID_SIZE + column];
      let end = column + 1;
      while (end < GRID_SIZE && board[row * GRID_SIZE + end] === piece) end += 1;
      if (end - column >= 3) {
        for (let matchedColumn = column; matchedColumn < end; matchedColumn += 1) {
          matches.add(row * GRID_SIZE + matchedColumn);
        }
      }
      column = end;
    }
  }

  // 縦方向も同じ区間走査にし、盤面全体を調べる時間を行数×列数に抑えます。
  for (let column = 0; column < GRID_SIZE; column += 1) {
    let row = 0;
    while (row < GRID_SIZE) {
      const piece = board[row * GRID_SIZE + column];
      let end = row + 1;
      while (end < GRID_SIZE && board[end * GRID_SIZE + column] === piece) end += 1;
      if (end - row >= 3) {
        for (let matchedRow = row; matchedRow < end; matchedRow += 1) {
          matches.add(matchedRow * GRID_SIZE + column);
        }
      }
      row = end;
    }
  }
  return matches;
}

/**
 * 3つ並んだ状態を避けながら、盤面の初期配置を作ります。
 * @param {() => number} [random] 0以上1未満を返す乱数関数
 * @returns {string[]} マッチのない初期盤面
 */
export function createBoard(random = Math.random) {
  const board = Array(CELL_COUNT).fill(null);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    board[index] = choosePiece(board, index, random);
  }
  return board;
}

/**
 * 二つのマスが上下または左右に隣り合っているか返します。
 * 一次元配列で隣接を扱うとき、行末と次の行頭を左右隣と誤認しないよう行番号も比べます。
 * @param {number} first 最初のマス番号
 * @param {number} second 次のマス番号
 * @returns {boolean} 隣接している場合はtrue
 */
export function areAdjacent(first, second) {
  if (
    !Number.isInteger(first) || !Number.isInteger(second) ||
    first < 0 || first >= CELL_COUNT || second < 0 || second >= CELL_COUNT
  ) {
    return false;
  }
  const sameRow = Math.floor(first / GRID_SIZE) === Math.floor(second / GRID_SIZE);
  return (sameRow && Math.abs(first - second) === 1) || Math.abs(first - second) === GRID_SIZE;
}

/**
 * マッチを消した後、列ごとに残ったピースを下へ詰めて空きを補充します。
 * 各列の上下関係は保ち、空いた分だけ列の上側へ新しいピースを置きます。
 * @param {(string|null)[]} board 消去対象がnullになった盤面
 * @param {() => number} random 補充用の乱数関数
 * @returns {string[]} 落下・補充が終わった盤面
 */
export function collapseAndRefill(board, random = Math.random) {
  assertBoard(board, true);
  const collapsed = Array(CELL_COUNT).fill(null);

  for (let column = 0; column < GRID_SIZE; column += 1) {
    let destinationRow = GRID_SIZE - 1;
    // 下から詰めると、マッチしていないピース同士の縦の順番が入れ替わりません。
    for (let row = GRID_SIZE - 1; row >= 0; row -= 1) {
      const piece = board[row * GRID_SIZE + column];
      if (piece === null) continue;
      collapsed[destinationRow * GRID_SIZE + column] = piece;
      destinationRow -= 1;
    }

    // 空きは列の先頭に集まっているので、上から順に安全な色を選びます。
    for (let row = 0; row <= destinationRow; row += 1) {
      const index = row * GRID_SIZE + column;
      collapsed[index] = choosePiece(collapsed, index, random);
    }
  }

  assertBoard(collapsed);
  return collapsed;
}

/**
 * 隣り合うピースを交換し、マッチができた場合だけ消去と連鎖解決を行います。
 * 入力盤面は変更せず、成功・不成立のどちらでも新しい結果オブジェクトを返します。
 * @param {string[]} board 現在の盤面
 * @param {number} first 交換する最初のマス
 * @param {number} second 交換する次のマス
 * @param {() => number} [random] 補充用の乱数関数
 * @returns {{accepted:boolean,board:string[],cascadeCount:number,clearedCount:number}}
 */
export function attemptSwap(board, first, second, random = Math.random) {
  assertBoard(board);
  if (!areAdjacent(first, second)) {
    return { accepted: false, board: board.slice(), cascadeCount: 0, clearedCount: 0 };
  }

  const swapped = board.slice();
  [swapped[first], swapped[second]] = [swapped[second], swapped[first]];
  let matches = findMatches(swapped);
  if (matches.size === 0) {
    return { accepted: false, board: board.slice(), cascadeCount: 0, clearedCount: 0 };
  }

  let resolved = swapped;
  let cascadeCount = 0;
  let clearedCount = 0;
  while (matches.size > 0) {
    cascadeCount += 1;
    clearedCount += matches.size;

    // 同じ波で見つかったピースを一括で空にし、その後に全列を同時に詰めます。
    for (const index of matches) resolved[index] = null;
    resolved = collapseAndRefill(resolved, random);
    matches = findMatches(resolved);
  }

  return { accepted: true, board: resolved, cascadeCount, clearedCount };
}
