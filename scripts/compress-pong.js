import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { readFile, rm, writeFile } from "node:fs/promises";

const gzipAsync = promisify(gzip);
const bundlePath = new URL("../dist/games/pong/assets/main.js", import.meta.url);
const compressedPath = new URL("../dist/games/pong/assets/main.js.gz", import.meta.url);

// ビルドしたPhaser本体をgzipし、静的ホストでも小さいファイルを配れるようにします。
const bundle = await readFile(bundlePath);
const compressed = await gzipAsync(bundle, { level: 9 });
await writeFile(compressedPath, compressed);
await rm(bundlePath);
console.log(`Phaser bundle compressed: ${bundle.length} -> ${compressed.length} bytes`);
