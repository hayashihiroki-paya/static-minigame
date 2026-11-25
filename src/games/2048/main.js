// 画面入力と表示だけを担当し、盤面の移動規則はlogic.jsへ委ねます。
import {
  BOARD_SIZE,
  createPlaySession,
  movePlaySession,
  undoPlaySession,
} from "./logic.js";

// HTMLの要素を一度取得し、再描画時も同じセルを更新してフォーカスを保ちます。
const boardElement = document.querySelector("#game2048-board");
const scoreOutput = document.querySelector("#score-output");
const feedback = document.querySelector("#game-feedback");
const newGameButton = document.querySelector("#new-game-button");
const undoButton = document.querySelector("#undo-button");
const directionButtons = Array.from(
  document.querySelectorAll(".game2048-direction"),
);

// ゲーム状態と最後の操作案内を画面側で持ち、ロジックの返り値を表示へ反映します。
let session = createPlaySession();
let actionMessage = "";
const tileCells = [];

/**
 * 4行×4列のgridcellを一度だけDOMへ作ります。
 * 盤面の数値配列と同じ座標で参照できるよう、セルも二次元配列で管理します。
 */
function createBoardCells() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "game2048-row";
    rowElement.setAttribute("role", "row");
    tileCells[row] = [];

    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const cell = document.createElement("div");
      cell.className = "game2048-cell";
      cell.setAttribute("role", "gridcell");
      rowElement.append(cell);
      tileCells[row][column] = cell;
    }
    boardElement.append(rowElement);
  }
}

/**
 * 盤面状態をセルの文字・色・読み上げ名へ変換します。
 * 空きマスも座標を含む名前で表し、値が見えない状態も読み上げから分かるようにします。
 */
function renderBoard() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const value = session.game.board[row][column];
      const cell = tileCells[row][column];
      cell.textContent = value === 0 ? "" : String(value);
      cell.dataset.value = value === 0 ? "empty" : String(value);

      if (value === 0) {
        delete cell.dataset.digits;
        cell.setAttribute("aria-label", (row + 1) + "行" + (column + 1) + "列、空きマス");
      } else {
        cell.dataset.digits = String(value).length;
        cell.setAttribute(
          "aria-label",
          (row + 1) + "行" + (column + 1) + "列、" + value,
        );
      }
    }
  }
}

/**
 * 勝利・ゲームオーバーを通常操作の案内より先に表示します。
 * 2048を達成しても終了にはしないため、続けて遊べる案内を出します。
 * @returns {string} 現在のライブ領域メッセージ
 */
function getFeedbackText() {
  const { game, previousGame } = session;
  if (game.isGameOver) {
    const result = game.hasWon ? "2048を達成しました。" : "ゲームオーバーです。";
    const nextAction = previousGame === null
      ? "新しいゲームを始められます。"
      : "1手戻すか、新しいゲームを始められます。";
    return result + "動かせる場所がありません。" + nextAction;
  }
  if (game.hasWon) {
    return actionMessage || "2048を達成しました。続けて遊べます。";
  }
  return actionMessage || "同じ数字を合わせて2048を目指しましょう。";
}

/**
 * 盤面・スコア・状態通知をゲーム状態に同期します。
 * @returns {void} 表示だけを更新します
 */
function render() {
  renderBoard();
  scoreOutput.textContent = String(session.game.score);
  undoButton.disabled = session.previousGame === null;
  feedback.textContent = getFeedbackText();
}

/**
 * 移動結果を表示し、成功した入力だけ状態メッセージを更新します。
 * 無効方向では状態遷移関数が同じオブジェクトを返すため、盤面は増えません。
 * @param {"up"|"down"|"left"|"right"} direction 移動方向
 */
function handleMove(direction) {
  const previousGame = session.game;
  session = movePlaySession(session, direction);
  const { game } = session;
  if (game === previousGame) {
    actionMessage = "その方向には動かせません。";
    render();
    return;
  }

  if (game.isGameOver) {
    actionMessage = "";
  } else if (!previousGame.hasWon && game.hasWon) {
    actionMessage = "2048達成です。続けて遊べます。";
  } else if (game.score > previousGame.score) {
    actionMessage = "タイルを合成しました。スコアは" + game.score + "です。";
  } else {
    actionMessage = "タイルを移動しました。";
  }
  render();
}

// ボード上で矢印キーを受け、標準のスクロール動作を止めてゲーム操作へ使います。
const keyDirections = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
boardElement.addEventListener("keydown", (event) => {
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  handleMove(direction);
});

// 方向ボタンはclickに統一し、マウス・Enter/Space・タッチで同じ移動処理を呼びます。
for (const button of directionButtons) {
  button.addEventListener("click", () => {
    handleMove(button.dataset.direction);
  });
}

undoButton.addEventListener("click", () => {
  const restored = undoPlaySession(session);
  if (restored === session) return;

  session = restored;
  actionMessage = "1手戻しました。スコアは" + session.game.score + "です。";
  render();
  // 使ったボタンは無効になるため、矢印キーを使える盤面へフォーカスを戻します。
  boardElement.focus();
});

// 新しいゲームでは盤面・得点・履歴を初期化し、操作起点を盤面へ戻します。
newGameButton.addEventListener("click", () => {
  session = createPlaySession();
  actionMessage = "新しいゲームを始めました。";
  render();
  boardElement.focus();
});

createBoardCells();
render();
