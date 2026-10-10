/* Tiltfill — 콘텐츠 스크립트, 팝업, 서비스 워커가 함께 쓰는 모양 */

export type FitMode = "off" | "vertical" | "horizontal" | "both";
export type Rotation = 0 | 90 | 180 | 270;

export interface FitState {
  fit: FitMode;
  sourceRatio: number;
  panX: number;
  panY: number;
  rotation: Rotation;
}

export interface Report {
  boxW: number;
  boxH: number;
  cw: number;
  ch: number;
  scale: number;
  cutX: number;
  cutY: number;
  intrinsic: number;
  rotation: Rotation;
  fullscreen: boolean;
}

export interface Snapshot {
  ok: true;
  host: string;
  state: FitState;
  report: Report | null;
  label: string;
}

export interface DetectResult {
  error?: string;
  ratio?: number;
}

/** 팝업과 서비스 워커가 콘텐츠 스크립트로 보내는 것. 조작은 페이지 안 패널이 직접 한다. */
export type Message =
  | { type: "getState" }
  | { type: "cycleFit" }
  | { type: "resetFit" }
  | { type: "openPanel" };

/** 메시지마다 돌아오는 응답. 영상이 없으면 null 이 온다. */
export type Reply = Snapshot;
