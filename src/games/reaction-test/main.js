// 画面入力と案内を担当し、待ち時間・計測・ラウンド判定はlogic.jsへ委ねます。
import {
  ROUND_COUNT,
  createReactionGameController,
  summarizeResults,
} from "./logic.js";

// 状態表示を更新する要素を先に取得し、ルール側からDOMを参照しない構成にします。
const signalDisplay = document.querySelector("#signal-display");
const roundOutput = document.querySelector("#round-output");
const lastTimeOutput = document.querySelector("#last-time-output");
const averageOutput = document.querySelector("#average-output");
const fastestOutput = document.querySelector("#fastest-output");
const summaryPanel = document.querySelector("#result-summary");
const roundResults = document.querySelector("#round-results");
const feedback = document.querySelector("#game-feedback");
const actionButton = document.querySelector("#action-button");
const resetButton = document.querySelector("#reset-button");

/**
 * 状態に応じて説明を変え、色だけに頼らず次の操作を伝えます。
 * @param {object} state 反射神経テストの状態
 * @returns {string} ライブ領域に表示する日本語案内
 */
function getFeedbackText(state) {
  if (state.phase === "waiting") {
    return (
      "第" +
      (state.results.length + 1) +
      "ラウンドです。合図が出るまで待ってください。今押すとフライングです。"
    );
  }
  if (state.phase === "go") {
    return (
      "第" +
      (state.results.length + 1) +
      "ラウンドです。合図が出ました。今すぐ押してください。"
    );
  }
  if (state.phase === "result") {
    const lastTime = state.results[state.results.length - 1];
    return "第" + state.results.length + "ラウンドは" + lastTime + "ミリ秒です。次へ進めます。";
  }
  if (state.phase === "false-start") {
    return "フライングです。この記録は終了しました。新しい記録を始められます。";
  }
  if (state.phase === "finished") {
    const summary = summarizeResults(state.results);
    return (
      "5ラウンド終了です。平均は" +
      summary.averageMs +
      "ミリ秒、最速は" +
      summary.fastestMs +
      "ミリ秒です。"
    );
  }
  return "準備ができたら「記録を始める」を押してください。";
}

/**
 * 大きな合図、ラウンド履歴、操作名、読み上げ案内を状態に同期します。
 * 合図表示時にlogic.jsが記録した時刻と、押した時刻の差だけを結果として見せます。
 * @param {object} state 最新のゲーム状態
 */
function render(state) {
  const isActiveRound = state.phase === "waiting" || state.phase === "go";
  const visibleRound = isActiveRound ? state.results.length + 1 : state.results.length;

  roundOutput.textContent = visibleRound + " / " + ROUND_COUNT;
  lastTimeOutput.textContent = state.results.length
    ? state.results[state.results.length - 1] + " ミリ秒"
    : "—";
  signalDisplay.dataset.phase = state.phase;
  feedback.textContent = getFeedbackText(state);

  if (state.phase === "waiting") {
    signalDisplay.textContent = "待って…";
    actionButton.textContent = "待機中（押すとフライング）";
  } else if (state.phase === "go") {
    signalDisplay.textContent = "押して！";
    actionButton.textContent = "今すぐ押す";
  } else if (state.phase === "result") {
    signalDisplay.textContent = state.results[state.results.length - 1] + " ミリ秒";
    actionButton.textContent = "次のラウンドへ";
  } else if (state.phase === "false-start" || state.phase === "finished") {
    signalDisplay.textContent = state.phase === "finished" ? "記録終了" : "フライング";
    actionButton.textContent = "新しい記録を始める";
  } else {
    signalDisplay.textContent = "準備";
    actionButton.textContent = "記録を始める";
  }

  roundResults.replaceChildren();
  state.results.forEach((value, index) => {
    const item = document.createElement("li");
    item.textContent = index + 1 + "回目：" + value + " ミリ秒";
    roundResults.append(item);
  });

  const hasFinished = state.phase === "finished";
  summaryPanel.hidden = !hasFinished;
  if (hasFinished) {
    const summary = summarizeResults(state.results);
    averageOutput.textContent = summary.averageMs + " ミリ秒";
    fastestOutput.textContent = summary.fastestMs + " ミリ秒";
  }
}

// 状態通知を受けることで、setTimeout後もルール側から描画関数を呼び戻せます。
const controller = createReactionGameController({
  onChange: render,
});

// 開始・次へ・反応・再スタートを状態ごとに同じ大きなボタンで扱います。
actionButton.addEventListener("click", () => {
  const { phase } = controller.getState();
  if (phase === "ready" || phase === "result") {
    controller.startRound();
  } else if (phase === "waiting" || phase === "go") {
    controller.submitResponse();
  } else {
    controller.reset();
  }
});

// リセットは待機中にも使え、タイマーを止めて古い合図を無効にします。
resetButton.addEventListener("click", () => {
  controller.reset();
});

// 戻る操作などでページが一時退避されても、古い待機が復帰後に合図しないようにします。
window.addEventListener("pagehide", () => {
  controller.reset();
});

render(controller.getState());
