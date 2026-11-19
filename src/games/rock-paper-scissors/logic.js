/**
 * じゃんけんのルールだけを画面表示から分けたモジュールです。
 * 手と結果を英語の固定値で扱うことで、日本語の表示文を変えても判定処理は変わりません。
 */
export const HANDS = Object.freeze(["rock", "scissors", "paper"]);
const OUTCOMES = Object.freeze(["win", "lose", "draw"]);

// グーはチョキに、チョキはパーに、パーはグーに勝つ関係を表します。
const BEATS = Object.freeze({
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
});

/**
 * [0, 1) の乱数を3つの手へ均等に割り当てます。
 * 乱数関数を引数にすることで、テストでは境界の値を固定して結果を再現できます。
 */
export function chooseComputerHand(random = Math.random) {
  const sample = random();

  // Math.randomの契約外の値は、手の選択に使わず早めにエラーとして知らせます。
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError("乱数は0以上1未満である必要があります。");
  }

  // 0以上1未満を3等分し、配列の順番でグー・チョキ・パーに対応させます。
  const handIndex = Math.floor(sample * HANDS.length);
  return HANDS[handIndex];
}

/**
 * プレイヤーとコンピューターの手から、1回分の勝敗を返します。
 * DOMに触れない純粋な関数なので、9通りの組み合わせをNode.jsで直接確認できます。
 */
export function judgeRound(playerHand, computerHand) {
  if (!HANDS.includes(playerHand) || !HANDS.includes(computerHand)) {
    throw new RangeError("グー・チョキ・パーのいずれかを指定してください。");
  }

  if (playerHand === computerHand) {
    return "draw";
  }

  // プレイヤーの手がコンピューターの手に勝つ場合だけ、勝ちを返します。
  return BEATS[playerHand] === computerHand ? "win" : "lose";
}

/**
 * 画面を開いたとき、またはスコアをリセットするときに使う初期値を作ります。
 * 毎回新しいオブジェクトを返し、前のスコアを誤って共有しないようにします。
 */
export function createInitialScore() {
  return { wins: 0, losses: 0, draws: 0 };
}

function assertValidScore(score) {
  const isValidScore =
    score !== null &&
    typeof score === "object" &&
    Number.isInteger(score.wins) &&
    score.wins >= 0 &&
    Number.isInteger(score.losses) &&
    score.losses >= 0 &&
    Number.isInteger(score.draws) &&
    score.draws >= 0;

  if (!isValidScore) {
    throw new RangeError("スコアは0以上の整数で指定してください。");
  }
}

/**
 * 1回分の結果だけを対応する累計へ加え、新しいスコアを返します。
 * 元の状態を変更しないため、更新前後の値をテストで比べられます。
 */
export function addRoundToScore(score, outcome) {
  assertValidScore(score);

  if (!OUTCOMES.includes(outcome)) {
    throw new RangeError("勝ち・負け・あいこのいずれかを指定してください。");
  }

  return {
    wins: score.wins + (outcome === "win" ? 1 : 0),
    losses: score.losses + (outcome === "lose" ? 1 : 0),
    draws: score.draws + (outcome === "draw" ? 1 : 0),
  };
}

/**
 * リセット操作は勝敗の累計だけを0に戻すゲーム上の操作です。
 * 既存スコアを確認してから新しい初期状態を返し、直近の結果表示とは分けて扱えます。
 */
export function resetScore(score) {
  assertValidScore(score);
  return createInitialScore();
}
