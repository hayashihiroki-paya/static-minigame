import { blockOf, CELL_COUNT, columnOf, rowOf, SIZE } from "./board.js";

// 1〜9を下位9ビットの位置に対応させます。例: 1は 0b001、3は 0b100。
const allDigits = (1 << SIZE) - 1;

function maskFor(digit) {
  return 1 << (digit - 1);
}

function createSearch(puzzle) {
  if (puzzle.length !== CELL_COUNT) return null;
  // 探索では空きマスに仮の数字を入れるため、受け取った盤面はコピーします。
  // rows・columns・blocksの各要素は、そのまとまりですでに使われた数字の集合です。
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
    // 初期数字も順に登録し、先に登録した数字と重複する盤面は探索前に除きます。
    if (!(candidates(search, index) & bit)) return null;
    toggle(search, index, bit);
  }
  return search;
}

function candidates(search, index) {
  // ORで3つの「使用済み」をまとめ、反転してから1〜9の範囲だけを残します。
  // たとえば行に1、列に3があれば、候補から1と3を同時に除外できます。
  return allDigits & ~(search.rows[rowOf(index)] | search.columns[columnOf(index)]
    | search.blocks[blockOf(index)]);
}

function toggle(search, index, bit) {
  // 候補に残っている数字のビットは3箇所とも0です。XORで1にし、
  // 分岐を調べ終えたら同じビットをもう一度反転して元の0に戻します。
  search.rows[rowOf(index)] ^= bit;
  search.columns[columnOf(index)] ^= bit;
  search.blocks[blockOf(index)] ^= bit;
}

function bitCount(mask) {
  let count = 0;
  // mask & (mask - 1) で、立っているビットのうち一番下の1つだけを消せます。
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
  // 空きマスがなくなれば1解。空きマスの候補が0個なら下のループに入らず0解です。
  if (!next) return 1;

  const { index, mask } = next;
  let count = 0;
  for (let remaining = mask; remaining && count < limit; remaining &= remaining - 1) {
    // 一番下のビットだけを取り出し、その位置を1〜9の数字に戻します。
    const bit = remaining & -remaining;
    search.values[index] = 1 + Math.log2(bit);
    toggle(search, index, bit);
    // すでに1解見つかっていれば、次の分岐ではもう1解だけ探せば十分です。
    count += countFrom(search, limit - count);
    // マスクと盤面を両方戻し、次の候補を同じ条件で試します。
    toggle(search, index, bit);
    search.values[index] = 0;
  }
  return count;
}

/**
 * 一意性の判定に必要な0・1・2以上の区別だけを返します。
 * 戻り値の2は「少なくとも2解」の意味です。
 */
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
    // 候補が一つのマスがなければ、この解き方では進めないのでここで止めます。
    if (!mask || (mask & (mask - 1))) return false;
    search.values[index] = 1 + Math.log2(mask);
    toggle(search, index, mask);
  }
  return true;
}
