/** ハノイの塔の盤面と移動ルールを、画面表示から分けて管理します。 */
export const DISK_COUNT = 4;
export const ROD_COUNT = 3;
export const START_ROD = 0;
export const GOAL_ROD = 2;
export const MINIMUM_MOVE_COUNT = 2 ** DISK_COUNT - 1;

/** 配列の末尾を棒の一番上とし、円盤番号が大きいほど大きな円盤にします。 */
export function createInitialGameState() {
  return {
    rods: [[4, 3, 2, 1], [], []],
    moveCount: 0,
    selectedRod: null,
    solutionVisible: false,
    isComplete: false,
  };
}

/** 棒番号が3本の範囲内か確認し、誤った呼び出しを早く見つけます。 */
function isValidRod(rodIndex) {
  return Number.isInteger(rodIndex) && rodIndex >= 0 && rodIndex < ROD_COUNT;
}

/** 移動元の選択を切り替えます。空の棒は移動元にできません。 */
export function selectRod(game, rodIndex) {
  if (game.isComplete || !isValidRod(rodIndex) || game.rods[rodIndex].length === 0) {
    return game;
  }

  return {
    ...game,
    selectedRod: game.selectedRod === rodIndex ? null : rodIndex,
  };
}

/** 選択中の棒を解除し、盤面・移動数・解法表示はそのまま保ちます。 */
export function clearRodSelection(game) {
  if (game.selectedRod === null) return game;
  return { ...game, selectedRod: null };
}

/** 一番上の円盤だけを移動し、大きい円盤の上に小さい円盤を置く規則を守ります。 */
export function moveDisk(game, fromRod, toRod) {
  if (
    game.isComplete ||
    !isValidRod(fromRod) ||
    !isValidRod(toRod) ||
    fromRod === toRod
  ) {
    return game;
  }

  const source = game.rods[fromRod];
  const target = game.rods[toRod];
  if (source.length === 0) return game;

  const disk = source.at(-1);
  const targetTop = target.at(-1);
  if (targetTop !== undefined && disk > targetTop) return game;

  const rods = game.rods.map((rod) => [...rod]);
  rods[fromRod].pop();
  rods[toRod].push(disk);

  return {
    ...game,
    rods,
    moveCount: game.moveCount + 1,
    selectedRod: null,
    isComplete: rods[GOAL_ROD].length === DISK_COUNT,
  };
}

/** リセットでは選択・手数・解法表示も含めて新しい初期状態を作ります。 */
export function resetGame() {
  return createInitialGameState();
}

/** 再帰で、n枚を補助棒経由で移す最短手順を順番に追加します。 */
export function solveHanoi(diskCount = DISK_COUNT, fromRod = START_ROD, toRod = GOAL_ROD) {
  if (!Number.isInteger(diskCount) || diskCount < 0) {
    throw new RangeError("円盤数は0以上の整数で指定してください。");
  }
  if (!isValidRod(fromRod) || !isValidRod(toRod) || fromRod === toRod) {
    throw new RangeError("移動元と移動先には異なる棒を指定してください。");
  }

  const auxiliaryRod = [0, 1, 2].find((rod) => rod !== fromRod && rod !== toRod);
  const moves = [];

  function appendMoves(count, source, target, auxiliary) {
    if (count === 0) return;

    // n枚の問題を「上のn-1枚」「一番大きい1枚」「上のn-1枚」に分けます。
    appendMoves(count - 1, source, auxiliary, target);
    moves.push({ disk: count, from: source, to: target });
    appendMoves(count - 1, auxiliary, target, source);
  }

  appendMoves(diskCount, fromRod, toRod, auxiliaryRod);
  return moves;
}

/** 解法一覧の表示だけを切り替え、盤面の状態や移動数は変更しません。 */
export function toggleSolution(game) {
  return { ...game, solutionVisible: !game.solutionVisible };
}
