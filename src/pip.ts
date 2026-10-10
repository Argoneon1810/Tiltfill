/* Fill Zoom — PIP
 *
 * 브라우저의 기본 PIP 는 디코더가 내놓은 프레임을 그대로 띄운다. video 요소에
 * 건 CSS transform 은 따라가지 않으므로, 돌려 놓은 영상도 PIP 에서는 눕는다.
 *
 * 그래서 문서 PIP 창(documentPictureInPicture, 크롬 116 이상)을 쓴다. 이 창은
 * 항상 위에 뜨는 작은 웹 문서라서 안에 든 것을 CSS 로 돌릴 수 있고, 글자도
 * 올릴 수 있다.
 *
 * 이 창은 기본 PIP 창과 달리 영상의 비율을 잠그지 못한다. 창 테두리를 끌면
 * 여백이 생긴다. 창 크기를 바꾸는 resizeTo 가 사용자 제스처를 요구하고, 테두리를
 * 끄는 동작은 제스처로 쳐주지 않아서 저절로 맞출 수도 없다. 비율이 잠기는
 * 기본 PIP 로 돌린 그림을 띄우려면 캔버스를 거쳐야 하는데, 그 길은 프레임이
 * 고르지 않았다 (`discarded/pip-canvas`).
 *
 * 창에는 재생기의 video 요소 자체를 옮겨 넣는다. captureStream() 으로 사본을
 * 만들어 물리는 방법도 있지만, 그쪽은 탭이 그린 화면을 다시 붙잡는 것이라
 * 프레임이 고르지 않고 탭이 가려지면 더 떨어진다. 요소를 옮기면 디코더가
 * 그 창에 바로 그린다. 창을 닫을 때 원래 자리로 되돌려 놓는다.
 *
 * 창 위쪽에는 마우스를 올렸을 때만 나타나는 조작줄을 둔다. 이 창은 그림 전체를
 * 보여 주므로 채움 방식이나 보이는 영역은 여기서 뜻이 없다. 창 안에서 뜻이 있는
 * 회전과 그림 비율만 담는다.
 *
 * 창을 여는 일은 사용자 제스처가 있어야 한다. 페이지의 키 입력과 클릭에서
 * 바로 부르는 toggle() 만 이 조건을 채운다.
 */
import type { Core } from "./core";
import { RATIO_PRESETS, SPIN_TEXT } from "./labels";

interface DocumentPip {
  requestWindow(options?: {
    width?: number; height?: number; preferInitialWindowPlacement?: boolean;
  }): Promise<Window>;
}

export interface Pip {
  toggle(): void;
  isOpen(): boolean;
}

const LONG_SIDE = 480;  // 처음 여는 창의 긴 변
const SEEK_S = 5;       // 창 안에서 방향키로 건너뛰는 초
const ASPECT_TOL = 0.02; // 창과 그림의 비율이 이만큼 어긋나면 창을 다시 맞춘다

// 유튜브는 video 의 크기와 자리를 인라인 스타일로 계속 다시 쓴다. 창 안에서는
// 그 값을 !important 로 눌러 두고, 실제 값은 .stage 의 변수로 넘긴다.
const CSS = `
html,body{margin:0;height:100%;background:#000;overflow:hidden;}
.stage{position:fixed;left:0;top:0;right:0;bottom:0;overflow:hidden;cursor:pointer;}
video{position:absolute !important;left:50% !important;top:50% !important;
  max-width:none !important;max-height:none !important;
  width:var(--fz-w,100%) !important;height:var(--fz-h,100%) !important;
  transform:var(--fz-t,translate(-50%,-50%)) !important;transform-origin:50% 50% !important;}
/* 자막은 돌리지 않는다. 영상을 돌린 것은 글을 바로 읽기 위해서다. */
.cc{position:absolute;left:4%;right:4%;bottom:6%;text-align:center;pointer-events:none;
  font:500 clamp(13px,4.2vmin,30px)/1.4 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;
  color:#fff;}
.cc span{padding:.08em .35em;background:rgba(8,8,8,.75);white-space:pre-wrap;}
/* 조작줄. 마우스가 창 위에 있을 때만 보인다. 창이 좁으면 두 줄로 접힌다. */
.bar{position:absolute;left:0;top:0;right:0;z-index:2;display:flex;flex-wrap:wrap;
  align-items:center;justify-content:center;gap:4px;padding:6px 6px 14px;cursor:default;
  background:linear-gradient(rgba(8,7,12,.82),rgba(8,7,12,0));
  opacity:0;transition:opacity .12s ease;}
.stage:hover .bar,.bar:focus-within{opacity:1;}
.bar button,.bar select{padding:5px 7px;border:1px solid #322E3D;border-radius:5px;
  background:rgba(30,28,38,.94);color:#EFEBF4;cursor:pointer;
  font:500 11.5px/1.2 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;}
.bar button:hover,.bar select:hover{border-color:#5C566B;}
.bar button[aria-pressed="true"]{background:#8CA0FF;border-color:#8CA0FF;color:#14131A;font-weight:700;}
.bar .gap{flex:0 0 6px;}
.bar .msg{flex:0 0 100%;min-height:0;text-align:center;color:#EFEBF4;
  font:400 11px/1.3 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;}
`;

