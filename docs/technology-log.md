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

## 今後の更新方法

- 新しいゲームの実装PRでは、この表にゲーム、主に試した技術・手法、学んだこと、関連Issueを追記します。
- 試行をしない場合は「新規試行なし」とし、既存技術を使う理由を記録します。
- 主な試行はゲームごとにひとつを目安にし、複数を組み合わせる場合は理由も残します。
- 実装後に分かった制約や次のゲームで活かせる点があれば、学習・結果の欄を具体的に更新します。
- 既存ゲームの技術移行は、新しいゲームの履歴と混ぜず、別Issue・PRで記録します。
