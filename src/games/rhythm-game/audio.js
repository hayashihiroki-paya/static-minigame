const frequencies = [262, 330, 392, 523];

export function scheduleChart(context, chart, startTime) {
  // JSのタイマーに頼らず、音声処理側の時計にすべての発音時刻を予約します。
  for (const { lane, timeMs } of chart) {
    const when = startTime + timeMs / 1000;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = "sine";
    tone.frequency.value = frequencies[lane];
    volume.gain.setValueAtTime(0, when);
    volume.gain.linearRampToValueAtTime(0.1, when + 0.008);
    volume.gain.linearRampToValueAtTime(0, when + 0.095);
    tone.connect(volume);
    volume.connect(context.destination);
    tone.addEventListener("ended", () => {
      tone.disconnect();
      volume.disconnect();
    }, { once: true });
    tone.start(when);
    tone.stop(when + 0.1);
  }
}
