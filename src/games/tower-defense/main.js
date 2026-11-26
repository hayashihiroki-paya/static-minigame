import { MAP_HEIGHT, MAP_WIDTH, route, sites } from "./map.js";
import { createGame, placeTower, positionAt, startWave, stepGame, STEP_MS, TOWER_COST, WAVE_REWARD } from "./logic.js";
import { waves } from "./waves.js";

const canvas = document.querySelector("#defense-board");
const ctx = canvas.getContext("2d");
const siteGroup = document.querySelector("#defense-sites");
const status = document.querySelector("#defense-status");
const start = document.querySelector("#defense-start");
const reset = document.querySelector("#defense-reset");
const coins = document.querySelector("#defense-coins");
const health = document.querySelector("#defense-health");
const wave = document.querySelector("#defense-wave");
let game;
let frame;
let lastTime;
let remainder;

const siteButtons = sites.map((site) => {
  const button = document.createElement("button");
  button.type = "button";
  button.style.left = site.x / MAP_WIDTH * 100 + "%";
  button.style.top = site.y / MAP_HEIGHT * 100 + "%";
  button.addEventListener("click", () => {
    const result = placeTower(game, site.id);
    const messages = {
      placed: site.id + "にタワーを置きました。残り" + game.coins + "コインです。",
      occupied: "そのマスにはタワーがあります。",
      insufficient: "コインが足りません。タワーには" + TOWER_COST + "コイン必要です。",
    };
    if (messages[result]) {
      status.textContent = messages[result];
      renderHud();
      draw();
    }
  });
  siteGroup.append(button);
  return { site, button };
});

function drawRoute() {
  ctx.beginPath();
  route.forEach(({ x, y }, index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 31;
  ctx.strokeStyle = "#856844";
  ctx.stroke();
  ctx.lineWidth = 25;
  ctx.strokeStyle = "#edcf9d";
  ctx.stroke();
}

function draw() {
  ctx.fillStyle = "#d4edda";
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
  drawRoute();

  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#4b3b24";
  ctx.fillText("→", route[0].x, route[0].y);
  const goal = route.at(-1);
  ctx.fillStyle = "#3f346c";
  ctx.fillText("◆", goal.x, goal.y);

  for (const tower of game.towers) {
    if (game.phase !== "running" || !tower.shot || tower.shot.expiresAt <= game.timeMs) continue;
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y);
    ctx.lineTo(tower.shot.x, tower.shot.y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#4d3188";
    ctx.stroke();
  }

  for (const enemy of game.enemies) {
    const { x, y } = positionAt(enemy.progress);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#bd4b34";
    ctx.fill();
    ctx.strokeStyle = "#612a1d";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 10, y - 16, 20, 4);
    ctx.fillStyle = "#702f23";
    ctx.fillRect(x - 10, y - 16, 20 * enemy.hp / enemy.maxHp, 4);
  }
}

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function renderHud() {
  setText(coins, String(game.coins));
  setText(health, String(game.health));
  setText(wave, (game.waveIndex + 1) + " / " + waves.length);
  start.setAttribute("aria-disabled", String(game.phase !== "planning"));
  for (const { site, button } of siteButtons) {
    const built = game.towers.some(({ id }) => site.id === id);
    setText(button, built ? "▲ " + site.id : site.id);
    button.dataset.built = String(built);
    button.setAttribute("aria-label", "設置マス" + site.id + (built ? "、タワー設置済み" : "、空き"));
    button.setAttribute("aria-disabled", String(game.phase !== "planning" || built));
  }
}

function resetGame() {
  cancelAnimationFrame(frame);
  game = createGame();
  lastTime = null;
  remainder = 0;
  status.textContent = "マスを選んでタワーを置き、ウェーブを始めましょう。";
  renderHud();
  draw();
}

function animate(timestamp) {
  if (lastTime !== null) remainder += Math.min(timestamp - lastTime, 250);
  lastTime = timestamp;

  while (remainder >= STEP_MS && game.phase === "running") {
    remainder -= STEP_MS;
    stepGame(game);
  }
  // 進行中は変化した数値だけ更新し、配置ボタンや読み上げ通知は切り替え時だけ更新します。
  setText(health, String(game.health));
  draw();
  if (game.phase === "running") {
    frame = requestAnimationFrame(animate);
    return;
  }

  const message = {
    planning: "ウェーブ突破！ " + WAVE_REWARD + "コイン獲得しました。次の配置を考えましょう。",
    won: "クリア！ " + waves.length + "ウェーブを守り切りました。残り耐久は" + game.health + "です。",
    lost: "敗北。拠点の耐久が0になりました。「最初から」でやり直せます。",
  };
  status.textContent = message[game.phase];
  renderHud();
}

start.addEventListener("click", () => {
  if (!startWave(game)) return;
  lastTime = null;
  remainder = 0;
  status.textContent = "ウェーブ" + (game.waveIndex + 1) + "開始。終了まで配置は固定です。";
  renderHud();
  draw();
  frame = requestAnimationFrame(animate);
});
reset.addEventListener("click", resetGame);
document.addEventListener("visibilitychange", () => {
  // 背景タブにいた間の時間は進行に含めません。
  lastTime = null;
});
resetGame();
