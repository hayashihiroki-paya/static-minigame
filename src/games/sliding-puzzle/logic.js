/**
 * 8パズルの盤面生成、移動、A*探索を画面表示から分けます。
 * タイル0を空きマスとして扱い、盤面を文字列に符号化して探索状態を比較します。
 */
export const BOARD_WIDTH = 3;
export const BOARD_CELL_COUNT = BOARD_WIDTH * BOARD_WIDTH;
export const SHUFFLE_STEPS = 24;
export const GOAL_BOARD = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 0]);

const GOAL_STATE = GOAL_BOARD.join("");
const DIRECTIONS = [
  { name: "up", rowChange: -1, columnChange: 0, label: "上" },
  { name: "right", rowChange: 0, columnChange: 1, label: "右" },
  { name: "down", rowChange: 1, columnChange: 0, label: "下" },
  { name: "left", rowChange: 0, columnChange: -1, label: "左" },
];
const DIRECTION_BY_NAME = new Map(DIRECTIONS.map((direction) => [direction.name, direction]));

/**
 * 盤面が1から8までの数字と空きマスを一つずつ含むか確認します。
 * @param {number[]} board 3×3の盤面を左上から並べた配列
 * @throws {RangeError} 盤面が9個の正しいタイル順でない場合
 */
function assertValidBoard(board) {
  if (
    !Array.isArray(board) ||
    board.length !== BOARD_CELL_COUNT ||
    board.some((tile) => !Number.isInteger(tile) || tile < 0 || tile >= BOARD_CELL_COUNT) ||
    new Set(board).size !== BOARD_CELL_COUNT
  ) {
    throw new RangeError("盤面には0から8までの数字を一度ずつ入れてください。");
  }
}

/**
 * 盤面位置から一手で空きマスへ動かせる隣接位置を返します。
 * @param {number} index 位置番号
 * @returns {number[]} 上、右、下、左の順に並んだ隣接位置
 */
function getAdjacentIndices(index) {
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_CELL_COUNT) return [];

  const row = Math.floor(index / BOARD_WIDTH);
  const column = index % BOARD_WIDTH;
  const neighbors = [];
  if (row > 0) neighbors.push(index - BOARD_WIDTH);
  if (column < BOARD_WIDTH - 1) neighbors.push(index + 1);
  if (row < BOARD_WIDTH - 1) neighbors.push(index + BOARD_WIDTH);
  if (column > 0) neighbors.push(index - 1);
  return neighbors;
}

/**
 * 乱数の契約を確認し、候補位置を決定的に選びます。
 * @param {() => number} random 0以上1未満を返す乱数関数
 * @param {number} length 候補数
 * @returns {number} 候補配列の添字
 */
function chooseRandomIndex(random, length) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }
  return Math.floor(value * length);
}

/**
 * ゴール盤面から合法手を繰り返して、必ず解ける盤面を作ります。
 * 直前の操作をすぐ戻す候補を除くため、混ぜる手数が無駄になりません。
 * @param {() => number} [random] 0以上1未満を返す乱数関数
 * @param {number} [shuffleSteps] ゴールから動かす回数
 * @returns {number[]} 混ぜ終わった盤面
 */
export function createShuffledBoard(random = Math.random, shuffleSteps = SHUFFLE_STEPS) {
  if (!Number.isInteger(shuffleSteps) || shuffleSteps < 1) {
    throw new RangeError("混ぜる回数は1以上の整数にしてください。");
  }

  const board = [...GOAL_BOARD];
  let emptyIndex = BOARD_CELL_COUNT - 1;
  let previousEmptyIndex = -1;

  for (let step = 0; step < shuffleSteps; step += 1) {
    const candidates = getAdjacentIndices(emptyIndex).filter(
      (index) => index !== previousEmptyIndex,
    ).filter((index) => {
      if (step < shuffleSteps - 1) return true;

      // 最後の一手だけ完成盤面を作る候補を除き、指定回数を守ったまま遊び始められる盤面にします。
      const candidateBoard = [...board];
      [candidateBoard[emptyIndex], candidateBoard[index]] = [
        candidateBoard[index],
        candidateBoard[emptyIndex],
      ];
      return !isSolved(candidateBoard);
    });
    const tileIndex = candidates[chooseRandomIndex(random, candidates.length)];
    [board[emptyIndex], board[tileIndex]] = [board[tileIndex], board[emptyIndex]];
    previousEmptyIndex = emptyIndex;
    emptyIndex = tileIndex;
  }

  return board;
}

