/* Tiltfill — content script 입구
 *
 * core 가 계산과 적용을, ui 가 페이지 안 조작판과 키보드를 맡는다.
 * 빌드가 이 파일 하나로 묶어 content.js 를 만든다.
 */
import { createCore, type Core } from "./core";
import { mountUI } from "./ui";

declare global {
  interface Window {
    __fzContent__?: boolean;
    /** 콘솔에서 FZ.stats() 를 부를 수 있게 남겨 둔다. */
    FZ?: Core;
  }
}

if (!window.__fzContent__) {
  window.__fzContent__ = true;
  const FZ = createCore();
  window.FZ = FZ;
  mountUI(FZ);
}
