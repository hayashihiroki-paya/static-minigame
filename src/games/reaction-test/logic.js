/**
 * 反射神経テストのラウンド状態、待機タイマー、計測結果を画面から分けます。
 * 時計・乱数・タイマーを引数で差し替えることで、待機と計測を実時間なしで検証できます。
 */
export const ROUND_COUNT = 5;
export const MIN_WAIT_MS = 1000;
export const MAX_WAIT_MS = 3000;

/**
 * 新しい記録の初期状態を作ります。
 * @returns {{phase: string, results: number[], signaledAt: number|null}} 待機前の状態
 */
function createInitialState() {
  return {
    phase: "ready",
    results: [],
    signaledAt: null,
  };
}

/**
 * 内部状態をコピーして返し、呼び出し側が結果配列を直接変更できないようにします。
 * @param {{phase: string, results: number[], signaledAt: number|null}} state 複製元
 * @returns {{phase: string, results: number[], signaledAt: number|null}} 公開用の状態
 */
function copyState(state) {
  return {
    ...state,
    results: [...state.results],
  };
}

/**
 * 反応時間の一覧から平均と最速を算出します。
 * 平均は画面で読みやすい整数ミリ秒に丸めます。
 * @param {number[]} results 記録した反応時間
 * @returns {{averageMs: number, fastestMs: number}} 集計結果
 */
export function summarizeResults(results) {
  if (results.length === 0) {
    return { averageMs: 0, fastestMs: 0 };
  }

  const totalMs = results.reduce((total, value) => total + value, 0);
  return {
    averageMs: Math.round(totalMs / results.length),
    fastestMs: Math.min(...results),
  };
}

/**
 * 反射神経テスト用の状態管理を作り、時間と乱数の依存を外から受け取ります。
 * タイマーが取消し直前に実行待ちへ入っても、世代番号で古い合図を無効にします。
 * @param {object} options 置き換え可能な時計・乱数・タイマー・状態通知
 * @param {() => number} [options.now] 単調増加する現在時刻。通常はperformance.now
 * @param {() => number} [options.random] 0以上1未満の乱数
 * @param {(callback: () => void, delay: number) => unknown} [options.schedule] 遅延コールバックを登録
 * @param {(timerId: unknown) => void} [options.cancel] 登録済みコールバックを取り消す
 * @param {(state: object) => void} [options.onChange] 状態変更の通知先
 * @returns {{getState: () => object, startRound: () => object, submitResponse: () => object, reset: () => object}} 状態操作
 */
export function createReactionGameController({
  now = () => globalThis.performance.now(),
  random = Math.random,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  cancel = (timerId) => globalThis.clearTimeout(timerId),
  onChange = () => {},
} = {}) {
  let state = createInitialState();
  let timerId = null;
  let timerGeneration = 0;

  /**
   * 現在の状態を安全なコピーとして返します。
   * @returns {{phase: string, results: number[], signaledAt: number|null}} 現在のゲーム状態
   */
  function getState() {
    return copyState(state);
  }

  /**
   * 画面側へコピーを通知し、表示層が内部配列を書き換えないようにします。
   */
  function notifyChange() {
    onChange(getState());
  }

  /**
   * タイマーを取り消し、すでにキューへ入った古いコールバックも世代番号で無効にします。
   */
  function cancelPendingTimer() {
    timerGeneration += 1;
    if (timerId === null) return;

    cancel(timerId);
    timerId = null;
  }

  /**
   * 1秒以上3秒未満の待ち時間を抽選します。
   * 0以上1未満以外を拒否し、テスト用乱数の誤りが無音の不具合にならないようにします。
   * @returns {number} 待ち時間のミリ秒
   */
  function chooseWaitDuration() {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("乱数関数は0以上1未満の値を返してください。");
    }

    return MIN_WAIT_MS + Math.floor(value * (MAX_WAIT_MS - MIN_WAIT_MS));
  }

  /**
   * 準備状態またはラウンド結果から待機を始め、タイマー後に合図を出します。
   * 合図時刻は予定時刻でなく実際に画面を切り替えた時刻にし、イベントループ遅延を計測に混ぜません。
   * @returns {object} 更新後の状態
   */
  function startRound() {
    if (
      (state.phase !== "ready" && state.phase !== "result") ||
      state.results.length >= ROUND_COUNT
    ) {
      return getState();
    }

    cancelPendingTimer();
    const waitDuration = chooseWaitDuration();
    const generation = timerGeneration;

    state = {
      phase: "waiting",
      results: [...state.results],
      signaledAt: null,
    };
    notifyChange();

    timerId = schedule(() => {
      if (
        generation !== timerGeneration ||
        state.phase !== "waiting"
      ) {
        return;
      }

      timerId = null;
      state = {
        ...state,
        phase: "go",
        signaledAt: now(),
      };
      notifyChange();
    }, waitDuration);

    return getState();
  }

  /**
   * 待機中ならフライング、合図後なら反応時間として入力を処理します。
   * @returns {object} 更新後の状態。入力できない状態では現在状態
   */
  function submitResponse() {
    if (state.phase === "waiting") {
      cancelPendingTimer();
      state = {
        ...state,
        phase: "false-start",
        signaledAt: null,
      };
      notifyChange();
      return getState();
    }

    if (state.phase !== "go" || state.signaledAt === null) {
      return getState();
    }

    const reactionTime = Math.max(0, Math.round(now() - state.signaledAt));
    const results = [...state.results, reactionTime];
    state = {
      phase: results.length >= ROUND_COUNT ? "finished" : "result",
      results,
      signaledAt: null,
    };
    notifyChange();
    return getState();
  }

  /**
   * 記録を初期状態に戻し、待機中のタイマーを停止します。
   * @returns {object} 準備状態
   */
  function reset() {
    cancelPendingTimer();
    state = createInitialState();
    notifyChange();
    return getState();
  }

  return {
    getState,
    startRound,
    submitResponse,
    reset,
  };
}
