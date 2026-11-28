import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CELL_COUNT,
  GRID_SIZE,
  PIECE_TYPES,
  areAdjacent,
  attemptSwap,
  collapseAndRefill,
  createBoard,
  findMatches,
} from "../src/games/match3/logic.js";

const homePage = await readFile(new URL("../index.html", import.meta.url), "utf8");
const gamePage = await readFile(new URL("../src/games/match3/index.html", import.meta.url), "utf8");
const gameMain = await readFile(new URL("../src/games/match3/main.js", import.meta.url), "utf8");
const gameStyles = await readFile(new URL("../src/games/match3/style.css", import.meta.url), "utf8");

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function patternedBoard() {
  // 斜めに色をずらすと初期マッチがなく、テストしたい場所だけを安全に書き換えられます。
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const column = index % GRID_SIZE;
    return PIECE_TYPES[(row + column) % PIECE_TYPES.length];
  });
}

test("同じ乱数列から同じ盤面を作り、初期配置にはマッチがない", () => {
  const first = createBoard(seededRandom(72));
  const second = createBoard(seededRandom(72));

  assert.deepEqual(first, second);
  assert.equal(first.length, CELL_COUNT);
  assert.ok(first.every((piece) => PIECE_TYPES.includes(piece)));
  assert.equal(findMatches(first).size, 0);
  assert.notDeepEqual(first, createBoard(seededRandom(73)));
});

test("横・縦の4連続と交差するマッチを一つの集合で検出する", () => {
  const board = patternedBoard();
  const center = 3 * GRID_SIZE + 3;

  // 横4つ、縦3つを交差させ、中心マスは一度だけ数えます。
  for (const index of [center - 2, center - 1, center, center + 1, center - GRID_SIZE, center + GRID_SIZE]) {
    board[index] = "ruby";
  }
  const expected = [center - 2, center - 1, center, center + 1, center - GRID_SIZE, center + GRID_SIZE];

  assert.deepEqual([...findMatches(board)].sort((a, b) => a - b), expected.sort((a, b) => a - b));
});

test("列を詰めるとピースの上下順を保ち、上側だけを補充する", () => {
  const board = patternedBoard();
  const column = 2;
  const removedRows = [1, 4, 6];
  const survivors = board.filter(
    (_, index) => index % GRID_SIZE === column && !removedRows.includes(Math.floor(index / GRID_SIZE)),
  );
  removedRows.forEach((row) => { board[row * GRID_SIZE + column] = null; });

  const result = collapseAndRefill(board, () => 0.5);
  const resultColumn = Array.from({ length: GRID_SIZE }, (_, row) => result[row * GRID_SIZE + column]);

  assert.deepEqual(resultColumn.slice(removedRows.length), survivors);
  assert.ok(resultColumn.every((piece) => PIECE_TYPES.includes(piece)));
  assert.equal(findMatches(result).size, 0);
});

test("隣り合うマスだけを交換し、マッチしない手は元の盤面へ戻す", () => {
  const board = patternedBoard();
  const original = board.slice();

  assert.equal(areAdjacent(7, 8), false, "行末と次の行頭は左右隣ではない");
  assert.equal(areAdjacent(7, 15), true, "同じ列の上下は隣接する");
  assert.equal(areAdjacent(-1, 0), false);
  assert.deepEqual(attemptSwap(board, 0, 2, () => 0).board, original);
  assert.equal(attemptSwap(board, 0, 2, () => 0).accepted, false);

  const notMatched = attemptSwap(board, 0, 1, () => 0);
  assert.equal(notMatched.accepted, false);
  assert.deepEqual(notMatched.board, original);
  assert.deepEqual(board, original, "入力盤面を破壊的に書き換えない");
});

test("交換でできたマッチを消し、落下で生じる二段目の連鎖も解決する", () => {
  const board = patternedBoard();
  const ruby = "ruby";
  const sapphire = "sapphire";

  // 右へ一つ交換すると5行目に赤3つができ、6行目の赤3つは落下後に初めて隣り合います。
  board[5 * GRID_SIZE] = ruby;
  board[5 * GRID_SIZE + 1] = ruby;
  board[5 * GRID_SIZE + 2] = "sun";
  board[5 * GRID_SIZE + 3] = ruby;
  board[3 * GRID_SIZE + 2] = sapphire;
  board[4 * GRID_SIZE + 2] = sapphire;
  board[6 * GRID_SIZE + 2] = sapphire;
  assert.equal(findMatches(board).size, 0);

  const result = attemptSwap(board, 5 * GRID_SIZE + 2, 5 * GRID_SIZE + 3, () => 0.4);

  assert.equal(result.accepted, true);
  assert.equal(result.cascadeCount, 2);
  assert.equal(result.clearedCount, 6);
  assert.equal(result.board.length, CELL_COUNT);
  assert.ok(result.board.every((piece) => PIECE_TYPES.includes(piece)));
  assert.equal(findMatches(result.board).size, 0);
  assert.equal(board[5 * GRID_SIZE + 2], "sun", "元の盤面を変更しない");
});

test("ホーム導線と盤面操作に日本語の説明・キーボード・狭い画面向けスタイルがある", () => {
  assert.match(homePage, /href="\.\/src\/games\/match3\/"/);
  assert.match(homePage, /<h3>マッチ3パズル<\/h3>/);
  assert.match(gamePage, /<html lang="ja">/);
  assert.match(gamePage, /role="status" aria-live="polite"/);
  assert.match(gamePage, /EnterまたはSpace/);
  assert.match(gameMain, /ArrowUp/);
  assert.match(gameMain, /ArrowDown/);
  assert.match(gameMain, /ArrowLeft/);
  assert.match(gameMain, /ArrowRight/);
  assert.match(gameStyles, /grid-template-columns: repeat\(8, minmax\(0, 1fr\)\)/);
  assert.match(gameStyles, /@media \(max-width: 520px\)/);
  assert.match(gameStyles, /touch-action: manipulation/);
});
