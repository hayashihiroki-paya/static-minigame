import { useEffect, useState } from "react";
import {
  advanceOneSecond,
  chooseNextHole,
  createInitialGameState,
  hitHole,
  startGame,
} from "./logic.js";

/** Reactの状態を画面に反映し、ゲームルールはlogic.jsへ委ねます。 */
export function WhackAMoleApp() {
  const [game, setGame] = useState(createInitialGameState);
  const [announcement, setAnnouncement] = useState("開始ボタンを押してゲームを始めてください。");

  // 残り時間か直前の穴が変わるごとに1秒後の更新を予約し、終了・リセット時は破棄します。
  useEffect(() => {
    if (game.phase !== "playing") return undefined;

    const timerId = window.setTimeout(() => {
      // 乱数はReactの状態更新関数の外で選び、状態遷移関数を純粋に保ちます。
      const nextHole =
        game.remainingSeconds > 1 ? chooseNextHole(game.previousHole) : null;
      setGame((currentGame) => advanceOneSecond(currentGame, nextHole));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [game.phase, game.remainingSeconds, game.previousHole]);

  function handleStart() {
    setGame(startGame());
    setAnnouncement("ゲーム開始。モグラがいる穴を押してください。");
  }

  function handleReset() {
    setGame(createInitialGameState());
    setAnnouncement("ゲームを初期化しました。開始ボタンを押してください。");
  }

  function handleHoleClick(holeIndex) {
    if (game.phase !== "playing") return;

    if (game.activeHole === holeIndex) {
      setAnnouncement(`ヒット！現在の得点は${game.score + 1}点です。`);
    } else {
      setAnnouncement("モグラはいません。得点は変わりません。");
    }
    setGame((currentGame) => hitHole(currentGame, holeIndex));
  }

  const statusMessage =
    game.phase === "finished"
      ? `時間です。最終得点は${game.score}点です。`
      : announcement;

  return (
    <main className="page-shell whack-page">
      <header className="whack-header">
        <a className="back-link" href="../../../index.html">← ゲーム一覧へ</a>
        <h1>もぐらたたき</h1>
        <p className="lead">モグラがいる穴を押して、30秒で得点しよう。</p>
      </header>

      <section className="whack-card" aria-labelledby="whack-title">
        <h2 id="whack-title">3×3の穴</h2>

        <div className="whack-stats" aria-label="ゲームの記録">
          <p>残り時間 <strong>{game.remainingSeconds}</strong>秒</p>
          <p>得点 <strong>{game.score}</strong>点</p>
        </div>

        <div className="whack-board" role="group" aria-label="モグラたたきの穴">
          {Array.from({ length: 9 }, (_, holeIndex) => {
            const hasMole = game.activeHole === holeIndex;
            return (
              <button
                key={holeIndex}
                className={`whack-hole${hasMole ? " whack-hole--active" : ""}`}
                type="button"
                aria-label={`穴${holeIndex + 1}、${hasMole ? "モグラがいます" : "モグラはいません"}`}
                disabled={game.phase !== "playing"}
                onClick={() => handleHoleClick(holeIndex)}
              >
                <span aria-hidden="true">{hasMole ? "🐹" : ""}</span>
              </button>
            );
          })}
        </div>

        <div className="whack-actions" role="group" aria-label="ゲーム操作">
          <button
            className="whack-button whack-button--primary"
            type="button"
            onClick={handleStart}
            disabled={game.phase === "playing"}
          >
            {game.phase === "ready" ? "ゲーム開始" : "もう一度遊ぶ"}
          </button>
          <button className="whack-button" type="button" onClick={handleReset}>
            リセット
          </button>
        </div>

        <p className="whack-feedback" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>
      </section>
    </main>
  );
}
