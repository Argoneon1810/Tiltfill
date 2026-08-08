/* Fill Zoom — popup */

const PRESETS = ["0", "2.39", "2.35", "2.3333", "2", "1.85", "1.7778", "1.3333", "1", "0.5625"];

const FRAME_MS = 500;   // 미리보기 그림을 다시 받아 오는 간격
const FRAME_MAX = 320;  // 받아 올 그림의 가로 픽셀
const UI_KEY = "ui:panel";  // 페이지 안 조작판과 함께 쓰는 설정

const el = {
  host: document.getElementById("host"),
  stage: document.getElementById("stage"),
  shot: document.getElementById("shot"),
  win: document.getElementById("win"),
  lock: document.getElementById("lock"),
  readout: document.getElementById("readout"),
  note: document.getElementById("note"),
  fits: document.getElementById("fits"),
  spins: document.getElementById("spins"),
  ratio: document.getElementById("ratio"),
  customRow: document.getElementById("customRow"),
  customRatio: document.getElementById("customRatio"),
  detect: document.getElementById("detect"),
  fullscreen: document.getElementById("fullscreen"),
  viewRow: document.getElementById("viewRow"),
  viewHint: document.getElementById("viewHint"),
  pic: document.getElementById("pic"),
  center: document.getElementById("center")
};

let current = { fit: "off", sourceRatio: 0, panX: 0, panY: 0, rotation: 0 };
let report = null;
let message = "";
let geom = null;
let drag = null;
let picture = true;

/* 콘텐츠 스크립트와 주고받기 ------------------------------------ */

async function send(payload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return null;
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, payload, (response) => {
      void chrome.runtime.lastError;
      resolve(response || null);
    });
  });
}

function receive(response) {
  if (!response) {
    document.body.classList.add("novideo");
    el.readout.textContent = "이 탭에서 영상을 찾지 못했습니다";
    return response;
  }
  document.body.classList.remove("novideo");
  current = response.state;
  report = response.report;
  el.host.textContent = response.host || "";
  render();
  return response;
}

async function patch(changes) {
  Object.assign(current, changes);
  render();
  receive(await send({ type: "setState", patch: changes }));
}

/* 미리보기 --------------------------------------------------------
   화면에 나오는 부분이 그림 전체에서 어디인지를 0~1 로 나타낸다.
   그림을 오른쪽으로 밀면(panX 가 +) 보이는 창은 왼쪽으로 간다.
   ---------------------------------------------------------------- */

function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

function viewGeom() {
  if (!report || !report.cw || !report.ch || !report.scale) return null;
  const winW = Math.min(1, report.boxW / (report.cw * report.scale));
  const winH = Math.min(1, report.boxH / (report.ch * report.scale));
  if (!isFinite(winW) || !isFinite(winH) || winW <= 0 || winH <= 0) return null;
  const maxX = (1 - winW) / 2;
  const maxY = (1 - winH) / 2;
  return {
    ratio: report.cw / report.ch,
    winW, winH, maxX, maxY,
    cx: 0.5 - maxX * (current.panX / 100),
    cy: 0.5 - maxY * (current.panY / 100)
  };
}

function drawPreview() {
  const maxW = 244;
  const maxH = 168;
  const minH = 92;

  geom = viewGeom();
  const ratio = geom ? geom.ratio : 16 / 9;

  let w = maxW;
  let h = Math.round(w / ratio);
  if (h > maxH) { h = maxH; w = Math.round(h * ratio); }
  if (h < minH) { h = minH; w = Math.min(maxW, Math.round(h * ratio)); }
  el.stage.style.width = w + "px";
  el.stage.style.height = h + "px";

  const movable = !!geom && (geom.maxX > 0.0005 || geom.maxY > 0.0005);
  el.stage.classList.toggle("still", !movable);
  el.stage.classList.toggle("flat", !picture);
  el.center.classList.toggle("hidden", !movable);
  el.pic.setAttribute("aria-pressed", String(picture));
  el.viewHint.textContent = movable ? "끌어서 이동" : "잘리는 부분 없음";

  if (!geom) { el.win.classList.add("hidden"); return; }
  el.win.classList.remove("hidden");
  el.win.style.left = ((geom.cx - geom.winW / 2) * 100).toFixed(3) + "%";
  el.win.style.top = ((geom.cy - geom.winH / 2) * 100).toFixed(3) + "%";
  el.win.style.width = (geom.winW * 100).toFixed(3) + "%";
  el.win.style.height = (geom.winH * 100).toFixed(3) + "%";
}

