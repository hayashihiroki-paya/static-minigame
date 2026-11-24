export const HOLE_COUNT = 9;
export const ROUND_DURATION_SECONDS = 30;

/** 開始前の画面と、リセット直後に共通して使う状態を返します。 */
export function createInitialGameState() {
  return {
    phase: "ready",
    score: 0,
    remainingSeconds: ROUND_DURATION_SECONDS,
    activeHole: null,
    previousHole: null,
  };
}

function assertHoleIndex(holeIndex) {
  if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex >= HOLE_COUNT) {
    throw new RangeError(`穴の番号は0から${HOLE_COUNT - 1}までの整数で指定してください。`);
  }
}

/** 前回と同じ穴を除いた候補から、乱数で次の出現場所を選びます。 */
export function chooseNextHole(previousHole, random = Math.random) {
  if (previousHole !== null) assertHoleIndex(previousHole);

  const candidates = Array.from({ length: HOLE_COUNT }, (_, index) => index).filter(
    (holeIndex) => holeIndex !== previousHole,
  );
  const randomValue = random();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("乱数は0以上1未満で指定してください。");
  }

  return candidates[Math.floor(randomValue * candidates.length)];
}

/** 開始操作で初期化し、最初のモグラを表示します。 */
export function startGame(random = Math.random) {
  const activeHole = chooseNextHole(null, random);
  return {
    ...createInitialGameState(),
    phase: "playing",
    activeHole,
    previousHole: activeHole,
  };
}

/** 表示中のモグラを一度だけ叩けます。それ以外の入力では状態を変えません。 */
export function hitHole(gameState, holeIndex) {
  assertHoleIndex(holeIndex);
  if (gameState.phase !== "playing" || gameState.activeHole !== holeIndex) {
    return gameState;
  }

  return {
    ...gameState,
    score: gameState.score + 1,
    activeHole: null,
  };
}

/** 1秒進めます。次の穴は呼び出し側から受け取り、状態遷移自体を決定的にします。 */
export function advanceOneSecond(gameState, nextHole) {
  if (gameState.phase !== "playing") return gameState;

  if (gameState.remainingSeconds <= 1) {
    return {
      ...gameState,
      phase: "finished",
      remainingSeconds: 0,
      activeHole: null,
    };
  }

  assertHoleIndex(nextHole);
  if (nextHole === gameState.previousHole) {
    throw new RangeError("次のモグラは直前と別の穴に表示してください。");
  }

  return {
    ...gameState,
    remainingSeconds: gameState.remainingSeconds - 1,
    activeHole: nextHole,
    previousHole: nextHole,
  };
}