/** onPageKey 는 페이지 단축키를, onWheel 은 가로 휠을 처리하고, 처리했으면 true 를 돌려준다. */
export function createPip(
  FZ: Core, onChange: () => void, onPageKey: (event: KeyboardEvent) => boolean,
  onWheel: (event: WheelEvent) => boolean
): Pip {
  let win: Window | null = null;
  // video 가 원래 있던 자리. 창을 갈아 끼우는 동안에도 처음 잰 값을 쥐고 있는다.
  let seat: { home: Node | null; after: Node | null } | null = null;

  function isOpen(): boolean { return !!win || !!document.pictureInPictureElement; }

  // 화면에 보이는 방향으로 본 그림의 크기. 구워진 띠는 뺀다.
  function pictureSize(video: HTMLVideoElement): { w: number; h: number } {
    const crop = FZ.pictureCrop();
    const w = crop ? crop.sw : (video.videoWidth || 16);
    const h = crop ? crop.sh : (video.videoHeight || 9);
    const turned = FZ.state.rotation === 90 || FZ.state.rotation === 270;
    return turned ? { w: h, h: w } : { w, h };
  }

  // 문서 PIP 를 못 쓰는 크롬에서만 온다.
  function plain(video: HTMLVideoElement): void {
    if (FZ.state.rotation) FZ.toast?.("돌린 화면은 기본 PIP 로 옮길 수 없습니다");
    try {
      video.disablePictureInPicture = false;
      video.requestPictureInPicture().catch(() => FZ.toast?.("PIP 를 열지 못했습니다"));
    } catch (e) {
      FZ.toast?.("PIP 를 열지 못했습니다");
    }
  }

  function toggle(): void {
    if (win) { win.close(); return; }
    if (document.pictureInPictureElement) { document.exitPictureInPicture().catch(() => {}); return; }

    const video = FZ.getVideo();
    if (!video) { FZ.toast?.("영상을 찾지 못했습니다"); return; }

    if (!request(video, LONG_SIDE)) plain(video);
  }

  // 그림의 비율에 맞춘 창을 연다. 이미 열린 창이 있으면 크롬이 그것을 닫고 새로 연다.
  function request(video: HTMLVideoElement, longSide: number): boolean {
    const api = (window as unknown as { documentPictureInPicture?: DocumentPip }).documentPictureInPicture;
    if (!api) return false;
    const size = pictureSize(video);
    const k = longSide / Math.max(size.w, size.h);
    // 크롬은 사용자가 마지막으로 잡아 둔 창 크기를 기억했다가 다시 쓴다. 그러면 여기서
    // 넘긴 크기가 무시되어 창이 그림의 비율과 어긋난다. 기억한 값을 쓰지 않게 한다.
    api.requestWindow({
      width: Math.round(size.w * k), height: Math.round(size.h * k), preferInitialWindowPlacement: true
    })
      .then((w) => open(w, video), () => FZ.toast?.("PIP 를 열지 못했습니다"));
    return true;
  }

  function open(w: Window, video: HTMLVideoElement): void {
    win = w;
    const doc = w.document;

    const style = doc.createElement("style");
    style.textContent = CSS;
    doc.head.appendChild(style);

    const stage = doc.createElement("div");
    stage.className = "stage";
    const cc = doc.createElement("div");
    cc.className = "cc";
    doc.body.appendChild(stage);

    // 돌려놓을 자리를 기억하고, core 가 걸어 둔 배율을 푼 다음에 옮긴다.
    if (video.ownerDocument === document) seat = { home: video.parentNode, after: video.nextSibling };
    const playing = !video.paused;
    FZ.setAway(true);
    stage.appendChild(video);
    stage.appendChild(cc);
    if (playing && video.paused) video.play().catch(() => {});

    /* 조작줄 — 회전과 그림 비율 */

    const bar = doc.createElement("div");
    bar.className = "bar";
    const spinButtons = new Map<number, HTMLButtonElement>();
    for (const deg of FZ.ROTATIONS) {
      const b = doc.createElement("button");
      b.textContent = SPIN_TEXT[deg];
      b.title = FZ.ROT_LABEL[deg];
      b.addEventListener("click", () => FZ.setState({ rotation: deg }));
      bar.appendChild(b);
      spinButtons.set(deg, b);
    }
    const gapEl = doc.createElement("span");
    gapEl.className = "gap";
    bar.appendChild(gapEl);
    const ratio = doc.createElement("select");
    ratio.title = "그림 비율. 영상 안에 구워진 검은 띠를 잘라 냅니다";
    for (const [value, label] of RATIO_PRESETS) {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = label;
      ratio.appendChild(option);
    }
    ratio.addEventListener("change", () => FZ.setState({ sourceRatio: Number(ratio.value) }));
    bar.appendChild(ratio);
    const detect = doc.createElement("button");
    detect.textContent = "감지";
    detect.title = "재생 중인 화면을 읽어 영상 속 검은 띠를 찾습니다";
    const msg = doc.createElement("div");
    msg.className = "msg";
    let msgTimer = 0;
    detect.addEventListener("click", () => {
      detect.disabled = true;
      detect.textContent = "…";
      FZ.detect((result) => {
        detect.disabled = false;
        detect.textContent = "감지";
        msg.textContent = result.error || (result.ratio ? "그림 비율을 " + result.ratio + " 로 잡았습니다." : "");
        clearTimeout(msgTimer);
        msgTimer = window.setTimeout(() => { msg.textContent = ""; }, 4000);
      });
    });
    bar.appendChild(detect);
    bar.appendChild(msg);
    stage.appendChild(bar);
    // 조작줄을 누른 것이 재생과 정지로 넘어가지 않게 한다.
    for (const type of ["pointerdown", "click", "dblclick"]) {
      bar.addEventListener(type, (event) => event.stopPropagation());
    }

    function paintBar(): void {
      for (const [deg, b] of spinButtons) b.setAttribute("aria-pressed", String(deg === (FZ.state.rotation || 0)));
      const value = String(FZ.state.sourceRatio || 0);
      const preset = RATIO_PRESETS.find(([v]) => Math.abs(Number(v) - Number(value)) < 0.005);
      let custom = ratio.querySelector<HTMLOptionElement>("option[data-custom]");
      if (preset) {
        if (custom) custom.remove();
        ratio.value = preset[0];
      } else {
        // 감지가 흔한 비율에 안 맞는 값을 잡았다. 그 값을 항목으로 더해 보여 준다.
        if (!custom) {
          custom = doc.createElement("option");
          custom.setAttribute("data-custom", "1");
          ratio.appendChild(custom);
        }
        custom.value = value;
        custom.textContent = value + " : 1";
        ratio.value = value;
      }
    }
    paintBar();

    /* 자리 잡기 — 그림이 창 안에 다 들어오게 맞추고 돌린다 */

    function layout(): void {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const size = pictureSize(video);
      const k = Math.min(w.innerWidth / size.w, w.innerHeight / size.h);
      if (!isFinite(k) || k <= 0) return;
      // 요소는 띠까지 포함한 프레임 전체다. 띠는 창 밖으로 밀려나 잘린다.
      stage.style.setProperty("--fz-w", (vw * k).toFixed(1) + "px");
      stage.style.setProperty("--fz-h", (vh * k).toFixed(1) + "px");
      stage.style.setProperty("--fz-t", `translate(-50%, -50%) rotate(${FZ.state.rotation}deg)`);
    }

    /* 자막 — 재생기가 화면에 그린 글을 그대로 옮겨 적는다 */

    let shownText = "";
    function readCaptions(): void {
      const box = FZ.getBox();
      const lines: string[] = [];
      if (box) {
        let found = box.querySelectorAll(".caption-visual-line");
        if (!found.length) found = box.querySelectorAll(".ytp-caption-segment");
        for (const line of found) {
          const text = (line.textContent || "").trim();
          if (text) lines.push(text);
        }
      }
      const joined = lines.join("\n");
      if (joined === shownText) return;
      shownText = joined;
      cc.textContent = "";
      for (const text of lines) {
        const row = doc.createElement("div");
        const span = doc.createElement("span");
        span.textContent = text;
        row.appendChild(span);
        cc.appendChild(row);
      }
    }

    // 탭이 가려지면 타이머는 느려지지만 MutationObserver 는 그대로 불린다.
    // 자막 상자만 지켜본다. 재생기 전체를 지켜보면 시간 표시가 바뀔 때마다 불린다.
    // 자막을 한 번도 켜지 않았으면 그 상자가 아직 없으므로, 생기는 것만 기다린다.
    const box = FZ.getBox();
    let captionRoot: Element | null = null;
    const captionObs = new MutationObserver(() => {
      if (!captionRoot) watchCaptions();
      readCaptions();
    });
    function watchCaptions(): void {
      if (!box) return;
      captionRoot = box.querySelector(".ytp-caption-window-container");
      captionObs.disconnect();
      if (captionRoot) captionObs.observe(captionRoot, { childList: true, subtree: true, characterData: true });
      else captionObs.observe(box, { childList: true });
    }
    watchCaptions();
    readCaptions();

    /* 조작 — 누르면 재생과 정지, 방향키로 건너뛰기 */

    const playPause = () => { if (video.paused) video.play().catch(() => {}); else video.pause(); };
    // 창 테두리를 끌어 비율이 어긋난 뒤의 첫 누름은 창을 맞추는 데 쓴다. 누름은
    // 제스처라서 이때는 resizeTo 가 통한다. 그 누름으로 재생이 멈추지는 않게 한다.
    let fixing = false;
    stage.addEventListener("pointerdown", () => { fixing = off(); if (fixing) snap(); });
    stage.addEventListener("click", () => { if (fixing) fixing = false; else playPause(); });
    // 이 창은 다른 문서라서 페이지에 걸어 둔 키와 휠 처리가 닿지 않는다. 같은 처리로 넘긴다.
    stage.addEventListener("wheel", (event) => { onWheel(event); }, { passive: false });
    doc.addEventListener("keydown", (event) => {
      if (onPageKey(event)) return;
      // 조작줄에 초점이 있으면 Space 와 방향키는 단추와 드롭다운의 것이다.
      if (bar.contains(event.target as Node)) return;
      if (event.code === "Space" || event.code === "KeyK") playPause();
      else if (event.code === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - SEEK_S);
      else if (event.code === "ArrowRight") video.currentTime = video.currentTime + SEEK_S;
      else return;
      event.preventDefault();
    });

    /* 창 크기 — 회전이나 그림 비율이 바뀌면 창을 그 비율로 다시 맞춘다

       resizeTo 는 이 창 안에서 생긴 제스처가 있어야 통한다. 창 안에서 키를 눌러
       돌렸으면 통하고, 탭에서 돌렸으면 안 통한다. 안 통했으면 탭에 남은 제스처로
       창을 새로 연다. */

    const aspect = () => { const size = pictureSize(video); return size.w / size.h; };
    const off = () => {
      const a = aspect();
      return Math.abs(w.innerWidth / w.innerHeight - a) / a > ASPECT_TOL;
    };
    // 넓이는 그대로 두고 모양만 바꾼다.
    function snap(): void {
      if (!off()) return;
      const a = aspect();
      const area = w.innerWidth * w.innerHeight;
      const nw = Math.round(Math.sqrt(area * a));
      const nh = Math.round(Math.sqrt(area / a));
      try { w.resizeTo(nw + w.outerWidth - w.innerWidth, nh + w.outerHeight - w.innerHeight); }
      catch (e) { /* 아래에서 결과로 판단한다 */ }
    }

    let snapTimer = 0;
    let lastAspect = aspect();
    const onState = () => {
      layout();
      paintBar();
      const a = aspect();
      if (Math.abs(a - lastAspect) < 0.001) return;
      lastAspect = a;
      // 회전이나 그림 비율이 바뀌었다. 창을 고쳐 보고, 안 고쳐졌으면 새로 연다.
      // 새로 여는 것은 방금 누른 키나 단추의 제스처가 남아 있는 동안에만 된다.
      snap();
      clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        if (win !== w || !off()) return;
        const activation = navigator.userActivation;
        if (activation && activation.isActive) request(video, Math.max(w.innerWidth, w.innerHeight));
      }, 150);
    };
    const unsubscribe = FZ.subscribe(onState);
    w.addEventListener("resize", layout);
    video.addEventListener("loadedmetadata", layout);
    video.addEventListener("resize", layout);
    layout();

    // 창이 사라지기 전에 video 를 원래 자리에 돌려놓는다. 여기서 놓치면 창과 함께 없어진다.
    w.addEventListener("pagehide", () => {
      captionObs.disconnect();
      unsubscribe();
      clearTimeout(snapTimer);
      clearTimeout(msgTimer);
      video.removeEventListener("loadedmetadata", layout);
      video.removeEventListener("resize", layout);
      // 새 창이 이미 video 를 가져갔다면 이 창은 조용히 물러난다.
      if (win !== w) return;
      const wasPlaying = !video.paused;
      const home = seat ? seat.home : null;
      const after = seat ? seat.after : null;
      seat = null;
      if (home && home.isConnected) {
        home.insertBefore(video, after && after.parentNode === home ? after : null);
        if (wasPlaying && video.paused) video.play().catch(() => {});
      }
      FZ.setAway(false);
      // 유튜브가 돌아온 video 의 크기를 다시 재게 한다.
      window.dispatchEvent(new Event("resize"));
      win = null;
      onChange();
    });
    onChange();
  }

  // 기본 PIP 로 열린 경우에도 단추 표시가 따라가게 한다.
  document.addEventListener("enterpictureinpicture", onChange, true);
  document.addEventListener("leavepictureinpicture", onChange, true);

  return { toggle, isOpen };
}