/* 미리보기 그림 받아 오기 ----------------------------------------
   팝업은 다른 문서라 video 를 직접 그릴 수 없다. 콘텐츠 스크립트가 작은
   그림 한 장을 만들어 넘겨 준다. 팝업이 열려 있는 동안에만 돈다.
   ---------------------------------------------------------------- */

let framePending = false;

async function refreshFrame() {
  if (framePending || !picture) return;
  framePending = true;
  const response = await send({ type: "frame", maxW: FRAME_MAX });
  framePending = false;
  if (!response) return;
  const frame = response.frame || {};
  if (frame.url) {
    el.shot.src = frame.url;
    el.lock.classList.add("hidden");
  } else {
    el.shot.removeAttribute("src");
    el.lock.textContent = frame.error === "tainted"
      ? "그림은 재생기 안의 패널에서만 보입니다"
      : "이 영상은 그림을 읽을 수 없습니다";
    el.lock.classList.toggle("hidden", frame.error === "notready");
  }
  // 끌고 있는 동안에는 내 손이 쥔 값이 우선이다. 그림만 갈아 끼운다.
  if (!drag) receive(response);
}

setInterval(refreshFrame, FRAME_MS);

/* 그림 켜고 끄기 — 페이지 안 조작판과 같은 설정을 씁니다 ---------- */

function setPicture(next) {
  picture = !!next;
  if (!picture) {
    el.shot.removeAttribute("src");
    el.lock.classList.add("hidden");
  }
  render();
  // shown 은 페이지 쪽이 쥔 값이다. 읽어서 그대로 얹어 준다.
  chrome.storage.local.get(UI_KEY, (obj) => {
    const saved = (obj && obj[UI_KEY]) || {};
    saved.pic = picture;
    chrome.storage.local.set({ [UI_KEY]: saved });
  });
  if (picture) refreshFrame();
}

el.pic.addEventListener("click", () => setPicture(!picture));

chrome.storage.local.get(UI_KEY, (obj) => {
  const saved = obj && obj[UI_KEY];
  picture = !saved || saved.pic !== false;
  render();
  if (picture) refreshFrame();
});

/* 보이는 영역 끌기 ------------------------------------------------ */

function pointAt(event) {
  const rect = el.stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
  };
}

// 한 프레임에 한 번만 보낸다. 포인터 이벤트는 화면 갱신보다 잦다.
let pendingPoint = null;
let moveRaf = 0;

function moveTo(p) {
  pendingPoint = p;
  if (moveRaf) return;
  moveRaf = requestAnimationFrame(() => {
    moveRaf = 0;
    const q = pendingPoint;
    pendingPoint = null;
    if (!q || !geom || !drag) return;
    const cx = q.x - drag.dx;
    const cy = q.y - drag.dy;
    const changes = {};
    if (geom.maxX > 0.0005) changes.panX = Math.round(clamp((0.5 - cx) / geom.maxX * 100, -100, 100));
    if (geom.maxY > 0.0005) changes.panY = Math.round(clamp((0.5 - cy) / geom.maxY * 100, -100, 100));
    for (const key of Object.keys(changes)) {
      if (changes[key] !== current[key]) { patch(changes); return; }
    }
  });
}

el.stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !geom) return;
  if (geom.maxX <= 0.0005 && geom.maxY <= 0.0005) return;
  const p = pointAt(event);
  if (!p) return;
  event.preventDefault();
  // 상자 안을 잡으면 잡은 지점을 유지한 채 끌고, 바깥을 누르면 그리로 옮긴다.
  const inside = Math.abs(p.x - geom.cx) <= geom.winW / 2 && Math.abs(p.y - geom.cy) <= geom.winH / 2;
  drag = inside ? { dx: p.x - geom.cx, dy: p.y - geom.cy } : { dx: 0, dy: 0 };
  el.stage.classList.add("grabbing");
  el.stage.setPointerCapture(event.pointerId);
  moveTo(p);
});

el.stage.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const p = pointAt(event);
  if (p) moveTo(p);
});

for (const type of ["pointerup", "pointercancel"]) {
  el.stage.addEventListener(type, (event) => {
    if (!drag) return;
    drag = null;
    el.stage.classList.remove("grabbing");
    try { el.stage.releasePointerCapture(event.pointerId); } catch (e) { /* 무시 */ }
  });
}

el.stage.addEventListener("dblclick", () => patch({ panX: 0, panY: 0 }));

