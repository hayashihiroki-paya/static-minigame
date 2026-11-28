/**
 * 物理演算を必要としない卓球ゲームのルールをPhaserのSceneから分けます。
 * 得点や方向の計算を通常のJavaScript関数にすると、ブラウザーなしでテストできます。
 */
export const WINNING_SCORE = 5;

const VALID_SIDES = new Set(["player", "cpu"]);
const INITIAL_BALL_SPEED = 340;
const MAX_BALL_SPEED = 620;
const MAX_BOUNCE_ANGLE = 0.95;

/** 新しい試合の得点と勝者を初期化します。 */
export function createScoreState() {
  return { player: 0, cpu: 0, winner: null, serveToward: "cpu" };
}

/**
 * 得点した側を更新し、次のサーブ方向か勝者を返します。
 * 勝利済みのスコアは固定し、二重の衝突イベントで追加点が入らないようにします。
 * @param {{player:number,cpu:number,winner:string|null,serveToward:string|null}} score 現在の得点
 * @param {"player"|"cpu"} side 得点した側
 * @returns {{player:number,cpu:number,winner:string|null,serveToward:string|null}} 次の状態
 */
export function awardPoint(score, side) {
  if (!VALID_SIDES.has(side)) throw new RangeError("得点する側を指定してください。");
  if (!score || !Number.isInteger(score.player) || !Number.isInteger(score.cpu)) {
    throw new RangeError("有効な得点状態を指定してください。");
  }
  if (score.winner) return { ...score, serveToward: null };

  const updated = { ...score, [side]: score[side] + 1 };
  const winner = updated[side] >= WINNING_SCORE ? side : null;
  return {
    ...updated,
    winner,
    // 得点した側から相手側へ向けて次のボールを出します。
    serveToward: winner ? null : side === "player" ? "cpu" : "player",
  };
}

/**
 * 次のラリーでボールを指定側へ送る初速を返します。
 * 乱数関数を受け取るため、サーブの角度も固定してテストできます。
 * @param {"player"|"cpu"} toward サーブを向ける側
 * @param {() => number} [random] 0以上1未満を返す乱数
 * @returns {{x:number,y:number}} 横・縦方向の初速
 */
export function createServeVelocity(toward, random = Math.random) {
  if (!VALID_SIDES.has(toward)) throw new RangeError("サーブの方向を指定してください。");
  if (typeof random !== "function") throw new TypeError("乱数関数を指定してください。");
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError("乱数関数は0以上1未満の数を返してください。");
  }

  // 小さな上下角度を付け、水平にしか進まないラリーを避けます。
  const angle = (sample - 0.5) * 0.7;
  const direction = toward === "cpu" ? 1 : -1;
  return {
    x: Math.cos(angle) * INITIAL_BALL_SPEED * direction,
    y: Math.sin(angle) * INITIAL_BALL_SPEED,
  };
}

/**
 * ラケットに当たった位置から跳ね返りの角度と速度を決めます。
 * ラケット中央なら水平に、端に近いほど上下へ強く返すための補助計算です。
 * @param {number} hitOffset -1（上端）から1（下端）の当たり位置
 * @param {number} currentSpeed 衝突前のボール速度
 * @param {number} horizontalDirection 次に進む横方向（-1または1）
 * @returns {{x:number,y:number}} 跳ね返り後の速度
 */
export function calculatePaddleBounce(hitOffset, currentSpeed, horizontalDirection) {
  if (!Number.isFinite(hitOffset) || !Number.isFinite(currentSpeed) || currentSpeed <= 0) {
    throw new RangeError("当たり位置とボール速度を確認してください。");
  }
  if (horizontalDirection !== -1 && horizontalDirection !== 1) {
    throw new RangeError("横方向は-1または1を指定してください。");
  }

  const offset = Math.max(-1, Math.min(1, hitOffset));
  const speed = Math.min(MAX_BALL_SPEED, Math.max(INITIAL_BALL_SPEED, currentSpeed * 1.04));
  const angle = offset * MAX_BOUNCE_ANGLE;
  return {
    x: Math.cos(angle) * speed * horizontalDirection,
    y: Math.sin(angle) * speed,
  };
}

/**
 * CPUラケットの上下速度を計算し、ボール追跡中も設定上限を超えないようにします。
 * 近づくほど速度を弱める比例移動なので、目標を通り越して往復しにくくなります。
 * @param {number} paddleY 現在のラケット中心
 * @param {number} targetY 追いかけるボール位置
 * @param {number} speedLimit 最大速度
 * @returns {number} Arcade Physicsへ渡す縦方向速度
 */
export function getPaddleVelocity(paddleY, targetY, speedLimit) {
  if (!Number.isFinite(paddleY) || !Number.isFinite(targetY) || !Number.isFinite(speedLimit) || speedLimit < 0) {
    throw new RangeError("ラケット位置と速度上限を確認してください。");
  }
  const proportionalSpeed = (targetY - paddleY) * 5;
  return Math.max(-speedLimit, Math.min(speedLimit, proportionalSpeed));
}
