/* Fill Zoom — 단축키
 *
 * 이 확장이 쓰는 키는 모두 여기에만 적는다. 페이지 안 조작판, 확장 팝업,
 * 서비스 워커, 그리고 빌드가 만드는 manifest.json 이 이 표를 읽는다.
 * 안내 문구에 나오는 "Ctrl+Alt+Shift+1" 같은 글도 이 표에서 만든다.
 *
 * 고르는 기준은 "평소에 누를 일이 없는 조합" 이다. PIP 만 예외다 (아래 PAGE_KEYS).
 *   - Ctrl, Alt, Shift 를 한꺼번에 요구한다. 브라우저도, 브라우저에서 돌리는
 *     편집기도 이 셋을 다 쓰는 기본 단축키를 거의 두지 않는다.
 *   - 글쇠는 숫자열을 쓴다. 글자는 편집기 단축키와 부딪히기 쉽다.
 *   - 맞춰 볼 때 KeyboardEvent.key 가 아니라 code 를 쓴다. code 는 자판 배열이나
 *     입력기 상태와 상관없이 "자판의 그 자리" 를 뜻하므로, 한글 입력 중이거나
 *     다른 배열을 쓰는 중에도 같은 자리가 같은 일을 한다.
 *
 * 빌드 스크립트가 node 로 이 파일을 직접 읽으므로, 다른 파일을 import 하지
 * 않고 타입만 지우면 돌아가는 문법만 쓴다 (enum, namespace 금지).
 */

export interface KeyCombo {
  /** KeyboardEvent.code — 자판의 자리. "Digit1", "KeyZ", "F9" 같은 값이다. */
  code: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/* ---------------------------------------------------------------
   페이지 단축키

   유튜브 탭에 초점이 있을 때만 동작한다. 입력칸에 글을 쓰는 중에는 무시한다.
   --------------------------------------------------------------- */

const ALL_THREE = { ctrl: true, alt: true, shift: true } as const;

export const PAGE_KEYS = {
  togglePanel: { code: "Digit1", ...ALL_THREE },  // 본 패널 펼치기 / 접기
  toggleShown: { code: "Digit2", ...ALL_THREE },  // 조작판 자체를 띄우기 / 감추기
  cycleFit:    { code: "Digit3", ...ALL_THREE },  // 채움 방식 차례로 바꾸기
  spin:        { code: "Digit4", ...ALL_THREE },  // 회전 차례로 바꾸기
  reset:       { code: "Digit5", ...ALL_THREE },  // 채움, 회전, 창 채움 되돌리기
  windowFill:  { code: "Digit6", ...ALL_THREE },  // 창 가득 채우기 켜기 / 끄기
  // 구글의 PIP 확장이 쓰던 키를 그대로 잇는다. 위의 기준에서 벗어난 유일한 키다.
  // 그 확장을 함께 켜 두면 같은 키를 두고 겹친다.
  pip:         { code: "KeyP", alt: true }        // PIP 열기 / 닫기
} as const satisfies Record<string, KeyCombo>;

export type PageAction = keyof typeof PAGE_KEYS;

/** 페이지 안 패널이 아무것도 걸려 있지 않을 때 늘어놓는 안내. 순서대로 보인다. */
export const PANEL_HINTS: ReadonlyArray<readonly [PageAction, string]> = [
  ["cycleFit", "채움 방식 바꾸기"],
  ["spin", "회전 바꾸기"]
];

/** 확장 팝업 아래쪽에 늘어놓는 안내. 순서대로 보인다. */
export const FOOTER_HINTS: ReadonlyArray<readonly [PageAction, string]> = [
  ["togglePanel", "패널 펼치기 / 접기"],
  ["toggleShown", "조작판 띄우기 / 감추기"],
  ["cycleFit", "채움 방식 바꾸기"],
  ["spin", "회전 바꾸기"],
  ["reset", "되돌리기"],
  ["windowFill", "창 가득 채우기"],
  ["pip", "PIP"]
];

/* ---------------------------------------------------------------
   미리보기 상자 옮기기

   미리보기에 초점이 있을 때 방향키로 보이는 영역을 옮긴다. 이쪽은 초점이
   미리보기에 있을 때만 듣는 조작이라 방향키 그대로 둔다.
   값은 panX / panY 의 단위(-100 ~ 100)다.
   --------------------------------------------------------------- */

export const PAN_KEYS = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  step: 5,
  bigStep: 20,
  /** 이 키를 같이 누르면 bigStep 만큼 옮긴다 */
  bigStepModifier: "shiftKey" as "shiftKey" | "ctrlKey" | "altKey" | "metaKey"
} as const;

