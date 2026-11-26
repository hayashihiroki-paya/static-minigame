# ゲーム別の技術・手法記録

ゲームごとに使った技術や手法、実装を通して分かったことを記録します。どのゲームで何を試したかを確認し、次の実装で学びを続けるための一覧です。

すべてのゲームのロジックテストにはNode.js組み込みのテストランナーを使います。表では共通の前提を重ねて書かず、ゲームごとの特徴的な技術・手法を記録します。

## これまでのゲーム

「初期の学習記録」は、ゲームごとに新技術を試す方針が決まる前の実装です。当時の主な手法は記録しますが、意図的な技術試行としては扱いません。

| ゲーム | 区分 | 主な技術・手法 | 学習・結果 | 関連Issue |
| --- | --- | --- | --- | --- |
| [数字当て](../src/games/number-guess/) | 初期の学習記録 | HTML/CSS/JavaScript。ゲームルールを画面表示から分け、乱数関数と正解値を外から渡す。 | 条件分岐とゲーム状態の基礎を学び、乱数を固定して境界値や勝敗を再現できるテストにした。 | [#4](https://github.com/hayashihiroki-paya/static-minigame/issues/4) |
| [じゃんけん](../src/games/rock-paper-scissors/) | 初期の学習記録 | HTML/CSS/JavaScriptを継続。3種類の手の勝敗関係を表にし、乱数選択をテストで固定する。 | 9通りの勝敗、ラウンド結果、ページ内の累計スコアを扱った。 | [#8](https://github.com/hayashihiroki-paya/static-minigame/issues/8) |
| [神経衰弱](../src/games/memory-match/) | 初期の学習記録 | HTML/CSS/JavaScript。Fisher–Yates法でカードを混ぜ、不一致カードを一定時間後に戻す状態遷移を実装する。 | 乱数を固定したシャッフルの確認と、待機・一致・完了の状態管理を学んだ。 | [#12](https://github.com/hayashihiroki-paya/static-minigame/issues/12) |
| [マルバツゲーム](../src/games/tic-tac-toe/) | 初期の学習記録 | HTML/CSS/JavaScript。8通りの勝ち筋をデータとして列挙し、盤面状態から勝利・引き分けを判定する。 | 盤面を配列で表し、手番と終了状態を含むルールをテストから再現した。 | [#14](https://github.com/hayashihiroki-paya/static-minigame/issues/14) |
| [ライツアウト](../src/games/lights-out/) | 意図的な技術試行 | TypeScriptとVite。型検査とブラウザー向けビルドを行い、生成物を静的ファイルとして配信する。 | 型で盤面状態を表し、ビルド時の変換と実行時の静的配信を分けた。 | [#16](https://github.com/hayashihiroki-paya/static-minigame/issues/16) |
| [ブロック崩し](../src/games/breakout/) | 意図的な技術試行 | Canvas 2D APIとrequestAnimationFrame。固定時間刻みで状態を進め、衝突ルールを描画処理から分ける。 | Canvas座標での描画、フレーム更新、衝突判定を試し、時間と入力を固定したロジックテストを用意した。 | [#20](https://github.com/hayashihiroki-paya/static-minigame/issues/20) |
| [スネーク](../src/games/snake/) | 意図的な技術試行 | Svelte 5とVite。\`$state\`・\`$derived\`で盤面と表示を同期し、ゲームルールは通常のJavaScriptモジュールへ分ける。 | Svelteのリアクティブな状態管理とコンポーネントを試しつつ、ルールをUIから独立させてNode.jsの組み込みテストで決定的に確認できた。静的ビルドで配信するための構成も記録した。 | [#24](https://github.com/hayashihiroki-paya/static-minigame/issues/24) |
| [サイモンゲーム](../src/games/simon/) | 意図的な技術試行 | Web Audio API。AudioContext、OscillatorNode、GainNodeで短い音を合成し、音声処理をルールから分ける。 | AudioContextをユーザー操作後に開始する制約、音の合成と停止、消音・非対応時の扱いを試した。ゲームルールはNode.jsでテストし、音声APIがなくても視覚操作で遊べるようにした。 | [#26](https://github.com/hayashihiroki-paya/static-minigame/issues/26) |
| [2048](../src/games/2048/) | 意図的な技術試行 | 盤面の行・列を移動方向に並べ替え、空きを詰めて同じ値を一度だけ合成する状態更新アルゴリズム。 | 4方向を共通の座標処理で扱い、乱数を注入して移動後のタイル生成を決定的にテストできるようにした。 | [#34](https://github.com/hayashihiroki-paya/static-minigame/issues/34) |
| [反射神経テスト](../src/games/reaction-test/) | 意図的な技術試行 | `performance.now()`の単調増加時計と、注入可能な乱数・タイマーで待機と反応時間を管理する。 | 実際に合図を描画した時刻から反応時間を測り、待機キャンセル後の古いコールバックも世代番号で無効化する。固定時計・タイマーで非同期状態を再現可能にテストする。 | [#36](https://github.com/hayashihiroki-paya/static-minigame/issues/36) |
| [迷路脱出](../src/games/maze-escape/) | 意図的な技術試行 | スタックを使った反復型の深さ優先探索で、未訪問の隣室へ進み、行き止まりでは戻りながら迷路を生成する。 | 訪問済み管理とバックトラッキングを使い、全室がつながる迷路を作る。乱数を注入し、別の幅優先探索で接続性とゴール経路を検証する。 | [#38](https://github.com/hayashihiroki-paya/static-minigame/issues/38) |
| [8パズル](../src/games/sliding-puzzle/) | 意図的な技術試行 | A*探索とマンハッタン距離ヒューリスティックで、3×3盤面からゴールまでの最短手順を求める。候補管理には二分ヒープの優先度付きキューを使う。 | ゴールまでの距離を過大評価しないヒューリスティックを使い、探索順を選ぶ方法を試した。固定盤面で最短経路と一手ヒントをテストする。 | [#40](https://github.com/hayashihiroki-paya/static-minigame/issues/40) |
| [ノノグラム](../src/games/nonogram/) | 意図的な技術試行 | 5マスの行・列をビットマスクで表し、数字ヒントに合うパターンを列挙する。交差する行列で候補を照合して制約を伝播する。 | 小さな候補集合を段階的に絞る制約充足を試し、全候補が合意するマスだけをヒントに使う。入力による候補減少、矛盾、確定できるマスがない状態をテストする。 | [#42](https://github.com/hayashihiroki-paya/static-minigame/issues/42) |
| [リバーシ](../src/games/reversi/) | 意図的な技術試行 | 深さ制限付きミニマックス法とαβ枝刈り。石数・角・合法手数の評価と角を優先する手順を使い、探索量を抑える。 | 手番ごとに最大化・最小化を切り替え、パスを深さ消費なしで処理する。固定深さの探索、位置評価、決定的な同点処理をテストする。 | [#44](https://github.com/hayashihiroki-paya/static-minigame/issues/44) |
| [ライフゲーム](../src/games/game-of-life/) | 意図的な技術試行 | セルオートマトンのB3/S23規則と二重バッファ方式。8近傍から次世代の状態を計算し、現在の盤面を読み取り専用の入力として保つ。 | 全セルを一斉に更新するため、配列をその場で書き換える場合と違い走査順に結果が左右されない。安定するブロックと周期2のブリンカーで規則と世代更新を確かめる。 | [#46](https://github.com/hayashihiroki-paya/static-minigame/issues/46) |
| [もぐらたたき](../src/games/whack-a-mole/) | 意図的な技術試行 | ReactとJSX。`useState`で画面状態を管理し、`useEffect`で1秒タイマーを予約して、終了・リセット時の後片付けをする。Vite Reactプラグインで静的ファイルへ変換する。 | 画面の状態更新とゲームルールを分け、乱数選択を状態更新関数の外に置いて遷移を決定的に保つ。Reactの副作用とクリーンアップ、既存のSvelteとの状態管理の違いを試す。 | [#48](https://github.com/hayashihiroki-paya/static-minigame/issues/48) |
| [ハノイの塔](../src/games/hanoi-tower/) | 意図的な技術試行 | 再帰関数で「上のn-1枚を補助棒へ移す・一番大きい円盤を移す・上のn-1枚を目的棒へ移す」に分けて最短手順を生成する。 | 終了条件と3段階の再帰呼び出しから2^n - 1手になることを確かめた。盤面状態の更新と解法一覧を分け、生成した手順を合法手として再生するテストで検証する。 | [#50](https://github.com/hayashihiroki-paya/static-minigame/issues/50) |
| [さめがめ](../src/games/same-game/) | 意図的な技術試行 | Rustの盤面ルールをwasm-bindgenでWebAssemblyへ変換し、JavaScriptの画面から呼び出す。ViteでWASMとページを静的ファイルへまとめる。 | 別言語のロジックをブラウザーから利用する境界を試す。Rust単体テストに加えNode.jsから実際のWASM APIを呼び、隣接グループ探索、除去、盤面詰め、得点を確認する。 | [#52](https://github.com/hayashihiroki-paya/static-minigame/issues/52) |
| [倉庫パズル](../src/games/warehouse-puzzle/) | 意図的な技術試行 | 文字列で定義したステージを読み込み、成功した手の直前の状態を履歴の末尾に積む。 | 壁とゴールは固定し、プレイヤーと箱の位置を一組で復元する。全ステージの解答手順をテストで再生して、データと移動ルールを一緒に確認する。 | [#58](https://github.com/hayashihiroki-paya/static-minigame/issues/58) |
| [日本語タイピング](../src/games/typing-game/) | 意図的な技術試行 | 日本語IMEの変換イベントを追跡し、回答用のEnterと変換確定用のEnterを区別する。 | 変換中の入力は得点に反映せず、回答時刻で制限時間を判定する。変換イベントと30秒の境界をテストする。 | [#60](https://github.com/hayashihiroki-paya/static-minigame/issues/60) |
| [4レーンリズム](../src/games/rhythm-game/) | 意図的な技術試行 | Web Audioの時計に発音を予約し、同じ基準時刻からノーツの位置と入力の時刻差を計算する。 | 描画間隔が変わっても判定がずれないよう、経過時刻から毎回位置を求める。判定幅の境界と音の予約時刻を自動テストする。 | [#62](https://github.com/hayashihiroki-paya/static-minigame/issues/62) |
| [ミニゴルフ](../src/games/mini-golf/) | 意図的な技術試行 | 描画に使った時間を蓄積し、8msごとの固定ステップで反射と減速を計算する。 | 余った時間は次の描画まで持ち越し、画面の更新間隔が変わっても同じ順序で物理を進める。異なる更新間隔と全3ホールのクリア手順をテストする。 | [#64](https://github.com/hayashihiroki-paya/static-minigame/issues/64) |
| [空の足場](../src/games/side-scroll-action/) | 意図的な技術試行 | 足場を離れた時刻とジャンプを押した時刻を固定ステップの時計で記録し、それぞれ100msの猶予を設ける。 | 足場を離れた直後や着地直前の操作に応えつつ、消費済みの入力が空中で再発動しないことをテストする。 | [#66](https://github.com/hayashihiroki-paya/static-minigame/issues/66) |
| [タワーディフェンス](../src/games/tower-defense/) | 意図的な技術試行 | 出現時刻・耐久・速度をウェーブデータにし、進行ループで時刻に達した相手を出現させる。 | 出現間隔と難易度のデータを処理から独立させる。ルート上の距離で狙う順序を決め、出現時刻・射程・全ウェーブの配置手順を自動テストする。 | [#68](https://github.com/hayashihiroki-paya/static-minigame/issues/68) |
| [数独](../src/games/sudoku/) | 意図的な技術試行 | 解の一意性を調べる問題生成をWeb Workerで実行する。 | 解を2つ見つけた時点で探索を打ち切り、候補が一つのマスだけで解ける問題を採用する。画面は生成のやり直しを受け付け、古いWorkerを破棄する。 | [#70](https://github.com/hayashihiroki-paya/static-minigame/issues/70) |

## 今後の更新方法

- 新しいゲームの実装PRでは、この表にゲーム、主に試した技術・手法、学んだこと、関連Issueを追記します。
- 試行をしない場合は「新規試行なし」とし、既存技術を使う理由を記録します。
- 主な試行はゲームごとにひとつを目安にし、複数を組み合わせる場合は理由も残します。
- 実装後に分かった制約や次のゲームで活かせる点があれば、学習・結果の欄を具体的に更新します。
- 既存ゲームの技術移行は、新しいゲームの履歴と混ぜず、別Issue・PRで記録します。
