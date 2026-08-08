/* Fill Zoom — in-page UI
 *
 * 전체화면에 들어가면 크롬의 확장 팝업을 열 수 없다.
 * 그래서 조작 수단을 페이지 안에 둔다.
 *
 * 표시 상태는 두 단계다.
 *   1) 재생기 조작줄의 버튼은 이 확장의 조작판을 아예 띄울지 말지를 정한다.
 *      기본값은 띄우는 쪽이고, 이 값만 저장한다.
 *   2) 띄운 조작판은 오른쪽 위의 작은 단추 상태로 시작한다. 그 단추를 눌러야
 *      본 패널이 펼쳐진다. 펼친 상태는 저장하지 않는다.
 *
 * 조작줄은 화면 아래, 패널은 화면 위에 있어 세로로 긴 창에서는 서로 멀다.
 * 자주 하는 조작인 펼치고 접기를 위쪽 단추에 두면 손이 멀리 가지 않는다.
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

  const SPIN_TEXT = { 0: "바로", 90: "↻ 90", 180: "180", 270: "↺ 90" };

  const UI_KEY = "ui:panel";
  // 미리보기 캔버스는 작을수록 싸다는 직관이 크롬에서는 뒤집힌다. 넓이가
  // 일정 값보다 작은 2D 캔버스는 GPU 가속 대상에서 빠지고, 그러면
  // drawImage(video) 가 GPU 안에서 끝나지 않고 디코드된 원본 프레임을 CPU 로
  // 끌어내린다. 1920x1080 을 256x144 로 줄이는 값싼 일이, 1920x1080 을 통째로
  // 회수하는 비싼 일로 바뀐다. 그래서 아래 넓이는 상한이 아니라 하한이다.
  const PREVIEW_MIN_AREA = 68000;  // 256x257 문턱을 넉넉히 넘긴다
  const PREVIEW_MAX_W = 640;       // 그렇다고 끝없이 키우지는 않는다
  const PREVIEW_MS = 250;          // requestVideoFrameCallback 이 없을 때만 쓰는 간격
  const COST_SHARE = 20;           // 잰 비용의 20배를 쉰다 = 5% 넘게 안 쓴다
  const GAP_MAX = 250;             // 아무리 비싸도 이 간격보다 더 뜸해지지 않는다
  const VIEW_W = 238;              // 미리보기 자리의 기본 폭 (패널 안쪽 폭)
  const VIEW_H = 150;              // 미리보기 높이 상한

  let layer = null;
  let panel = null;
  let parts = null;
  let launcher = null;
  let playerButton = null;
  let toastEl = null;
  let toastTimer = 0;

  let shown = true;      // 조작판을 띄울지 (저장한다)
  let picture = true;    // 미리보기에 영상 그림을 그릴지 (저장한다)
  let expanded = false;  // 본 패널을 펼쳤는지 (저장하지 않는다)

  let previewTimer = 0;
  let previewStamp = "";
  let previewBlocked = false;
  let running = false;
  let loopVideo = null;
  let rvfcId = 0;
  let drawMs = 0;   // 한 번 그리는 데 실제로 든 시간 (이동평균)
  let gapMs = 0;    // 그 비용에서 나온 최소 간격
  let geom = null;
  let drag = null;
  let dragRaf = 0;

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
/* 접힌 상태. 펼친 패널과 같은 자리에 앉아 서로 갈아 끼우는 것처럼 보인다. */
.fz-launch{position:absolute;top:60px;right:24px;width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;pointer-events:auto;
  padding:0;border:1px solid #322E3D;border-radius:8px;background:rgba(20,19,26,.86);
  color:#EFEBF4;cursor:pointer;opacity:.66;box-shadow:0 4px 14px rgba(0,0,0,.45);
  transition:opacity .12s ease,border-color .12s ease;}
