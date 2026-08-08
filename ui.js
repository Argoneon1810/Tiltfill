/* Fill Zoom — in-page UI
 *
 * 전체화면에 들어가면 크롬의 확장 팝업을 열 수 없다.
 * 그래서 조작 수단을 페이지 안에 둔다.
 *   1) 유튜브 재생기 오른쪽 조작줄에 버튼을 끼워 넣는다.
 *   2) 그 버튼이 여는 패널은 전체화면 요소 안에 붙으므로 전체화면에서도 보인다.
 *   3) 키보드로도 열고 닫는다.
 */
(() => {
  "use strict";
  if (window.__fzUI__) return;
  window.__fzUI__ = true;

  const FZ = window.FZ;
  if (!FZ) return;

  const PRESETS = [
    ["0", "자동"],
    ["2.39", "2.39 : 1"],
    ["2.35", "2.35 : 1"],
    ["2.3333", "21 : 9"],
    ["2", "2 : 1"],
    ["1.85", "1.85 : 1"],
    ["1.7778", "16 : 9"],
    ["1.3333", "4 : 3"],
    ["1", "1 : 1"],
    ["0.5625", "9 : 16"]
  ];

  let layer = null;
  const SPIN_TEXT = { 0: "바로", 90: "↻ 90", 180: "180", 270: "↺ 90" };

  let panel = null;
  let parts = null;
  let open = false;
  let playerButton = null;
  let toastEl = null;
  let toastTimer = 0;

  /* ---------------------------------------------------------------
     스타일
     --------------------------------------------------------------- */

  const CSS = `
/* 재생기 전체를 덮는 층. 영상 영역과 반드시 겹치므로 브라우저가 영상을
   하드웨어 오버레이 평면으로 내보내지 못하고 평소대로 합성한다. 이 층이 없으면
   레터박스 위에 놓인 패널이 눌리기는 하는데 눈에는 보이지 않는다.
   투명도가 완전히 0 이면 겹침으로 세지 않을 수 있어 아주 옅은 색을 남긴다. */
.fz-layer{position:absolute;left:0;top:0;right:0;bottom:0;z-index:2147483646;
  pointer-events:none;background:rgba(0,0,0,.01);
  transform:translateZ(0);backface-visibility:hidden;}
.fz-panel{position:absolute;top:60px;right:24px;width:270px;pointer-events:auto;
  padding:14px 15px 12px;border:1px solid #322E3D;border-radius:8px;
  background:rgba(20,19,26,.96);color:#EFEBF4;
  font:400 13px/1.5 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;
  box-shadow:0 12px 32px rgba(0,0,0,.5);text-align:left;}
.fz-panel *{box-sizing:border-box;}
.fz-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.fz-title{font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;}
.fz-close{background:none;border:0;color:#A29BB0;font-size:16px;line-height:1;cursor:pointer;padding:2px 4px;}
.fz-close:hover{color:#EFEBF4;}
.fz-fits{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:9px;}
.fz-fit{padding:8px 4px;border:1px solid #322E3D;border-radius:5px;background:#1E1C26;
  color:#EFEBF4;font:inherit;font-weight:500;cursor:pointer;}
.fz-fit:hover{border-color:#5C566B;}
.fz-fit[aria-pressed="true"]{background:#8CA0FF;border-color:#8CA0FF;color:#14131A;font-weight:700;}
.fz-spins{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:9px;}
.fz-spin{padding:7px 2px;border:1px solid #322E3D;border-radius:5px;background:#1E1C26;
  color:#EFEBF4;font:inherit;font-size:11.5px;cursor:pointer;}
.fz-spin:hover{border-color:#5C566B;}
.fz-spin[aria-pressed="true"]{background:#8CA0FF;border-color:#8CA0FF;color:#14131A;font-weight:700;}
.fz-read{margin:0 0 10px;font-size:11.5px;color:#A29BB0;text-align:center;min-height:16px;}
.fz-row{display:flex;align-items:center;gap:7px;margin-bottom:7px;}
.fz-label{flex:0 0 74px;font-size:11.5px;color:#A29BB0;}
.fz-panel select{flex:1;min-width:0;padding:5px 6px;background:#1E1C26;color:#EFEBF4;
  border:1px solid #322E3D;border-radius:4px;font:inherit;font-size:12px;}
.fz-panel input[type=range]{flex:1;min-width:0;accent-color:#8CA0FF;}
.fz-mini{flex:0 0 auto;padding:4px 8px;font:inherit;font-size:11px;background:transparent;
  color:#A29BB0;border:1px solid #322E3D;border-radius:4px;cursor:pointer;}
.fz-mini:hover{color:#EFEBF4;border-color:#5C566B;}
.fz-note{margin:6px 0 0;font-size:10.5px;line-height:1.45;color:#A29BB0;}
.fz-hidden{display:none !important;}
.fz-toast{position:absolute;left:50%;top:8%;transform:translate3d(-50%,0,0);
  pointer-events:none;padding:8px 14px;border-radius:8px;background:rgba(20,19,26,.88);
  color:#EFEBF4;font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;
  transition:opacity .18s ease;}
/* 버튼과 아이콘 크기를 둘 다 못 박는다. 하나라도 auto 로 두면 svg 가 버튼보다
   큰 상자를 잡고, 그 안에서 가운데 정렬된 그림이 오른쪽 아래로 밀려 보인다. */
.fz-btn{display:inline-flex !important;align-items:center;justify-content:center;
  width:48px;height:100%;padding:0;border:0;background:transparent;
  vertical-align:top;cursor:pointer;}
.fz-btn svg{width:24px;height:24px;display:block;color:#fff;opacity:.92;}
.fz-btn:hover svg{opacity:1;}
.fz-btn.fz-on svg{color:#8CA0FF;opacity:1;}
`;

  function ensureStyle() {
    if (document.getElementById("fz-style")) return;
    const style = document.createElement("style");
    style.id = "fz-style";
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ---------------------------------------------------------------
     작은 헬퍼
     --------------------------------------------------------------- */

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function host() {
    return document.fullscreenElement || FZ.getBox() || document.body;
  }

  /* ---------------------------------------------------------------
     패널 만들기
     --------------------------------------------------------------- */

  function build() {
    const root = make("div", "fz-panel");

    const head = make("div", "fz-head");
    head.appendChild(make("span", "fz-title", "Fill Zoom"));
    const close = make("button", "fz-close", "×");
    close.title = "닫기";
    close.addEventListener("click", () => setOpen(false));
    head.appendChild(close);
    root.appendChild(head);

    const fits = make("div", "fz-fits");
    const fitButtons = {};
    for (const fit of FZ.FIT_ORDER) {
      const b = make("button", "fz-fit", FZ.FIT_LABEL[fit]);
      b.addEventListener("click", () => FZ.setState({ fit }));
      fits.appendChild(b);
      fitButtons[fit] = b;
    }
    root.appendChild(fits);

    const spins = make("div", "fz-spins");
    const spinButtons = {};
    for (const deg of FZ.ROTATIONS) {
      const b = make("button", "fz-spin", SPIN_TEXT[deg]);
      b.title = FZ.ROT_LABEL[deg];
      b.addEventListener("click", () => FZ.setState({ rotation: deg }));
      spins.appendChild(b);
      spinButtons[deg] = b;
    }
    root.appendChild(spins);

    const read = make("p", "fz-read", "");
    root.appendChild(read);

    const ratioRow = make("div", "fz-row");
    ratioRow.appendChild(make("label", "fz-label", "그림 비율"));
    const ratio = make("select");
    for (const [value, label] of PRESETS) {
      const option = make("option", null, label);
      option.value = value;
      ratio.appendChild(option);
    }
    ratio.addEventListener("change", () => FZ.setState({ sourceRatio: Number(ratio.value) }));
    ratioRow.appendChild(ratio);
    const detectButton = make("button", "fz-mini", "감지");
    detectButton.title = "재생 중인 화면을 읽어 영상 속 검은 띠를 찾습니다";
    detectButton.addEventListener("click", () => runDetect(detectButton, note));
    ratioRow.appendChild(detectButton);
    root.appendChild(ratioRow);

    const panXRow = make("div", "fz-row fz-hidden");
    panXRow.appendChild(make("label", "fz-label", "좌우 위치"));
    const panX = document.createElement("input");
    panX.type = "range"; panX.min = "-100"; panX.max = "100"; panX.step = "1";
    panX.addEventListener("input", () => FZ.setState({ panX: Number(panX.value) }));
    panXRow.appendChild(panX);
    const panXReset = make("button", "fz-mini", "가운데");
    panXReset.addEventListener("click", () => FZ.setState({ panX: 0 }));
    panXRow.appendChild(panXReset);
    root.appendChild(panXRow);

    const panYRow = make("div", "fz-row fz-hidden");
    panYRow.appendChild(make("label", "fz-label", "상하 위치"));
    const panY = document.createElement("input");
    panY.type = "range"; panY.min = "-100"; panY.max = "100"; panY.step = "1";
    panY.addEventListener("input", () => FZ.setState({ panY: Number(panY.value) }));
    panYRow.appendChild(panY);
    const panYReset = make("button", "fz-mini", "가운데");
    panYReset.addEventListener("click", () => FZ.setState({ panY: 0 }));
    panYRow.appendChild(panYReset);
    root.appendChild(panYRow);

    const note = make("p", "fz-note", "");
    root.appendChild(note);

    // 재생기가 클릭이나 키를 가로채지 않도록 패널 밖으로 나가는 것만 막는다.
    // 캡처 단계에서 막으면 패널 안의 단추와 입력까지 이벤트를 못 받는다.
    for (const type of ["click", "dblclick", "pointerdown", "mousedown", "mouseup", "keydown", "keyup", "wheel"]) {
      root.addEventListener(type, (e) => e.stopPropagation(), false);
    }

    parts = { root, fitButtons, spinButtons, read, ratio, panXRow, panYRow, panX, panY, note, detectButton };
    return root;
  }

  function runDetect(button, note) {
    button.disabled = true;
    button.textContent = "…";
    FZ.detect((result) => {
      button.disabled = false;
      button.textContent = "감지";
      if (result.error) note.textContent = result.error;
      else if (result.ratio) note.textContent = "그림 비율을 " + result.ratio + " 로 잡았습니다.";
    });
  }

  /* ---------------------------------------------------------------
     패널 그리기
     --------------------------------------------------------------- */

  function describe(snap) {
    const r = snap.report;
    if (!r) return "영상 정보를 읽는 중입니다";
    const cutX = Math.round(r.cutX * 100);
    const cutY = Math.round(r.cutY * 100);
    const size = r.scale.toFixed(2) + "배";
    if (cutX <= 0 && cutY <= 0) return size + " · 잘리는 부분 없음";
    const bits = [];
    if (cutX > 0) bits.push("좌우 " + cutX + "%");
    if (cutY > 0) bits.push("위아래 " + cutY + "%");
    return size + " · " + bits.join(", ") + " 잘림";
  }

  function noteFor(snap) {
    const r = snap.report;
    if (!r) return "";
    if (snap.state.fit === "off") {
      if (snap.state.rotation) return "돌린 그림이 상자 안에 들어오도록 맞춰 놓았습니다.";
      return "Shift+Z 로 채움 방식을, Shift+R 로 회전을 바꿉니다.";
    }
    if (r.scale > 1.001) return "";
    if (snap.state.sourceRatio > 0) return "고른 비율로는 더 확대할 여지가 없습니다.";
    return "이 영상은 이미 그 방향을 채우고 있습니다. 영상 안에 검은 띠가 구워져 있다면 감지를 눌러 보세요.";
  }

  function paint(snap) {
    if (playerButton) playerButton.classList.toggle("fz-on", snap.state.fit !== "off" || !!snap.state.rotation);
    if (!parts || !open) return;

    for (const fit of FZ.FIT_ORDER) {
      parts.fitButtons[fit].setAttribute("aria-pressed", String(fit === snap.state.fit));
    }
    for (const deg of FZ.ROTATIONS) {
      parts.spinButtons[deg].setAttribute("aria-pressed", String(deg === (snap.state.rotation || 0)));
    }
    const value = String(snap.state.sourceRatio || 0);
    const preset = PRESETS.find(([v]) => Math.abs(Number(v) - Number(value)) < 0.005);
    if (preset) {
      const custom = parts.ratio.querySelector("option[data-custom]");
      if (custom) custom.remove();
      parts.ratio.value = preset[0];
    } else {
      let custom = parts.ratio.querySelector("option[data-custom]");
      if (!custom) {
        custom = document.createElement("option");
        custom.setAttribute("data-custom", "1");
        parts.ratio.appendChild(custom);
      }
      custom.value = value;
      custom.textContent = value + " : 1";
      parts.ratio.value = value;
    }
    parts.read.textContent = describe(snap);
    parts.note.textContent = noteFor(snap);

    const r = snap.report;
    const cutX = r ? r.cutX > 0.001 : false;
    const cutY = r ? r.cutY > 0.001 : false;
    parts.panXRow.classList.toggle("fz-hidden", !cutX);
    parts.panYRow.classList.toggle("fz-hidden", !cutY);
    parts.panX.value = snap.state.panX;
    parts.panY.value = snap.state.panY;
  }

  function ensureLayer() {
    ensureStyle();
    if (!layer) layer = make("div", "fz-layer");
    const h = host();
    if (layer.parentElement !== h) h.appendChild(layer);
    layer.style.position = (h === document.body && !document.fullscreenElement) ? "fixed" : "absolute";
    return layer;
  }

  function dropLayerIfIdle() {
    if (!layer || open) return;
    if (toastEl && toastEl.parentElement === layer) return;
    if (layer.parentElement) layer.remove();
  }

  function setOpen(next) {
    open = next;
    if (!open) {
      if (panel && panel.parentElement) panel.remove();
      dropLayerIfIdle();
      return;
    }
    const l = ensureLayer();
    if (!panel) panel = build();
    if (panel.parentElement !== l) l.appendChild(panel);
    paint(FZ.snapshot());
  }

  /* ---------------------------------------------------------------
     재생기 버튼
     --------------------------------------------------------------- */

  const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
    '<path fill="currentColor" d="M3 2h18v2H3z"></path>' +
    '<path fill="currentColor" d="M3 20h18v2H3z"></path>' +
    '<path fill="currentColor" d="M12 6l4.5 5h-9z"></path>' +
    '<path fill="currentColor" d="M12 18l-4.5-5h9z"></path></svg>';

  function mountPlayerButton() {
    const rail = document.querySelector(".ytp-right-controls");
    if (!rail) return;
    if (playerButton && playerButton.parentElement === rail) return;

    ensureStyle();
    const button = document.createElement("button");
    button.className = "ytp-button fz-btn";
    button.title = "Fill Zoom (Shift+A)";
    button.setAttribute("aria-label", "Fill Zoom");
    // 아이콘만 들어 있는 정적 마크업이다.
    button.innerHTML = ICON;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!open);
    });
    rail.insertBefore(button, rail.firstChild);
    playerButton = button;
    paint(FZ.snapshot());
  }

  /* ---------------------------------------------------------------
     안내 문구
     --------------------------------------------------------------- */

  FZ.toast = function toast(text) {
    const l = ensureLayer();
    if (!toastEl) toastEl = make("div", "fz-toast");
    toastEl.textContent = text;
    if (toastEl.parentElement !== l) l.appendChild(toastEl);
    toastEl.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.opacity = "0";
      setTimeout(() => {
        if (toastEl && toastEl.parentElement) toastEl.remove();
        dropLayerIfIdle();
      }, 220);
    }, 1100);
  };

  FZ.togglePanel = () => setOpen(!open);

  /* ---------------------------------------------------------------
     키보드
     --------------------------------------------------------------- */

  function typing(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  document.addEventListener("keydown", (event) => {
    if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    if (typing(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === "z") { event.preventDefault(); event.stopPropagation(); FZ.toast(FZ.cycle()); }
    else if (key === "x") { event.preventDefault(); event.stopPropagation(); FZ.toast(FZ.reset()); }
    else if (key === "r") { event.preventDefault(); event.stopPropagation(); FZ.toast(FZ.spin()); }
    else if (key === "a") { event.preventDefault(); event.stopPropagation(); setOpen(!open); }
    else return;
  }, true);

  /* ---------------------------------------------------------------
     붙이고 유지하기
     --------------------------------------------------------------- */

  FZ.subscribe(paint);

  function reseat() {
    mountPlayerButton();
    if (open) setOpen(true);
    else if (layer && layer.parentElement && layer.parentElement !== host()) ensureLayer();
  }

  document.addEventListener("fullscreenchange", reseat);
  document.addEventListener("webkitfullscreenchange", reseat);
  setInterval(reseat, 1000);
  reseat();
})();
