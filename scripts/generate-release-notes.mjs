import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Tiltfill — GitHub Release 본문 생성기
 *
 * RELEASE_TAG 가 static/manifest.json 의 version 과 맞는지 확인하고,
 * 스토어 링크 + 수동 ZIP 설치법(한·영) + CHANGELOG 발췌 + SHA-256 값을
 * release/release-notes-<버전>.md 로 쓴다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "static", "manifest.json"), "utf8"),
);
const version = manifest.version;
const expectedTag = `v${version}`;
const actualTag = process.env.RELEASE_TAG || expectedTag;

if (actualTag !== expectedTag) {
  console.error(
    `[FAIL] 태그(${actualTag})와 static/manifest.json 버전(${expectedTag})이 다릅니다.`,
  );
  process.exit(1);
}

const zipName = `tiltfill-${version}.zip`;
const zipRelPath = `release/${zipName}`;
const zipFullPath = path.join(root, "release", zipName);

if (!fs.existsSync(zipFullPath)) {
  console.error(`[FAIL] 패키지 파일을 찾을 수 없습니다: ${zipFullPath}`);
  process.exit(1);
}

const sha256 = crypto
  .createHash("sha256")
  .update(fs.readFileSync(zipFullPath))
  .digest("hex");

function extractChangelog(ver) {
  const changelogPath = path.join(root, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) return "";
  const lines = fs.readFileSync(changelogPath, "utf8").split(/\r?\n/);
  const blocks = [];
  let collecting = false;
  let current = [];
  const headerRe = /^##\s+(\d+\.\d+\.\d+)\b/;

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (collecting && current.length > 0) blocks.push(current.join("\n").trim());
      if (m[1] === ver) {
        collecting = true;
        current = [`### ${line.replace(/^##\s+/, "")}`];
      } else {
        collecting = false;
        current = [];
      }
    } else if (collecting) {
      current.push(line);
    }
  }
  if (collecting && current.length > 0) blocks.push(current.join("\n").trim());
  return blocks.join("\n\n");
}

const changelogExcerpt = extractChangelog(version);

const notes = [
  `## 설치하기 / Install`,
  ``,
  `- **크롬 웹 스토어 (권장 / Recommended)**: [Tiltfill 스토어 페이지](https://chromewebstore.google.com/detail/tiltfill/ekodgikandbohjbgfofemohoefkpgkpd)에서 **Chrome에 추가**를 누른 뒤 열려 있던 유튜브 탭을 새로고침합니다.`,
  ``,
  `### ZIP 수동 설치 (빌드 도구 불필요)`,
  `1. 아래 **Assets**에서 **\`${zipName}\`** 을 받아 지우지 않을 폴더에 압축을 풉니다.`,
  `2. 크롬에서 \`chrome://extensions\` 를 열고 오른쪽 위 **개발자 모드**를 켭니다.`,
  `3. 왼쪽 위 **압축해제된 확장 프로그램을 로드합니다**를 누르고 압축 푼 폴더(\`manifest.json\` 이 들어 있는 폴더)를 고릅니다.`,
  `4. 이미 열려 있던 유튜브 탭을 새로고침합니다.`,
  ``,
  `### Manual Install from ZIP (No Node.js Needed)`,
  `1. Download **\`${zipName}\`** from **Assets** below and extract it into a permanent folder.`,
  `2. Open \`chrome://extensions\` in Chrome and turn on **Developer mode** at the top right.`,
  `3. Click **Load unpacked** and choose the extracted folder containing \`manifest.json\`.`,
  `4. Reload any YouTube tabs that were already open.`,
  ``,
  `---`,
  ``,
  `## 바뀐 내역 (Changelog)`,
  ``,
  changelogExcerpt || `- [CHANGELOG.md](./CHANGELOG.md) 참고`,
  ``,
  `---`,
  ``,
  `### 파일 무결성 (SHA-256)`,
  ``,
  `- \`${zipName}\`: \`${sha256}\``,
].join("\n") + "\n";

const notesRelPath = `release/release-notes-${version}.md`;
const notesFullPath = path.join(root, "release", `release-notes-${version}.md`);
fs.writeFileSync(notesFullPath, notes, "utf8");

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\nzip_path=${zipRelPath}\nnotes_path=${notesRelPath}\n`,
    "utf8",
  );
}

console.log(`[PASS] ${notesRelPath} 생성 완료 (${zipRelPath}, sha256=${sha256})`);
