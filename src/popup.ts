/* Fill Zoom — popup
 *
 * 조작은 모두 재생기 안의 패널에서 한다. 팝업은 지금 상태를 알려 주고, 패널을
 * 열어 주고, 확장이 이 탭에 왜 안 붙었는지를 알려 줄 뿐이다.
 *
 * 예전에는 패널과 같은 조작을 팝업에도 따로 만들어 뒀다. 같은 일을 하는 코드가
 * 두 벌이라 패널만 고쳐 가는 동안 팝업이 뒤처졌고, 그래서 걷어냈다.
 */
import type { Message, Reply } from "./types";
import { FOOTER_HINTS, pageKey } from "./shortcuts";

function must<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error("popup.html 에 #" + id + " 가 없습니다");
  return found as T;
}

const el = {
  version: must("version"),
  host: must("host"),
  readout: must("readout"),
  open: must<HTMLButtonElement>("open"),
  reload: must<HTMLButtonElement>("reload"),
  foot: must("foot")
};

el.version.textContent = chrome.runtime.getManifest().version;

/* 단축키 안내 — 글은 shortcuts.ts 의 표에서 만든다 ---------------- */

for (const [action, label] of FOOTER_HINTS) {
  const item = document.createElement("li");
  const what = document.createElement("span");
  what.textContent = label;
  const key = document.createElement("kbd");
  key.textContent = pageKey(action);
  item.appendChild(what);
  item.appendChild(key);
  el.foot.appendChild(item);
}

/* 콘텐츠 스크립트와 주고받기 ------------------------------------ */

/* 답을 못 받은 이유. 이유마다 사용자가 할 일이 다르다.
   - "site"   유튜브가 아닌 탭이다. 권한이 유튜브뿐이라 다른 탭은 url 이 비어 온다.
   - "script" 유튜브인데 받는 쪽이 없다. 설치나 업데이트 전부터 열려 있던 탭이다.
              크롬은 이미 열린 탭에 콘텐츠 스크립트를 넣어 주지 않는다.
   - "video"  스크립트는 있는데 영상이 없다. 콘텐츠 스크립트가 null 로 답한다. */
type Missing = "site" | "script" | "video";

const MISSING_TEXT: Record<Missing, string> = {
  site: "유튜브 영상 페이지에서 열어 주세요",
  script: "확장이 이 탭에는 아직 붙지 않았습니다. 설치나 업데이트 전부터 열려 있던 탭입니다. 새로고침해 주세요",
  video: "영상을 재생하면 조작할 수 있습니다"
};

let missing: Missing | null = null;
let tabId: number | undefined;

function isYoutube(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname === "youtube.com" || hostname.endsWith(".youtube.com"));
  } catch (e) {
    return false;
  }
}

async function send(payload: Message): Promise<Reply | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) { missing = "site"; return null; }
  tabId = tab.id;
  if (!isYoutube(tab.url)) { missing = "site"; return null; }
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id!, payload, (response?: Reply | null) => {
      if (chrome.runtime.lastError) missing = "script";
      else missing = response ? null : "video";
      resolve(response || null);
    });
  });
}

/* 글 ------------------------------------------------------------- */

function describe(reply: Reply): string {
  const bits = [reply.label];
  const r = reply.report;
  if (reply.state.rotation) bits.push(reply.state.rotation + "도 회전");
  if (r) {
    bits.push(r.scale.toFixed(2) + "배");
    const cutX = Math.round(r.cutX * 100);
    const cutY = Math.round(r.cutY * 100);
    const cuts = [];
    if (cutX > 0) cuts.push("좌우 " + cutX + "%");
    if (cutY > 0) cuts.push("위아래 " + cutY + "%");
    if (cuts.length) bits.push(cuts.join(", ") + " 잘림");
  }
  return bits.join(" · ");
}

function receive(response: Reply | null): void {
  el.open.classList.toggle("hidden", !response);
  el.reload.classList.toggle("hidden", missing !== "script");
  if (!response) {
    el.readout.textContent = MISSING_TEXT[missing || "video"];
    return;
  }
  el.host.textContent = response.host || "";
  el.readout.textContent = describe(response);
}

/* 입력 ------------------------------------------------------------ */

// 패널은 페이지 안에 뜬다. 팝업이 가리고 있으면 안 보이므로 닫는다.
el.open.addEventListener("click", async () => {
  await send({ type: "openPanel" });
  window.close();
});

// 새로고침하면 페이지가 새로 뜨면서 콘텐츠 스크립트가 붙는다. 팝업은 닫는다.
el.reload.addEventListener("click", () => {
  if (tabId !== undefined) chrome.tabs.reload(tabId);
  window.close();
});

/* 시작 ------------------------------------------------------------ */

send({ type: "getState" }).then(receive);
