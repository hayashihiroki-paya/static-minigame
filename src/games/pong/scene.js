import Phaser from "phaser";
import {
  awardPoint,
  calculatePaddleBounce,
  createScoreState,
  createServeVelocity,
  getPaddleVelocity,
} from "./logic.js";

const COURT_WIDTH = 800;
const COURT_HEIGHT = 450;
const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT = 88;
const BALL_RADIUS = 9;
const PLAYER_SPEED = 470;
const CPU_SPEED = 350;

/**
 * Phaser Sceneが画面、入力、衝突、毎フレーム更新をまとめて管理します。
 * 得点とボール速度のルールはlogic.jsに任せ、ここでは物理オブジェクトと同期します。
 */
export class PongScene extends Phaser.Scene {
  constructor() {
    super("pong-match");
    this.score = createScoreState();
    this.pointerTargetY = null;
  }

  create() {
    this.physics.world.setBounds(0, 0, COURT_WIDTH, COURT_HEIGHT);
    this.drawCourt();
    this.playerPaddle = this.createPaddle(42);
    this.cpuPaddle = this.createPaddle(COURT_WIDTH - 42);
    this.ball = this.createBall();
    this.createWalls();
    this.createCollisions();
    this.createInput();

    // HTML側の再開ボタンから、同じSceneを初期状態へ戻せるようイベントを受け取ります。
    this.game.events.on("pong:restart", this.restartMatch, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("pong:restart", this.restartMatch, this);
    });

