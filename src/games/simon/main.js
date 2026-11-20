import {
  closeAudio,
  isAudioSupported,
  playTone,
  setMuted,
  startAudio,
} from "./audio.js";
import {
  PAD_IDS,
  createInitialGame,
  finishSequencePlayback,
  resetGame,
  startGame,
  submitPad,
} from "./logic.js";

const PAD_LABELS = {
  red: "赤・丸",
  blue: "青・三角",
  yellow: "黄・四角",
  green: "緑・星",
};
const KEY_PADS = { "1": "red", "2": "blue", "3": "yellow", "4": "green" };
const PAD_BUTTONS = new Map(
  [...document.querySelectorAll("[data-pad]")].map((button) => [button.dataset.pad, button]),
);
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");
const muteButton = document.querySelector("#mute-button");
const scoreOutput = document.querySelector("#score-output");
const feedback = document.querySelector("#game-feedback");
const audioNotice = document.querySelector("#audio-notice");

let game = createInitialGame();
let muted = false;
let audioReady = false;
let startToken = 0;
let playbackToken = 0;
const playbackTimers = new Set();
const padTimers = new Map();

const STEP_INTERVAL_MS = 640;
const FIRST_STEP_DELAY_MS = 250;

function updateControls() {
  scoreOutput.textContent = String(game.score);
  startButton.disabled = game.status === "showing" || game.status === "input";
  startButton.textContent = game.status === "lost" ? "もう一度遊ぶ" : "スタート";

  for (const button of PAD_BUTTONS.values()) {
    button.disabled = game.status !== "input";
  }

  muteButton.setAttribute("aria-pressed", String(muted));
  muteButton.textContent = muted ? "消音：オン" : "消音：オフ";

  if (game.status === "ready") {
    feedback.textContent = "スタートを押してください。音の順番を覚えて、同じ順に選びましょう。";
  } else if (game.status === "showing") {
    feedback.textContent = "順番を見て、聞いてください。";
  } else if (game.status === "input") {
    feedback.textContent = `あなたの番です。${game.inputIndex + 1}番目を選んでください。`;
  } else {
    feedback.textContent = `ゲームオーバーです。成功したラウンドは${game.score}回です。もう一度遊べます。`;
  }
}

function setPadActive(pad, active) {
  const button = PAD_BUTTONS.get(pad);
  if (!button) return;
  button.classList.toggle("is-active", active);
}

function schedulePlayback(callback, delay) {
  const timer = window.setTimeout(() => {
    playbackTimers.delete(timer);
    callback();
  }, delay);
  playbackTimers.add(timer);
}

function clearPlayback() {
  // トークンを変えると、タイマーが実行待ちだった場合も古い順番を無効にできます。
  playbackToken += 1;
  for (const timer of playbackTimers) {
    window.clearTimeout(timer);
  }
  playbackTimers.clear();

  for (const timer of padTimers.values()) {
    window.clearTimeout(timer);
  }
  padTimers.clear();
  for (const pad of PAD_IDS) setPadActive(pad, false);
}

function flashPad(pad, duration = 200) {
  const oldTimer = padTimers.get(pad);
  if (oldTimer !== undefined) window.clearTimeout(oldTimer);
  setPadActive(pad, true);

  const timer = window.setTimeout(() => {
    padTimers.delete(pad);
    setPadActive(pad, false);
  }, duration);
  padTimers.set(pad, timer);
}

function playSequence() {
  clearPlayback();
  const token = playbackToken;
  const sequence = [...game.sequence];

  sequence.forEach((pad, index) => {
    const delay = FIRST_STEP_DELAY_MS + index * STEP_INTERVAL_MS;
    schedulePlayback(() => {
      if (token !== playbackToken) return;
      flashPad(pad, 260);
      playTone(pad);
      feedback.textContent = `${index + 1}番目、${PAD_LABELS[pad]}。順番を覚えてください。`;
    }, delay);
  });

  const finishDelay = FIRST_STEP_DELAY_MS + sequence.length * STEP_INTERVAL_MS;
  schedulePlayback(() => {
    if (token !== playbackToken) return;
    game = finishSequencePlayback(game);
    updateControls();
  }, finishDelay);
}

async function handleStart() {
  if (game.status !== "ready" && game.status !== "lost") return;

  // 音声再開待ちの二重クリックを防ぎ、リセットされた古い開始処理を無効にします。
  const token = ++startToken;
  startButton.disabled = true;

  // Web Audioはクリックなどのユーザー操作後に開始し、再生制限に従います。
  const startedAudio = muted ? false : await startAudio();
  if (token !== startToken) return;
  audioReady = startedAudio;
  if (!muted && !audioReady) {
    audioNotice.textContent = "音声を利用できないため、光るパッドを見て遊べます。";
  } else if (!muted && isAudioSupported()) {
    audioNotice.textContent = "音声を使っています。消音ボタンで音を切り替えられます。";
  }

  game = startGame(game);
  updateControls();
  playSequence();
}

function handlePad(pad) {
  if (game.status !== "input") return;

  flashPad(pad, 160);
  if (audioReady && !muted) playTone(pad, 0.16);

  const previousStatus = game.status;
  const previousScore = game.score;
  game = submitPad(game, pad);
  updateControls();

  if (game.status === "lost") return;
  if (game.score > previousScore && game.status === "showing") {
    feedback.textContent = `${game.score}ラウンド成功。次の順番です。`;
    playSequence();
  } else if (previousStatus === "input") {
    feedback.textContent = `正解です。${game.inputIndex + 1}番目を選んでください。`;
  }
}

function handleMute() {
  muted = !muted;
  setMuted(muted);
  if (muted) {
    audioNotice.textContent = "消音中です。画面のパッド表示で順番を確認してください。";
  } else if (audioReady) {
    audioNotice.textContent = "音声を使っています。";
  } else if (game.status === "ready" && isAudioSupported()) {
    audioNotice.textContent = "スタート後に音声を開始します。";
  } else if (game.status !== "ready") {
    audioNotice.textContent = "次のスタート操作から音声を利用できます。";
  } else {
    audioNotice.textContent = "このブラウザーでは音声を使わず、画面表示で遊べます。";
  }
  updateControls();
}

function handleReset() {
  startToken += 1;
  clearPlayback();
  game = resetGame();
  audioReady = false;
  void closeAudio();
  // リセット後も消音設定は維持するため、案内を現在の設定に合わせます。
  audioNotice.textContent = muted
    ? "消音中です。画面のパッド表示で順番を確認してください。"
    : isAudioSupported()
      ? "スタート後に音声を開始します。"
      : "このブラウザーでは音声を使わず、画面表示で遊べます。";
  updateControls();
}

for (const [pad, button] of PAD_BUTTONS) {
  button.addEventListener("click", () => handlePad(pad));
}

startButton.addEventListener("click", handleStart);
resetButton.addEventListener("click", handleReset);
muteButton.addEventListener("click", handleMute);
window.addEventListener("keydown", (event) => {
  const pad = KEY_PADS[event.key];
  if (!pad || game.status !== "input") return;
  event.preventDefault();
  handlePad(pad);
});
window.addEventListener("pagehide", () => {
  clearPlayback();
  void closeAudio();
});

audioNotice.textContent = isAudioSupported()
  ? "スタート後に音声を開始します。"
  : "このブラウザーでは音声を使わず、画面表示で遊べます。";
updateControls();
