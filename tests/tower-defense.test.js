import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  createGame, placeTower, positionAt, ROUTE_LENGTH, selectTarget,
  startWave, stepGame, STEP_MS, TOWER_COST, TOWER_RANGE, WAVE_REWARD,
} from "../src/games/tower-defense/logic.js";
import { route } from "../src/games/tower-defense/map.js";
import { waves } from "../src/games/tower-defense/waves.js";

function finishWave(game) {
  for (let i = 0; i < 1000 && game.phase === "running"; i += 1) stepGame(game);
  assert.notEqual(game.phase, "running");
}

test("ルート上の進行距離を曲がり角の前後と終点の座標へ変換する", () => {
  assert.deepEqual(positionAt(0), route[0]);
  assert.deepEqual(positionAt(305), route[1]);
  assert.deepEqual(positionAt(325), { x: 330, y: 118 });
  assert.deepEqual(positionAt(ROUTE_LENGTH), route.at(-1));
});

test("空きマスへの配置だけがコインを消費し、ウェーブ中は置けない", () => {
  const game = createGame();
  assert.equal(placeTower(game, "Z"), "unavailable");
  assert.equal(placeTower(game, "A"), "placed");
  assert.equal(game.coins, createGame().coins - TOWER_COST);
  assert.equal(placeTower(game, "A"), "occupied");
  assert.equal(placeTower(game, "B"), "placed");
  assert.equal(placeTower(game, "D"), "insufficient");
  assert.equal(game.coins, 0);
  assert.equal(startWave(game), true);
  assert.equal(startWave(game), false);
  assert.equal(placeTower(game, "D"), "locked");
  assert.deepEqual(game.towers.map(({ id }) => id), ["A", "B"]);
});

test("出現時刻どおりに先頭から順番に追加し、出現したステップでは移動しない", () => {
  const game = createGame();
  startWave(game);
  assert.deepEqual(game.enemies.map(({ id, progress }) => [id, progress]), [[0, 0]]);
  const wave = waves[0];
  for (const [id, time] of wave.atMs.entries()) {
    if (id === 0) continue;
    while (game.timeMs < time - STEP_MS) stepGame(game);
    assert.equal(game.enemies.length, id);
    stepGame(game);
    assert.equal(game.timeMs, time);
    assert.deepEqual(game.enemies.at(-1), { id, progress: 0, hp: wave.hp, maxHp: wave.hp });
  }
  assert.deepEqual(game.enemies.map(({ id }) => id), [0, 1, 2, 3, 4]);
});

test("射程の境界を含め、ゴールまでの進行距離と出現順で狙う相手を選ぶ", () => {
  const tower = { x: 100, y: 98 + TOWER_RANGE };
  const enemy = { id: 4, progress: 75, hp: 2 };
  assert.equal(selectTarget(tower, [enemy]), enemy);
  assert.equal(selectTarget({ ...tower, y: tower.y + 0.01 }, [enemy]), null);

  const others = [
    { id: 4, progress: 60, hp: 2 }, { id: 3, progress: 90, hp: 2 },
    { id: 1, progress: 90, hp: 2 }, { id: 5, progress: 100, hp: 0 },
    { id: 6, progress: 400, hp: 2 },
  ];
  assert.equal(selectTarget({ x: 100, y: 98 }, others), others[2]);
});

test("拠点に到達した相手の分だけ耐久が減り、0になると敗北する", () => {
  const game = createGame();
  startWave(game);
  finishWave(game);
  assert.equal(game.health, 1);
  assert.equal(game.phase, "planning");
  startWave(game);
  finishWave(game);
  assert.equal(game.health, 0);
  assert.equal(game.phase, "lost");
  assert.equal(startWave(game), false);
});

test("ウェーブの報酬を次の配置に使って3ウェーブを守り切れる", () => {
  const game = createGame();
  for (const placements of [["A", "B"], ["D"], ["F"]]) {
    for (const site of placements) assert.equal(placeTower(game, site), "placed");
    assert.equal(game.coins, 0);
    assert.equal(startWave(game), true);
    finishWave(game);
    assert.equal(game.health, createGame().health);
    assert.equal(game.coins, WAVE_REWARD);
  }
  assert.equal(game.phase, "won");
  assert.equal(game.waveIndex, waves.length - 1);
  assert.equal(startWave(game), false);

  const reset = createGame();
  assert.equal(reset.phase, "planning");
  assert.equal(reset.waveIndex, 0);
  assert.equal(reset.coins, 2 * TOWER_COST);
  assert.equal(reset.health, 6);
  assert.deepEqual(reset.towers, []);
  assert.deepEqual(reset.enemies, []);
});

test("ホームから開け、設置マスのグループと状態通知がある", async () => {
  const [home, page] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/games/tower-defense/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /aria-label="タワーディフェンスのゲームで遊ぶ" href="\.\/src\/games\/tower-defense\/"/);
  assert.match(page, /role="group" aria-label="タワーの設置マス"/);
  assert.match(page, /id="defense-start" type="button">ウェーブ開始/);
  assert.match(page, /role="status" aria-live="polite"/);
});
