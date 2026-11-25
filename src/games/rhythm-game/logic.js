export const PERFECT_MS = 80;
export const HIT_MS = 160;

export function createRound(chart) {
  return {
    notes: chart.map((note) => ({ ...note, result: null })),
    counts: { perfect: 0, good: 0, miss: 0 },
    endMs: Math.max(...chart.map((note) => note.timeMs)) + HIT_MS,
  };
}

function record(round, note, result) {
  note.result = result;
  round.counts[result] += 1;
}

export function expireNotes(round, nowMs) {
  let missed = 0;
  for (const note of round.notes) {
    // 受付範囲の最後の1msも入力に使えるため、境界を過ぎてからミスにします。
    if (note.result === null && nowMs - note.timeMs > HIT_MS) {
      record(round, note, "miss");
      missed += 1;
    }
  }
  return missed;
}

export function judgeInput(round, lane, nowMs) {
  let nearest = null;
  let distance = HIT_MS + 1;
  for (const note of round.notes) {
    if (note.lane !== lane || note.result !== null) continue;
    const difference = Math.abs(note.timeMs - nowMs);
    if (difference <= HIT_MS && difference < distance) {
      nearest = note;
      distance = difference;
    }
  }

  // 同じレーンの受付範囲が重なる場合は、一番近い未判定ノーツだけを確定します。
  if (!nearest) return null;
  const result = distance <= PERFECT_MS ? "perfect" : "good";
  record(round, nearest, result);
  return result;
}

export function isRoundOver(round, nowMs) {
  return nowMs > round.endMs;
}
