/**
 * 神経衰弱のルールと盤面状態を画面表示から分けます。
 * 乱数関数を引数に受け取り、シャッフルを同じ条件で繰り返しテストできるようにします。
 */
export const CARD_FACES = Object.freeze([
  Object.freeze({ faceId: "apple", name: "りんご", symbol: "🍎" }),
  Object.freeze({ faceId: "lemon", name: "レモン", symbol: "🍋" }),
  Object.freeze({ faceId: "cherry", name: "さくらんぼ", symbol: "🍒" }),
  Object.freeze({ faceId: "grapes", name: "ぶどう", symbol: "🍇" }),
  Object.freeze({ faceId: "star", name: "星", symbol: "⭐" }),
  Object.freeze({ faceId: "moon", name: "月", symbol: "🌙" }),
  Object.freeze({ faceId: "cat", name: "ねこ", symbol: "🐱" }),
  Object.freeze({ faceId: "fish", name: "さかな", symbol: "🐟" }),
]);

export const PAIR_COUNT = CARD_FACES.length;
export const CARD_COUNT = PAIR_COUNT * 2;
export const MISMATCH_DELAY_MS = 800;

/**
 * 8種類の絵柄を2枚ずつ並べ、Fisher–Yates法で偏りのない順に混ぜます。
 * 各カードに盤面上のIDを付けるため、表示位置とペアの絵柄を別々に扱えます。
 */
export function createShuffledDeck(random = Math.random) {
  const faces = CARD_FACES.flatMap((face) => [face, face]);

  for (let index = faces.length - 1; index > 0; index -= 1) {
    const sample = random();

    // Math.randomの契約外の値を使うと不均等な位置交換になるため、シャッフル前に検証します。
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new RangeError("乱数は0以上1未満である必要があります。");
    }

    const swapIndex = Math.floor(sample * (index + 1));
    [faces[index], faces[swapIndex]] = [faces[swapIndex], faces[index]];
  }

  // IDはシャッフル後の位置から付け、常に0〜15の盤面位置として使います。
  return faces.map((face, id) => ({
    id,
    faceId: face.faceId,
    name: face.name,
    symbol: face.symbol,
  }));
}

/**
 * 新しいゲームの盤面と得点を作ります。
 * 関数を引数に取るので、テストは毎回同じ並びの盤面を使えます。
 */
export function createGame(random = Math.random) {
  return {
    cards: createShuffledDeck(random),
    revealed: [],
    matched: [],
    moves: 0,
    status: "playing",
    lastResult: "start",
  };
}

/**
 * 表向きにするカードを選び、選択数に応じて盤面状態を進めます。
 * 不一致表示中や、すでに選んだカードは同じ状態を返して無視します。
 */
export function selectCard(game, cardId) {
  if (game.status !== "playing" || !Number.isInteger(cardId)) {
    return game;
  }

  const card = game.cards.find((candidate) => candidate.id === cardId);

  if (!card || game.matched.includes(cardId) || game.revealed.includes(cardId)) {
    return game;
  }

  const revealed = [...game.revealed, cardId];

  // 1枚目だけでは手数を増やさず、2枚目を待つ状態として表示します。
  if (revealed.length === 1) {
    return { ...game, revealed, lastResult: "first" };
  }

  const [firstCardId] = game.revealed;
  const firstCard = game.cards.find((candidate) => candidate.id === firstCardId);
  const moves = game.moves + 1;

  if (firstCard.faceId === card.faceId) {
    const matched = [...game.matched, firstCardId, cardId];
    const isComplete = matched.length === game.cards.length;

    // 一致したカードはmatchedに記録して表向きで固定し、選択中カードから外します。
    return {
      ...game,
      revealed: [],
      matched,
      moves,
      status: isComplete ? "complete" : "playing",
      lastResult: isComplete ? "complete" : "match",
    };
  }

  // 不一致の2枚は一時的に表向きで保持し、画面側の800ミリ秒タイマーを待ちます。
  return {
    ...game,
    revealed,
    moves,
    status: "waiting",
    lastResult: "mismatch",
  };
}

/**
 * 表示時間が終わった不一致カードを裏向きに戻します。
 * waiting状態だけを進め、タイマーの二重実行や別状態の変更を避けます。
 */
export function hideMismatchedCards(game) {
  if (game.status !== "waiting") {
    return game;
  }

  return {
    ...game,
    revealed: [],
    status: "playing",
    lastResult: "mismatch-hidden",
  };
}

/**
 * 盤面を再シャッフルして、手数とペア数を初期化します。
 * 新しいゲーム状態を返すため、リセット前の状態は変更されません。
 */
export function resetGame(random = Math.random) {
  return { ...createGame(random), lastResult: "reset" };
}
