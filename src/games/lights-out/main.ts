/**
 * ライツアウトの画面とTypeScriptで定義したルールをつなぎます。
 * このファイルはボタンと表示を担当し、盤面の計算はlogic.tsに任せます。
 */
import { BOARD_WIDTH, CELL_COUNT, createGame, pressCell, resetGame } from "./logic.ts";
import type { GameState } from "./logic.ts";

/**
 * HTMLの構造違いを黙って見逃さず、必須要素を取得してから画面処理を始めます。
 * 戻り値を非null型にすると、イベント関数の内側でも型検査が明確になります。
 */
function requireElement<ElementType extends HTMLElement>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`画面要素${selector}が見つかりません。`);
  }

  return element;
}

const boardElement = requireElement<HTMLDivElement>("#lights-out-board");
const gameFeedback = requireElement<HTMLParagraphElement>("#game-feedback");
const resetButton = requireElement<HTMLButtonElement>("#reset-button");

let game: GameState = createGame();
const cellButtons: HTMLButtonElement[] = [];

/**
 * 25個のマスを一度だけ作り、更新後も同じボタンを使い続けます。
 * ボタンを再生成しないことで、手を打った後もキーボードフォーカスを保てます。
 */
function createCellButtons(): void {
  const fragment = document.createDocumentFragment();

  for (let cellIndex = 0; cellIndex < CELL_COUNT; cellIndex += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lights-out-cell";
    button.dataset.cellIndex = String(cellIndex);
    button.addEventListener("click", () => chooseCell(cellIndex));
    cellButtons.push(button);
    fragment.append(button);
  }

  boardElement.replaceChildren(fragment);
}

/**
 * 盤面状態から各マスの記号・色・読み上げ名と全体の案内を更新します。
 * 点灯数も伝えることで、クリアまでに残っている状態を絵だけに頼らず把握できます。
 */
function renderGame(resetNotice = false): void {
  let litCount = 0;

  for (let cellIndex = 0; cellIndex < CELL_COUNT; cellIndex += 1) {
    const button = cellButtons[cellIndex];
    const isLit = game.board[cellIndex];
    const row = Math.floor(cellIndex / BOARD_WIDTH) + 1;
    const column = (cellIndex % BOARD_WIDTH) + 1;

    if (isLit) litCount += 1;

    button.textContent = isLit ? "●" : "○";
    button.setAttribute(
      "aria-label",
      `${row}行${column}列目、${isLit ? "点灯中" : "消灯"}`,
    );
    button.setAttribute("aria-pressed", String(isLit));
    button.classList.toggle("is-lit", isLit);
  }

  if (game.status === "cleared") {
    gameFeedback.textContent = "クリア！すべてのライトが消えました。";
  } else if (resetNotice) {
    gameFeedback.textContent = "盤面を初期状態に戻しました。すべて消灯を目指してください。";
  } else {
    gameFeedback.textContent = `点灯中のマスは${litCount}個です。選んだマスと上下左右が反転します。`;
  }
}

/**
 * 選んだマスで状態を更新し、同じボタン群へ新しい表示を反映します。
 * クリア後はpressCellが同じ状態を返すため、それ以上の操作を受け付けません。
 */
function chooseCell(cellIndex: number): void {
  const nextGame = pressCell(game, cellIndex);

  if (nextGame === game) return;

  game = nextGame;
  renderGame();
}

/**
 * 新しい初期盤面へ戻し、最初のマスにフォーカスを置きます。
 * リセット後にキーボード利用者がそのまま盤面を操作できるようにします。
 */
resetButton.addEventListener("click", () => {
  game = resetGame();
  renderGame(true);
  cellButtons[0].focus();
});

createCellButtons();
renderGame();
