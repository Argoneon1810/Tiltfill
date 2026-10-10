/* Fill Zoom — PIP
 *
 * 브라우저의 기본 PIP 는 디코더가 내놓은 프레임을 그대로 띄운다. video 요소에
 * 건 CSS transform 은 따라가지 않으므로, 돌려 놓은 영상도 PIP 에서는 눕는다.
 *
 * 그래서 문서 PIP 창(documentPictureInPicture, 크롬 116 이상)을 쓴다. 이 창은
 * 항상 위에 뜨는 작은 웹 문서라서 안에 든 것을 CSS 로 돌릴 수 있고, 글자도
 * 올릴 수 있다. 창 안의 video 에는 원본의 captureStream() 을 물린다. 소리는
 * 원본이 계속 내므로 사본은 소리를 끈다.
 *
 * 보호된 영상은 captureStream 이 막힌다. 그때는 기본 PIP 로 연다.
 *
 * 창을 여는 일은 사용자 제스처가 있어야 한다. 페이지의 키 입력과 클릭에서
 * 바로 부르는 toggle() 만 이 조건을 채운다.
 */
import type { Core } from "./core";
import { PAGE_KEYS, matches } from "./shortcuts";

interface DocumentPip {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}
type Capturable = HTMLVideoElement & { captureStream?: () => MediaStream };

export interface Pip {
  toggle(): void;
  isOpen(): boolean;
}

const LONG_SIDE = 480;  // 처음 여는 창의 긴 변
const SEEK_S = 5;       // 창 안에서 방향키로 건너뛰는 초

const CSS = `
html,body{margin:0;height:100%;background:#000;overflow:hidden;}
.stage{position:fixed;left:0;top:0;right:0;bottom:0;overflow:hidden;cursor:pointer;}
video{position:absolute;left:50%;top:50%;max-width:none;transform-origin:50% 50%;}
/* 자막은 돌리지 않는다. 영상을 돌린 것은 글을 바로 읽기 위해서다. */
.cc{position:absolute;left:4%;right:4%;bottom:6%;text-align:center;pointer-events:none;
  font:500 clamp(13px,4.2vmin,30px)/1.4 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;
  color:#fff;}
.cc span{padding:.08em .35em;background:rgba(8,8,8,.75);white-space:pre-wrap;}
`;

export function createPip(FZ: Core, onChange: () => void): Pip {
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

  function plain(video: HTMLVideoElement): void {
    if (FZ.state.rotation) FZ.toast?.("이 영상은 돌린 화면을 옮길 수 없어 기본 PIP 로 엽니다");
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
    const source = video as Capturable;
    let stream: MediaStream | null = null;
    if (api && source.captureStream) {
      try { stream = source.captureStream(); } catch (e) { stream = null; }
    }
    if (!api || !stream) { plain(video); return; }

    const size = pictureSize(video);
    const k = LONG_SIDE / Math.max(size.w, size.h);
    const captured = stream;
    api.requestWindow({ width: Math.round(size.w * k), height: Math.round(size.h * k) })
      .then((w) => open(w, video, captured), () => plain(video));
  }

  function open(w: Window, video: HTMLVideoElement, stream: MediaStream): void {
    win = w;
    const doc = w.document;

    const style = doc.createElement("style");
    style.textContent = CSS;
    doc.head.appendChild(style);

    const stage = doc.createElement("div");
    stage.className = "stage";
    const copy = doc.createElement("video");
    copy.muted = true;
    copy.autoplay = true;
    copy.playsInline = true;
    // 스트림을 통째로 물린다. 화질이 바뀌거나 다음 영상으로 넘어가면 트랙이
    // 갈리는데, 통째로 물려 두면 새 트랙을 알아서 따라간다.
    copy.srcObject = stream;
    const cc = doc.createElement("div");
    cc.className = "cc";
    stage.appendChild(copy);
    stage.appendChild(cc);
    doc.body.appendChild(stage);
    copy.play().catch(() => {});

    /* 자리 잡기 — 그림이 창 안에 다 들어오게 맞추고 돌린다 */

    function layout(): void {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const size = pictureSize(video);
      const k = Math.min(w.innerWidth / size.w, w.innerHeight / size.h);
      if (!isFinite(k) || k <= 0) return;
      // 요소는 띠까지 포함한 프레임 전체다. 띠는 창 밖으로 밀려나 잘린다.
      copy.style.width = (vw * k).toFixed(1) + "px";
      copy.style.height = (vh * k).toFixed(1) + "px";
      copy.style.transform = `translate(-50%, -50%) rotate(${FZ.state.rotation}deg)`;
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
    doc.addEventListener("keydown", (event) => {
      if (matches(event, PAGE_KEYS.pip)) w.close();
      else if (event.code === "Space" || event.code === "KeyK") playPause();
      else if (event.code === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - SEEK_S);
      else if (event.code === "ArrowRight") video.currentTime = video.currentTime + SEEK_S;
      else return;
      event.preventDefault();
    });

    const unsubscribe = FZ.subscribe(layout);
    w.addEventListener("resize", layout);
    copy.addEventListener("loadedmetadata", layout);
    copy.addEventListener("resize", layout);
    layout();

    w.addEventListener("pagehide", () => {
      captionObs.disconnect();
      unsubscribe();
      copy.srcObject = null;
      for (const track of stream.getVideoTracks()) track.stop();
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