el.stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 20 : 5;
  let changes = null;
  if (event.key === "ArrowLeft") changes = { panX: clamp(current.panX + step, -100, 100) };
  else if (event.key === "ArrowRight") changes = { panX: clamp(current.panX - step, -100, 100) };
  else if (event.key === "ArrowUp") changes = { panY: clamp(current.panY + step, -100, 100) };
  else if (event.key === "ArrowDown") changes = { panY: clamp(current.panY - step, -100, 100) };
  else return;
  event.preventDefault();
  patch(changes);
});

el.center.addEventListener("click", () => patch({ panX: 0, panY: 0 }));

/* 글 ------------------------------------------------------------- */

function describe() {
  if (!report) return "영상 정보를 읽는 중입니다";
  const cutX = Math.round(report.cutX * 100);
  const cutY = Math.round(report.cutY * 100);
  const size = report.scale.toFixed(2) + "배";
  if (cutX <= 0 && cutY <= 0) return size + " · 잘리는 부분 없음";
  const bits = [];
  if (cutX > 0) bits.push("좌우 " + cutX + "%");
  if (cutY > 0) bits.push("위아래 " + cutY + "%");
  return size + " · " + bits.join(", ") + " 잘림";
}

function noteText() {
  if (message) return message;
  if (!report) return "";
  if (current.fit === "off") {
    return current.rotation ? "돌린 그림이 상자 안에 들어오도록 맞춰 놓았습니다." : "";
  }
  if (report.scale > 1.001) {
    return report.fullscreen ? "" : "전체화면에 들어가면 배율이 다시 계산됩니다.";
  }
  if (current.sourceRatio > 0) return "고른 비율로는 더 확대할 여지가 없습니다.";
  return "이 영상은 이미 그 방향을 채우고 있습니다. 영상 파일 안에 검은 띠가 구워져 있다면 감지를 눌러 보세요.";
}

/* 그리기 ---------------------------------------------------------- */

function render() {
  for (const button of el.fits.querySelectorAll(".fit")) {
    button.setAttribute("aria-pressed", String(button.dataset.fit === current.fit));
  }
  for (const button of el.spins.querySelectorAll(".spin")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.rot) === (current.rotation || 0)));
  }

  const value = String(current.sourceRatio || 0);
  const preset = PRESETS.find((p) => Math.abs(Number(p) - Number(value)) < 0.005);
  if (preset !== undefined) {
    el.ratio.value = preset;
    el.customRow.classList.add("hidden");
  } else {
    el.ratio.value = "custom";
    el.customRatio.value = current.sourceRatio;
    el.customRow.classList.remove("hidden");
  }

  drawPreview();
  el.readout.textContent = describe();
  el.note.textContent = noteText();

  el.fullscreen.textContent = (report && report.fullscreen) ? "전체화면 해제" : "전체화면으로 전환";
}

/* 입력 ------------------------------------------------------------ */

el.fits.addEventListener("click", (event) => {
  const button = event.target.closest(".fit");
  if (button) { message = ""; patch({ fit: button.dataset.fit }); }
});

el.spins.addEventListener("click", (event) => {
  const button = event.target.closest(".spin");
  if (button) { message = ""; patch({ rotation: Number(button.dataset.rot) }); }
});

el.ratio.addEventListener("change", () => {
  message = "";
  if (el.ratio.value === "custom") {
    el.customRow.classList.remove("hidden");
    el.customRatio.focus();
    return;
  }
  el.customRow.classList.add("hidden");
  patch({ sourceRatio: Number(el.ratio.value) });
});

el.customRatio.addEventListener("input", () => {
  const value = Number(el.customRatio.value);
  if (value >= 0.2 && value <= 5) patch({ sourceRatio: value });
});

el.detect.addEventListener("click", async () => {
  el.detect.disabled = true;
  el.detect.textContent = "화면을 읽는 중입니다";
  const response = await send({ type: "detect" });
  el.detect.disabled = false;
  el.detect.textContent = "재생 화면 읽어서 찾기";
  if (!response) { message = "영상을 찾지 못했습니다"; render(); return; }
  const result = response.detect || {};
  message = result.error ? result.error
    : (result.ratio ? "그림 비율을 " + result.ratio + " 로 잡았습니다." : "");
  receive(response);
});

el.fullscreen.addEventListener("click", async () => {
  const response = await send({ type: "fullscreen" });
  if (!response) return;
  message = response.fullscreen
    ? ""
    : "브라우저가 확장에서 시작한 전체화면 전환을 막았습니다. 재생기에서 직접 전환한 뒤 Shift+A 로 패널을 여세요.";
  receive(response);
});

/* 시작 ------------------------------------------------------------ */

send({ type: "getState" }).then(receive);
