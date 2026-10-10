/* Fill Zoom — core
 *
 * 배율의 기준은 두 가지다.
 *   채워야 할 상자  = 재생기 요소의 크기 (전체화면이면 화면 전체)
 *   채울 그림       = video 요소 안에서 실제 그림이 차지하는 영역
 *
 * 두 번째 값을 잘못 잡으면 배율이 1로 나오고, 아무 일도 일어나지 않는다.
 * 유튜브는 video 요소 자체를 상자 안에 맞춰 letterbox 시켜 두므로,
 * 영상 파일 안에 검은 띠가 구워져 있는 경우에는 그 띠의 크기를 따로 알아내야 한다.
 */
import type {
  DetectResult, FitMode, FitState, FrameResult, Message, Report, Reply, Rotation, Snapshot
} from "./types";

export interface Crop { sx: number; sy: number; sw: number; sh: number }

export interface Core {
  FIT_ORDER: readonly FitMode[];
  FIT_LABEL: Record<FitMode, string>;
  ROTATIONS: readonly Rotation[];
  ROT_LABEL: Record<Rotation, string>;
  state: FitState;
  spin(): string;
  snapshot(): Snapshot;
  setState(patch: Partial<FitState>): void;
  cycle(): string;
  reset(): string;
  detect(done: (result: DetectResult) => void): void;
  drawFrame(ctx: CanvasRenderingContext2D | null, w: number, h: number): boolean;
  pictureCrop(): Crop | null;
  grabFrame(maxW?: number): FrameResult;
  requestFullscreen(done: (result: { fullscreen: boolean }) => void): void;
  subscribe(fn: (snap: Snapshot) => void): () => boolean;
  getBox(): HTMLElement | null;
  getVideo(): HTMLVideoElement | null;
  refresh(): void;
  /** ui 가 채워 넣는다. core 는 있으면 부르고 없으면 넘어간다. */
  toast?: (text: string) => void;
  togglePanel?: () => void;
  stats?: () => unknown;
}

