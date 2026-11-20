import assert from "node:assert/strict";
import { test } from "node:test";

// main.jsのイベント処理を小さなDOMスタブで動かし、依存ライブラリを増やさず画面案内を確認します。
class FakeButton {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.listeners = new Map();
    this.classList = { toggle() {} };
    this.disabled = false;
    this.textContent = "";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get("click")?.();
  }

  setAttribute() {}
}

function restoreGlobal(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}

test("消音中にリセットしても消音案内を維持する", async () => {
  const previous = Object.fromEntries(
    ["AudioContext", "document", "window"].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  const elements = new Map([
    ["#start-button", new FakeButton()],
    ["#reset-button", new FakeButton()],
    ["#mute-button", new FakeButton()],
    ["#score-output", new FakeButton()],
    ["#game-feedback", new FakeButton()],
    ["#audio-notice", new FakeButton()],
  ]);
  const pads = ["red", "blue", "yellow", "green"].map((pad) => new FakeButton({ pad }));
  let timerId = 0;

  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: class FakeAudioContext {},
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      querySelectorAll: () => pads,
      querySelector: (selector) => elements.get(selector) ?? null,
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout: () => ++timerId,
      clearTimeout() {},
      addEventListener() {},
    },
  });

  try {
    const moduleUrl = new URL("../src/games/simon/main.js", import.meta.url);
    moduleUrl.searchParams.set("test", String(Date.now()));
    await import(moduleUrl.href);

    const muteButton = elements.get("#mute-button");
    const resetButton = elements.get("#reset-button");
    const audioNotice = elements.get("#audio-notice");

    muteButton.click();
    resetButton.click();
    assert.equal(
      audioNotice.textContent,
      "消音中です。画面のパッド表示で順番を確認してください。",
    );

    muteButton.click();
    resetButton.click();
    assert.equal(audioNotice.textContent, "スタート後に音声を開始します。");
  } finally {
    for (const [name, descriptor] of Object.entries(previous)) {
      restoreGlobal(name, descriptor);
    }
  }
});
