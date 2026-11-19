/**
 * 数字当てのルールだけを画面表示から分離したモジュールです。
 * DOMを使わないため、同じルールをブラウザーとNode.jsのテストから呼び出せます。
 */
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 100;
export const MAX_ATTEMPTS = 7;

/**
 * 乱数を1〜100の整数に変換します。
 * random関数を引数で受け取れるので、テストでは0や0.99を渡して境界値を固定できます。
 */
export function createRandomTarget(random = Math.random) {
  const sample = random();

  // Math.randomの契約は0以上1未満です。契約外の値を黙って使うと101などが出るため拒否します。
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError("乱数は0以上1未満である必要があります。");
  }

  // 100個の候補を0始まりの範囲へ写し、最後に最小値を足して1〜100にします。
  return Math.floor(sample * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
}

/**
 * 新しいゲーム状態を作ります。
 * targetを外から渡すことで、画面では乱数を使いつつ、テストでは正解を決め打ちできます。
 */
export function createGame(target, maxAttempts = MAX_ATTEMPTS) {
  if (!Number.isInteger(target) || target < MIN_NUMBER || target > MAX_NUMBER) {
    throw new RangeError("正解の数字は1から100までの整数にしてください。");
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("予想回数は1以上の整数にしてください。");
  }

  return {
    target,
    maxAttempts,
    attempts: 0,
    status: "playing",
    feedback: "1から100までの数字を入力してください。",
  };
}

/**
 * 入力を検証し、1回分の予想結果から次の状態を返します。
 * 状態を直接書き換えず新しいオブジェクトを返すため、前後の状態をテストしやすくなります。
 */
export function submitGuess(game, rawGuess) {
  // 終了後は入力を無視して勝敗や回数が変わらないようにします。
  if (game.status !== "playing") {
    return game;
  }

  const input = String(rawGuess).trim();

  // 空欄は数値0に変換される前に見つけ、試行回数を消費しない形で説明を返します。
  if (input === "") {
    return { ...game, feedback: "数字を入力してください。" };
  }

  const guess = Number(input);

  // 小数や文字列は数当てのルールに合わないため、正解との比較より先に除外します。
  if (!Number.isFinite(guess) || !Number.isInteger(guess)) {
    return { ...game, feedback: "整数を入力してください。" };
  }

  // 入力範囲の確認も試行回数を増やす前に行い、やり直せる入力ミスを失敗回数にしません。
  if (guess < MIN_NUMBER || guess > MAX_NUMBER) {
    return { ...game, feedback: "1から100までの数字を入力してください。" };
  }

  const attempts = game.attempts + 1;

  // 正解なら即終了し、正解した回数をメッセージに含めて成功が分かるようにします。
  if (guess === game.target) {
    return {
      ...game,
      attempts,
      status: "won",
      feedback: attempts + "回目で正解です！",
    };
  }

  // 最後の有効な予想を外した場合は、ヒントより先に敗北状態を確定します。
  if (attempts >= game.maxAttempts) {
    return {
      ...game,
      attempts,
      status: "lost",
      feedback: game.maxAttempts + "回使い切りました。正解は" + game.target + "でした。",
    };
  }

  // 正解と予想を比べて次の方向を伝え、残り回数も一緒に示します。
  const hint = guess < game.target ? "もっと大きいです。" : "もっと小さいです。";
  const remaining = game.maxAttempts - attempts;

  return {
    ...game,
    attempts,
    feedback: hint + " あと" + remaining + "回です。",
  };
}
