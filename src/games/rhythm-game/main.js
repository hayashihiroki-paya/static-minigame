import { scheduleChart } from "./audio.js";
import { chart } from "./chart.js";
import { createRound, expireNotes, isRoundOver, judgeInput } from "./logic.js";

const start = document.querySelector("#rhythm-start");
const status = document.querySelector("#rhythm-status");
const judgment = document.querySelector("#rhythm-judgment");
const lanes = [...document.querySelectorAll(".rhythm-lane")];
const pads = [...document.querySelectorAll(".rhythm-pad button")];
const laneByKey = new Map(pads.map((pad, lane) => [pad.dataset.key, lane]));
const labels = { perfect: "ぴったり", good: "少しずれた", miss: "ミス" };
const counters = Object.keys(labels).map((key) => [key, document.querySelector("#rhythm-" + key)]);
const travelMs = 1400;

const markers = chart.map(({ lane }) => {
  const marker = document.createElement("div");
  marker.className = "rhythm-note";
  marker.hidden = true;
  lanes[lane].append(marker);
  return marker;
});

let audio = null;
let playbackStart = 0;
let round = null;
let frameId;

function songTime() {
  return Math.round((audio.currentTime - playbackStart) * 1000);
}

function showCounts() {
  for (const [key, element] of counters) {
    element.textContent = String(round.counts[key]);
  }
}

function stopPlayback(message, retryLabel) {
  cancelAnimationFrame(frameId);
  round = null;
  const previousAudio = audio;
  audio = null;
  // コンテキストを閉じると、途中終了でも予約済みの音がすべて止まります。
  if (previousAudio && previousAudio.state !== "closed") {
    previousAudio.close().catch(() => {});
  }

  const hadPadFocus = pads.includes(document.activeElement);
  markers.forEach((marker) => { marker.hidden = true; });
  pads.forEach((pad) => { pad.disabled = true; });
  status.textContent = message;
  start.textContent = retryLabel;
  start.disabled = false;
  if (hadPadFocus) start.focus();
}

function updateNotes(now) {
  if (expireNotes(round, now) > 0) {
    judgment.textContent = labels.miss;
    showCounts();
  }
}

function renderFrame() {
  if (!round) return;
  const now = songTime();
  updateNotes(now);
  if (isRoundOver(round, now)) {
    const { perfect, good, miss } = round.counts;
    stopPlayback("終了。ぴったり " + perfect + "、少しずれた " + good + "、ミス " + miss + "。", "もう一度遊ぶ");
    return;
  }

  round.notes.forEach((note, index) => {
    // 画面の更新回数ではなく、発音時刻までの時間からラインに対する位置を計算します。
    const progress = 1 - (note.timeMs - now) / travelMs;
    const marker = markers[index];
    marker.hidden = note.result !== null || progress < 0;
    if (!marker.hidden) marker.style.top = "calc(var(--judge-line) * " + progress + ")";
  });
  frameId = requestAnimationFrame(renderFrame);
}

function hit(lane) {
  if (!round) return;
  const now = songTime();
  updateNotes(now);
  const result = judgeInput(round, lane, now);
  if (result !== null) {
    judgment.textContent = labels[result];
    showCounts();
  }
}

document.addEventListener("keydown", (event) => {
  const lane = laneByKey.get(event.key.toLowerCase());
  if (round && lane !== undefined && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault();
    hit(lane);
  }
});

pads.forEach((pad, lane) => {
  // タッチは指を置いた時刻で判定します。Enter等が起こすクリックも受け付けます。
  pad.addEventListener("pointerdown", (event) => {
    if (event.button === 0) hit(lane);
  });
  pad.addEventListener("click", (event) => {
    if (event.detail === 0) hit(lane);
  });
});

start.addEventListener("click", async () => {
  if (audio) return;
  start.disabled = true;
  status.textContent = "音を準備しています。";

  let context;
  try {
    context = new AudioContext();
    audio = context;
    await context.resume();
    if (audio !== context) return;
    if (context.state !== "running") throw new Error("音声を開始できませんでした。");

    playbackStart = context.currentTime + 0.15;
    scheduleChart(context, chart, playbackStart);
    round = createRound(chart);
    showCounts();
    judgment.textContent = "準備";
    status.textContent = "プレイ中。ノーツが判定ラインに重なったら押してください。";
    pads.forEach((pad) => { pad.disabled = false; });
    pads[0].focus({ preventScroll: true });
    frameId = requestAnimationFrame(renderFrame);

    context.addEventListener("statechange", () => {
      if (audio === context && context.state !== "running") {
        stopPlayback("音声が中断されました。もう一度遊べます。", "もう一度遊ぶ");
      }
    });
  } catch {
    if (context && context !== audio) return;
    stopPlayback("音を開始できませんでした。もう一度お試しください。", "もう一度遊ぶ");
    start.focus();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && audio) {
    stopPlayback("画面を離れたため中断しました。もう一度遊べます。", "もう一度遊ぶ");
  }
});
