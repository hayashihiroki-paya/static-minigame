import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  WINNING_SCORE,
  awardPoint,
  calculatePaddleBounce,
  createScoreState,
  createServeVelocity,
  getPaddleVelocity,
} from "../src/games/pong/logic.js";

const homePage = await readFile(new URL("../index.html", import.meta.url), "utf8");
const gamePage = await readFile(new URL("../src/games/pong/index.html", import.meta.url), "utf8");
const sceneSource = await readFile(new URL("../src/games/pong/scene.js", import.meta.url), "utf8");
const bootstrapSource = await readFile(new URL("../src/games/pong/bootstrap.js", import.meta.url), "utf8");
const configSource = await readFile(new URL("../vite.pong.config.js", import.meta.url), "utf8");
const compressionScript = await readFile(new URL("../scripts/compress-pong.js", import.meta.url), "utf8");
const license = await readFile(new URL("../src/games/pong/public/THIRD-PARTY-LICENSES.txt", import.meta.url), "utf8");

test("試合を0点から始め、得点後はサーブ方向を相手側へ切り替える", () => {
  const fresh = createScoreState();
  assert.deepEqual(fresh, { player: 0, cpu: 0, winner: null, serveToward: "cpu" });
  assert.deepEqual(awardPoint(fresh, "player"), {
    player: 1,
    cpu: 0,
    winner: null,
    serveToward: "cpu",
  });
  assert.deepEqual(awardPoint(fresh, "cpu"), {
    player: 0,
    cpu: 1,
    winner: null,
    serveToward: "player",
  });
  assert.deepEqual(fresh, createScoreState(), "得点処理で元の試合状態を変更しない");
});

test("5点目で勝者を固定し、終了後の衝突で得点が増えない", () => {
  let score = createScoreState();
  for (let point = 0; point < WINNING_SCORE - 1; point += 1) {
    score = awardPoint(score, "player");
  }
  assert.equal(score.winner, null);

  score = awardPoint(score, "player");
  assert.equal(score.player, WINNING_SCORE);
  assert.equal(score.winner, "player");
  assert.equal(score.serveToward, null);
  assert.deepEqual(awardPoint(score, "cpu"), score);
});

test("サーブの向きと角度は乱数を固定して再現できる", () => {
  const levelServe = createServeVelocity("cpu", () => 0.5);
  const angledServe = createServeVelocity("player", () => 0.999);

  assert.ok(levelServe.x > 0);
  assert.equal(levelServe.y, 0);
  assert.ok(angledServe.x < 0);
  assert.ok(angledServe.y > 0);
  assert.deepEqual(levelServe, createServeVelocity("cpu", () => 0.5));
});

test("ラケットの当たり位置で反射角を変え、速度とCPU移動を上限内にする", () => {
  const center = calculatePaddleBounce(0, 340, 1);
  const edge = calculatePaddleBounce(2, 340, -1);

  assert.ok(center.x > 0);
  assert.equal(center.y, 0);
  assert.ok(edge.x < 0);
  assert.ok(edge.y > 0);
  assert.ok(Math.hypot(edge.x, edge.y) <= 620.001);
  assert.equal(getPaddleVelocity(100, 1000, 350), 350);
  assert.equal(getPaddleVelocity(100, -1000, 350), -350);
  assert.equal(getPaddleVelocity(200, 201, 350), 5);
});

test("ホーム導線、Phaser Scene、物理入力、静的出力とライセンスをそろえる", () => {
  assert.match(homePage, /href="\.\/dist\/games\/pong\/"/);
  assert.match(homePage, /<h3>卓球ゲーム<\/h3>/);
  assert.match(gamePage, /<html lang="ja">/);
  assert.match(gamePage, /上下矢印キーまたはW\/S/);
  assert.match(gamePage, /id="pong-status"[^>]*role="status" aria-live="polite"/);
  assert.match(sceneSource, /extends Phaser\.Scene/);
  assert.match(sceneSource, /this\.physics\.add\.collider/);
  assert.match(sceneSource, /pointermove/);
  assert.match(sceneSource, /this\.input\.keyboard\.createCursorKeys/);
  assert.match(configSource, /dist\/games\/pong/);
  assert.match(bootstrapSource, /DecompressionStream\("gzip"\)/);
  assert.match(bootstrapSource, /import\(moduleUrl\)/);
  assert.match(compressionScript, /gzipAsync/);
  assert.match(license, /Phaser 3\.90\.0[\s\S]*eventemitter3 5\.0\.1/);
});
