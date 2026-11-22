// 小さな盤面を使い、数字ヒント、ビット列候補、制約伝播、入力状態を確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CELL_COUNT,
  CELL_MARK,
  COLUMN_CLUES,
  GRID_SIZE,
  ROW_CLUES,
  SOLUTION_ROWS,
  createGame,
  getConsensusCell,
  getLineClues,
  getLinePatterns,
  isSolved,
  markCell,
  propagateCandidates,
  requestHint,
} from "../src/games/nonogram/logic.js";

test("固定した絵から行と列のヒントを正しい順に作る", () => {
  // ビット0を左端として、横と縦の連続マスのまとまりを確認します。
  assert.deepEqual(ROW_CLUES, [[1, 1], [2, 2], [5], [1, 1, 1], [1, 1]]);
  assert.deepEqual(COLUMN_CLUES, [[5], [2], [2], [2], [5]]);
  assert.deepEqual(getLineClues(0b10101, 5), [1, 1, 1]);
  assert.deepEqual(getLineClues(0, 5), []);
});

test("候補パターンは数字ヒントと既入力の塗り・空き印に一致する", () => {
  const unknown = Array(GRID_SIZE).fill(CELL_MARK.UNKNOWN);
  assert.deepEqual(getLinePatterns([2], 5), [0b00011, 0b00110, 0b01100, 0b11000]);

  const firstCellFilled = [...unknown];
  firstCellFilled[0] = CELL_MARK.FILLED;
  assert.deepEqual(getLinePatterns([2], 5, firstCellFilled), [0b00011]);

  const impossible = [...unknown];
  impossible[2] = CELL_MARK.EMPTY;
  assert.deepEqual(getLinePatterns([5], 5, impossible), []);
});

test("数字ヒントに必要な長さを超える候補を拒否する", () => {
  assert.throws(() => getLinePatterns([4, 2], 5), RangeError);
  assert.throws(() => getLineClues(32, 5), RangeError);
});

test("行と列の候補を交差位置で伝播して絞り込む", () => {
  const result = propagateCandidates(Array(CELL_COUNT).fill(CELL_MARK.UNKNOWN));
  const originalRowCandidates = getLinePatterns(ROW_CLUES[0]);
  const originalColumnCandidates = getLinePatterns(COLUMN_CLUES[1]);

  assert.equal(result.contradiction, false);
  assert.equal(originalRowCandidates.length, 6);
  assert.equal(result.rowCandidates[0].length, 1);
  assert.equal(originalColumnCandidates.length, 4);
  assert.equal(result.columnCandidates[1].length, 1);
  assert.ok(result.rowCandidates.every((patterns) => patterns.length > 0));
  assert.ok(result.columnCandidates.every((patterns) => patterns.length > 0));
});

test("候補に矛盾が生じた入力を検出する", () => {
  const marks = Array(CELL_COUNT).fill(CELL_MARK.UNKNOWN);
  marks[10] = CELL_MARK.EMPTY;

  assert.equal(propagateCandidates(marks).contradiction, true);
});

test("候補が全て合意する未入力マスだけを確定セルとして返す", () => {
  const unknown = Array(GRID_SIZE).fill(CELL_MARK.UNKNOWN);
  assert.deepEqual(getConsensusCell([0b00011, 0b00111], unknown), {
    index: 0,
    mark: CELL_MARK.FILLED,
  });
  assert.equal(getConsensusCell([0, 0b11111], unknown), null);
  assert.equal(getConsensusCell([], unknown), null);
});

test("一手ヒントは候補から確定したマスを示し、入力状態を変更しない", () => {
  const game = createGame();
  const hinted = requestHint(game);

  assert.ok(hinted.hint);
  assert.equal(hinted.hint.mark === CELL_MARK.FILLED || hinted.hint.mark === CELL_MARK.EMPTY, true);
  const solutionIsFilled = ((SOLUTION_ROWS[hinted.hint.row] >> hinted.hint.column) & 1) === 1;
  assert.equal(
    hinted.hint.mark,
    solutionIsFilled ? CELL_MARK.FILLED : CELL_MARK.EMPTY,
  );
  assert.match(hinted.hintText, /\d+行\d+列/);
  assert.deepEqual(hinted.marks, game.marks);
  assert.equal(game.hint, null);
});

test("ヒントは矛盾した盤面で入力確認を促す", () => {
  const game = createGame();
  const inconsistent = markCell(game, 10, CELL_MARK.EMPTY);
  const hinted = requestHint(inconsistent);

  assert.equal(hinted.hint, null);
  assert.match(hinted.hintText, /矛盾/);
});

test("マスの塗り・取り消しと空き印の削除を状態遷移に反映する", () => {
  const game = createGame();
  const filled = markCell(game, 0, CELL_MARK.FILLED);
  const cleared = markCell(filled, 0, CELL_MARK.FILLED);
  const xMarked = markCell(cleared, 1, CELL_MARK.EMPTY);
  const erased = markCell(xMarked, 1, CELL_MARK.UNKNOWN);

  assert.equal(filled.marks[0], CELL_MARK.FILLED);
  assert.equal(cleared.marks[0], CELL_MARK.UNKNOWN);
  assert.equal(xMarked.marks[1], CELL_MARK.EMPTY);
  assert.equal(erased.marks[1], CELL_MARK.UNKNOWN);
  assert.equal(game.marks[0], CELL_MARK.UNKNOWN);
});

test("正解の塗りマスで完成し、空き印は必須にしない", () => {
  const marks = Array(CELL_COUNT).fill(CELL_MARK.UNKNOWN);
  SOLUTION_ROWS.forEach((pattern, row) => {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      if (((pattern >> column) & 1) === 1) {
        marks[row * GRID_SIZE + column] = CELL_MARK.FILLED;
      }
    }
  });

  assert.equal(isSolved(marks), true);
  assert.equal(isSolved(Array(CELL_COUNT).fill(CELL_MARK.UNKNOWN)), false);
  assert.equal(markCell({ ...createGame(), marks, isWon: true }, 0, CELL_MARK.EMPTY).isWon, true);
});

test("新しいゲームは盤面とヒントを初期化し、不正な入力位置を無視する", () => {
  const game = createGame();
  const filled = markCell(game, 0, CELL_MARK.FILLED);

  assert.equal(game.marks.length, CELL_COUNT);
  assert.equal(game.marks.every((mark) => mark === CELL_MARK.UNKNOWN), true);
  assert.equal(game.hint, null);
  assert.equal(markCell(filled, -1, CELL_MARK.FILLED), filled);
  assert.equal(markCell(filled, 0, "invalid"), filled);
});