/**
 * タイルがすべてゴール位置にあるか調べます。
 * @param {number[]} board 比較する盤面
 * @returns {boolean} 完成していればtrue
 */
export function isSolved(board) {
  assertValidBoard(board);
  return board.every((tile, index) => tile === GOAL_BOARD[index]);
}

/**
 * 3×3盤面の可解性を反転数の偶奇で判定します。
 * 空きマスを除いた反転数が偶数なら、ゴール状態へ到達できます。
 * @param {number[]} board 判定する盤面
 * @returns {boolean} 解ける盤面ならtrue
 */
export function isSolvable(board) {
  assertValidBoard(board);
  const numberedTiles = board.filter((tile) => tile !== 0);
  let inversions = 0;
  for (let left = 0; left < numberedTiles.length; left += 1) {
    for (let right = left + 1; right < numberedTiles.length; right += 1) {
      if (numberedTiles[left] > numberedTiles[right]) inversions += 1;
    }
  }
  return inversions % 2 === 0;
}

/**
 * 各タイルからゴール位置までの上下左右の距離を合計します。
 * 空きマスは数えず、距離が実際の最短手数を超えないヒューリスティックにします。
 * @param {number[]} board 評価する盤面
 * @returns {number} マンハッタン距離の合計
 */
export function getManhattanDistance(board) {
  assertValidBoard(board);
  return board.reduce((distance, tile, index) => {
    if (tile === 0) return distance;

    const goalIndex = tile - 1;
    const currentRow = Math.floor(index / BOARD_WIDTH);
    const currentColumn = index % BOARD_WIDTH;
    const goalRow = Math.floor(goalIndex / BOARD_WIDTH);
    const goalColumn = goalIndex % BOARD_WIDTH;
    return (
      distance +
      Math.abs(currentRow - goalRow) +
      Math.abs(currentColumn - goalColumn)
    );
  }, 0);
}

/**
 * 空きマスに隣接しているタイルの位置を返します。
 * @param {number[]} board 盤面
 * @returns {number[]} 動かせるタイルの位置
 */
export function getMovableTileIndices(board) {
  assertValidBoard(board);
  return getAdjacentIndices(board.indexOf(0));
}

/**
 * テストや探索用の初期ゲーム状態を作ります。
 * @param {number[]} board 初期盤面
 * @returns {{board:number[],moves:number,isWon:boolean,hintTileIndex:number|null,hintText:string}} ゲーム状態
 */
export function createGameFromBoard(board) {
  assertValidBoard(board);
  const copiedBoard = [...board];
  return {
    board: copiedBoard,
    moves: 0,
    isWon: isSolved(copiedBoard),
    hintTileIndex: null,
    hintText: "",
  };
}

/**
 * 新しい合法な盤面とプレイヤー状態を作ります。
 * @param {() => number} [random] 盤面生成に使う乱数
 * @returns {{board:number[],moves:number,isWon:boolean,hintTileIndex:number|null,hintText:string}} 初期状態
 */
export function createInitialGame(random = Math.random) {
  return createGameFromBoard(createShuffledBoard(random));
}

/**
 * 空きマスに隣接する指定タイルを一つ動かします。
 * 不正な位置、ゴール後の操作では同じ状態を返します。
 * @param {object} game 現在の状態
 * @param {number} tileIndex 動かしたいタイルの位置
 * @returns {object} 次の状態
 */
