/* Fill Zoom — 가로 스크롤로 프레임 넘기기
 *
 * 재생기나 PIP 창 위에서 휠을 가로로 굴리면 영상을 멈추고 한 프레임씩 넘긴다.
 * 가로 휠이 없는 마우스는 Shift 를 누른 채 굴린다.
 *
 * 브라우저는 영상의 프레임 수를 알려 주지 않는다. 그래서 재생 중에 화면에 뿌려진
 * 프레임 열몇 장의 시각 차이를 재서 한 프레임의 길이를 구한다. 영상마다 한 번만
 * 재고 그친다. 재기 전에 굴리면 30프레임으로 치고 넘긴다.
 */
import type { Core } from "./core";
import { FRAME_WHEEL } from "./shortcuts";

export interface FrameStep {
  /** 가로로 굴린 휠이면 프레임을 넘기고 true 를 돌려준다. */
  onWheel(event: WheelEvent): boolean;
  /** 영상이 바뀌었는지 보고, 필요하면 프레임 길이를 다시 잰다. 가끔 불러 준다. */
  watch(): void;
  /** 굴리는 방향을 뒤집는다. 어느 쪽이 앞인지는 사람마다 다르게 느낀다. */
  setFlip(on: boolean): void;
}

const SAMPLES = 12;        // 프레임 길이를 구하는 데 쓰는 간격의 수
const FALLBACK = 1 / 30;   // 아직 재지 못했을 때의 프레임 길이(초)

export function createFrameStep(FZ: Core): FrameStep {
  let frame = FALLBACK;
  let known = false;
  let sampling = false;
  let key = "";
  let carry = 0;
  let flip = false;

  function keyOf(video: HTMLVideoElement): string {
    return video.currentSrc + "|" + video.videoWidth + "x" + video.videoHeight;
  }

  function sample(video: HTMLVideoElement): void {
    if (sampling || !video.requestVideoFrameCallback) return;
    sampling = true;
    const mine = key;
    const gaps: number[] = [];
    let last = -1;
    const tick = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (key !== mine || FZ.getVideo() !== video) { sampling = false; return; }
      // 건너뛰기와 멈춤이 섞이면 터무니없는 간격이 나온다. 그럴듯한 것만 모은다.
      const gap = meta.mediaTime - last;
      if (last >= 0 && gap > 0.004 && gap < 0.2) gaps.push(gap);
      last = meta.mediaTime;
      if (gaps.length >= SAMPLES) {
        // 프레임이 빠지면 간격이 두 배, 세 배로 잡힌다. 작은 쪽의 값을 쓴다.
        gaps.sort((a, b) => a - b);
        frame = gaps[Math.floor(gaps.length / 4)];
        known = true;
        sampling = false;
        return;
      }
      video.requestVideoFrameCallback(tick);
    };
    video.requestVideoFrameCallback(tick);
  }

  function watch(): void {
    const video = FZ.getVideo();
    if (!video || !video.videoWidth) return;
    const next = keyOf(video);
    if (next !== key) {
      key = next;
      known = false;
      sampling = false;
      frame = FALLBACK;
    }
    if (!known && !video.paused) sample(video);
  }

  function step(video: HTMLVideoElement, count: number): void {
    if (!video.paused) video.pause();
    // 지금 프레임의 번호를 구해 count 만큼 옮기고, 그 프레임의 한가운데를 겨눈다.
    // 경계를 겨누면 반올림에 따라 옆 프레임이 잡힌다.
    const index = Math.floor(video.currentTime / frame + 0.001);
    const target = (index + count + 0.5) * frame;
    const end = isFinite(video.duration) ? video.duration : target;
    video.currentTime = Math.max(0, Math.min(end, target));
  }

  function onWheel(event: WheelEvent): boolean {
    // 가로로 굴렸거나, Shift 를 누른 채 굴린 것만 받는다. 브라우저에 따라 Shift 를
    // 누르면 세로 값이 가로 값으로 바뀌어 오기도 하고 그대로 오기도 한다.
    let delta = event.deltaX;
    if (event[FRAME_WHEEL.modifier] && Math.abs(event.deltaY) > Math.abs(delta)) delta = event.deltaY;
    else if (Math.abs(event.deltaY) > Math.abs(delta)) return false;
    if (!delta) return false;

    const video = FZ.getVideo();
    if (!video) return false;
    event.preventDefault();
    event.stopPropagation();
    watch();

    // 줄 단위나 쪽 단위로 오는 값을 픽셀로 맞춘다.
    const unit = event.deltaMode === 1 ? 33 : (event.deltaMode === 2 ? 300 : 1);
    carry += delta * unit * FRAME_WHEEL.forward * (flip ? -1 : 1);
    const count = Math.trunc(carry / FRAME_WHEEL.pixelsPerFrame);
    if (!count) return true;
    carry -= count * FRAME_WHEEL.pixelsPerFrame;
    step(video, count);
    return true;
  }

  return { onWheel, watch, setFlip: (on) => { flip = on; carry = 0; } };
}