export function createCore(): Core {
  const FIT_ORDER: readonly FitMode[] = ["off", "vertical", "horizontal", "both"];
  const FIT_LABEL: Record<FitMode, string> = {
    off: "원래 크기",
    vertical: "상하 채움",
    horizontal: "좌우 채움",
    both: "꽉 채움"
  };

  const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];
  const ROT_LABEL: Record<Rotation, string> = { 0: "바로", 90: "오른쪽 90도", 180: "180도", 270: "왼쪽 90도" };

  const state: FitState = { fit: "off", sourceRatio: 0, panX: 0, panY: 0, rotation: 0 };
  const STORE_KEY = "site:" + location.hostname;

  let video: HTMLVideoElement | null = null;
  let box: HTMLElement | null = null;
  let clipEl: HTMLElement | null = null;
  let savedOverflow: string | null = null;
  let resizeObs: ResizeObserver | null = null;
  let attrObs: MutationObserver | null = null;
  let rafId = 0;
  let signature = "";
  let settleTimers: number[] = [];
  let lastReport: Report | null = null;
  let appliedTransform = "";
  let appliedDX = 0;
  let appliedDY = 0;
  const listeners = new Set<(snap: Snapshot) => void>();

  /* =============================================================
     대상 찾기
     ============================================================= */

  // 유튜브에서만 돈다 (manifest 의 matches). 재생기 요소는 이 선택자로 잡는다.
  const PLAYER_SELECTOR = "#movie_player, .html5-video-player";

  function pickVideo(): HTMLVideoElement | null {
    const list: HTMLVideoElement[] = [];
    for (const v of document.querySelectorAll("video")) {
      if (v.offsetWidth > 80 && v.offsetHeight > 60) list.push(v);
    }
    if (!list.length) return null;
    list.sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight);
    return list[0];
  }

  function pickBox(v: HTMLVideoElement): HTMLElement {
    const player = v.closest<HTMLElement>(PLAYER_SELECTOR) || document.querySelector<HTMLElement>(PLAYER_SELECTOR);
    if (player) return player;
    // 재생기 요소를 못 찾으면 조상 요소를 훑어 추측한다.
    let best: HTMLElement = v.parentElement || v;
    let el = v.parentElement;
    for (let i = 0; i < 3 && el; i++, el = el.parentElement) {
      if (el.clientHeight <= window.innerHeight * 1.2 &&
          el.clientWidth >= best.clientWidth &&
          el.clientHeight >= best.clientHeight) {
        best = el;
      }
    }
    return best;
  }

  /* =============================================================
     계산
     ============================================================= */

  interface Size { w: number; h: number }

  function contentSize(v: HTMLVideoElement): Size | null {
    const vw = v.offsetWidth;
    const vh = v.offsetHeight;
    if (!vw || !vh) return null;

    const layoutRatio = vw / vh;
    const intrinsic = (v.videoWidth && v.videoHeight) ? v.videoWidth / v.videoHeight : layoutRatio;
    const declared = state.sourceRatio > 0 ? state.sourceRatio : intrinsic;

    if (declared >= layoutRatio) return { w: vw, h: vw / declared };
    return { w: vh * declared, h: vh };
  }

  // 90도나 270도로 돌리면 화면에서 차지하는 가로와 세로가 서로 바뀐다.
  // 채움 계산은 돌린 뒤의 값으로 해야 한다.
  function turned(): boolean { return state.rotation === 90 || state.rotation === 270; }

  function effectiveSize(content: Size): Size {
    return turned() ? { w: content.h, h: content.w } : { w: content.w, h: content.h };
  }

  function scaleFor(eff: Size, boxW: number, boxH: number): number {
    const sx = boxW / eff.w;
    const sy = boxH / eff.h;
    if (state.fit === "vertical") return sy;
    if (state.fit === "horizontal") return sx;
    if (state.fit === "both") return Math.max(sx, sy);
    // 돌려 놓기만 한 상태에서 배율 1은 화면 밖으로 넘쳐 쓸모가 없다.
    // 이때는 상자 안에 다 들어오는 배율을 쓴다.
    return turned() ? Math.min(sx, sy) : 1;
  }

  // 전체화면으로 넘어가는 도중에는 상자만 먼저 커지고 video 요소는 아직 작다.
  // 그 순간의 크기로 배율을 구하면 터무니없이 큰 값이 나왔다가,
  // 유튜브가 video 요소를 다시 키우면 정상값으로 되돌아가면서 깜빡인다.
  // 자리가 잡힌 상태에서는 video 요소가 상자의 가로나 세로 중 한쪽에 반드시 닿는다.
  function isSettled(vw: number, vh: number, bw: number, bh: number): boolean {
    if (!vw || !vh || !bw || !bh) return false;
    const tol = Math.max(2, Math.min(bw, bh) * 0.01);
    if (vw > bw + tol || vh > bh + tol) return false;
    return Math.abs(vw - bw) <= tol || Math.abs(vh - bh) <= tol;
  }

  /* =============================================================
     적용
     ============================================================= */

  function currentSignature(): string {
    return [
      state.fit, state.sourceRatio, state.panX, state.panY, state.rotation,
      video ? video.offsetWidth : 0,
      video ? video.offsetHeight : 0,
      video ? video.videoWidth : 0,
      video ? video.videoHeight : 0,
      box ? Math.round(box.getBoundingClientRect().width) : 0,
      box ? Math.round(box.getBoundingClientRect().height) : 0,
      document.fullscreenElement ? 1 : 0
    ].join("|");
  }

  function restoreClip(): void {
    if (clipEl && savedOverflow !== null) {
      if (savedOverflow) clipEl.style.overflow = savedOverflow;
      else clipEl.style.removeProperty("overflow");
    }
    clipEl = null;
    savedOverflow = null;
  }

  function clearTransform(): void {
    if (video) {
      video.style.removeProperty("transform");
      video.style.removeProperty("transform-origin");
      video.style.removeProperty("will-change");
    }
    appliedTransform = "";
    appliedDX = 0;
    appliedDY = 0;
    restoreClip();
  }

  // 우리가 걸어 둔 transform 이 그대로 남아 있는지 확인한다.
  // 재생기가 video 의 style 을 다시 쓰면서 지워 버리는 일이 있는데,
  // 크기가 그대로면 서명 비교로는 이것을 알아챌 수 없다.
  function intact(): boolean {
    if (!video) return false;
    if ((video.style.transform || "") === appliedTransform) return true;
    appliedTransform = "";
    appliedDX = 0;
    appliedDY = 0;
    return false;
  }

  // transform 을 잠시 none 으로 돌려 재는 대신, 우리가 건 이동량을 빼서 계산한다.
  // 재는 도중에 예외가 나거나 중간에 빠져나가도 화면이 원래대로 풀리지 않는다.
  function measureVideo(v: HTMLVideoElement) {
    const rect = v.getBoundingClientRect();
    return {
      width: v.offsetWidth,
      height: v.offsetHeight,
      cx: rect.left + rect.width / 2 - appliedDX,
      cy: rect.top + rect.height / 2 - appliedDY
    };
  }

  function apply(force: boolean): void {
    if (!video || !video.isConnected) { attach(); if (!video) return; }
    if (!box || !box.isConnected) box = pickBox(video);

    const kept = intact();
    const sig = currentSignature();
    if (!force && kept && sig === signature) return;
    signature = sig;

    if (state.fit === "off" && state.rotation === 0) {
      clearTransform();
      lastReport = buildReport(1);
      notify();
      return;
    }

    const v = measureVideo(video);
    const br = box.getBoundingClientRect();

    if (!isSettled(v.width, v.height, br.width, br.height)) {
      // 아직 자리가 안 잡혔다. 걸어 둔 값은 그대로 두고 잠시 뒤에 다시 시도한다.
      signature = "";
      scheduleSettle();
      return;
    }

    const content = contentSize(video);
    const eff = content ? effectiveSize(content) : null;
    const s = eff ? scaleFor(eff, br.width, br.height) : null;
    if (!eff || !s || !isFinite(s) || s <= 0) { clearTransform(); return; }

    const dx = (br.left + br.width / 2) - v.cx;
    const dy = (br.top + br.height / 2) - v.cy;
    const slackX = Math.max(0, (eff.w * s - br.width) / 2);
    const slackY = Math.max(0, (eff.h * s - br.height) / 2);
    const px = dx + slackX * (state.panX / 100);
    const py = dy + slackY * (state.panY / 100);

    const parent = video.parentElement;
    const pr = parent ? parent.getBoundingClientRect() : null;
    const nextClip = (parent && pr && pr.width >= br.width - 1 && pr.height >= br.height - 1) ? parent : box;
    if (nextClip !== clipEl) {
      restoreClip();
      clipEl = nextClip;
      savedOverflow = clipEl.style.overflow || "";
    }
    nextClip.style.overflow = "hidden";

    // 오른쪽 끝부터 적용된다. 크기를 먼저 바꾸고, 돌리고, 마지막에 옮긴다.
    const turn = state.rotation ? ` rotate(${state.rotation}deg)` : "";
    video.style.setProperty("transform-origin", "50% 50%", "important");
    video.style.setProperty(
      "transform",
      `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)${turn} scale(${s.toFixed(5)})`,
      "important"
    );
    // 브라우저가 다시 쓴 문자열을 그대로 기억해야 나중 비교가 어긋나지 않는다.
    appliedTransform = video.style.transform || "";
    appliedDX = px;
    appliedDY = py;

    lastReport = buildReport(s, eff, br);
    notify();
  }

  function scheduleSettle(): void {
    clearSettle();
    for (const delay of [50, 120, 260, 500, 900]) {
      settleTimers.push(window.setTimeout(() => schedule(true), delay));
    }
  }
  function clearSettle(): void {
    for (const t of settleTimers) clearTimeout(t);
    settleTimers = [];
  }

  let pendingForce = false;
  function schedule(force: boolean): void {
    if (force) pendingForce = true;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      const forceNow = pendingForce;
      pendingForce = false;
      try { apply(forceNow); } catch (e) { signature = ""; }
    });
  }

  /* =============================================================
     보고
     ============================================================= */

  function buildReport(scale: number, eff?: Size, br?: DOMRect): Report | null {
    if (!video || !box) return null;
    const rect = br || box.getBoundingClientRect();
    const content = contentSize(video);
    const c = eff || (content ? effectiveSize(content) : null);
    if (!c || !rect.width) return null;
    const shownW = c.w * scale;
    const shownH = c.h * scale;
    return {
      boxW: Math.round(rect.width),
      boxH: Math.round(rect.height),
      cw: c.w,
      ch: c.h,
      scale,
      cutX: Math.max(0, 1 - rect.width / shownW),
      cutY: Math.max(0, 1 - rect.height / shownH),
      intrinsic: (video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : 0,
      rotation: state.rotation,
      fullscreen: !!document.fullscreenElement
    };
  }

  // 미리보기가 보여 줄 그림의 원본 좌표. 영상 파일 안에 구워진 검은 띠는
  // 그림이 아니므로 잘라 낸다. 상자 계산에서 쓰는 contentSize 와 같은 전제다.
  function pictureCrop(): Crop | null {
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const intrinsic = vw / vh;
    const declared = state.sourceRatio > 0 ? state.sourceRatio : intrinsic;
    let sw = vw;
    let sh = vh;
    if (declared >= intrinsic) sh = vh * (intrinsic / declared);
    else sw = vw * (declared / intrinsic);
    return { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh };
  }

  // 화면에 보이는 방향 그대로 그림을 한 장 그린다. 픽셀을 되읽지 않으므로
  // getImageData 나 toDataURL 과 달리 GPU 에서 CPU 로 옮기는 비용이 없다.
  // 상자의 가로세로는 회전을 반영한 값이어야 한다. 즉 report 의 cw : ch 다.
  function drawFrame(ctx: CanvasRenderingContext2D | null, w: number, h: number): boolean {
    const crop = pictureCrop();
    if (!crop || !ctx || !w || !h || !video) return false;
    const dw = turned() ? h : w;
    const dh = turned() ? w : h;
    try {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (state.rotation) ctx.rotate(state.rotation * Math.PI / 180);
      ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      return true;
    } catch (e) {
      // 보호된 영상은 그리기 자체가 막힌다. 부른 쪽이 대체 그림을 쓴다.
      try { ctx.restore(); } catch (e2) { /* 무시 */ }
      return false;
    }
  }

  // 확장 팝업은 다른 문서라 video 를 직접 못 그린다. 그림 한 장을 넘겨 준다.
  // 막히는 경우가 두 가지고 뜻이 다르다.
  //   blocked — 보호된 영상이라 그리기 자체가 막혔다. 페이지 안에서도 못 본다.
  //   tainted — 교차 출처 영상이라 캔버스가 오염됐다. 화면에 그리는 것은 되므로
  //             페이지 안의 패널에서는 보인다. 되읽어서 내보내는 것만 막힌다.
  // 넓이가 작은 2D 캔버스는 크롬이 가속 대상에서 빼는데, 그러면 drawImage 가
  // 원본 프레임을 통째로 CPU 로 끌어내린 뒤 줄인다. 1920x1080 을 회수하는
  // 것과 384x216 을 회수하는 것의 차이라서, 여기서는 작게 잡을수록 손해다.
  const MIN_CANVAS_AREA = 68000;
  let frameCanvas: HTMLCanvasElement | null = null;

  function grabFrame(maxW?: number): FrameResult {
    const r = lastReport || buildReport(1);
    if (!r || !r.cw || !r.ch) return { error: "notready" };
    let w = Math.max(16, Math.min(Math.round(maxW || 320), 512));
    let h = Math.max(16, Math.round(w * r.ch / r.cw));
    if (w * h < MIN_CANVAS_AREA) {
      const k = Math.sqrt(MIN_CANVAS_AREA / (w * h));
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    if (!frameCanvas) frameCanvas = document.createElement("canvas");
    if (frameCanvas.width !== w || frameCanvas.height !== h) {
      frameCanvas.width = w;
      frameCanvas.height = h;
    }
    if (!drawFrame(frameCanvas.getContext("2d"), w, h)) return { error: "blocked" };
    // 이쪽은 되읽기가 반드시 필요하다. 팝업은 다른 문서라 캔버스를 넘길 수 없다.
    try { return { url: frameCanvas.toDataURL("image/jpeg", 0.6) }; }
    catch (e) { return { error: "tainted" }; }
  }

  function snapshot(): Snapshot {
    return {
      ok: true,
      host: location.hostname,
      state: { ...state },
      report: lastReport || buildReport(1),
      label: FIT_LABEL[state.fit]
    };
  }

  function notify(): void {
    for (const fn of listeners) {
      try { fn(snapshot()); } catch (e) { /* 구독자 오류는 무시 */ }
    }
  }

  /* =============================================================
     영상 속 검은 띠 감지
     ============================================================= */

  const COMMON_RATIOS = [2.39, 2.35, 2.33, 2.2, 2, 1.85, 1.7778, 1.5, 1.3333, 1, 0.5625];

  interface Bars { top: number; bottom: number; left: number; right: number }
  type Sample = Bars | { blocked: true } | { blank: true };

  function sampleBars(): Sample | null {
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const w = 160;
    const h = Math.max(4, Math.round(w * video.videoHeight / video.videoWidth));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { blocked: true };
    let data: Uint8ClampedArray;
    try {
      ctx.drawImage(video, 0, 0, w, h);
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return { blocked: true };
    }
    const luma = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    };
    const rowDark = (y: number) => { for (let x = 0; x < w; x++) if (luma(x, y) > 26) return false; return true; };
    const colDark = (x: number) => { for (let y = 0; y < h; y++) if (luma(x, y) > 26) return false; return true; };

    let top = 0; while (top < h && rowDark(top)) top++;
    if (top >= h) return { blank: true };
    let bottom = 0; while (bottom < h - top && rowDark(h - 1 - bottom)) bottom++;
    let left = 0; while (left < w && colDark(left)) left++;
    let right = 0; while (right < w - left && colDark(w - 1 - right)) right++;

    return { top: top / h, bottom: bottom / h, left: left / w, right: right / w };
  }

  function snapRatio(r: number): number {
    for (const c of COMMON_RATIOS) if (Math.abs(r - c) / c < 0.02) return c;
    return Math.round(r * 100) / 100;
  }

  // 어두운 장면을 검은 띠로 착각하지 않도록 여러 번 재서 가장 작은 값을 쓴다.
  function detect(done: (result: DetectResult) => void): void {
    if (!video || !video.videoWidth) { done({ error: "영상이 아직 준비되지 않았습니다" }); return; }
    const shots: Bars[] = [];
    let n = 0;
    const tick = () => {
      const s = sampleBars();
      if (s && "blocked" in s) { done({ error: "이 사이트의 영상은 화면을 읽을 수 없습니다" }); return; }
      if (s && !("blank" in s)) shots.push(s);
      if (++n < 5) { setTimeout(tick, 350); return; }
      if (!shots.length) { done({ error: "화면이 계속 검게 나옵니다. 재생 중에 다시 시도해 주세요" }); return; }
      const bars: Bars = {
        top: Math.min(...shots.map((s) => s.top)),
        bottom: Math.min(...shots.map((s) => s.bottom)),
        left: Math.min(...shots.map((s) => s.left)),
        right: Math.min(...shots.map((s) => s.right))
      };
      for (const k of Object.keys(bars) as (keyof Bars)[]) if (bars[k] < 0.012) bars[k] = 0;
      const cw = 1 - bars.left - bars.right;
      const ch = 1 - bars.top - bars.bottom;
      if (cw < 0.3 || ch < 0.3) { done({ error: "띠가 너무 크게 잡혔습니다" }); return; }
      if (bars.top + bars.bottom === 0 && bars.left + bars.right === 0) {
        done({ error: "영상 안에 검은 띠가 없습니다", ratio: 0 });
        return;
      }
      if (!video) { done({ error: "영상이 아직 준비되지 않았습니다" }); return; }
      const base = video.videoWidth / video.videoHeight;
      const ratio = snapRatio(base * (cw / ch));
      setState({ sourceRatio: ratio });
      done({ ratio });
    };
    tick();
  }

  /* =============================================================
     전체화면
     ============================================================= */

  function requestFullscreen(done: (result: { fullscreen: boolean }) => void): void {
    if (document.fullscreenElement) { done({ fullscreen: true }); return; }
    const ytButton = document.querySelector<HTMLElement>(".ytp-fullscreen-button");
    try {
      if (ytButton) ytButton.click();
      else if (box && box.requestFullscreen) box.requestFullscreen().catch(() => {});
      else if (video && video.requestFullscreen) video.requestFullscreen().catch(() => {});
    } catch (e) { /* 아래에서 결과로 판단한다 */ }
    setTimeout(() => done({ fullscreen: !!document.fullscreenElement }), 450);
  }

  /* =============================================================
     상태 변경
     ============================================================= */

  // 보이는 영역을 끌어 옮기는 동안에는 setState 가 초당 수십 번 들어온다.
  // 화면은 그때마다 갱신하되, 저장은 손을 뗀 뒤에 한 번만 한다.
  let saveTimer = 0;
  function save(): void {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try { chrome.storage.local.set({ [STORE_KEY]: { ...state } }); } catch (e) { /* 무시 */ }
    }, 300);
  }

  function setState(patch: Partial<FitState>): void {
    Object.assign(state, patch);
    save();
    schedule(true);
    notify();
  }

  function cycle(): string {
    const next = FIT_ORDER[(FIT_ORDER.indexOf(state.fit) + 1) % FIT_ORDER.length];
    setState({ fit: next });
    return FIT_LABEL[next];
  }

  function reset(): string {
    setState({ fit: "off", panX: 0, panY: 0, rotation: 0 });
    return FIT_LABEL.off;
  }

  function spin(): string {
    const next = ROTATIONS[(ROTATIONS.indexOf(state.rotation) + 1) % ROTATIONS.length];
    setState({ rotation: next });
    return ROT_LABEL[next];
  }

  /* =============================================================
     붙이기 / 떼기
     ============================================================= */

  const VIDEO_EVENTS = ["loadedmetadata", "resize", "canplay", "play", "playing", "seeked"];
  function onVideoEvent(): void { schedule(true); }

  // 재생 중에 걸어 둔 값이 지워지는 일이 있다. timeupdate 는 초당 네 번쯤 오는데,
  // 문자열 비교만 하므로 배치 계산을 일으키지 않는다. 어긋났을 때만 다시 건다.
  function onTimeUpdate(): void {
    if (state.fit === "off" || !video) return;
    if ((video.style.transform || "") !== appliedTransform) schedule(true);
  }

  function detach(): void {
    clearTransform();
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    if (attrObs) { attrObs.disconnect(); attrObs = null; }
    if (video) {
      for (const ev of VIDEO_EVENTS) video.removeEventListener(ev, onVideoEvent);
      video.removeEventListener("timeupdate", onTimeUpdate);
    }
    video = null;
    box = null;
    signature = "";
  }

  function attach(): boolean {
    const v = pickVideo();
    if (!v) { if (video) detach(); return false; }
    if (v === video && video.isConnected) return true;

    detach();
    video = v;
    box = pickBox(v);

    resizeObs = new ResizeObserver(() => schedule(false));
    resizeObs.observe(v);
    if (box && box !== v) resizeObs.observe(box);

    attrObs = new MutationObserver(() => schedule(false));
    attrObs.observe(v, { attributes: true, attributeFilter: ["style", "width", "height"] });

    for (const ev of VIDEO_EVENTS) v.addEventListener(ev, onVideoEvent);
    v.addEventListener("timeupdate", onTimeUpdate);
    schedule(true);
    return true;
  }

  /* =============================================================
     바깥과 주고받기
     ============================================================= */

  const FZ: Core = {
    FIT_ORDER,
    FIT_LABEL,
    ROTATIONS,
    ROT_LABEL,
    spin,
    state,
    snapshot,
    setState,
    cycle,
    reset,
    detect,
    drawFrame,
    pictureCrop,
    grabFrame,
    requestFullscreen,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    getBox: () => box,
    getVideo: () => video,
    refresh: () => schedule(true)
  };

  chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse: (r: Reply | null) => void) => {
    // 영상이 없어도 답은 한다. 답이 없으면 팝업은 스크립트가 안 붙은 탭과 구분하지 못한다.
    if (!attach()) { sendResponse(null); return false; }

    switch (msg.type) {
      case "getState": schedule(false); sendResponse(snapshot()); return true;
      case "setState": setState(msg.patch); sendResponse(snapshot()); return true;
      case "cycleFit": { const l = cycle(); FZ.toast?.(l); sendResponse(snapshot()); return true; }
      case "resetFit": { const l = reset(); FZ.toast?.(l); sendResponse(snapshot()); return true; }
      case "spin": { const l = spin(); FZ.toast?.(l); sendResponse(snapshot()); return true; }
      case "togglePanel": FZ.togglePanel?.(); sendResponse(snapshot()); return true;
      case "frame": sendResponse({ ...snapshot(), frame: grabFrame(msg.maxW) }); return true;
      case "detect":
        detect((result) => sendResponse({ ...snapshot(), detect: result }));
        return true;
      case "fullscreen":
        requestFullscreen((result) => sendResponse({ ...snapshot(), ...result }));
        return true;
    }
    return false;
  });

  /* =============================================================
     시작
     ============================================================= */

  try {
    chrome.storage.local.get(STORE_KEY, (obj) => {
      const saved = obj && obj[STORE_KEY];
      if (saved && typeof saved === "object") Object.assign(state, saved as Partial<FitState>);
      attach();
      schedule(true);
      notify();
    });
  } catch (e) {
    attach();
    schedule(true);
  }

  addEventListener("resize", () => schedule(false), { passive: true });
  addEventListener("orientationchange", () => schedule(false), { passive: true });

  function onFullscreenChange(): void {
    signature = "";
    schedule(true);
    scheduleSettle();
    notify();
  }
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  setInterval(() => {
    if (!video || !video.isConnected) attach();
    else schedule(false);
  }, 1000);

  return FZ;
}