.fz-launch:hover{opacity:1;border-color:#5C566B;}
.fz-launch svg{width:20px;height:20px;display:block;color:currentColor;}
.fz-launch.fz-act{color:#8CA0FF;border-color:rgba(140,160,255,.5);opacity:.92;}
/* 재생기가 조작줄을 감출 때 접힌 단추도 같이 사라진다. 마우스를 움직이면
   재생기가 조작줄을 되살리고, 이 단추도 같이 돌아온다. 펼친 패널은 그대로 둔다. */
.fz-layer.fz-idle .fz-launch{opacity:0;pointer-events:none;}
/* 재생기가 작으면 패널이 그 밖으로 밀려난다. 상자 안에서 굴러가게 둔다. */
.fz-panel{position:absolute;top:60px;right:24px;width:270px;pointer-events:auto;
  max-height:calc(100% - 76px);overflow-y:auto;overscroll-behavior:contain;
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
.fz-mini{flex:0 0 auto;padding:4px 8px;font:inherit;font-size:11px;background:transparent;
  color:#A29BB0;border:1px solid #322E3D;border-radius:4px;cursor:pointer;}
.fz-mini:hover{color:#EFEBF4;border-color:#5C566B;}
.fz-mini[aria-pressed="true"]{color:#EFEBF4;background:#26232F;border-color:#5C566B;}
.fz-note{margin:6px 0 0;font-size:10.5px;line-height:1.45;color:#A29BB0;}
.fz-hidden{display:none !important;}
/* 보이는 영역 고르기. 영상의 저해상도 사본 위에 지금 화면에 나오는 부분을
   밝은 상자로 그리고, 그 상자를 끌어 옮기게 한다. */
.fz-viewRow{margin:2px 0 8px;}
.fz-viewHead{display:flex;align-items:center;gap:5px;margin-bottom:5px;}
.fz-viewHead .fz-mini:first-of-type{margin-left:auto;}
.fz-view{position:relative;margin:0 auto;overflow:hidden;border:1px solid #322E3D;
  border-radius:5px;background:#0C0B10;cursor:grab;touch-action:none;
  user-select:none;-webkit-user-select:none;}
.fz-view.fz-grabbing{cursor:grabbing;}
.fz-view.fz-still{cursor:default;}
/* 그림을 끈 상태. 도식만 남는다. */
.fz-view.fz-flat{background:#1B1A22;}
.fz-view.fz-still .fz-win{box-shadow:none;border-color:rgba(140,160,255,.34);}
.fz-view canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;}
.fz-view:focus-visible{outline:2px solid #8CA0FF;outline-offset:2px;}
.fz-win{position:absolute;border:1.5px solid #8CA0FF;border-radius:2px;
  box-shadow:0 0 0 9999px rgba(8,7,12,.62);pointer-events:none;}
.fz-lock{position:absolute;left:0;bottom:0;right:0;padding:3px 5px;pointer-events:none;
  font-size:10px;color:#A29BB0;background:rgba(12,11,16,.72);text-align:center;}
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
/* 조작판을 감춘 상태. 기본값이 띄우는 쪽이므로, 예외인 이쪽만 표시한다. */
.fz-btn.fz-off svg{opacity:.3;}
.fz-btn.fz-off:hover svg{opacity:.6;}
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

  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  // 끌기 중에는 paint 가 화면 갱신마다 돈다. 같은 글을 다시 써 넣으면
  // 바뀐 것이 없어도 배치를 다시 잡게 되므로, 달라졌을 때만 쓴다.
  function setText(el, text) { if (el.textContent !== text) el.textContent = text; }

  const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
    '<path fill="currentColor" d="M3 2h18v2H3z"></path>' +
    '<path fill="currentColor" d="M3 20h18v2H3z"></path>' +
    '<path fill="currentColor" d="M12 6l4.5 5h-9z"></path>' +
    '<path fill="currentColor" d="M12 18l-4.5-5h9z"></path></svg>';

  /* ---------------------------------------------------------------
     보이는 영역 계산

     화면에 나오는 부분이 그림 전체에서 어디인지를 0~1 로 나타낸다.
     transform 은 translate 가 바깥에 있어 화면 좌표로 움직이므로,
     그림을 오른쪽으로 밀면(panX 가 +) 보이는 창은 왼쪽으로 간다.
     --------------------------------------------------------------- */

  function viewGeom(snap) {
    const r = snap.report;
    if (!r || !r.cw || !r.ch || !r.scale) return null;
    const winW = Math.min(1, r.boxW / (r.cw * r.scale));
    const winH = Math.min(1, r.boxH / (r.ch * r.scale));
    if (!isFinite(winW) || !isFinite(winH) || winW <= 0 || winH <= 0) return null;
    const maxX = (1 - winW) / 2;
    const maxY = (1 - winH) / 2;
    return {
      ratio: r.cw / r.ch,
      winW, winH, maxX, maxY,
      cx: 0.5 - maxX * (snap.state.panX / 100),
      cy: 0.5 - maxY * (snap.state.panY / 100)
    };
  }

  function panFor(cx, cy) {
    if (!geom) return null;
    const patch = {};
    if (geom.maxX > 0.0005) patch.panX = Math.round(clamp((0.5 - cx) / geom.maxX * 100, -100, 100));
    if (geom.maxY > 0.0005) patch.panY = Math.round(clamp((0.5 - cy) / geom.maxY * 100, -100, 100));
    return patch;
  }

  /* ---------------------------------------------------------------
     미리보기 그림

     video 를 캔버스에 그대로 옮겨 그린다. 픽셀을 되읽지 않으므로 감지 기능이
     쓰는 getImageData 와 달리 GPU 밖으로 나갈 일이 없다 — 캔버스가 가속을
     받고 있다면. 그 전제가 깨지는 경우가 있어서(위 PREVIEW_MIN_AREA 설명),
     비용을 재고 잰 값에서 간격을 뽑는다. 프레임 수를 미리 정해 두지 않는다.

     그리는 시점은 영상이 새 프레임을 내놓는 순간이다. requestVideoFrameCallback
     은 화면에 실제로 뿌려진 프레임마다 한 번씩만 부르므로 같은 그림을 두 번
     그리는 일이 없고, 영상이 멈추면 저절로 멈춘다.
     --------------------------------------------------------------- */

  function canvasSize(cssW, cssH) {
    const dpr = window.devicePixelRatio || 1;
    let w = Math.max(16, Math.round(cssW * dpr));
    let h = Math.max(16, Math.round(cssH * dpr));
    if (w * h < PREVIEW_MIN_AREA) {
      const k = Math.sqrt(PREVIEW_MIN_AREA / (w * h));
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    if (w > PREVIEW_MAX_W) {
      h = Math.max(16, Math.round(h * PREVIEW_MAX_W / w));
      w = PREVIEW_MAX_W;
    }
    return { w, h };
  }

  let lastDraw = 0;
  function paintFrame() {
    if (!parts || previewBlocked) return;
    const video = FZ.getVideo();
    if (!video || !video.videoWidth) return;

    const now = performance.now();
    if (now - lastDraw < gapMs) return;

    // 크기는 paintView 가 정해 둔 값을 그대로 쓴다. 여기서 다시 재면
    // 끌기 도중에 배치 계산을 부르게 된다.
    const cssW = parts.viewW;
    const cssH = parts.viewH;
    if (!cssW || !cssH) return;

    const canvas = parts.canvas;
    const size = canvasSize(cssW, cssH);
    const stamp = [size.w, size.h, video.currentTime, FZ.state.rotation, FZ.state.sourceRatio].join("|");
    if (stamp === previewStamp) return;
    previewStamp = stamp;
    lastDraw = now;

    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }

    // GPU 경로에서는 그리기가 큐에 들어가고 곧바로 돌아오므로 여기서 재는 값이
    // 0 에 가깝다. CPU 로 떨어지면 원본 프레임을 끌어내리느라 이 자리에서
    // 막히므로 그대로 시간에 잡힌다. 즉 이 측정은 비싼 경우에만 반응한다.
    const t0 = performance.now();
    const ok = FZ.drawFrame(canvas.getContext("2d"), size.w, size.h);
    const cost = performance.now() - t0;

    if (!ok) {
      // 보호된 영상은 그리기가 막힌다. 상자 조작은 그대로 쓸 수 있다.
      previewBlocked = true;
      stopPreview();
      parts.lock.classList.remove("fz-hidden");
      return;
    }
    drawMs = drawMs ? drawMs * 0.8 + cost * 0.2 : cost;
    gapMs = Math.min(GAP_MAX, drawMs * COST_SHARE);
  }

  function previewNeeded() {
    return picture && shown && expanded && !!parts && !parts.viewRow.classList.contains("fz-hidden");
  }

  function clearFrame() {
    if (!parts) return;
    const canvas = parts.canvas;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    previewStamp = "";
    lastDraw = 0;
  }

  // 영상이 새 프레임을 내놓을 때마다 한 번. 멈춰 있으면 아무 일도 일어나지
  // 않고, 탭이 가려져도 프레임이 안 나오므로 저절로 멎는다.
  function armLoop() {
    const video = loopVideo;
    if (!running || !video) return;
    if (video.requestVideoFrameCallback) {
      rvfcId = video.requestVideoFrameCallback(() => {
        rvfcId = 0;
        if (!running) return;
        if (!document.hidden) paintFrame();
        armLoop();
      });
      return;
    }
    // 아주 오래된 크롬을 위한 대비. 이쪽은 같은 그림을 다시 그릴 수 있으므로
    // paintFrame 안의 시간 도장이 걸러 낸다.
    previewTimer = setTimeout(() => {
      previewTimer = 0;
      if (!running) return;
      if (!document.hidden) paintFrame();
      armLoop();
    }, Math.max(PREVIEW_MS, gapMs));
  }

  function startPreview() {
    const video = FZ.getVideo();
    if (running && video === loopVideo) {
      // 돌고 있는 고리가 알아서 그린다. 멈춘 영상만 여기서 한 번 더 그린다.
      // 비율이나 회전이 바뀌었는데 새 프레임이 안 나오는 경우가 이것이다.
      if (video && video.paused) paintFrame();
      return;
    }
    stopPreview();
    if (previewBlocked) return;
    running = true;
    loopVideo = video;
    paintFrame();  // 멈춰 있는 영상도 한 장은 보여 준다
    armLoop();
  }

  function stopPreview() {
    running = false;
    if (rvfcId && loopVideo && loopVideo.cancelVideoFrameCallback) {
      try { loopVideo.cancelVideoFrameCallback(rvfcId); } catch (e) { /* 무시 */ }
    }
    rvfcId = 0;
    loopVideo = null;
    if (previewTimer) { clearTimeout(previewTimer); previewTimer = 0; }
  }

  function syncPreview() {
    if (previewNeeded()) startPreview();
    else stopPreview();
  }

  /* ---------------------------------------------------------------
     보이는 영역 끌기
     --------------------------------------------------------------- */

  // 끌기가 시작될 때 잰 자리를 그대로 쓴다. 끄는 동안 패널은 움직이지 않는다.
  let viewRect = null;

  function pointAt(event) {
    const rect = viewRect;
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
    };
  }

  function bindView(view) {
    view.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      geom = viewGeom(FZ.snapshot());
      viewRect = view.getBoundingClientRect();
      const p = pointAt(event);
      if (!geom || !p) return;
      if (geom.maxX <= 0.0005 && geom.maxY <= 0.0005) return;
      event.preventDefault();

      // 상자 안을 잡으면 잡은 지점을 유지한 채 끌고, 바깥을 누르면 그리로 옮긴다.
      const inside = Math.abs(p.x - geom.cx) <= geom.winW / 2 && Math.abs(p.y - geom.cy) <= geom.winH / 2;
      drag = inside ? { dx: p.x - geom.cx, dy: p.y - geom.cy } : { dx: 0, dy: 0 };
      view.classList.add("fz-grabbing");
      try { view.setPointerCapture(event.pointerId); } catch (e) { /* 무시 */ }
      moveTo(p);
    });

    view.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const p = pointAt(event);
      if (p) moveTo(p);
    });

    const release = (event) => {
      if (!drag) return;
      drag = null;
      view.classList.remove("fz-grabbing");
      try { view.releasePointerCapture(event.pointerId); } catch (e) { /* 무시 */ }
    };
    view.addEventListener("pointerup", release);
    view.addEventListener("pointercancel", release);

    view.addEventListener("dblclick", () => FZ.setState({ panX: 0, panY: 0 }));

    view.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 20 : 5;
      const s = FZ.state;
      let patch = null;
      if (event.key === "ArrowLeft") patch = { panX: clamp(s.panX + step, -100, 100) };
      else if (event.key === "ArrowRight") patch = { panX: clamp(s.panX - step, -100, 100) };
      else if (event.key === "ArrowUp") patch = { panY: clamp(s.panY + step, -100, 100) };
      else if (event.key === "ArrowDown") patch = { panY: clamp(s.panY - step, -100, 100) };
      else return;
      event.preventDefault();
      FZ.setState(patch);
    });
  }

  // 한 프레임에 한 번만 반영한다. 끌기 중에는 포인터 이벤트가 화면 갱신보다 잦다.
  let pending = null;
  function moveTo(p) {
    pending = p;
    if (dragRaf) return;
    dragRaf = requestAnimationFrame(() => {
      dragRaf = 0;
      const q = pending;
      pending = null;
      if (!q || !drag || !geom) return;
      const patch = panFor(q.x - drag.dx, q.y - drag.dy);
      if (patch) FZ.setState(patch);
    });
  }

  /* ---------------------------------------------------------------
     패널 만들기
     --------------------------------------------------------------- */

  function build() {
    const root = make("div", "fz-panel");

    const head = make("div", "fz-head");
    head.appendChild(make("span", "fz-title", "Fill Zoom"));
    const close = make("button", "fz-close", "×");
    close.title = "접기";
    close.addEventListener("click", () => setExpanded(false));
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

    const viewRow = make("div", "fz-viewRow fz-hidden");
    const viewHead = make("div", "fz-viewHead");
    viewHead.appendChild(make("span", "fz-label", "보이는 영역"));
    const pic = make("button", "fz-mini", "그림");
    pic.title = "영상 그림을 미리보기에 그립니다. 끄면 도식만 남고 아무것도 그리지 않습니다";
    pic.addEventListener("click", () => setPicture(!picture));
    viewHead.appendChild(pic);
    const center = make("button", "fz-mini", "가운데");
    center.title = "가운데로 되돌립니다";
    center.addEventListener("click", () => FZ.setState({ panX: 0, panY: 0 }));
    viewHead.appendChild(center);
    viewRow.appendChild(viewHead);

    const view = make("div", "fz-view");
    view.tabIndex = 0;
    view.title = "밝은 상자를 끌어 옮기세요. 두 번 누르면 가운데로 돌아갑니다";
    const canvas = document.createElement("canvas");
    const win = make("div", "fz-win");
    const lock = make("div", "fz-lock fz-hidden", "이 영상은 그림을 읽을 수 없습니다");
    view.appendChild(canvas);
    view.appendChild(win);
    view.appendChild(lock);
    bindView(view);
    viewRow.appendChild(view);
    root.appendChild(viewRow);

    const note = make("p", "fz-note", "");
    root.appendChild(note);

    // 재생기가 클릭이나 키를 가로채지 않도록 패널 밖으로 나가는 것만 막는다.
    // 캡처 단계에서 막으면 패널 안의 단추와 입력까지 이벤트를 못 받는다.
    const SEAL = ["click", "dblclick", "pointerdown", "pointermove", "pointerup",
      "mousedown", "mouseup", "keydown", "keyup", "wheel"];
    for (const type of SEAL) root.addEventListener(type, (e) => e.stopPropagation(), false);

    parts = { root, fitButtons, spinButtons, read, ratio, viewRow, view, canvas, win, lock, pic, note, detectButton };
    return root;
  }

  function buildLauncher() {
    const button = make("button", "fz-launch");
    button.title = "Fill Zoom 열기 (Shift+A)";
    button.setAttribute("aria-label", "Fill Zoom 열기");
    // 아이콘만 들어 있는 정적 마크업이다.
    button.innerHTML = ICON;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setExpanded(true);
    });
    for (const type of ["pointerdown", "mousedown", "dblclick"]) {
      button.addEventListener(type, (e) => e.stopPropagation(), false);
    }
    return button;
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
    const active = snap.state.fit !== "off" || !!snap.state.rotation;
    if (playerButton) playerButton.classList.toggle("fz-on", active);
    if (launcher) launcher.classList.toggle("fz-act", active);
    if (!parts || !expanded || !shown) return;

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
    setText(parts.read, describe(snap));
    setText(parts.note, noteFor(snap));

    paintView(snap);
  }

  function paintView(snap) {
    const r = snap.report;
    const cut = r ? (r.cutX > 0.001 || r.cutY > 0.001) : false;
    parts.viewRow.classList.toggle("fz-hidden", !cut);
    if (!cut) { syncPreview(); return; }

    geom = viewGeom(snap);
    if (!geom) return;

    // 세로로 세운 영상은 폭을 그대로 두면 패널이 감당 못 할 만큼 길어진다.
    // 높이를 먼저 못 박고 폭을 거기에 맞춘다.
    if (!parts.full) parts.full = parts.viewRow.clientWidth || VIEW_W;
    let w = parts.full;
    let h = Math.round(w / geom.ratio);
    if (h > VIEW_H) { h = VIEW_H; w = Math.round(h * geom.ratio); }
    if (w !== parts.viewW || h !== parts.viewH) {
      parts.viewW = w;
      parts.viewH = h;
      parts.view.style.width = w + "px";
      parts.view.style.height = h + "px";
    }
    parts.view.classList.toggle("fz-still", geom.maxX <= 0.0005 && geom.maxY <= 0.0005);
    parts.view.classList.toggle("fz-flat", !picture);
    parts.pic.setAttribute("aria-pressed", String(picture));

    const s = parts.win.style;
    s.left = ((geom.cx - geom.winW / 2) * 100).toFixed(3) + "%";
    s.top = ((geom.cy - geom.winH / 2) * 100).toFixed(3) + "%";
    s.width = (geom.winW * 100).toFixed(3) + "%";
    s.height = (geom.winH * 100).toFixed(3) + "%";
    syncPreview();
  }

  /* ---------------------------------------------------------------
     표시 상태
     --------------------------------------------------------------- */

  function ensureLayer() {
    ensureStyle();
    if (!layer) layer = make("div", "fz-layer");
    const h = host();
    if (layer.parentElement !== h) h.appendChild(layer);
    layer.style.position = (h === document.body && !document.fullscreenElement) ? "fixed" : "absolute";
    return layer;
  }

  function dropLayerIfIdle() {
    if (!layer || shown) return;
    if (toastEl && toastEl.parentElement === layer) return;
    if (layer.parentElement) layer.remove();
  }

  function sync() {
    if (playerButton) {
      playerButton.classList.toggle("fz-off", !shown);
      playerButton.title = (shown ? "Fill Zoom 조작판 감추기" : "Fill Zoom 조작판 띄우기") + " (Shift+S)";
    }
    if (!shown) {
      if (panel && panel.parentElement) panel.remove();
      if (launcher && launcher.parentElement) launcher.remove();
      stopPreview();
      dropLayerIfIdle();
      return;
    }

    const l = ensureLayer();
    if (!launcher) launcher = buildLauncher();
    if (launcher.parentElement !== l) l.appendChild(launcher);
    launcher.classList.toggle("fz-hidden", expanded);

    if (expanded) {
      if (!panel) panel = build();
      if (panel.parentElement !== l) l.appendChild(panel);
    } else if (panel && panel.parentElement) {
      panel.remove();
    }

    paint(FZ.snapshot());
    syncPreview();
  }

  function saveUI() {
    try { chrome.storage.local.set({ [UI_KEY]: { shown, pic: picture } }); } catch (e) { /* 무시 */ }
  }

  function setShown(next) {
    shown = !!next;
    if (!shown) expanded = false;
    saveUI();
    sync();
  }

  function setPicture(next) {
    picture = !!next;
    previewBlocked = false;
    if (parts) parts.lock.classList.add("fz-hidden");
    if (picture) { clearFrame(); } else { stopPreview(); clearFrame(); }
    saveUI();
    sync();
  }

  // 같은 설정을 팝업과 다른 프레임도 함께 쓴다. 어느 쪽에서 바꾸든 따라간다.
  function adopt(value) {
    const nextShown = !value || value.shown !== false;
    const nextPic = !value || value.pic !== false;
    if (nextShown === shown && nextPic === picture) return;
    shown = nextShown;
    if (!shown) expanded = false;
    if (nextPic !== picture) {
      picture = nextPic;
      previewBlocked = false;
      if (parts) parts.lock.classList.add("fz-hidden");
      clearFrame();
      if (!picture) stopPreview();
    }
    sync();
  }

  function setExpanded(next) {
    expanded = !!next;
    if (expanded && !shown) { shown = true; saveUI(); }
    if (expanded) {
      // 펼칠 때마다 그림을 한 번 다시 시도한다. 앞 영상이 보호된 영상이었어도
      // 다음 영상까지 포기한 채로 남지 않는다.
      previewStamp = "";
      previewBlocked = false;
      lastDraw = 0;
      if (parts) parts.lock.classList.add("fz-hidden");
    }
    sync();
  }

  /* ---------------------------------------------------------------
     재생기 버튼
     --------------------------------------------------------------- */

  function mountPlayerButton() {
    const rail = document.querySelector(".ytp-right-controls");
    if (!rail) return;
    if (playerButton && playerButton.parentElement === rail) return;

    ensureStyle();
    const button = document.createElement("button");
    button.className = "ytp-button fz-btn";
    button.setAttribute("aria-label", "Fill Zoom");
    // 아이콘만 들어 있는 정적 마크업이다.
    button.innerHTML = ICON;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setShown(!shown);
    });
    rail.insertBefore(button, rail.firstChild);
    playerButton = button;
    sync();
  }

  /* ---------------------------------------------------------------
     재생기가 조작줄을 감출 때 따라가기

     전체화면에서는 층이 재생기 요소 안에 붙지 않을 수도 있어서, CSS 자손
     선택자로는 유튜브의 ytp-autohide 를 잡지 못한다. 재생기 요소를 직접
     지켜보고 층에 표시를 옮겨 준다. 유튜브가 아니면 아무 일도 하지 않는다.
     --------------------------------------------------------------- */

  let playerEl = null;
  let autoObs = null;

  function markIdle() {
    if (!layer || !playerEl) return;
    layer.classList.toggle("fz-idle", playerEl.classList.contains("ytp-autohide"));
  }

  function watchAutohide() {
    const el = document.querySelector(".html5-video-player");
    if (el !== playerEl) {
      if (autoObs) { autoObs.disconnect(); autoObs = null; }
      playerEl = el;
      if (playerEl) {
        autoObs = new MutationObserver(markIdle);
        autoObs.observe(playerEl, { attributes: true, attributeFilter: ["class"] });
      } else if (layer) {
        layer.classList.remove("fz-idle");
      }
    }
    markIdle();
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

  FZ.togglePanel = () => setExpanded(!expanded);

  // 콘솔에서 FZ.stats() 로 미리보기가 실제로 얼마나 쓰는지 볼 수 있다.
  // drawMs 가 0.1 언저리면 GPU 에서 끝난 것이고, 몇 ms 씩 나오면 캔버스가
  // 가속을 못 받아 원본 프레임을 CPU 로 끌어내리고 있다는 뜻이다.
  FZ.stats = () => ({
    drawMs: Number(drawMs.toFixed(3)),
    gapMs: Number(gapMs.toFixed(1)),
    fps: gapMs > 0 ? Number((1000 / gapMs).toFixed(1)) : "영상 프레임마다",
    canvas: parts ? parts.canvas.width + "x" + parts.canvas.height : null,
    running
  });

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
    else if (key === "a") { event.preventDefault(); event.stopPropagation(); setExpanded(!expanded); }
    else if (key === "s") { event.preventDefault(); event.stopPropagation(); setShown(!shown); }
    else return;
  }, true);

  /* ---------------------------------------------------------------
     붙이고 유지하기
     --------------------------------------------------------------- */

  FZ.subscribe(paint);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPreview();
    else syncPreview();
  });

  function reseat() {
    mountPlayerButton();
    sync();
    watchAutohide();
  }

  document.addEventListener("fullscreenchange", reseat);
  document.addEventListener("webkitfullscreenchange", reseat);
  setInterval(reseat, 1000);

  try {
    chrome.storage.local.get(UI_KEY, (obj) => {
      const saved = obj && obj[UI_KEY];
      if (saved && typeof saved === "object") {
        shown = saved.shown !== false;
        picture = saved.pic !== false;
      }
      reseat();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[UI_KEY]) return;
      adopt(changes[UI_KEY].newValue);
    });
  } catch (e) {
    reseat();
  }
  reseat();
})();
