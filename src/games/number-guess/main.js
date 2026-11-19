/**
 * 数字当ての画面とルールモジュールをつなぐ入口です。
 * ルールの判定はlogic.jsに任せ、このファイルでは入力、表示、フォーカスを管理します。
 */
import { createGame, createRandomTarget, MAX_ATTEMPTS, submitGuess } from "./logic.js";

const form = document.querySelector("#guess-form");
const guessInput = document.querySelector("#guess-input");
const guessButton = document.querySelector("#guess-button");
const feedback = document.querySelector("#game-feedback");
const attemptCounter = document.querySelector("#attempt-counter");
const restartButton = document.querySelector("#restart-button");

// ページを開いた時点で1つの正解を決め、ゲーム中に答えが変わらないよう状態に保存します。
let game = createGame(createRandomTarget());

/**
 * 状態から表示をまとめて更新します。
 * 入力の結果が変わるたび同じ関数を通すことで、勝敗・回数・操作可否のずれを防ぎます。
 */
function renderGame() {
  const remaining = game.maxAttempts - game.attempts;
  const isPlaying = game.status === "playing";

  feedback.textContent = game.feedback;
  attemptCounter.textContent = "残り" + remaining + "回";
  guessInput.disabled = !isPlaying;
  guessButton.disabled = !isPlaying;
  restartButton.hidden = isPlaying;
}

/**
 * フォーム送信はボタンとEnterキーの両方から発生するため、処理を1か所にまとめます。
 * novalidateを使い、空欄や範囲外入力も独自の日本語メッセージで案内します。
 */
form.addEventListener("submit", (event) => {
  event.preventDefault();
  game = submitGuess(game, guessInput.value);
  renderGame();

  // 続けて予想するときは入力を選択状態にし、入力の置き換えをしやすくします。
  if (game.status === "playing") {
    guessInput.select();
    return;
  }

  // 勝敗が決まったときは次の操作へキーボードで進めるよう、再開ボタンにフォーカスします。
  restartButton.focus();
});

/**
 * 再開時は正解・回数・表示・入力欄をまとめて初期状態へ戻します。
 * 新しい乱数を作るので、前のゲームの答えがそのまま残りません。
 */
restartButton.addEventListener("click", () => {
  game = createGame(createRandomTarget(), MAX_ATTEMPTS);
  form.reset();
  renderGame();
  guessInput.focus();
});

// 初期表示も状態から描画し、HTML側の初期文言とルール状態を一致させます。
renderGame();
