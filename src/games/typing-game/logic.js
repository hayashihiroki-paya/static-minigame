import { prompts } from "./prompts.js";

export const ROUND_MS = 30_000;

export function startRound(now) {
  return { deadline: now + ROUND_MS, score: 0 };
}

export function remainingMs(round, now) {
  return Math.max(0, round.deadline - now);
}

export function currentPrompt(round) {
  return prompts[round.score % prompts.length];
}

export function answerQuestion(round, answer, now) {
  // 表示更新が遅れた場合も、回答を受け取った時点で締め切りを判定します。
  if (remainingMs(round, now) === 0) return "expired";
  if (answer !== currentPrompt(round)) return "incorrect";
  round.score += 1;
  return "correct";
}

/** 通常のEnterだけを回答に使います。一部のブラウザーではIME操作を229で識別します。 */
export function isAnswerEnter(event, composing) {
  return event.key === "Enter" && !event.repeat
    && !composing && !event.isComposing && event.keyCode !== 229;
}
