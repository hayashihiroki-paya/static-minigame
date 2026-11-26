import { blockOf, CELL_COUNT, columnOf, rowOf, SIZE } from "./board.js";

const allDigits = (1 << SIZE) - 1;

function maskFor(digit) {
  return 1 << (digit - 1);
}

function createSearch(puzzle) {
  if (puzzle.length !== CELL_COUNT) return null;
  const search = {
    values: Array.from(puzzle),
    rows: Array(SIZE).fill(0),
    columns: Array(SIZE).fill(0),
    blocks: Array(SIZE).fill(0),
  };
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const digit = search.values[index];
    if (!Number.isInteger(digit) || digit < 0 || digit > SIZE) return null;
    if (digit === 0) continue;
    const bit = maskFor(digit);
    if (!(candidates(search, index) & bit)) return null;
    toggle(search, index, bit);
  }
  return search;
}

function candidates(search, index) {
  return allDigits & ~(search.rows[rowOf(index)] | search.columns[columnOf(index)]
    | search.blocks[blockOf(index)]);
}

function toggle(search, index, bit) {
  // 探索で数字を入れる操作と戻す操作に、同じビット反転を使えます。
  search.rows[rowOf(index)] ^= bit;
  search.columns[columnOf(index)] ^= bit;
  search.blocks[blockOf(index)] ^= bit;
}

function bitCount(mask) {
  let count = 0;
  for (; mask; mask &= mask - 1) count += 1;
  return count;
}

function nextCell(search) {
  let choice = null;
  let bestCount = SIZE + 1;
  // 候補が少ないマスから調べると、矛盾のある分岐を早く止められます。
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (search.values[index]) continue;
    const mask = candidates(search, index);
    const count = bitCount(mask);
    if (count < bestCount) {
      choice = { index, mask };
      bestCount = count;
      if (count === 0) break;
    }
  }
  return choice;
}

function countFrom(search, limit) {
  const next = nextCell(search);
  if (!next) return 1;

  const { index, mask } = next;
  let count = 0;
  for (let remaining = mask; remaining && count < limit; remaining &= remaining - 1) {
    const bit = remaining & -remaining;
    search.values[index] = 1 + Math.log2(bit);
    toggle(search, index, bit);
    count += countFrom(search, limit - count);
    toggle(search, index, bit);
    search.values[index] = 0;
  }
  return count;
}

/** 一意性の判定に必要な0・1・2以上の区別だけを返します。 */
export function countSolutions(puzzle) {
  const search = createSearch(puzzle);
  return search ? countFrom(search, 2) : 0;
}

/** 候補が一つのマスだけを順に埋め、初級問題として解けるか確認します。 */
export function canSolveWithSingles(puzzle) {
  const search = createSearch(puzzle);
  if (!search) return false;
  for (let next = nextCell(search); next; next = nextCell(search)) {
    const { index, mask } = next;
    if (!mask || (mask & (mask - 1))) return false;
    search.values[index] = 1 + Math.log2(mask);
    toggle(search, index, mask);
  }
  return true;
}