export function moveTile(game, tileIndex) {
  if (game.isWon || !getMovableTileIndices(game.board).includes(tileIndex)) return game;

  const emptyIndex = game.board.indexOf(0);
  const nextBoard = [...game.board];
  [nextBoard[emptyIndex], nextBoard[tileIndex]] = [nextBoard[tileIndex], nextBoard[emptyIndex]];
  return {
    ...game,
    board: nextBoard,
    moves: game.moves + 1,
    isWon: isSolved(nextBoard),
    hintTileIndex: null,
    hintText: "",
  };
}

/**
 * 空きマスを方向キーに合わせて一マス動かします。
 * @param {object} game 現在の状態
 * @param {string} directionName up、right、down、leftのいずれか
 * @returns {object} 次の状態
 */
export function moveBlank(game, directionName) {
  const direction = DIRECTION_BY_NAME.get(directionName);
  if (!direction || game.isWon) return game;

  const emptyIndex = game.board.indexOf(0);
  const row = Math.floor(emptyIndex / BOARD_WIDTH);
  const column = emptyIndex % BOARD_WIDTH;
  const nextRow = row + direction.rowChange;
  const nextColumn = column + direction.columnChange;
  if (
    nextRow < 0 ||
    nextRow >= BOARD_WIDTH ||
    nextColumn < 0 ||
    nextColumn >= BOARD_WIDTH
  ) {
    return game;
  }

  return moveTile(game, nextRow * BOARD_WIDTH + nextColumn);
}

/**
 * 盤面配列を探索用の9文字へ変換します。
 * @param {number[]} board 盤面
 * @returns {string} 状態キー
 */
function encodeBoard(board) {
  return board.join("");
}

/**
 * 状態キーを使ってA*探索のヒューリスティックを計算します。
 * @param {string} state 9文字の盤面
 * @returns {number} マンハッタン距離
 */
function getStateHeuristic(state) {
  let distance = 0;
  for (let index = 0; index < state.length; index += 1) {
    const tile = Number(state[index]);
    if (tile === 0) continue;

    const goalIndex = tile - 1;
    distance +=
      Math.abs(Math.floor(index / BOARD_WIDTH) - Math.floor(goalIndex / BOARD_WIDTH)) +
      Math.abs((index % BOARD_WIDTH) - (goalIndex % BOARD_WIDTH));
  }
  return distance;
}

/**
 * A*探索で使う最小ヒープです。f=g+hの小さい盤面を先に取り出します。
 */
class MinPriorityQueue {
  constructor() {
    this.items = [];
  }

  /**
   * 評価値が小さい探索ノードをキューへ追加します。
   * @param {object} node 探索ノード
   */
  push(node) {
    this.items.push(node);
    let index = this.items.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) break;
      [this.items[index], this.items[parentIndex]] = [
        this.items[parentIndex],
        this.items[index],
      ];
      index = parentIndex;
    }
  }

  /**
   * 評価値が最小の探索ノードを取り出します。
   * @returns {object|null} 最小ノード。空ならnull
   */
  pop() {
    if (this.items.length === 0) return null;

    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let index = 0;
      while (true) {
        const leftIndex = index * 2 + 1;
        const rightIndex = leftIndex + 1;
        let smallestIndex = index;
        if (
          leftIndex < this.items.length &&
          this.compare(this.items[leftIndex], this.items[smallestIndex]) < 0
        ) {
          smallestIndex = leftIndex;
        }
        if (
          rightIndex < this.items.length &&
          this.compare(this.items[rightIndex], this.items[smallestIndex]) < 0
        ) {
          smallestIndex = rightIndex;
        }
        if (smallestIndex === index) break;
        [this.items[index], this.items[smallestIndex]] = [
          this.items[smallestIndex],
          this.items[index],
        ];
        index = smallestIndex;
      }
    }
    return first;
  }

  /**
   * f値、h値、追加順で優先順位を決め、同点時も探索順を再現できるようにします。
   * @param {object} left ノードA
   * @param {object} right ノードB
   * @returns {number} 左が先なら負数、右が先なら正数
   */
  compare(left, right) {
    return (
      left.fScore - right.fScore ||
      left.hScore - right.hScore ||
      left.sequence - right.sequence
    );
  }
}

