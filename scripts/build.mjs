/* Fill Zoom — 빌드
 *
 * src/*.ts 를 esbuild 로 묶어 dist/ 에 놓고, static/ 의 파일을 옮겨 담는다.
 * manifest.json 의 commands 는 src/shortcuts.ts 의 표로 채운다.
 * 크롬에는 dist/ 폴더를 불러온다.
 *
 *   node scripts/build.mjs          한 번 빌드
 *   node scripts/build.mjs --watch  고칠 때마다 다시 빌드
 */
import * as esbuild from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// node 가 타입만 지우고 바로 읽는다. 그래서 shortcuts.ts 는 다른 파일을 import 하지 않는다.
import { BROWSER_COMMANDS } from "../src/shortcuts.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const watch = process.argv.includes("--watch");

async function writeStatic() {
  await cp(path.join(root, "static"), dist, { recursive: true });

  const manifest = JSON.parse(await readFile(path.join(root, "static", "manifest.json"), "utf8"));
  manifest.commands = Object.fromEntries(
    Object.entries(BROWSER_COMMANDS).map(([name, c]) => [
      name,
      { suggested_key: { default: c.suggested }, description: c.description }
    ])
  );
  await writeFile(path.join(dist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

const options = {
  entryPoints: {
    content: path.join(root, "src", "content.ts"),
    background: path.join(root, "src", "background.ts"),
    popup: path.join(root, "src", "popup.ts")
  },
  outdir: dist,
  bundle: true,
  // 콘텐츠 스크립트는 모듈로 불러올 수 없다. 셋 다 즉시 실행 함수로 감싼다.
  format: "iife",
  target: "chrome110",
  charset: "utf8",
  logLevel: "info",
  plugins: [{
    name: "static",
    setup(build) {
      build.onEnd(async (result) => {
        if (!result.errors.length) await writeStatic();
      });
    }
  }]
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
