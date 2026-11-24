// DOM表示とボタン操作を担当し、盤面ルールと再帰ソルバーはlogic.jsへ委ねます。
import {
  DISK_COUNT,
  GOAL_ROD,
  MINIMUM_MOVE_COUNT,
  START_ROD,
  clearRodSelection,
  createInitialGameState,
  moveDisk,
  resetGame,
  selectRod,
  solveHanoi,
  toggleSolution,
} from "./logic.js";

const rodButtons = [...document.querySelectorAll("[data-rod-index]")];
const moveCountOutput = document.querySelector("#move-count");
const feedback = document.querySelector("#game-feedback");
const resetButton = document.querySelector("#reset-button");
const solutionButton = document.querySelector("#solution-button");
const solutionList = document.querySelector("#solution-list");
const solutionSection = document.querySelector("#solution-section");

let game = createInitialGameState();

const rodNames = ["左の棒", "中央の棒", "右の棒"];

/** 棒と円盤をボタン内に描き、読み上げ名にも現在の枚数を含めます。 */
function renderRods() {
  rodButtons.forEach((button, rodIndex) => {
    const stack = button.querySelector(".hanoi-stack");
    const disks = game.rods[rodIndex];
    const fragment = document.createDocumentFragment();

    for (const diskSize of disks) {
      const disk = document.createElement("span");
      disk.className = "hanoi-disk";
      disk.dataset.size = String(diskSize);
      disk.textContent = String(diskSize);
      disk.setAttribute("aria-hidden", "true");
      fragment.append(disk);
    }

    stack.replaceChildren(fragment);
    button.setAttribute("aria-pressed", String(game.selectedRod === rodIndex));
    button.setAttribute(
      "aria-label",
      `${rodNames[rodIndex]}、円盤${disks.length}枚${game.selectedRod === rodIndex ? "、移動元に選択中" : ""}`,
    );
    button.classList.toggle("is-selected", game.selectedRod === rodIndex);
    button.classList.toggle("is-goal", game.isComplete && rodIndex === GOAL_ROD);
  });
}

/** 手数、選択中の棒、クリア状態を文字でも通知します。 */
function render() {
  renderRods();
  moveCountOutput.textContent = String(game.moveCount);
  solutionButton.setAttribute("aria-expanded", String(game.solutionVisible));
  solutionButton.textContent = game.solutionVisible ? "最短手順を隠す" : "最短手順を見る";
  solutionSection.hidden = !game.solutionVisible;

  if (game.isComplete) {
    feedback.textContent = `クリア！${game.moveCount}手で完成しました。最短は${MINIMUM_MOVE_COUNT}手です。`;
  } else if (game.selectedRod !== null) {
    feedback.textContent = `${rodNames[game.selectedRod]}を選択中です。移動先の棒を選んでください。`;
  }
}

/** 選択元がない時は移動元を決め、選択中なら移動先として合法性を判定します。 */
function handleRodClick(rodIndex) {
  if (game.isComplete) return;

  if (game.selectedRod === null) {
    const nextGame = selectRod(game, rodIndex);
    if (nextGame === game) {
      feedback.textContent = `${rodNames[rodIndex]}に移動できる円盤がありません。`;
      return;
    }
    game = nextGame;
    feedback.textContent = `${rodNames[rodIndex]}を選択しました。移動先の棒を選んでください。`;
    render();
    return;
  }

  if (rodIndex === game.selectedRod) {
    game = clearRodSelection(game);
    feedback.textContent = "移動元の選択を解除しました。";
    render();
    return;
  }

  const fromRod = game.selectedRod;
  const nextGame = moveDisk(game, fromRod, rodIndex);
  if (nextGame === game) {
    feedback.textContent = "その移動はできません。大きい円盤の上には置けません。移動先を選び直してください。";
    return;
  }

  game = nextGame;
  if (!game.isComplete) {
    feedback.textContent = `円盤を${rodNames[fromRod]}から${rodNames[rodIndex]}へ移動しました。`;
  }
  render();
}

/** 初期配置から得た手順を番号付きで表示し、ゲーム盤面には適用しません。 */
function renderSolution() {
  const fragment = document.createDocumentFragment();
  for (const [index, move] of solveHanoi().entries()) {
    const item = document.createElement("li");
    item.textContent = `${index + 1}手目：円盤${move.disk}を${rodNames[move.from]}から${rodNames[move.to]}へ移動`;
    fragment.append(item);
  }
  solutionList.replaceChildren(fragment);
}

rodButtons.forEach((button) => {
  button.addEventListener("click", () => handleRodClick(Number(button.dataset.rodIndex)));
});

resetButton.addEventListener("click", () => {
  game = resetGame();
  feedback.textContent = "盤面を初期状態に戻しました。左の棒から円盤を移動してください。";
  render();
  rodButtons[START_ROD].focus();
});

solutionButton.addEventListener("click", () => {
  if (!game.solutionVisible) renderSolution();
  game = toggleSolution(game);
  render();
});

// 初期配置と、4枚で最短15手になる仕様の不整合を早期に知らせます。
if (rodButtons.length !== 3 || game.rods[START_ROD].length !== DISK_COUNT) {
  throw new Error("ハノイの塔には3本の棒と4枚の円盤が必要です。");
}

render();
