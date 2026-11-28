// PhaserのGameはこのページに一つだけ作り、Sceneの状態をHTMLの案内へ反映します。
import Phaser from "phaser";
import { PongScene } from "./scene.js";

const playerScore = document.querySelector("#pong-player-score");
const cpuScore = document.querySelector("#pong-cpu-score");
const status = document.querySelector("#pong-status");
const restartButton = document.querySelector("#pong-restart");

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "pong-game",
  backgroundColor: "#10243a",
  scale: {
    // 16:9のゲーム世界を保ち、画面幅に合わせて縮小しても物理座標を変えません。
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [PongScene],
});

game.events.on("pong:score", (score) => {
  playerScore.textContent = String(score.player);
  cpuScore.textContent = String(score.cpu);
});
game.events.on("pong:status", (message) => {
  status.textContent = message;
});

restartButton.addEventListener("click", () => {
  game.events.emit("pong:restart");
});

window.addEventListener("pagehide", () => game.destroy(true), { once: true });
