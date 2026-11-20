<script>
  import "../../style.css";
  import { onMount } from "svelte";
  import {
    GRID_SIZE,
    MOVE_INTERVAL_MS,
    advanceGame,
    changeDirection,
    createInitialGame,
    resetGame,
    startGame,
  } from "./logic.js";

  let game = $state(createInitialGame());
  let timerId = null;

  // 盤面の各マスに種類を付け、Svelteが状態の変更に合わせて描画を更新します。
  const cells = $derived.by(() => {
    const snakeCells = new Map(game.snake.map((part, index) => [`${part.x},${part.y}`, index]));
    const result = [];

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const snakeIndex = snakeCells.get(`${x},${y}`);
        const isSnake = snakeIndex !== undefined;
        const isFood = game.food?.x === x && game.food?.y === y;
        result.push({
          id: `${x},${y}`,
          kind: isSnake ? (snakeIndex === 0 ? "head" : "body") : isFood ? "food" : "empty",
        });
      }
    }

    return result;
  });

  const statusMessage = $derived(
    game.status === "ready"
      ? "スタートを押して始めてください。矢印キーまたはW・A・S・Dで方向を操作できます。"
      : game.status === "playing"
        ? `プレイ中です。現在の得点は${game.score}点です。`
        : game.status === "won"
          ? `クリアです。最終得点は${game.score}点です。`
          : `ゲームオーバーです。最終得点は${game.score}点です。`
  );

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(() => {
      game = advanceGame(game);
      if (game.status !== "playing") {
        stopTimer();
      }
    }, MOVE_INTERVAL_MS);
  }

  function beginGame() {
    game = startGame(game);
    if (game.status === "playing") startTimer();
  }

  function restartGame() {
    stopTimer();
    game = resetGame();
  }

  function turn(direction) {
    game = changeDirection(game, direction);
  }

  function handleKeydown(event) {
    const keyDirections = {
      ArrowUp: "up",
      ArrowRight: "right",
      ArrowDown: "down",
      ArrowLeft: "left",
      w: "up",
      d: "right",
      s: "down",
      a: "left",
      W: "up",
      D: "right",
      S: "down",
      A: "left",
    };
    const direction = keyDirections[event.key];

    if (direction) {
      event.preventDefault();
      turn(direction);
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);

    // ページを離れるときにタイマーと入力処理を止め、不要な更新を残さないようにします。
    return () => {
      stopTimer();
      window.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<main class="page-shell snake-page">
  <header class="snake-header">
    <a class="back-link" href="../../../index.html">← ゲーム一覧へ</a>
    <h1>スネーク</h1>
    <p class="lead">食べ物を集めて、蛇を長くしよう。</p>
  </header>

  <section class="snake-card" aria-labelledby="board-heading">
    <h2 id="board-heading">ゲーム画面</h2>

    <!-- セルは装飾として扱い、盤面の変化はテキストの状態通知でも伝えます。 -->
    <div class="snake-board" role="img" aria-label="スネークの15マス×15マスの盤面">
      {#each cells as cell (cell.id)}
        <span class="snake-cell snake-cell--{cell.kind}"></span>
      {/each}
    </div>

    <dl class="snake-progress">
      <div>
        <dt>得点</dt>
        <dd>{game.score}</dd>
      </div>
      <div>
        <dt>蛇の長さ</dt>
        <dd>{game.snake.length}</dd>
      </div>
    </dl>

    <div class="snake-buttons" role="group" aria-label="ゲーム開始とリセット">
      <button
        class="snake-button snake-button--primary"
        type="button"
        onclick={beginGame}
        disabled={game.status !== "ready"}
      >
        スタート
      </button>
      <button class="snake-button" type="button" onclick={restartGame}>最初から遊ぶ</button>
    </div>

    <p class="snake-help" id="control-help">
      矢印キーまたはW・A・S・Dで移動します。画面下の方向ボタンも使えます。壁や自分にぶつかるとゲームオーバーです。
    </p>

    <div class="snake-pad" role="group" aria-label="方向操作">
      <button class="snake-button snake-button--up" type="button" onclick={() => turn("up")} aria-label="上へ">↑</button>
      <button class="snake-button snake-button--left" type="button" onclick={() => turn("left")} aria-label="左へ">←</button>
      <button class="snake-button snake-button--down" type="button" onclick={() => turn("down")} aria-label="下へ">↓</button>
      <button class="snake-button snake-button--right" type="button" onclick={() => turn("right")} aria-label="右へ">→</button>
    </div>

    <p class="snake-feedback" role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  </section>

  <footer class="site-footer">
    <p>食べ物を取ると蛇が伸び、壁や自分にぶつかるとゲームが終了します。</p>
  </footer>
</main>

<style>
  /* ゲーム専用のクラスだけを使い、ほかのページの見た目に影響させません。 */
  .snake-header {
    margin: 0 auto 2rem;
    text-align: center;
  }

  .back-link {
    display: inline-block;
    margin-bottom: 2rem;
    color: #3649a5;
    font-weight: 700;
    text-underline-offset: 0.2em;
  }

  .back-link:focus-visible,
  .snake-button:focus-visible {
    outline: 3px solid #5369c8;
    outline-offset: 3px;
  }

  .snake-card {
    width: min(100%, 34rem);
    margin: 0 auto;
    padding: clamp(1rem, 4vw, 2rem);
    border: 1px solid #dfe5f2;
    border-radius: 1.5rem;
    background: #fff;
    box-shadow: 0 1rem 3rem rgb(34 48 80 / 7%);
  }

  .snake-card h2 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    text-align: center;
  }

  /* CSS Gridで15×15の盤面を作り、HTMLの各セルを状態に応じて色分けします。 */
  .snake-board {
    display: grid;
    grid-template-columns: repeat(15, minmax(0, 1fr));
    width: min(100%, 28rem);
    aspect-ratio: 1;
    margin: 0 auto;
    overflow: hidden;
    border: 2px solid #263a91;
    border-radius: 0.75rem;
    background: #f4f6ff;
  }

  .snake-cell {
    border: 1px solid rgb(38 58 145 / 8%);
  }

  .snake-cell--head {
    border-radius: 0.25rem;
    background: #263a91;
  }

  .snake-cell--body {
    border-radius: 0.2rem;
    background: #6176cf;
  }

  .snake-cell--food {
    border-radius: 50%;
    background: #e35a58;
    transform: scale(0.7);
  }

  .snake-progress {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .snake-progress div {
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: #f3f5fc;
    text-align: center;
  }

  .snake-progress dt {
    color: #566176;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .snake-progress dd {
    margin: 0.25rem 0 0;
    color: #263a91;
    font-size: 1.35rem;
    font-weight: 800;
  }

  .snake-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.65rem;
  }

  .snake-button {
    min-width: 3.25rem;
    min-height: 3rem;
    padding: 0.65rem 1rem;
    border: 1px solid #cbd3e8;
    border-radius: 0.75rem;
    background: #f7f8ff;
    color: #263456;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    touch-action: manipulation;
  }

  .snake-button:hover:not(:disabled) {
    background: #eef0ff;
  }

  .snake-button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .snake-button--primary {
    border-color: #3649a5;
    background: #4357b6;
    color: #fff;
  }

  .snake-help {
    margin: 0.85rem 0 0;
    color: #566176;
    font-size: 0.92rem;
    line-height: 1.7;
    text-align: center;
  }

  /* 十字キーは標準ボタンなので、タッチ・マウス・キーボードのどれでも操作できます。 */
  .snake-pad {
    display: grid;
    grid-template-columns: repeat(3, 3.5rem);
    grid-template-rows: repeat(2, 3.25rem);
    justify-content: center;
    gap: 0.35rem;
    margin-top: 1rem;
  }

  .snake-pad .snake-button {
    padding: 0.3rem;
    font-size: 1.25rem;
  }

  .snake-button--up {
    grid-column: 2;
    grid-row: 1;
  }

  .snake-button--left {
    grid-column: 1;
    grid-row: 2;
  }

  .snake-button--down {
    grid-column: 2;
    grid-row: 2;
  }

  .snake-button--right {
    grid-column: 3;
    grid-row: 2;
  }

  .snake-feedback {
    min-height: 3.5rem;
    margin: 1rem 0 0;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    background: #f0f3ff;
    color: #263a91;
    font-weight: 800;
    line-height: 1.6;
    text-align: center;
  }

  @media (max-width: 520px) {
    .snake-card {
      padding: 0.8rem;
    }
  }
</style>
