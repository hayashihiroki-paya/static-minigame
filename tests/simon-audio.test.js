import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closeAudio,
  isAudioSupported,
  playTone,
  setMuted,
  startAudio,
} from "../src/games/simon/audio.js";

function saveAudioGlobals() {
  return {
    audio: Object.getOwnPropertyDescriptor(globalThis, "AudioContext"),
    webkit: Object.getOwnPropertyDescriptor(globalThis, "webkitAudioContext"),
  };
}

function restoreGlobal(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}

test("Web Audio非対応時は音声を開始せず、画面プレイへ戻せる", async () => {
  const previous = saveAudioGlobals();
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: undefined });
  Object.defineProperty(globalThis, "webkitAudioContext", { configurable: true, value: undefined });

  try {
    assert.equal(isAudioSupported(), false);
    assert.equal(await startAudio(), false);
    assert.equal(playTone("red"), false);
  } finally {
    restoreGlobal("AudioContext", previous.audio);
    restoreGlobal("webkitAudioContext", previous.webkit);
  }
});

test("AudioContextを再開して音を合成し、消音と終了で後片付けする", async () => {
  const previous = saveAudioGlobals();

  class FakeAudioContext {
    static latest;

    constructor() {
      this.state = "suspended";
      this.currentTime = 2;
      this.destination = {};
      this.oscillators = [];
      FakeAudioContext.latest = this;
    }

    async resume() {
      this.state = "running";
    }

    createOscillator() {
      const oscillator = {
        frequency: { setValueAtTime: (value) => { oscillator.frequencyValue = value; } },
        connect() {},
        disconnect() { oscillator.disconnected = true; },
        start(value) { oscillator.startedAt = value; },
        stop(value) {
          oscillator.stoppedAt = value;
          oscillator.stopCount = (oscillator.stopCount ?? 0) + 1;
        },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }

    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }

    async close() {
      this.state = "closed";
    }
  }

  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: FakeAudioContext,
  });
  Object.defineProperty(globalThis, "webkitAudioContext", {
    configurable: true,
    value: undefined,
  });

  try {
    setMuted(false);
    assert.equal(isAudioSupported(), true);
    assert.equal(await startAudio(), true);
    assert.equal(FakeAudioContext.latest.state, "running");
    assert.equal(playTone("blue"), true);
    assert.equal(FakeAudioContext.latest.oscillators[0].frequencyValue, 329.63);

    setMuted(true);
    assert.equal(playTone("blue"), false);
    assert.equal(FakeAudioContext.latest.oscillators[0].stopCount, 2);
    await closeAudio();
    assert.equal(FakeAudioContext.latest.state, "closed");
  } finally {
    setMuted(false);
    await closeAudio();
    restoreGlobal("AudioContext", previous.audio);
    restoreGlobal("webkitAudioContext", previous.webkit);
  }
});
