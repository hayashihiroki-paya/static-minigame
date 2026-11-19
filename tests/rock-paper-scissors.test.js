import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addRoundToScore,
  chooseComputerHand,
  createInitialScore,
  judgeRound,
  resetScore,
} from "../src/games/rock-paper-scissors/logic.js";

/**
 * ルールをDOMから独立させたまま固定値で検証します。
 * 乱数に頼らず手を指定することで、同じ組み合わせが毎回同じ結果になることを確認できます。
 */

test("乱数の範囲の境界でコンピューターの手を選ぶ", () => {
  // 乱数を3等分した各区間の先頭と最大に近い値を、グー・チョキ・パーへ対応させます。
  assert.equal(chooseComputerHand(() => 0), "rock");
  assert.equal(chooseComputerHand(() => 1 / 3), "scissors");
  assert.equal(chooseComputerHand(() => 2 / 3), "paper");
  assert.equal(chooseComputerHand(() => 0.999999), "paper");
});

test("乱数が0以上1未満でなければ選択を中断する", () => {
  // Math.randomの契約外の値を使うと偏ったり無効な手になったりするため、明示的に拒否します。
  assert.throws(() => chooseComputerHand(() => 1), RangeError);
  assert.throws(() => chooseComputerHand(() => -0.01), RangeError);
  assert.throws(() => chooseComputerHand(() => Number.NaN), RangeError);
});

test("9通りすべての手の組み合わせを勝ち・負け・あいこに判定する", () => {
  // 3×3の全組み合わせを表で確認し、どの手の組でも勝ち負けの向きを取り違えないようにします。
  const cases = [
    ["rock", "rock", "draw"],
    ["rock", "scissors", "win"],
    ["rock", "paper", "lose"],
    ["scissors", "rock", "lose"],
    ["scissors", "scissors", "draw"],
    ["scissors", "paper", "win"],
    ["paper", "rock", "win"],
    ["paper", "scissors", "lose"],
    ["paper", "paper", "draw"],
  ];

  for (const [playerHand, computerHand, expected] of cases) {
    assert.equal(judgeRound(playerHand, computerHand), expected, `${playerHand} vs ${computerHand}`);
  }
});

test("登録されていない手は勝敗判定に使わない", () => {
  // 表示側や将来の変更が不正な値を渡した際に、誤って負け扱いにしないことを確認します。
  assert.throws(() => judgeRound("lizard", "rock"), RangeError);
  assert.throws(() => judgeRound("rock", "spock"), RangeError);
});

test("各ラウンドの結果を対応する累計だけに加える", () => {
  // 勝ち・負け・あいこを順に加え、他の種類のスコアは変わらないことを確認します。
  const start = createInitialScore();
  const afterWin = addRoundToScore(start, "win");
  const afterLoss = addRoundToScore(afterWin, "lose");
  const afterDraw = addRoundToScore(afterLoss, "draw");

  assert.deepEqual(start, { wins: 0, losses: 0, draws: 0 });
  assert.deepEqual(afterWin, { wins: 1, losses: 0, draws: 0 });
  assert.deepEqual(afterLoss, { wins: 1, losses: 1, draws: 0 });
  assert.deepEqual(afterDraw, { wins: 1, losses: 1, draws: 1 });
});

test("スコアのリセットで勝ち・負け・あいこを0に戻す", () => {
  // 一度ずつ結果が記録された状態からリセットし、元の累計が変更されないことも確認します。
  const played = { wins: 2, losses: 3, draws: 1 };

  assert.deepEqual(resetScore(played), { wins: 0, losses: 0, draws: 0 });
  assert.deepEqual(played, { wins: 2, losses: 3, draws: 1 });
});

test("不明な結果や壊れたスコアは累計へ加えない", () => {
  // 内部状態が不正なときに静かに続行せず、変更箇所を早く見つけられるようにします。
  assert.throws(() => addRoundToScore(createInitialScore(), "unknown"), RangeError);
  assert.throws(() => addRoundToScore({ wins: -1, losses: 0, draws: 0 }, "win"), RangeError);
  assert.throws(() => resetScore({ wins: 0, losses: 0 }), RangeError);
});
