import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = ["src", "tests", "scripts"];

async function findJavaScriptFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return findJavaScriptFiles(path);
      }

      return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
    }),
  );

  return nestedFiles.flat();
}

const files = (await Promise.all(roots.map(findJavaScriptFiles))).flat();
let hasSyntaxErrors = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    hasSyntaxErrors = true;
  }
}

if (hasSyntaxErrors) {
  process.exitCode = 1;
} else {
  console.log(`JavaScript syntax checked: ${files.length} file(s)`);
}
