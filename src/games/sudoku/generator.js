import { CELL_COUNT, SIZE } from "./board.js";
import { canSolveWithSingles, countSolutions } from "./solver.js";

const blankTarget = 40;

function shuffled(values, random) {
  const copy = values.slice();
  // 末尾から順に、まだ確定していない範囲だけを対象に交換します。
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function groupedOrder(random) {
  // 3行または3列のまとまりの順番と、そのまとまりの中の順番を別々に混ぜます。
  // ブロックをまたいで個別に入れ替えると、3×3の制約が崩れる場合があります。
  return shuffled([0, 1, 2], random).flatMap((group) =>
    shuffled([0, 1, 2], random).map((offset) => group * 3 + offset));
}

export function generatePuzzle(random = Math.random) {
  const digits = shuffled(Array.from({ length: SIZE }, (_, index) => index + 1), random);
  const rows = groupedOrder(random);
  const columns = groupedOrder(random);

  // 基本の完成盤面は1行進むごとに数字を3つずらし、3行ごとにさらに1つずらします。
  // この規則で各行・列・ブロックに1〜9がそろいます。並べ替えはその性質を保ちます。
  const puzzle = rows.flatMap((row) => columns.map((column) =>
    digits[(row * 3 + Math.floor(row / 3) + column) % SIZE]));
  const order = shuffled(Array.from({ length: CELL_COUNT }, (_, index) => index), random);
  let blanks = 0;

  for (const index of order) {
    const digit = puzzle[index];
    puzzle[index] = 0;
    // 解が一つあることと、候補一つのマスだけで解けることを別々に検査します。
    // 数字を一つ消すたびに判定し、どちらかの条件が崩れたらその数字を戻します。
    if (countSolutions(puzzle) !== 1 || !canSolveWithSingles(puzzle)) {
      puzzle[index] = digit;
    } else {
      blanks += 1;
      // 40は目安です。候補位置を使い切った場合は、ここまでの盤面を採用します。
      if (blanks === blankTarget) break;
    }
  }
  return puzzle;
}
