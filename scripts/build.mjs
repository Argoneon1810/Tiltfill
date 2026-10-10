/* Tiltfill — 빌드
 *
 * src/*.ts 를 esbuild 로 묶어 dist/ 에 놓고, static/ 의 파일을 옮겨 담는다.
 * manifest.json 의 commands 는 src/shortcuts.ts 의 표로 채운다.
 * 화면의 글(static/_locales)에 빠진 열쇠가 없는지도 확인한다.
 * 크롬에는 dist/ 폴더를 불러온다.
 *
 *   node scripts/build.mjs          한 번 빌드
 *   node scripts/build.mjs --watch  고칠 때마다 다시 빌드
 */
import * as esbuild from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
      { suggested_key: { default: c.suggested, mac: c.suggestedMac }, description: `__MSG_${c.descriptionKey}__` }
    ])
  );
  await writeFile(path.join(dist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

// 소스에 쓰인 글의 열쇠가 두 언어에 모두 있는지 본다. 빠진 것이 있으면 화면에 열쇠가
// 그대로 찍히므로, 빌드를 멈춘다.
async function checkMessages() {
  const load = async (lang) =>
    JSON.parse(await readFile(path.join(root, "static", "_locales", lang, "messages.json"), "utf8"));
  const ko = await load("ko");
  const en = await load("en");
  const used = new Set(["extName", "extDescription"]);
  for (const name of await readdir(path.join(root, "src"))) {
    const text = await readFile(path.join(root, "src", name), "utf8");
    for (const m of text.matchAll(/\bt\("([A-Za-z0-9_]+)"/g)) used.add(m[1]);
    for (const m of text.matchAll(/"((?:hint|cmd)[A-Z][A-Za-z0-9]*)"/g)) used.add(m[1]);
  }
  const problems = [];
  for (const key of used) {
    if (!ko[key]) problems.push(`ko 에 ${key} 가 없습니다`);
    if (!en[key]) problems.push(`en 에 ${key} 가 없습니다`);
  }
  for (const key of Object.keys(ko)) if (!en[key]) problems.push(`en 에 ${key} 가 없습니다`);
  for (const key of Object.keys(en)) if (!ko[key]) problems.push(`ko 에 ${key} 가 없습니다`);
  for (const key of Object.keys(ko)) if (!used.has(key)) problems.push(`${key} 는 쓰이지 않습니다`);
  // 스토어는 요약을 132자, 이름을 75자까지만 받는다.
  for (const [lang, table] of [["ko", ko], ["en", en]]) {
    if (table.extDescription && [...table.extDescription.message].length > 132) problems.push(`${lang} 의 extDescription 이 132자를 넘습니다`);
    if (table.extName && [...table.extName.message].length > 75) problems.push(`${lang} 의 extName 이 75자를 넘습니다`);
  }
  if (problems.length) throw new Error("messages.json 확인:\n  " + [...new Set(problems)].join("\n  "));
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

await checkMessages();
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