/**
 * A*探索でゴールまでの最短手順を返します。
 * ヒューリスティックは最短手数を超えないため、最初に取り出したゴールが最短経路です。
 * @param {number[]} board 開始盤面
 * @returns {number[]|null} 動かすタイル位置の列。解けない盤面ならnull
 */
export function findShortestPath(board) {
  assertValidBoard(board);
  if (!isSolvable(board)) return null;

  const startState = encodeBoard(board);
  if (startState === GOAL_STATE) return [];

  const openSet = new MinPriorityQueue();
  const bestCosts = new Map([[startState, 0]]);
  const previousSteps = new Map();
  let sequence = 0;
  const startHeuristic = getStateHeuristic(startState);
  openSet.push({
    state: startState,
    gScore: 0,
    hScore: startHeuristic,
    fScore: startHeuristic,
    sequence,
  });

  while (openSet.items.length > 0) {
    const current = openSet.pop();
    if (current.gScore !== bestCosts.get(current.state)) continue;

    if (current.state === GOAL_STATE) {
      const path = [];
      let state = current.state;
      while (state !== startState) {
        const step = previousSteps.get(state);
        path.push(step.tileIndex);
        state = step.previousState;
      }
      return path.reverse();
    }

    const emptyIndex = current.state.indexOf("0");
    for (const tileIndex of getAdjacentIndices(emptyIndex)) {
      const nextTiles = current.state.split("");
      [nextTiles[emptyIndex], nextTiles[tileIndex]] = [
        nextTiles[tileIndex],
        nextTiles[emptyIndex],
      ];
      const nextState = nextTiles.join("");
      const nextCost = current.gScore + 1;
      if (nextCost >= (bestCosts.get(nextState) ?? Number.POSITIVE_INFINITY)) continue;

      bestCosts.set(nextState, nextCost);
      previousSteps.set(nextState, {
        previousState: current.state,
        tileIndex,
      });
      const hScore = getStateHeuristic(nextState);
      sequence += 1;
      openSet.push({
        state: nextState,
        gScore: nextCost,
        hScore,
        fScore: nextCost + hScore,
        sequence,
      });
    }
  }

  return null;
}

/**
 * A*が選んだ最短経路から、プレイヤーが次に動かすタイルだけを案内します。
 * この関数は盤面や移動数を変更せず、説明用の状態だけを更新します。
 * @param {object} game 現在の状態
 * @returns {object} ヒント表示を含む状態
 */
export function requestHint(game) {
  const path = findShortestPath(game.board);
  if (path === null) {
    return { ...game, hintTileIndex: null, hintText: "この盤面からゴールへ進めません。" };
  }
  if (path.length === 0) {
    return { ...game, hintTileIndex: null, hintText: "すでに完成しています。" };
  }

  const tileIndex = path[0];
  const emptyIndex = game.board.indexOf(0);
  const tileRow = Math.floor(tileIndex / BOARD_WIDTH);
  const tileColumn = tileIndex % BOARD_WIDTH;
  const emptyRow = Math.floor(emptyIndex / BOARD_WIDTH);
  const emptyColumn = emptyIndex % BOARD_WIDTH;
  let direction;
  if (tileRow < emptyRow) direction = "下";
  else if (tileRow > emptyRow) direction = "上";
  else if (tileColumn < emptyColumn) direction = "右";
  else direction = "左";

  return {
    ...game,
    hintTileIndex: tileIndex,
    hintText: "最短手順のヒント：" + game.board[tileIndex] + "のタイルを" + direction + "へ動かします。",
  };
}
