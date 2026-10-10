/* Tiltfill — 스토어에 올릴 zip 만들기
 *
 * dist/ 의 내용물을 zip 의 맨 위에 담아 release/tiltfill-<버전>.zip 으로 만든다.
 * 스토어는 manifest.json 이 zip 의 맨 위에 있어야 받는다. dist 폴더째 압축하면
 * manifest.json 이 한 단계 아래로 들어가 거절당한다.
 *
 * 항상 `npm run package` 로 부른다. 그래야 타입 검사를 거친 새 빌드가 담긴다.
 * zip 을 쓰는 도구를 따로 깔지 않으려고 형식을 직접 쓴다.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import zlib from "node:zlib";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");

async function walk(dir, base = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...await walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

// 날짜를 고정한다. 같은 소스에서 만든 zip 이 언제 만들어도 같은 파일이 된다.
const DOS_TIME = 0;
const DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1;

const names = await walk(dist);
const parts = [];
const central = [];
let offset = 0;
for (const name of names) {
  const data = await readFile(path.join(dist, name));
  const packed = zlib.deflateRawSync(data, { level: 9 });
  const nameBytes = Buffer.from(name, "utf8");
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4);            // 풀 때 필요한 판
  head.writeUInt16LE(0x0800, 6);        // 이름이 UTF-8 이다
  head.writeUInt16LE(8, 8);             // deflate
  head.writeUInt16LE(DOS_TIME, 10);
  head.writeUInt16LE(DOS_DATE, 12);
  head.writeUInt32LE(zlib.crc32(data), 14);
  head.writeUInt32LE(packed.length, 18);
  head.writeUInt32LE(data.length, 22);
  head.writeUInt16LE(nameBytes.length, 26);
  parts.push(head, nameBytes, packed);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  head.copy(entry, 6, 4, 30);           // 판, 표시, 방식, 시각, CRC, 크기, 이름 길이
  entry.writeUInt32LE(offset, 42);
  central.push(entry, nameBytes);
  offset += head.length + nameBytes.length + packed.length;
}
const centralSize = central.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(names.length, 8);
end.writeUInt16LE(names.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

if (!names.includes("manifest.json")) throw new Error("dist/ 에 manifest.json 이 없습니다. 먼저 빌드하세요.");
const { version } = JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8"));
const outDir = path.join(root, "release");
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `tiltfill-${version}.zip`);
await writeFile(outFile, Buffer.concat([...parts, ...central, end]));
console.log(`${path.relative(root, outFile)}  (파일 ${names.length}개)`);
