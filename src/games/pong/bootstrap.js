/**
 * Phaserを含む本体は大きいためgzipで静的配布し、ブラウザーで展開してから起動します。
 * サーバー側の圧縮設定に頼らないので、GitHub Pagesのような静的ホストでも動きます。
 */
async function startCompressedGame() {
  const status = document.querySelector("#pong-status");

  if (!("DecompressionStream" in window)) {
    status.textContent = "このブラウザーはゲームの圧縮データ展開に対応していません。新しいブラウザーで開いてください。";
    return;
  }

  try {
    // bootstrap.jsと圧縮された本体は同じassetsフォルダーに出力されます。
    const compressedUrl = new URL(/* @vite-ignore */ "./main.js.gz", import.meta.url);
    const response = await fetch(compressedUrl);
    if (!response.ok) throw new Error(`ゲーム本体を取得できませんでした (${response.status})`);

    // DecompressionStreamはFetchのバイト列を逐次展開し、余分な中間文字列を作りません。
    const decompressed = response.body.pipeThrough(new DecompressionStream("gzip"));
    const gameBundle = await new Response(decompressed).blob();
    const moduleUrl = URL.createObjectURL(new Blob([gameBundle], { type: "text/javascript" }));

    try {
      // Blob URLをES moduleとして読み込むと、展開したPhaser本体を通常のモジュールとして実行できます。
      await import(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
  } catch (error) {
    status.textContent = "ゲームを読み込めませんでした。ページを再読み込みしてください。";
    console.error("卓球ゲームの読み込みに失敗しました。", error);
  }
}

startCompressedGame();
