/* Fill Zoom — popup */

const PRESETS = ["0", "2.39", "2.35", "2.3333", "2", "1.85", "1.7778", "1.3333", "1", "0.5625"];

const el = {
  host: document.getElementById("host"),
  stage: document.getElementById("stage"),
  overhang: document.getElementById("overhang"),
  visible: document.getElementById("visible"),
  readout: document.getElementById("readout"),
  note: document.getElementById("note"),
  fits: document.getElementById("fits"),
  spins: document.getElementById("spins"),
  ratio: document.getElementById("ratio"),
  customRow: document.getElementById("customRow"),
  customRatio: document.getElementById("customRatio"),
  detect: document.getElementById("detect"),
  fullscreen: document.getElementById("fullscreen"),
  panXRow: document.getElementById("panXRow"),
  panYRow: document.getElementById("panYRow"),
  panX: document.getElementById("panX"),
  panY: document.getElementById("panY")
};

let current = { fit: "off", sourceRatio: 0, panX: 0, panY: 0, rotation: 0 };
let report = null;
let message = "";

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

/* 미리보기 -------------------------------------------------------- */

function drawPreview() {
  const maxW = 244;
  const maxH = 168;
  const minH = 92;

  let stageW = maxW;
  let stageH = 137;
  if (report) {
    stageH = Math.round(stageW * report.boxH / report.boxW);
    if (stageH > maxH) { stageH = maxH; stageW = Math.round(stageH * report.boxW / report.boxH); }
    if (stageH < minH) { stageH = minH; stageW = Math.min(maxW, Math.round(stageH * report.boxW / report.boxH)); }
  }
  el.stage.style.width = stageW + "px";
  el.stage.style.height = stageH + "px";

  if (!report) {
    el.overhang.style.display = "none";
    el.visible.style.display = "none";
    return;
  }
  el.overhang.style.display = "";
  el.visible.style.display = "";

  const k = stageW / report.boxW;
  const pw = report.cw * report.scale * k;
  const ph = report.ch * report.scale * k;
  const slackX = Math.max(0, (pw - stageW) / 2);
  const slackY = Math.max(0, (ph - stageH) / 2);
  const left = (stageW - pw) / 2 + slackX * (current.panX / 100);
  const top = (stageH - ph) / 2 + slackY * (current.panY / 100);

  el.overhang.style.left = left + "px";
  el.overhang.style.top = top + "px";
  el.overhang.style.width = pw + "px";
  el.overhang.style.height = ph + "px";

  const vx = Math.max(0, left);
  const vy = Math.max(0, top);
  el.visible.style.left = vx + "px";
  el.visible.style.top = vy + "px";
  el.visible.style.width = Math.max(0, Math.min(stageW, left + pw) - vx) + "px";
  el.visible.style.height = Math.max(0, Math.min(stageH, top + ph) - vy) + "px";
}

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

  const cutX = report ? report.cutX > 0.001 : false;
  const cutY = report ? report.cutY > 0.001 : false;
  el.panXRow.classList.toggle("hidden", !cutX);
  el.panYRow.classList.toggle("hidden", !cutY);
  el.panX.value = current.panX;
  el.panY.value = current.panY;

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

el.panX.addEventListener("input", () => patch({ panX: Number(el.panX.value) }));
el.panY.addEventListener("input", () => patch({ panY: Number(el.panY.value) }));

for (const button of document.querySelectorAll(".mini")) {
  button.addEventListener("click", () => patch({ [button.dataset.reset]: 0 }));
}

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
