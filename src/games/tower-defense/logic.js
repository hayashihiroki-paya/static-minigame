import { route, sites } from "./map.js";
import { waves } from "./waves.js";

export const STEP_MS = 50;
export const TOWER_COST = 30;
export const TOWER_RANGE = 104;
export const WAVE_REWARD = 30;
const initialCoins = 60;
const initialHealth = 6;
const damage = 2;
const cooldownMs = 450;

const segments = [];
let distance = 0;
for (let index = 1; index < route.length; index += 1) {
  const start = route[index - 1];
  const end = route[index];
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  segments.push({ start, end, length, from: distance, to: distance + length });
  distance += length;
}
export const ROUTE_LENGTH = distance;

// 進行距離を座標に変換します。曲がり角でも距離が途切れず、ゴールまでの順序を比べられます。
export function positionAt(progress) {
  const clamped = Math.max(0, Math.min(ROUTE_LENGTH, progress));
  const { start, end, from, length } = segments.find((segment) => clamped <= segment.to);
  const ratio = (clamped - from) / length;
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
}

export function createGame() {
  return {
    phase: "planning",
    waveIndex: 0,
    timeMs: 0,
    nextSpawn: 0,
    health: initialHealth,
    coins: initialCoins,
    towers: [],
    enemies: [],
  };
}

export function placeTower(game, siteId) {
  if (game.phase !== "planning") return "locked";
  const site = sites.find(({ id }) => id === siteId);
  if (!site) return "unavailable";
  if (game.towers.some(({ id }) => id === siteId)) return "occupied";
  if (game.coins < TOWER_COST) return "insufficient";

  game.coins -= TOWER_COST;
  game.towers.push({ ...site, nextShotAt: 0, shot: null });
  return "placed";
}

function spawnDueEnemies(game) {
  const wave = waves[game.waveIndex];
  while (game.nextSpawn < wave.atMs.length && wave.atMs[game.nextSpawn] <= game.timeMs) {
    game.enemies.push({ id: game.nextSpawn, progress: 0, hp: wave.hp, maxHp: wave.hp });
    game.nextSpawn += 1;
  }
}

export function startWave(game) {
  if (game.phase !== "planning") return false;
  game.phase = "running";
  game.timeMs = 0;
  game.nextSpawn = 0;
  for (const tower of game.towers) {
    tower.nextShotAt = 0;
    tower.shot = null;
  }
  spawnDueEnemies(game);
  return true;
}

export function selectTarget(tower, enemies) {
  let target = null;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const { x, y } = positionAt(enemy.progress);
    if (Math.hypot(tower.x - x, tower.y - y) > TOWER_RANGE) continue;
    if (!target || enemy.progress > target.progress
      || (enemy.progress === target.progress && enemy.id < target.id)) {
      target = enemy;
    }
  }
  return target;
}

export function stepGame(game) {
  if (game.phase !== "running") return;
  game.timeMs += STEP_MS;
  const wave = waves[game.waveIndex];

  // 既に出現した相手だけを進め、到達した相手は同じステップのタワー判定から除きます。
  for (const enemy of game.enemies) enemy.progress += wave.speed * STEP_MS / 1000;
  game.enemies = game.enemies.filter((enemy) => {
    if (enemy.progress < ROUTE_LENGTH) return true;
    game.health = Math.max(0, game.health - 1);
    return false;
  });
  if (game.health === 0) {
    game.phase = "lost";
    return;
  }
  spawnDueEnemies(game);

  for (const tower of game.towers) {
    if (tower.nextShotAt > game.timeMs) continue;
    const target = selectTarget(tower, game.enemies);
    if (!target) continue;
    target.hp -= damage;
    tower.nextShotAt = game.timeMs + cooldownMs;
    tower.shot = { ...positionAt(target.progress), expiresAt: game.timeMs + 100 };
  }
  game.enemies = game.enemies.filter(({ hp }) => hp > 0);
  if (game.nextSpawn !== wave.atMs.length || game.enemies.length > 0) return;

  game.coins += WAVE_REWARD;
  if (game.waveIndex === waves.length - 1) {
    game.phase = "won";
  } else {
    game.waveIndex += 1;
    game.phase = "planning";
  }
}
