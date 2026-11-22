/**
 * 5×5ノノグラムのルールを画面表示から分けます。
 * 各行を整数のビット列にし、ヒントに合う並び方だけを候補として残します。
 */
export const GRID_SIZE = 5;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;
export const CELL_MARK = Object.freeze({
  UNKNOWN: "unknown",
  FILLED: "filled",
  EMPTY: "empty",
});

// bit0を左端（列）または上端（行）に対応させ、盤面と同じ順に読みます。
export const SOLUTION_ROWS = Object.freeze([
  0b10001,
  0b11011,
  0b11111,
  0b10101,
  0b10001,
]);

const VALID_MARKS = new Set(Object.values(CELL_MARK));
const MAX_LINE_LENGTH = 10;

/**
 * ビット列を左から走査し、連続して塗られたマスの長さを返します。
 * @param {number} pattern 行または列のビットマスク
 * @param {number} [lineLength] 行または列の長さ
 * @returns {number[]} ヒントに表示する連続数
 */
export function getLineClues(pattern, lineLength = GRID_SIZE) {
  if (
    !Number.isInteger(lineLength) ||
    lineLength < 1 ||
    lineLength > MAX_LINE_LENGTH ||
    !Number.isInteger(pattern) ||
    pattern < 0 ||
    pattern >= 2 ** lineLength
  ) {
    throw new RangeError("行の長さまたはビット列が範囲外です。");
  }

  const clues = [];
  let runLength = 0;
  for (let index = 0; index < lineLength; index += 1) {
    if (((pattern >> index) & 1) === 1) {
      runLength += 1;
    } else if (runLength > 0) {
      clues.push(runLength);
      runLength = 0;
    }
  }
  if (runLength > 0) clues.push(runLength);
  return clues;
}

/**
 * 解答の各行から横ヒントを作ります。
 * @returns {number[][]} 上から順に並ぶ5行分のヒント
 */
function createRowClues() {
  return SOLUTION_ROWS.map((pattern) => getLineClues(pattern));
}

/**
 * 解答の各列から縦ヒントを作ります。
 * @returns {number[][]} 左から順に並ぶ5列分のヒント
 */
function createColumnClues() {
  return Array.from({ length: GRID_SIZE }, (_, column) => {
    const pattern = SOLUTION_ROWS.reduce((mask, rowPattern, row) => {
      return mask | (((rowPattern >> column) & 1) << row);
    }, 0);
    return getLineClues(pattern);
  });
}

export const ROW_CLUES = Object.freeze(createRowClues().map(Object.freeze));
export const COLUMN_CLUES = Object.freeze(createColumnClues().map(Object.freeze));

/**
 * 25個の入力が未入力・塗り・空き印のいずれかであることを確認します。
 * @param {string[]} marks 盤面の入力状態
 * @throws {RangeError} 入力配列の形や値が不正な場合
 */
function assertValidMarks(marks) {
  if (
    !Array.isArray(marks) ||
    marks.length !== CELL_COUNT ||
    marks.some((mark) => !VALID_MARKS.has(mark))
  ) {
    throw new RangeError("盤面には25個の有効なマス状態を指定してください。");
  }
}

/**
 * ヒントとプレイヤー入力の両方に一致する、行・列のビットパターンを列挙します。
 * 5マスなら全32通りだけ調べればよく、条件に合わない候補を明示的に除けます。
 * @param {number[]} clues 連続する塗りマスのヒント
 * @param {number} [lineLength] 行または列の長さ
 * @param {string[]} [knownMarks] 各位置の入力状態
 * @returns {number[]} 条件に合うビットマスク
 */
