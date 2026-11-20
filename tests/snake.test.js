import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRID_SIZE,
  advanceGame,
  changeDirection,
  createInitialGame,
  resetGame,
  startGame,
} from "../src/games/snake/logic.js";

const firstAvailableFood = () => 0;

test("initial state starts centered with a valid food cell", () => {
  const game = createInitialGame(firstAvailableFood);

  assert.equal(game.status, "ready");
  assert.equal(game.score, 0);
  assert.deepEqual(game.snake, [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ]);
  assert.deepEqual(game.food, { x: 0, y: 0 });
  assert.equal(game.snake.some(({ x, y }) => x === game.food.x && y === game.food.y), false);
});

test("start and movement advance the snake by one cell", () => {
  const ready = createInitialGame(firstAvailableFood);
  const started = startGame(ready);
  const moved = advanceGame(started, firstAvailableFood);

  assert.equal(started.status, "playing");
  assert.deepEqual(moved.snake[0], { x: 8, y: 7 });
  assert.equal(moved.snake.length, 3);
  assert.equal(moved.status, "playing");
});

test("direction changes cannot reverse into the snake", () => {
  const playing = startGame(createInitialGame(firstAvailableFood));
  const reversed = changeDirection(playing, "left");
  const turned = changeDirection(playing, "up");

  assert.equal(reversed, playing);
  assert.equal(turned.nextDirection, "up");
  assert.equal(changeDirection(turned, "down"), turned);
});

test("wall collision ends the game", () => {
  const game = {
    ...startGame(createInitialGame(firstAvailableFood)),
    snake: [{ x: GRID_SIZE - 1, y: 4 }, { x: GRID_SIZE - 2, y: 4 }],
    food: { x: 0, y: 0 },
  };

  assert.equal(advanceGame(game, firstAvailableFood).status, "lost");
});

test("body collision ends the game", () => {
  const game = {
    ...startGame(createInitialGame(firstAvailableFood)),
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
    ],
    direction: "left",
    food: { x: 10, y: 10 },
  };

  assert.equal(advanceGame(game, firstAvailableFood).status, "lost");
});

test("moving into the tail cell is safe when the tail moves away", () => {
  const game = {
    ...startGame(createInitialGame(firstAvailableFood)),
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ],
    direction: "left",
    food: { x: 10, y: 10 },
  };

  const moved = advanceGame(game, firstAvailableFood);
  assert.equal(moved.status, "playing");
  assert.deepEqual(moved.snake[0], { x: 1, y: 2 });
  assert.equal(moved.snake.length, 4);
});

test("eating food grows the snake, adds a point, and chooses a free cell", () => {
  const game = {
    ...startGame(createInitialGame(firstAvailableFood)),
    food: { x: 8, y: 7 },
  };

  const moved = advanceGame(game, firstAvailableFood);
  assert.equal(moved.score, 1);
  assert.equal(moved.snake.length, 4);
  assert.deepEqual(moved.food, { x: 0, y: 0 });
});

test("filling the last free cell wins", () => {
  // 盤面の全マスを一筆書きの順で蛇にし、残った左上を最後に埋めます。
  const path = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    const row = Array.from({ length: GRID_SIZE }, (_, x) => x);
    if (y % 2 === 1) row.reverse();
    for (const x of row) {
      if (x !== 0 || y !== 0) path.push({ x, y });
    }
  }
  const snake = path;
  const game = {
    snake,
    direction: "left",
    nextDirection: null,
    food: { x: 0, y: 0 },
    score: snake.length - 3,
    status: "playing",
  };

  const won = advanceGame(game, firstAvailableFood);
  assert.equal(won.status, "won");
  assert.equal(won.snake.length, GRID_SIZE * GRID_SIZE);
  assert.equal(won.food, null);
});

test("reset restores a ready game and invalid random values are rejected", () => {
  const game = startGame(createInitialGame(firstAvailableFood));
  const reset = resetGame(firstAvailableFood);

  assert.notEqual(reset, game);
  assert.equal(reset.status, "ready");
  assert.equal(reset.score, 0);
  assert.throws(() => createInitialGame(() => 1), RangeError);
});