/* ---------------------------------------------------------------
   프레임 넘기기

   재생기나 PIP 창 위에서 휠을 가로로 굴리면 한 프레임씩 넘긴다. 가로 휠이
   없는 마우스는 modifier 를 누른 채 굴린다. 왼쪽(위)이 앞으로 가는 쪽이다.
   --------------------------------------------------------------- */

export const FRAME_WHEEL = {
  /** 이만큼 굴리면 한 걸음이다. 보통 마우스의 휠 한 칸이 100 이다.
      한 걸음에 몇 프레임을 넘길지는 패널의 "휠 한 칸" 에서 정한다. */
  pixelsPerFrame: 100,
  /** 앞으로 가는 쪽의 기본값. -1 이면 왼쪽(위)으로 굴릴 때, 1 이면 오른쪽(아래)으로 굴릴 때다.
      패널의 "휠 반대" 단추가 이것을 뒤집는다. */
  forward: -1,
  modifier: "shiftKey" as "shiftKey" | "ctrlKey" | "altKey" | "metaKey"
} as const;

/* ---------------------------------------------------------------
   브라우저 단축키

   페이지에 초점이 없어도 동작한다. 빌드가 이 표로 manifest.json 의
   commands 를 채운다. 여기 적는 값은 처음 설치할 때의 제안일 뿐이고,
   실제 키는 사용자가 chrome://extensions/shortcuts 에서 바꿀 수 있다.

   크롬은 이쪽에 Ctrl+Alt 조합을 허용하지 않는다. 자판 배열에 따라 그 둘이
   AltGr 로 묶여 글자를 찍기 때문이다. 그래서 페이지 단축키와 같은
   Ctrl+Alt+Shift 를 쓸 수 없고, Alt+Shift 에 숫자를 붙였다.
   --------------------------------------------------------------- */

export const BROWSER_COMMANDS = {
  "cycle-fit": { suggested: "Alt+Shift+8", description: "채움 방식 바꾸기", message: "cycleFit" },
  "reset-fit": { suggested: "Alt+Shift+9", description: "원래 크기로 되돌리기", message: "resetFit" }
} as const;

export type BrowserCommand = keyof typeof BROWSER_COMMANDS;

/* ---------------------------------------------------------------
   맞춰 보기와 글로 쓰기
   --------------------------------------------------------------- */

export function matches(event: KeyboardEvent, combo: KeyCombo): boolean {
  return event.code === combo.code &&
    event.ctrlKey === !!combo.ctrl &&
    event.altKey === !!combo.alt &&
    event.shiftKey === !!combo.shift &&
    event.metaKey === !!combo.meta;
}

/** { code: "Digit1", ctrl, alt, shift } → "Ctrl+Alt+Shift+1" */
export function keyLabel(combo: KeyCombo): string {
  const bits: string[] = [];
  if (combo.ctrl) bits.push("Ctrl");
  if (combo.alt) bits.push("Alt");
  if (combo.shift) bits.push("Shift");
  if (combo.meta) bits.push("Meta");
  bits.push(codeLabel(combo.code));
  return bits.join("+");
}

/** "Digit1" → "1", "KeyZ" → "Z", 나머지는 그대로 */
function codeLabel(code: string): string {
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Numpad")) return "숫자판 " + code.slice(6);
  return code;
}

export function pageKey(action: PageAction): string {
  return keyLabel(PAGE_KEYS[action]);
}
