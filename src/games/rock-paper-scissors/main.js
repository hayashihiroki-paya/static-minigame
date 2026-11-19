/**
 * じゃんけん画面と、画面表示から分けたルールモジュールをつなぎます。
 * このファイルではボタン操作、ページ内のスコア状態、結果表示を担当します。
 */
import {
  addRoundToScore,
  chooseComputerHand,
  createInitialScore,
  judgeRound,
  resetScore,
} from "./logic.js";

const HAND_LABELS = {
  rock: "グー",
  scissors: "チョキ",
  paper: "パー",
};

const OUTCOME_LABELS = {
  win: "勝ち",
  lose: "負け",
  draw: "あいこ",
};

const handButtons = document.querySelectorAll("[data-hand]");
const playerHandOutput = document.querySelector("#player-hand");
const computerHandOutput = document.querySelector("#computer-hand");
const roundFeedback = document.querySelector("#round-feedback");
const winsOutput = document.querySelector("#wins-count");
const lossesOutput = document.querySelector("#losses-count");
const drawsOutput = document.querySelector("#draws-count");
const resetButton = document.querySelector("#reset-score-button");

// スコアと直近の手を分けて持ち、累計だけをリセットできるようにします。
let score = createInitialScore();
let latestRound = null;

/**
 * スコアと直近の対戦をDOMへ反映します。
 * 状態を更新した後に必ずこの関数を通し、数値と読み上げ用メッセージを揃えます。
 */
function renderGame() {
  winsOutput.textContent = String(score.wins);
  lossesOutput.textContent = String(score.losses);
  drawsOutput.textContent = String(score.draws);

  if (latestRound === null) {
    playerHandOutput.textContent = "—";
    computerHandOutput.textContent = "—";
    return;
  }

  const playerLabel = HAND_LABELS[latestRound.playerHand];
  const computerLabel = HAND_LABELS[latestRound.computerHand];
  const outcomeLabel = OUTCOME_LABELS[latestRound.outcome];

  playerHandOutput.textContent = playerLabel;
  computerHandOutput.textContent = computerLabel;

  // ライブ領域に両者の手と結果をまとめ、読み上げでも1回の対戦内容が分かるようにします。
  if (latestRound.outcome === "draw") {
    roundFeedback.textContent = `あなたは${playerLabel}、コンピューターは${computerLabel}。${outcomeLabel}です。`;
  } else {
    roundFeedback.textContent = `あなたは${playerLabel}、コンピューターは${computerLabel}。あなたの${outcomeLabel}です。`;
  }
}

/**
 * 選ばれた手で1回対戦し、勝敗と累計スコアを順に更新します。
 * コンピューターの手はここで1度だけ選び、結果表示と加算で同じ手を使います。
 */
function playRound(playerHand) {
  const computerHand = chooseComputerHand();
  const outcome = judgeRound(playerHand, computerHand);

  latestRound = { playerHand, computerHand, outcome };
  score = addRoundToScore(score, outcome);
  renderGame();
}

// button要素を使うことで、マウス・タッチに加えてTabとEnter/Spaceでも手を選べます。
handButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playRound(button.dataset.hand);
  });
});

/**
 * リセット後は手の表示も初期状態へ戻し、次の操作場所を最初の手ボタンに移します。
 * キーボード利用者がそのまま新しい対戦を始められるようにするためです。
 */
resetButton.addEventListener("click", () => {
  score = resetScore(score);
  latestRound = null;
  roundFeedback.textContent = "スコアをリセットしました。手を選んでください。";
  renderGame();
  handButtons[0].focus();
});

// HTML上の初期値も状態から描画し、最初の表示と再描画後の書式を統一します。
renderGame();