export function getLinePatterns(
  clues,
  lineLength = GRID_SIZE,
  knownMarks = Array(lineLength).fill(CELL_MARK.UNKNOWN),
) {
  if (
    !Number.isInteger(lineLength) ||
    lineLength < 1 ||
    lineLength > MAX_LINE_LENGTH ||
    !Array.isArray(clues) ||
    clues.some((clue) => !Number.isInteger(clue) || clue < 1) ||
    !Array.isArray(knownMarks) ||
    knownMarks.length !== lineLength ||
    knownMarks.some((mark) => !VALID_MARKS.has(mark))
  ) {
    throw new RangeError("ヒント、行の長さ、入力状態を確認してください。");
  }

  const filledCount = clues.reduce((sum, clue) => sum + clue, 0);
  const requiredLength = filledCount + Math.max(0, clues.length - 1);
  if (requiredLength > lineLength) {
    throw new RangeError("ヒントの合計が行または列の長さを超えています。");
  }

  const patternCount = 2 ** lineLength;
  const candidates = [];
  for (let pattern = 0; pattern < patternCount; pattern += 1) {
    const patternClues = getLineClues(pattern, lineLength);
    if (patternClues.length !== clues.length || patternClues.some((n, i) => n !== clues[i])) {
      continue;
    }

    // 入力済みの塗り・空き印と食い違う並び方は候補から外します。
    const matchesMarks = knownMarks.every((mark, index) => {
      if (mark === CELL_MARK.UNKNOWN) return true;
      const isFilled = ((pattern >> index) & 1) === 1;
      return isFilled === (mark === CELL_MARK.FILLED);
    });
    if (matchesMarks) candidates.push(pattern);
  }
  return candidates;
}

/**
 * 候補群がある位置で取り得る値（0=空き、1=塗り）を集めます。
 * @param {number[]} patterns ビットマスク候補
 * @param {number} index 調べる位置
 * @returns {Set<number>} 候補に含まれる値
 */
function getPossibleValues(patterns, index) {
  return new Set(patterns.map((pattern) => (pattern >> index) & 1));
}

/**
 * 行と列の候補を互いに照合し、交点に矛盾する候補を繰り返し取り除きます。
 * この反復が制約充足の基本で、どちらかの線で確定したマスを交差する線へ伝えます。
 * @param {string[]} marks 盤面の入力状態
 * @returns {{rowCandidates:number[][],columnCandidates:number[][],contradiction:boolean}}
 */
export function propagateCandidates(marks) {
  assertValidMarks(marks);

  const rowCandidates = ROW_CLUES.map((clues, row) =>
    getLinePatterns(clues, GRID_SIZE, marks.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE)),
  );
  const columnCandidates = COLUMN_CLUES.map((clues, column) => {
    const columnMarks = Array.from({ length: GRID_SIZE }, (_, row) => marks[row * GRID_SIZE + column]);
    return getLinePatterns(clues, GRID_SIZE, columnMarks);
  });

  if (rowCandidates.some((patterns) => patterns.length === 0) ||
      columnCandidates.some((patterns) => patterns.length === 0)) {
    return { rowCandidates, columnCandidates, contradiction: true };
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const rowValues = getPossibleValues(rowCandidates[row], column);
        const columnValues = getPossibleValues(columnCandidates[column], row);

        // 各候補は交点で、もう一方の線にも存在する値を使わなければなりません。
        const supportedRows = rowCandidates[row].filter((pattern) =>
          columnValues.has((pattern >> column) & 1),
        );
        const supportedColumns = columnCandidates[column].filter((pattern) =>
          rowValues.has((pattern >> row) & 1),
        );

        if (supportedRows.length !== rowCandidates[row].length) {
          rowCandidates[row] = supportedRows;
          changed = true;
        }
        if (supportedColumns.length !== columnCandidates[column].length) {
          columnCandidates[column] = supportedColumns;
          changed = true;
        }
        if (rowCandidates[row].length === 0 || columnCandidates[column].length === 0) {
          return { rowCandidates, columnCandidates, contradiction: true };
        }
      }
    }
  }

  return { rowCandidates, columnCandidates, contradiction: false };
}

/**
 * すべての候補が同じ値を持つ未入力マスを返します。
 * @param {number[]} patterns ビットマスク候補
 * @param {string[]} knownMarks 線上の現在の入力状態
 * @returns {{index:number,mark:string}|null} 確定位置。なければnull
 */
