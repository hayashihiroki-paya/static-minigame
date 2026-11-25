const directions = new Map([
  ["up", [-1, 0]], ["down", [1, 0]],
  ["left", [0, -1]], ["right", [0, 1]],
]);

export function createGame(rows) {
  const width = rows[0]?.length;
  if (!width || !rows.every((row) => row.length === width && /^[#.\$@ ]+$/.test(row))) {
    throw new Error("ステージは決められた記号を使った長方形にしてください。");
  }

  const walls = new Set();
  const goals = new Set();
  const boxes = new Set();
  const players = [];
  // 1次元の位置番号を使うと、箱やゴールがあるかを同じ番号で調べられます。
  [...rows.join("")].forEach((tile, index) => {
    if (tile === "#") walls.add(index);
    if (tile === ".") goals.add(index);
    if (tile === "$") boxes.add(index);
    if (tile === "@") players.push(index);
  });
  if (players.length !== 1 || boxes.size === 0 || boxes.size !== goals.size) {
    throw new Error("プレイヤーは1人、箱とゴールは同じ数だけ配置してください。");
  }

  return {
    width, height: rows.length, walls, goals,
    position: { player: players[0], boxes },
    history: [],
  };
}

export function countPlacedBoxes(game) {
  return [...game.goals].filter((goal) => game.position.boxes.has(goal)).length;
}

export function isCleared(game) {
  return countPlacedBoxes(game) === game.goals.size;
}

function adjacent(game, index, [dr, dc]) {
  const row = Math.floor(index / game.width) + dr;
  const column = index % game.width + dc;
  return row < 0 || row >= game.height || column < 0 || column >= game.width
    ? -1 : row * game.width + column;
}

export function movePlayer(game, direction) {
  const offset = directions.get(direction);
  if (!offset || isCleared(game)) return false;

  const { player, boxes } = game.position;
  const next = adjacent(game, player, offset);
  if (next === -1 || game.walls.has(next)) return false;

  let nextBoxes = boxes;
  if (boxes.has(next)) {
    const beyond = adjacent(game, next, offset);
    if (beyond === -1 || game.walls.has(beyond) || boxes.has(beyond)) return false;
    // 履歴と箱の集合を共有するので、箱を動かすときだけコピーを作ります。
    nextBoxes = new Set(boxes);
    nextBoxes.delete(next);
    nextBoxes.add(beyond);
  }

  game.history.push(game.position);
  game.position = { player: next, boxes: nextBoxes };
  return true;
}

export function undoMove(game) {
  const previous = game.history.pop();
  if (!previous) return false;
  game.position = previous;
  return true;
}
