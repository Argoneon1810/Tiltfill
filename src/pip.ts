/* Fill Zoom — PIP
 *
 * 브라우저의 기본 PIP 는 디코더가 내놓은 프레임을 그대로 띄운다. video 요소에
 * 건 CSS transform 은 따라가지 않으므로, 돌려 놓은 영상도 PIP 에서는 눕는다.
 *
 * 그래서 문서 PIP 창(documentPictureInPicture, 크롬 116 이상)을 쓴다. 이 창은
 * 항상 위에 뜨는 작은 웹 문서라서 안에 든 것을 CSS 로 돌릴 수 있고, 글자도
 * 올릴 수 있다.
 *
 * 창에는 재생기의 video 요소 자체를 옮겨 넣는다. captureStream() 으로 사본을
 * 만들어 물리는 방법도 있지만, 그쪽은 탭이 그린 화면을 다시 붙잡는 것이라
 * 프레임이 고르지 않고 탭이 가려지면 더 떨어진다. 요소를 옮기면 디코더가
 * 그 창에 바로 그린다. 창을 닫을 때 원래 자리로 되돌려 놓는다.
 *
 * 창을 여는 일은 사용자 제스처가 있어야 한다. 페이지의 키 입력과 클릭에서
 * 바로 부르는 toggle() 만 이 조건을 채운다.
 */
import type { Core } from "./core";

interface DocumentPip {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

export interface Pip {
  toggle(): void;
  isOpen(): boolean;
}

const LONG_SIDE = 480;  // 처음 여는 창의 긴 변
const SEEK_S = 5;       // 창 안에서 방향키로 건너뛰는 초

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
`;

/** onPageKey 는 페이지 단축키를 처리하고, 처리했으면 true 를 돌려준다. */
export function createPip(
  FZ: Core, onChange: () => void, onPageKey: (event: KeyboardEvent) => boolean
): Pip {
  let win: Window | null = null;

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

    const api = (window as unknown as { documentPictureInPicture?: DocumentPip }).documentPictureInPicture;
    if (!api) { plain(video); return; }

    const size = pictureSize(video);
    const k = LONG_SIDE / Math.max(size.w, size.h);
    api.requestWindow({ width: Math.round(size.w * k), height: Math.round(size.h * k) })
      .then((w) => open(w, video), () => FZ.toast?.("PIP 를 열지 못했습니다"));
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
    const home = video.parentNode;
    const after = video.nextSibling;
    const playing = !video.paused;
    FZ.setAway(true);
    stage.appendChild(video);
    stage.appendChild(cc);
    if (playing && video.paused) video.play().catch(() => {});

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
    stage.addEventListener("click", playPause);
    // 이 창은 다른 문서라서 페이지에 걸어 둔 키 처리가 닿지 않는다. 같은 처리로 넘긴다.
    doc.addEventListener("keydown", (event) => {
      if (onPageKey(event)) return;
      if (event.code === "Space" || event.code === "KeyK") playPause();
      else if (event.code === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - SEEK_S);
      else if (event.code === "ArrowRight") video.currentTime = video.currentTime + SEEK_S;
      else return;
      event.preventDefault();
    });

    const unsubscribe = FZ.subscribe(layout);
    w.addEventListener("resize", layout);
    video.addEventListener("loadedmetadata", layout);
    video.addEventListener("resize", layout);
    layout();

    // 창이 사라지기 전에 video 를 원래 자리에 돌려놓는다. 여기서 놓치면 창과 함께 없어진다.
    w.addEventListener("pagehide", () => {
      captionObs.disconnect();
      unsubscribe();
      video.removeEventListener("loadedmetadata", layout);
      video.removeEventListener("resize", layout);
      const wasPlaying = !video.paused;
      if (home && home.isConnected) {
        home.insertBefore(video, after && after.parentNode === home ? after : null);
        if (wasPlaying && video.paused) video.play().catch(() => {});
      }
      FZ.setAway(false);
      // 유튜브가 돌아온 video 의 크기를 다시 재게 한다.
      window.dispatchEvent(new Event("resize"));
      if (win === w) win = null;
      onChange();
    });
    onChange();
  }

  // 기본 PIP 로 열린 경우에도 단추 표시가 따라가게 한다.
  document.addEventListener("enterpictureinpicture", onChange, true);
  document.addEventListener("leavepictureinpicture", onChange, true);

  return { toggle, isOpen };
}
