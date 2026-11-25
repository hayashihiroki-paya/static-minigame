import { answerQuestion, currentPrompt, isAnswerEnter, remainingMs, startRound } from "./logic.js";

const input = document.querySelector("#typing-answer");
const submit = document.querySelector("#typing-submit");
const start = document.querySelector("#typing-start");
const prompt = document.querySelector("#typing-prompt");
const time = document.querySelector("#typing-time");
const score = document.querySelector("#typing-score");
const status = document.querySelector("#typing-status");

let round = null;
let timerId;
let composing = false;
let compositionEndTimer;

function finishRound() {
  const shouldRestoreFocus = [input, submit].includes(document.activeElement);
  clearInterval(timerId);
  time.textContent = "0";
  status.textContent = "時間切れ。正解は" + round.score + "問でした。";
  round = null;
  input.disabled = true;
  submit.disabled = true;
  start.textContent = "もう一度遊ぶ";
  start.hidden = false;
  if (shouldRestoreFocus) start.focus();
}

function updateClock() {
  if (!round) return;
  const remaining = remainingMs(round, performance.now());
  if (remaining === 0) {
    finishRound();
  } else {
    time.textContent = String(Math.ceil(remaining / 1000));
  }
}

function submitAnswer() {
  if (!round || composing) return;
  const result = answerQuestion(round, input.value, performance.now());
  if (result === "expired") {
    finishRound();
    return;
  }
  if (result === "incorrect") {
    status.textContent = "お題と一致しません。同じお題にもう一度答えてください。";
  } else {
    score.textContent = String(round.score);
    prompt.textContent = currentPrompt(round);
    status.textContent = "正解。次のお題は「" + prompt.textContent + "」です。";
    input.value = "";
  }
  input.focus();
}

input.addEventListener("compositionstart", () => {
  clearTimeout(compositionEndTimer);
  composing = true;
  submit.disabled = true;
});
input.addEventListener("compositionend", () => {
  // 確定と同じ処理の中でEnterが届く場合も除外し、次の操作から回答を受け付けます。
  compositionEndTimer = setTimeout(() => {
    composing = false;
    submit.disabled = round === null;
  }, 0);
});
input.addEventListener("keydown", (event) => {
  // フォームの暗黙送信に頼らず、IMEの通常の確定操作はブラウザーに任せます。
  if (!isAnswerEnter(event, composing)) return;
  event.preventDefault();
  submitAnswer();
});
submit.addEventListener("click", submitAnswer);

start.addEventListener("click", () => {
  if (round) return;
  clearTimeout(compositionEndTimer);
  composing = false;
  round = startRound(performance.now());
  input.value = "";
  input.disabled = false;
  submit.disabled = false;
  score.textContent = "0";
  prompt.textContent = currentPrompt(round);
  status.textContent = "開始しました。お題は「" + prompt.textContent + "」です。";
  updateClock();
  timerId = setInterval(updateClock, 100);
  input.focus();
  start.hidden = true;
});
