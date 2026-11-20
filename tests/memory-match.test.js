import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARD_COUNT,
  CARD_FACES,
  PAIR_COUNT,
  createGame,
  createShuffledDeck,
  hideMismatchedCards,
  resetGame,
  selectCard,
} from "../src/games/memory-match/logic.js";

/**
 * 盤面ルールはDOMや実時間から切り離し、固定した乱数とカード位置で検証します。
 * こうするとペア判定や状態遷移の失敗を画面操作なしで再現できます。
 */

test("カードは16枚あり、8種類がそれぞれ2枚ずつ並ぶ", () => {
  // 絵柄の構成を数え、カード不足や同じ絵柄の過不足が起きないことを確認します。
  const deck = createShuffledDeck(() => 0.5);
  const counts = new Map();

  for (const card of deck) {
    counts.set(card.faceId, (counts.get(card.faceId) ?? 0) + 1);
  }

  assert.equal(deck.length, CARD_COUNT);
  assert.equal(counts.size, PAIR_COUNT);
  assert.equal(CARD_FACES.length, PAIR_COUNT);
  assert.deepEqual([...counts.values()], Array(PAIR_COUNT).fill(2));
  assert.equal(new Set(deck.map((card) => card.id)).size, CARD_COUNT);
  assert.notDeepEqual(
    deck.map((card) => card.faceId),
    CARD_FACES.flatMap((face) => [face.faceId, face.faceId]),
  );
});

test("同じ乱数列を渡すと同じ順序へシャッフルされる", () => {
  // 固定乱数で同じ並びが返ることを確かめ、テスト結果が実行ごとに揺れないようにします。
  const firstDeck = createShuffledDeck(() => 0.5);
  const secondDeck = createShuffledDeck(() => 0.5);

  assert.deepEqual(firstDeck, secondDeck);
});

test("0以上1未満以外の乱数はシャッフルに使わない", () => {
  // 乱数関数の契約違反を隠さず、無効な配列順を作る前に知らせます。
  assert.throws(() => createShuffledDeck(() => 1), RangeError);
  assert.throws(() => createShuffledDeck(() => -0.1), RangeError);
  assert.throws(() => createShuffledDeck(() => Number.NaN), RangeError);
});

test("1枚目の選択では手数を増やさず、同じカードの再選択を無視する", () => {
  // 2枚そろって初めて1手になるようにし、1枚目を連打しても状態が進まないことを確認します。
  const game = createGame(() => 0.5);
  const firstCard = game.cards[0];
  const oneRevealed = selectCard(game, firstCard.id);

  assert.deepEqual(oneRevealed.revealed, [firstCard.id]);
  assert.equal(oneRevealed.moves, 0);
  assert.equal(oneRevealed.lastResult, "first");
  assert.equal(selectCard(oneRevealed, firstCard.id), oneRevealed);
});

test("一致した2枚を固定し、手数とそろったカード数を更新する", () => {
  // 同じ絵柄を選んだ場合は表向きの一致済み集合に移し、ペアとして数えます。
  let game = createGame(() => 0.5);
  const [firstCard, secondCard] = game.cards.filter((card) => card.faceId === game.cards[0].faceId);

  game = selectCard(game, firstCard.id);
  game = selectCard(game, secondCard.id);

  assert.equal(game.moves, 1);
  assert.equal(game.matched.length, 2);
  assert.deepEqual(game.revealed, []);
  assert.equal(game.status, "playing");
  assert.equal(game.lastResult, "match");
  assert.equal(selectCard(game, firstCard.id), game);
});

test("不一致の2枚は待機状態で保持し、3枚目の選択を無視する", () => {
  // mismatch表示中に追加のカードを開かないことで、記憶する時間を保ちます。
  let game = createGame(() => 0.5);
  const firstCard = game.cards[0];
  const secondCard = game.cards.find((card) => card.faceId !== firstCard.faceId);
  const thirdCard = game.cards.find(
    (card) => card.id !== firstCard.id && card.id !== secondCard.id,
  );

  game = selectCard(game, firstCard.id);
  game = selectCard(game, secondCard.id);

  assert.equal(game.status, "waiting");
  assert.equal(game.moves, 1);
  assert.deepEqual(game.revealed, [firstCard.id, secondCard.id]);
  assert.equal(selectCard(game, thirdCard.id), game);
});

test("待機状態の不一致カードを裏向きに戻す", () => {
  // タイマーそのものは画面側に任せ、満了後の状態変更だけを純粋関数で確認します。
  let game = createGame(() => 0.5);
  const firstCard = game.cards[0];
  const secondCard = game.cards.find((card) => card.faceId !== firstCard.faceId);

  game = selectCard(selectCard(game, firstCard.id), secondCard.id);
  const hidden = hideMismatchedCards(game);

  assert.equal(hidden.status, "playing");
  assert.deepEqual(hidden.revealed, []);
  assert.equal(hidden.moves, 1);
  assert.equal(hidden.lastResult, "mismatch-hidden");
  assert.equal(hideMismatchedCards(hidden), hidden);
});

test("全ペアをそろえると完了状態になり、手数がペアごとに増える", () => {
  // 8ペアをすべて選ぶ経路を通し、最終状態と手数が一致することを確認します。
  let game = createGame(() => 0.5);

  for (const face of CARD_FACES) {
    const pair = game.cards.filter((card) => card.faceId === face.faceId);
    game = selectCard(game, pair[0].id);
    game = selectCard(game, pair[1].id);
  }

  assert.equal(game.status, "complete");
  assert.equal(game.matched.length, CARD_COUNT);
  assert.equal(game.moves, PAIR_COUNT);
  assert.equal(game.lastResult, "complete");
  assert.equal(selectCard(game, 0), game);
});

test("リセットで新しい盤面と0手・0ペアの状態を作る", () => {
  // リセット前に対戦済みでも、古い盤面や累計を共有しない状態を返します。
  const oldGame = createGame(() => 0);
  const firstPair = oldGame.cards.filter((card) => card.faceId === oldGame.cards[0].faceId);
  const played = selectCard(
    selectCard(oldGame, firstPair[0].id),
    firstPair[1].id,
  );
  const newGame = resetGame(() => 0.999999);

  assert.deepEqual(newGame.revealed, []);
  assert.deepEqual(newGame.matched, []);
  assert.equal(newGame.moves, 0);
  assert.equal(newGame.status, "playing");
  assert.equal(newGame.lastResult, "reset");
  assert.notEqual(newGame.cards, played.cards);
  assert.notDeepEqual(newGame.cards, oldGame.cards);
  assert.equal(played.moves, 1);
});
