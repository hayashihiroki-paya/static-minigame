import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createGame, enterDigit, findConflicts } from "../src/games/sudoku/board.js";
import { generatePuzzle } from "../src/games/sudoku/generator.js";
import { canSolveWithSingles, countSolutions } from "../src/games/sudoku/solver.js";

const board = (...rows) => [...rows.join("")].map(Number);
const unique = board(
  "530070000", "600195000", "098000060", "800060003", "400803001",
  "700020006", "060000280", "000419005", "000080079",
);
const solved = board(
  "534678912", "672195348", "198342567", "859761423", "426853791",
  "713924856", "961537284", "287419635", "345286179",
);

test("解の数が一つ、複数、ゼロの場合を区別する", () => {
  assert.equal(countSolutions(unique), 1);
  assert.equal(countSolutions(solved.map((digit) => digit <= 2 ? 0 : digit)), 2);
  const impossible = unique.slice();
  impossible[2] = 1;
  assert.equal(findConflicts(impossible).size, 0, "初期数字自体に重複はない");
  assert.equal(countSolutions(impossible), 0);
  assert.equal(countSolutions([1]), 0);
  assert.equal(countSolutions(unique.map((digit, index) => index === 1 ? 5 : digit)), 0);
});

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test("固定乱数で問題を再現でき、生成した問題は候補一つのマスだけで解ける", () => {
  const first = generatePuzzle(seededRandom(19));
  assert.deepEqual(first, generatePuzzle(seededRandom(19)));
  assert.notDeepEqual(first, generatePuzzle(seededRandom(20)));

  for (let seed = 1; seed <= 12; seed += 1) {
    const puzzle = generatePuzzle(seededRandom(seed));
    assert.equal(puzzle.length, 81);
    assert.equal(countSolutions(puzzle), 1);
    assert.equal(canSolveWithSingles(puzzle), true);
    assert.ok(puzzle.filter((digit) => digit === 0).length >= 30);
  }
  assert.equal(canSolveWithSingles(Array(81).fill(0)), false);
});

test("行・列・ブロックの重複は、それぞれ関係する全マスを示す", () => {
  for (const indexes of [[0, 1, 7], [0, 27, 63], [0, 10, 20]]) {
    const puzzle = Array(81).fill(0);
    indexes.forEach((index) => { puzzle[index] = 4; });
    assert.deepEqual([...findConflicts(puzzle)].sort((a, b) => a - b), indexes);
  }
});

test("初期数字を保持し、入力・消去・クリアを扱う", () => {
  const game = createGame(unique);
  assert.equal(enterDigit(game, 0, 2), false);
  assert.equal(enterDigit(game, -1, 2), false);
  assert.equal(enterDigit(game, 2, 10), false);
  assert.equal(enterDigit(game, 2, 5), true);
  assert.ok(findConflicts(game.values).has(2));
  assert.equal(enterDigit(game, 2, 0), true);
  assert.equal(findConflicts(game.values).size, 0);
  solved.forEach((digit, index) => {
    if (!game.givens[index]) assert.equal(enterDigit(game, index, digit), true);
  });
  assert.equal(game.cleared, true);
  assert.equal(enterDigit(game, 2, 0), false);
  assert.deepEqual(game.givens, unique);
});

test("誤りのある満杯の盤面はクリアにならない", () => {
  const puzzle = solved.slice();
  puzzle[0] = 0;
  const game = createGame(puzzle);
  enterDigit(game, 0, 3);
  assert.equal(game.cleared, false);
  assert.deepEqual(game.values.filter((value) => value === 0), []);
});

test("ホームから数独を開け、盤面・入力ボタン・通知を識別できる", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/sudoku/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="数独のゲームで遊ぶ" href="\.\/src\/games\/sudoku\/"/);
  assert.match(page, /id="sudoku-grid" role="grid" aria-label="9行9列の数独"/);
  assert.match(page, /role="group" aria-label="数字の入力"/);
  assert.match(page, /role="status" aria-live="polite"/);
});
