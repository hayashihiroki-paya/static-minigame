export const SIZE = 9;
export const CELL_COUNT = SIZE * SIZE;
export const rowOf = (index) => Math.floor(index / SIZE);
export const columnOf = (index) => index % SIZE;
export const blockOf = (index) => Math.floor(rowOf(index) / 3) * 3 + Math.floor(columnOf(index) / 3);

export function findConflicts(values) {
  const conflicts = new Set();

  for (const unitOf of [rowOf, columnOf, blockOf]) {
    const firstByDigit = Array.from({ length: SIZE }, () => new Map());
    values.forEach((digit, index) => {
      if (digit === 0) return;
      const first = firstByDigit[unitOf(index)];
      if (first.has(digit)) {
        conflicts.add(first.get(digit));
        conflicts.add(index);
      } else {
        first.set(digit, index);
      }
    });
  }
  return conflicts;
}

export function createGame(puzzle) {
  return { givens: puzzle.slice(), values: puzzle.slice(), cleared: false };
}

export function enterDigit(game, index, digit) {
  if (game.cleared || !Number.isInteger(index) || game.givens[index] !== 0
    || !Number.isInteger(digit) || digit < 0 || digit > SIZE) return false;

  game.values[index] = digit;
  game.cleared = !game.values.includes(0) && findConflicts(game.values).size === 0;
  return true;
}
