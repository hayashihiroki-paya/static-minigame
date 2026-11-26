import { CELL_COUNT, SIZE } from "./board.js";
import { canSolveWithSingles, countSolutions } from "./solver.js";

const blankTarget = 40;

function shuffled(values, random) {
  const copy = values.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function groupedOrder(random) {
  return shuffled([0, 1, 2], random).flatMap((group) =>
    shuffled([0, 1, 2], random).map((offset) => group * 3 + offset));
}

export function generatePuzzle(random = Math.random) {
  const digits = shuffled(Array.from({ length: SIZE }, (_, index) => index + 1), random);
  const rows = groupedOrder(random);
  const columns = groupedOrder(random);

  // 完成盤面の数字と3行・3列のまとまりを並べ替えても、数独のルールは保たれます。
  const puzzle = rows.flatMap((row) => columns.map((column) =>
    digits[(row * 3 + Math.floor(row / 3) + column) % SIZE]));
  const order = shuffled(Array.from({ length: CELL_COUNT }, (_, index) => index), random);
  let blanks = 0;

  for (const index of order) {
    const digit = puzzle[index];
    puzzle[index] = 0;
    if (countSolutions(puzzle) !== 1 || !canSolveWithSingles(puzzle)) {
      puzzle[index] = digit;
    } else {
      blanks += 1;
      if (blanks === blankTarget) break;
    }
  }
  return puzzle;
}
