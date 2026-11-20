// パッドIDの順番を固定し、画面・音声・テストで同じ入力値を使います。
export const PAD_IDS = ["red", "blue", "yellow", "green"];

function pickPad(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("乱数関数は0以上1未満の値を返してください。");
  }

  return PAD_IDS[Math.floor(value * PAD_IDS.length)];
}

/** ゲーム開始前の、空の順番と0点の状態を作ります。 */
export function createInitialGame() {
  return {
    sequence: [],
    inputIndex: 0,
    score: 0,
    status: "ready",
  };
}

/** 開始または再挑戦で、最初の1音を含む提示状態へ進めます。 */
export function startGame(game, random = Math.random) {
  if (game.status !== "ready" && game.status !== "lost") {
    return game;
  }

  return {
    sequence: [pickPad(random)],
    inputIndex: 0,
    score: 0,
    status: "showing",
  };
}

/** UIが一連の音と点灯表示を終えた後に、入力を受け付けます。 */
export function finishSequencePlayback(game) {
  if (game.status !== "showing") {
    return game;
  }

  return { ...game, inputIndex: 0, status: "input" };
}

/**
 * 入力順を照合します。最後まで正解したときだけ得点を増やして次の1音を追加します。
 */
export function submitPad(game, pad, random = Math.random) {
  if (game.status !== "input" || !PAD_IDS.includes(pad)) {
    return game;
  }

  if (game.sequence[game.inputIndex] !== pad) {
    return { ...game, status: "lost" };
  }

  const nextInputIndex = game.inputIndex + 1;
  if (nextInputIndex < game.sequence.length) {
    return { ...game, inputIndex: nextInputIndex };
  }

  return {
    sequence: [...game.sequence, pickPad(random)],
    inputIndex: 0,
    score: game.score + 1,
    status: "showing",
  };
}

/** やり直しでは順番や得点を残さず、開始前の状態に戻します。 */
export function resetGame() {
  return createInitialGame();
}
