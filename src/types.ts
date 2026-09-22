/* Fill Zoom — 콘텐츠 스크립트, 팝업, 서비스 워커가 함께 쓰는 모양 */

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

export type FrameResult =
  | { url: string; error?: undefined }
  | { url?: undefined; error: "notready" | "blocked" | "tainted" };

export interface DetectResult {
  error?: string;
  ratio?: number;
}

export type Message =
  | { type: "getState" }
  | { type: "setState"; patch: Partial<FitState> }
  | { type: "cycleFit" }
  | { type: "resetFit" }
  | { type: "spin" }
  | { type: "togglePanel" }
  | { type: "frame"; maxW?: number }
  | { type: "detect" }
  | { type: "fullscreen" };

/** 메시지마다 돌아오는 응답. 영상이 없는 프레임은 응답하지 않는다. */
export type Reply = Snapshot & {
  frame?: FrameResult;
  detect?: DetectResult;
  fullscreen?: boolean;
};
