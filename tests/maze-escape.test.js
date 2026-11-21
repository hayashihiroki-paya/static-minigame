// 固定乱数で迷路生成と移動を再現し、探索結果とゲーム状態を確認します。
import assert from "node:assert/strict";
import { test } from "node:test";
import { MAZE_SIZE, createInitialGame, createMaze, movePlayer } from "../src/games/maze-escape/logic.js";

const DIRECTIONS = [
  { name: "up", rowChange: -1, columnChange: 0, opposite: "down" },
  { name: "right", rowChange: 0, columnChange: 1, opposite: "left" },
  { name: "down", rowChange: 1, columnChange: 0, opposite: "up" },
  { name: "left", rowChange: 0, columnChange: -1, opposite: "right" },
];

/**
 * スタートから通路をたどり、到達できる部屋を数えます。
 * 生成時の深さ優先探索とは別の幅優先確認にして、接続性を独立して検証します。
 * @param {Array<Array<{walls: object}>>} maze 検証する迷路
 * @returns {Set<string>} 到達した座標の一覧
 */
function findReachableRooms(maze) {
  const queue = [{ row: 0, column: 0 }];
  const visited = new Set(["0,0"]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const direction of DIRECTIONS) {
      const row = current.row + direction.rowChange;
      const column = current.column + direction.columnChange;
      const key = row + "," + column;
      if (
        row >= 0 && row < MAZE_SIZE &&
        column >= 0 && column < MAZE_SIZE &&
        !maze[current.row][current.column].walls[direction.name] &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ row, column });
      }
    }
  }

  return visited;
}

/**
 * スタートからゴールまでの方向列を幅優先で探します。
 * @param {Array<Array<{walls: object}>>} maze 検索する迷路
 * @returns {string[]} ゴールまでに通る方向
 */
function findRouteToGoal(maze) {
  const queue = [{ row: 0, column: 0, route: [] }];
  const visited = new Set(["0,0"]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.row === MAZE_SIZE - 1 && current.column === MAZE_SIZE - 1) {
      return current.route;
    }

    for (const direction of DIRECTIONS) {
      const row = current.row + direction.rowChange;
      const column = current.column + direction.columnChange;
      const key = row + "," + column;
      if (
        row >= 0 && row < MAZE_SIZE &&
        column >= 0 && column < MAZE_SIZE &&
        !maze[current.row][current.column].walls[direction.name] &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ row, column, route: [...current.route, direction.name] });
      }
    }
  }

  return [];
}

test("固定乱数から同じ迷路を生成する", () => {
  const firstMaze = createMaze(() => 0.37);
  const secondMaze = createMaze(() => 0.37);

  assert.deepEqual(firstMaze, secondMaze);
});

test("迷路の全室がつながり、壁の両側が一致する", () => {
  const maze = createMaze(() => 0.5);
  let openPassages = 0;

  assert.equal(maze.length, MAZE_SIZE);
  for (const row of maze) assert.equal(row.length, MAZE_SIZE);

  for (let row = 0; row < MAZE_SIZE; row += 1) {
    for (let column = 0; column < MAZE_SIZE; column += 1) {
      const cell = maze[row][column];
      if (row === 0) assert.equal(cell.walls.up, true);
      if (column === 0) assert.equal(cell.walls.left, true);
      if (row === MAZE_SIZE - 1) assert.equal(cell.walls.down, true);
      if (column === MAZE_SIZE - 1) assert.equal(cell.walls.right, true);

      if (column + 1 < MAZE_SIZE) {
        assert.equal(cell.walls.right, maze[row][column + 1].walls.left);
        if (!cell.walls.right) openPassages += 1;
      }
      if (row + 1 < MAZE_SIZE) {
        assert.equal(cell.walls.down, maze[row + 1][column].walls.up);
        if (!cell.walls.down) openPassages += 1;
      }
    }
  }

  // 連結な木は部屋数より通路がひとつ少ないため、余分な循環路もないことを確認します。
  assert.equal(openPassages, MAZE_SIZE * MAZE_SIZE - 1);
  assert.equal(findReachableRooms(maze).size, MAZE_SIZE * MAZE_SIZE);
});

test("壁と盤面の境界では止まり、開いた通路だけ移動数を増やす", () => {
  const game = createInitialGame(() => 0);
  const moved = movePlayer(game, "right");

  assert.deepEqual(moved.player, { row: 0, column: 1 });
  assert.equal(moved.moves, 1);
  assert.equal(game.moves, 0);
  assert.strictEqual(movePlayer(game, "up"), game);
  assert.strictEqual(movePlayer(game, "diagonal"), game);
});

test("ゴールまで移動するとクリアし、その後の移動を受け付けない", () => {
  let game = createInitialGame(() => 0.42);
  const route = findRouteToGoal(game.maze);
  assert.ok(route.length > 0, "ゴールへ通じる経路が必要です");

  for (const direction of route) {
    game = movePlayer(game, direction);
  }

  assert.equal(game.player.row, MAZE_SIZE - 1);
  assert.equal(game.player.column, MAZE_SIZE - 1);
  assert.equal(game.moves, route.length);
  assert.equal(game.isWon, true);
  assert.strictEqual(movePlayer(game, "left"), game);
});

test("不正な乱数は迷路生成時にエラーにする", () => {
  assert.throws(() => createMaze(() => 1), RangeError);
});