export function getConsensusCell(patterns, knownMarks) {
  if (!Array.isArray(patterns) || patterns.length === 0) return null;
  if (!Array.isArray(knownMarks) || knownMarks.length !== GRID_SIZE) {
    throw new RangeError("線の入力状態は5マス分必要です。");
  }

  for (let index = 0; index < GRID_SIZE; index += 1) {
    if (knownMarks[index] !== CELL_MARK.UNKNOWN) continue;

    const values = getPossibleValues(patterns, index);
    if (values.size !== 1) continue;
    return {
      index,
      mark: values.has(1) ? CELL_MARK.FILLED : CELL_MARK.EMPTY,
    };
  }
  return null;
}

/**
 * 解答との一致を調べます。空き印は必須にせず、塗った場所だけを答えと比較します。
 * @param {string[]} marks 盤面の入力状態
 * @returns {boolean} すべての塗りマスが解答と一致する場合true
 */
export function isSolved(marks) {
  assertValidMarks(marks);
  return marks.every((mark, cellIndex) => {
    const row = Math.floor(cellIndex / GRID_SIZE);
    const column = cellIndex % GRID_SIZE;
    const solutionIsFilled = ((SOLUTION_ROWS[row] >> column) & 1) === 1;
    return (mark === CELL_MARK.FILLED) === solutionIsFilled;
  });
}

/**
 * 新しいゲーム状態を作ります。
 * @returns {{marks:string[],isWon:boolean,hint:{row:number,column:number,mark:string}|null,hintText:string}}
 */
export function createGame() {
  return {
    marks: Array(CELL_COUNT).fill(CELL_MARK.UNKNOWN),
    isWon: false,
    hint: null,
    hintText: "",
  };
}

/**
 * 選択したマスの入力を更新します。同じ印を選ぶと未入力に戻せます。
 * @param {object} game 現在のゲーム状態
 * @param {number} cellIndex 左上から数えた位置
 * @param {string} mark 入れる状態
 * @returns {object} 更新したゲーム状態
 */
export function markCell(game, cellIndex, mark) {
  if (
    game.isWon ||
    !Number.isInteger(cellIndex) ||
    cellIndex < 0 ||
    cellIndex >= CELL_COUNT ||
    !VALID_MARKS.has(mark)
  ) {
    return game;
  }

  const nextMarks = [...game.marks];
  nextMarks[cellIndex] = game.marks[cellIndex] === mark ? CELL_MARK.UNKNOWN : mark;
  return {
    ...game,
    marks: nextMarks,
    isWon: isSolved(nextMarks),
    hint: null,
    hintText: "",
  };
}

/**
 * 候補の合意があるマスだけを一手ヒントとして示します。入力盤面は変更しません。
 * @param {object} game 現在のゲーム状態
 * @returns {object} ヒント結果を含む状態
 */
export function requestHint(game) {
  if (game.isWon) {
    return { ...game, hint: null, hintText: "すでに完成しています。" };
  }

  const candidates = propagateCandidates(game.marks);
  if (candidates.contradiction) {
    return {
      ...game,
      hint: null,
      hintText: "今の入力は行または列のヒントと矛盾しています。入力を確認してください。",
    };
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const marks = game.marks.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE);
    const cell = getConsensusCell(candidates.rowCandidates[row], marks);
    if (cell) {
      return {
        ...game,
        hint: { row, column: cell.index, mark: cell.mark },
        hintText: `${row + 1}行${cell.index + 1}列は「${cell.mark === CELL_MARK.FILLED ? "塗る" : "空き"}」と確定できます。`,
      };
    }
  }

  for (let column = 0; column < GRID_SIZE; column += 1) {
    const marks = Array.from({ length: GRID_SIZE }, (_, row) => game.marks[row * GRID_SIZE + column]);
    const cell = getConsensusCell(candidates.columnCandidates[column], marks);
    if (cell) {
      return {
        ...game,
        hint: { row: cell.index, column, mark: cell.mark },
        hintText: `${cell.index + 1}行${column + 1}列は「${cell.mark === CELL_MARK.FILLED ? "塗る" : "空き"}」と確定できます。`,
      };
    }
  }

  return {
    ...game,
    hint: null,
    hintText: "今の入力からは確定できるマスがありません。別のヒントを手がかりに進めてください。",
  };
}
