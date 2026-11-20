/**
 * 神経衰弱の画面とルールモジュールをつなぎます。
 * 盤面状態はlogic.jsに任せ、このファイルではボタン、表示、待ち時間を管理します。
 */
import {
  CARD_COUNT,
  MISMATCH_DELAY_MS,
  createGame,
  hideMismatchedCards,
  resetGame,
  selectCard,
} from "./logic.js";

const cardGrid = document.querySelector("#card-grid");
const gameFeedback = document.querySelector("#game-feedback");
const movesOutput = document.querySelector("#moves-count");
const pairsOutput = document.querySelector("#pairs-count");
const resetButton = document.querySelector("#reset-button");

let game = createGame();
let mismatchTimer = null;
const cardButtons = new Map();

/**
 * 絵柄のラベルと現在の状態を使って読み上げ用の名前を作ります。
 * 見た目の絵文字だけに頼らず、カード番号・絵柄・表裏を伝えます。
 */
function getCardLabel(card, isFaceUp, isMatched) {
  const cardNumber = card.id + 1;

  if (!isFaceUp) {
    return `カード${cardNumber}、裏向き`;
  }

  const stateLabel = isMatched ? "ペア完成" : "表向き";
  return `カード${cardNumber}、${card.name}、${stateLabel}`;
}

/**
 * 初回にカードボタンを盤面位置ごとに作ります。
 * 再描画のたびにボタンを作り直さず、キーボード利用時のフォーカスを保ちます。
 */
function createCardButtons() {
  const fragment = document.createDocumentFragment();

  for (const card of game.cards) {
    const button = document.createElement("button");
    button.className = "memory-card";
    button.type = "button";
    button.dataset.cardId = String(card.id);
    button.addEventListener("click", () => chooseCard(card.id));
    cardButtons.set(card.id, button);
    fragment.append(button);
  }

  cardGrid.replaceChildren(fragment);
}

function getFeedbackMessage() {
  if (game.lastResult === "first") {
    return "1枚目を選びました。もう1枚選んでください。";
  }

  if (game.lastResult === "match") {
    return "ペアがそろいました。次のペアを探してください。";
  }

  if (game.lastResult === "mismatch") {
    return "ペアではありません。絵柄を覚えてください。";
  }

  if (game.lastResult === "mismatch-hidden") {
    return "カードを裏返しました。次のペアを探してください。";
  }

  if (game.lastResult === "complete") {
    return `すべてそろいました。${game.moves}手で完成です。`;
  }

  if (game.lastResult === "reset") {
    return "ゲームをリセットしました。カードを2枚選んでください。";
  }

  return "カードを2枚選んで、絵柄のペアを探してください。";
}

/**
 * 状態からカード・手数・ペア数をまとめて描画します。
 * 表向きと一致済みは別々に計算し、間違いカードだけが時間後に裏返るようにします。
 */
function renderGame() {
  for (const card of game.cards) {
    const button = cardButtons.get(card.id);
    const isMatched = game.matched.includes(card.id);
    const isFaceUp = isMatched || game.revealed.includes(card.id);

    button.textContent = isFaceUp ? card.symbol : "？";
    button.setAttribute("aria-label", getCardLabel(card, isFaceUp, isMatched));
    button.setAttribute("aria-pressed", String(isFaceUp));
    button.classList.toggle("is-revealed", isFaceUp);
    button.classList.toggle("is-matched", isMatched);
  }

  movesOutput.textContent = String(game.moves);
  pairsOutput.textContent = `${game.matched.length / 2} / ${CARD_COUNT / 2}`;
  gameFeedback.textContent = getFeedbackMessage();
}

/**
 * カード選択で状態が変わったときだけ再描画します。
 * 不一致中に3枚目を押しても状態が同じなら、タイマーを追加しません。
 */
function chooseCard(cardId) {
  const nextGame = selectCard(game, cardId);

  if (nextGame === game) {
    return;
  }

  game = nextGame;
  renderGame();

  if (game.status === "waiting") {
    mismatchTimer = window.setTimeout(() => {
      game = hideMismatchedCards(game);
      mismatchTimer = null;
      renderGame();
    }, MISMATCH_DELAY_MS);
  }
}

/**
 * 保留中のタイマーを止めてから、盤面・手数・ペア数を新しいゲームへ置き換えます。
 * リセットとタイマーが競合し、直後に古いカードが再び裏返るのを防ぎます。
 */
function startNewGame() {
  if (mismatchTimer !== null) {
    window.clearTimeout(mismatchTimer);
    mismatchTimer = null;
  }

  game = resetGame();
  createCardButtons();
  renderGame();
  cardButtons.get(0).focus();
}

resetButton.addEventListener("click", startNewGame);

createCardButtons();
renderGame();
