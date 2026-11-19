import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGame,
  createRandomTarget,
  MAX_ATTEMPTS,
  MAX_NUMBER,
  MIN_NUMBER,
  submitGuess,
} from "../src/games/number-guess/logic.js";

/**
 * ルールのテストでは正解値を直接渡し、結果が乱数やブラウザー操作に左右されないようにします。
 * これにより、境界値や勝敗条件を同じ入力で何度でも確かめられます。
 */

test("乱数の境界を1と100に変換する", () => {
  // 乱数の最小値は最小の答えに、1に近い値は最大の答えに対応することを確認します。
  assert.equal(createRandomTarget(() => 0), MIN_NUMBER);
  assert.equal(createRandomTarget(() => 0.999999), MAX_NUMBER);
});

test("範囲外の乱数を受け取ったらエラーにする", () => {
  // 乱数関数の契約が破られたとき、存在しない101などを答えに使わないことを確認します。
  assert.throws(() => createRandomTarget(() => 1), RangeError);
  assert.throws(() => createRandomTarget(() => -0.1), RangeError);
});

test("ゲーム開始時は回数0、状態playingで初期化する", () => {
  // 初期状態の不変条件を確かめると、画面側が表示すべき回数と状態を信頼できます。
  const game = createGame(42);

  assert.equal(game.target, 42);
  assert.equal(game.maxAttempts, MAX_ATTEMPTS);
  assert.equal(game.attempts, 0);
  assert.equal(game.status, "playing");
});

test("範囲外の答えや無効な試行回数ではゲームを作らない", () => {
  // 入力条件をゲーム開始時に検証し、後続の比較処理を有効な値だけに保ちます。
  assert.throws(() => createGame(0), RangeError);
  assert.throws(() => createGame(101), RangeError);
  assert.throws(() => createGame(42, 0), RangeError);
});

test("空欄、小数、範囲外の予想は回数を消費しない", () => {
  // 訂正可能な入力ミスを試行回数に数えず、プレイヤーが7回の予想を公平に使えるようにします。
  const start = createGame(42);
  const empty = submitGuess(start, "");
  const decimal = submitGuess(empty, "12.5");
  const tooSmall = submitGuess(decimal, "0");
  const tooLarge = submitGuess(tooSmall, "101");

  assert.equal(empty.attempts, 0);
  assert.equal(decimal.attempts, 0);
  assert.equal(tooSmall.attempts, 0);
  assert.equal(tooLarge.attempts, 0);
  assert.equal(tooLarge.status, "playing");
});

test("答えより小さい予想には大きい方向のヒントを出す", () => {
  // この比較は大小条件の分岐を確認し、同時に有効な予想だけ回数を1増やします。
  const result = submitGuess(createGame(42), "20");

  assert.equal(result.attempts, 1);
  assert.match(result.feedback, /もっと大きい/);
  assert.equal(result.status, "playing");
});

test("答えより大きい予想には小さい方向のヒントを出す", () => {
  // 逆方向の分岐も別に検査し、上下ヒントを取り違えた不具合を見つけられるようにします。
  const result = submitGuess(createGame(42), "70");

  assert.equal(result.attempts, 1);
  assert.match(result.feedback, /もっと小さい/);
  assert.equal(result.status, "playing");
});

test("正解したら勝利状態になり、成功した回数を保持する", () => {
  // 連続して外したあとに正解する経路で、回数と状態が同時に更新されることを確かめます。
  const first = submitGuess(createGame(42), "20");
  const second = submitGuess(first, "42");

  assert.equal(second.attempts, 2);
  assert.equal(second.status, "won");
  assert.match(second.feedback, /2回目で正解/);
});

test("最後の予想を外すと終了し、正解を表示する", () => {
  // maxAttemptsを小さく設定して最終回の分岐を短く再現し、正解の開示も検証します。
  const oneTryGame = createGame(42, 1);
  const result = submitGuess(oneTryGame, "20");

  assert.equal(result.attempts, 1);
  assert.equal(result.status, "lost");
  assert.match(result.feedback, /正解は42/);
});

test("終了後は新しい予想を受け付けない", () => {
  // 終了後に同じ状態が返ることを確認し、回数や勝敗が後から変わるのを防ぎます。
  const finished = submitGuess(createGame(42, 1), "42");
  const afterFinish = submitGuess(finished, "10");

  assert.equal(afterFinish, finished);
  assert.equal(afterFinish.attempts, 1);
  assert.equal(afterFinish.status, "won");
});