    this.game.canvas.setAttribute("aria-label", "卓球ゲームのプレイエリア");
    this.game.canvas.setAttribute("aria-describedby", "pong-help");
    this.game.canvas.setAttribute("tabindex", "0");
    this.restartMatch();
  }

  /** 中央線と上下の余白を描き、プレイエリアを図形だけで組み立てます。 */
  drawCourt() {
    const centerLine = this.add.graphics();
    centerLine.lineStyle(3, 0x60758a, 0.8);
    for (let y = 22; y < COURT_HEIGHT - 18; y += 28) {
      centerLine.beginPath();
      centerLine.moveTo(COURT_WIDTH / 2, y);
      centerLine.lineTo(COURT_WIDTH / 2, Math.min(y + 14, COURT_HEIGHT - 18));
      centerLine.strokePath();
    }
    this.add.rectangle(COURT_WIDTH / 2, 5, COURT_WIDTH, 10, 0x60758a);
    this.add.rectangle(COURT_WIDTH / 2, COURT_HEIGHT - 5, COURT_WIDTH, 10, 0x60758a);
  }

  /**
   * 物理移動するラケットを作ります。
   * Arcade Physicsのworld boundsを使い、上下の壁を越えないようにします。
   * @param {number} x コート内の横位置
   * @returns {Phaser.GameObjects.Rectangle} ラケット
   */
  createPaddle(x) {
    const paddle = this.add.rectangle(x, COURT_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT, 0xf4f7fb);
    this.physics.add.existing(paddle);
    paddle.body.setAllowGravity(false);
    paddle.body.setImmovable(true);
    paddle.body.setCollideWorldBounds(true);
    paddle.body.setBounce(0);
    return paddle;
  }

  /** ボールを円形Arcade Physics bodyとして作ります。 */
  createBall() {
    const ball = this.add.circle(COURT_WIDTH / 2, COURT_HEIGHT / 2, BALL_RADIUS, 0xf4c95d);
    this.physics.add.existing(ball);
    ball.body.setCircle(BALL_RADIUS);
    ball.body.setAllowGravity(false);
    ball.body.setBounce(1, 1);
    // 左右の端では跳ね返さず、得点判定をするためworld boundsから外します。
    ball.body.setCollideWorldBounds(false);
    return ball;
  }

  /** 画面上端と下端だけを静的物理オブジェクトにし、左右はゴール判定に残します。 */
  createWalls() {
    this.wallTop = this.add.rectangle(COURT_WIDTH / 2, 5, COURT_WIDTH, 10, 0xffffff, 0);
    this.wallBottom = this.add.rectangle(COURT_WIDTH / 2, COURT_HEIGHT - 5, COURT_WIDTH, 10, 0xffffff, 0);
    this.physics.add.existing(this.wallTop, true);
    this.physics.add.existing(this.wallBottom, true);
  }

  /** Phaserの衝突登録へ上下の壁と2本のラケットを渡します。 */
  createCollisions() {
    this.physics.add.collider(this.ball, this.wallTop);
    this.physics.add.collider(this.ball, this.wallBottom);
    this.physics.add.collider(this.ball, this.playerPaddle, () => {
      this.bounceFromPaddle(this.playerPaddle, 1);
    });
    this.physics.add.collider(this.ball, this.cpuPaddle, () => {
      this.bounceFromPaddle(this.cpuPaddle, -1);
    });
  }

  /**
   * キーボードとポインターを同じラケット速度へ変換します。
   * pointermoveは押している間だけ受け取り、タッチではドラッグ操作になります。
   */
  createInput() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
    });
    this.input.on("pointerdown", (pointer) => {
      this.pointerTargetY = pointer.worldY;
    });
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown) this.pointerTargetY = pointer.worldY;
    });
    this.input.on("pointerup", () => {
      this.pointerTargetY = null;
    });
  }

  /**
   * Sceneのupdateは毎フレーム呼ばれ、入力・CPU移動・ゴールを確認します。
   * PhaserのArcade Physicsが速度からボール位置と衝突を更新します。
   */
  update() {
    if (this.score.winner) return;

    const keyDirection = Number(this.cursorKeys.down.isDown || this.wasd.down.isDown)
      - Number(this.cursorKeys.up.isDown || this.wasd.up.isDown);
    const playerVelocity = this.pointerTargetY === null
      ? keyDirection * PLAYER_SPEED
      : getPaddleVelocity(this.playerPaddle.y, this.pointerTargetY, PLAYER_SPEED);

    // 位置を直接書き換えず、Arcade Physicsの速度へ指示して衝突境界と同期します。
    this.playerPaddle.body.setVelocityY(playerVelocity);
    this.cpuPaddle.body.setVelocityY(
      getPaddleVelocity(this.cpuPaddle.y, this.ball.y, CPU_SPEED),
    );

    if (this.ball.x < -BALL_RADIUS) this.registerPoint("cpu");
    if (this.ball.x > COURT_WIDTH + BALL_RADIUS) this.registerPoint("player");
  }

  /**
   * ラケットのどこに当たったかで反射角を調整します。
   * @param {Phaser.GameObjects.Rectangle} paddle 衝突したラケット
   * @param {number} horizontalDirection 次の横方向
   */
  bounceFromPaddle(paddle, horizontalDirection) {
    const velocity = this.ball.body.velocity;
    const speed = Math.hypot(velocity.x, velocity.y);
    const hitOffset = (this.ball.y - paddle.y) / (PADDLE_HEIGHT / 2);
    const bounce = calculatePaddleBounce(hitOffset, speed, horizontalDirection);
    this.ball.body.setVelocity(bounce.x, bounce.y);
  }

  /**
   * ゴール後に得点を更新し、勝敗が決まっていなければ次のラリーを始めます。
   * @param {"player"|"cpu"} side 得点した側
   */
  registerPoint(side) {
    this.score = awardPoint(this.score, side);
    this.game.events.emit("pong:score", this.score);
    if (this.score.winner) {
      this.ball.body.setVelocity(0, 0);
      this.game.events.emit(
        "pong:status",
        this.score.winner === "player" ? "あなたの勝ちです！もう一度遊べます。" : "CPUの勝ちです。再挑戦できます。",
      );
      return;
    }

    this.serve(this.score.serveToward);
    this.game.events.emit("pong:status", "得点が入りました。次のラリーです。");
  }

  /**
   * 中央から指定方向へサーブし、新しいラリーを始めます。
   * @param {"player"|"cpu"} toward 次に受ける側
   */
  serve(toward) {
    this.ball.setPosition(COURT_WIDTH / 2, COURT_HEIGHT / 2);
    this.ball.body.reset(this.ball.x, this.ball.y);
    const velocity = createServeVelocity(toward);
    this.ball.body.setVelocity(velocity.x, velocity.y);
  }

  /** スコア・ラケット・ボールを初期化し、同じSceneで新しい試合を開始します。 */
  restartMatch() {
    this.score = createScoreState();
    this.playerPaddle.body.reset(this.playerPaddle.x, COURT_HEIGHT / 2);
    this.cpuPaddle.body.reset(this.cpuPaddle.x, COURT_HEIGHT / 2);
    this.serve("cpu");
    this.game.events.emit("pong:score", this.score);
    this.game.events.emit("pong:status", "スタート！ラケットを動かしてラリーしましょう。");
  }
}
