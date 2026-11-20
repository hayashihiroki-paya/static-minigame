const PAD_FREQUENCIES = {
  red: 261.63,
  blue: 329.63,
  yellow: 392,
  green: 523.25,
};

let audioContext = null;
let muted = false;
const activeOscillators = new Set();

function getAudioContextConstructor() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
}

/** ブラウザーにAudioContextがあるかを調べ、未対応時は画面だけで遊べるようにします。 */
export function isAudioSupported() {
  return getAudioContextConstructor() !== null;
}

/** AudioContextは自動再生制限に合わせ、スタート操作から呼ばれたときだけ開始します。 */
export async function startAudio() {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return false;
  }

  try {
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return audioContext.state === "running";
  } catch {
    // 音声の初期化に失敗しても、ルールと視覚表示はそのまま利用できます。
    return false;
  }
}

/** 消音中は現在鳴っている音も止め、次の操作まで残らないようにします。 */
export function setMuted(nextMuted) {
  muted = Boolean(nextMuted);
  if (muted) {
    for (const oscillator of activeOscillators) {
      try {
        oscillator.stop();
      } catch {
        // すでに停止した発振器は無視し、ほかの音の停止を続けます。
      }
    }
  }
}

/** 指定パッドの音を短く合成し、再生後に音声ノードを片付けます。 */
export function playTone(pad, durationSeconds = 0.24) {
  const frequency = PAD_FREQUENCIES[pad];
  if (muted || !audioContext || audioContext.state !== "running" || !frequency) {
    return false;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startTime = audioContext.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.onended = () => {
    activeOscillators.delete(oscillator);
    oscillator.disconnect();
    gain.disconnect();
  };

  activeOscillators.add(oscillator);
  oscillator.start(startTime);
  oscillator.stop(startTime + durationSeconds);
  return true;
}

/** リセットやページ終了時に音声コンテキストを閉じ、再生資源を残しません。 */
export async function closeAudio() {
  const contextToClose = audioContext;
  audioContext = null;
  activeOscillators.clear();

  if (contextToClose && contextToClose.state !== "closed") {
    await contextToClose.close();
  }
}
