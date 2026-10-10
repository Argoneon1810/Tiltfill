/* Fill Zoom — 창 가득 채우기
 *
 * 전체화면이 아닐 때 재생기를 브라우저 창 안쪽 전체에 깐다. 재생기 요소를
 * position: fixed 로 창에 붙이고, 페이지의 나머지와 스크롤을 감춘다.
 *
 * 재생기 요소의 크기만 바꾸면 유튜브는 video 요소를 예전 크기로 둔다.
 * 창 크기가 바뀐 것처럼 resize 를 알려 줘야 다시 잰다. 그 사이의 어긋난
 * 순간은 core 의 isSettled 가 걸러 낸다.
 *
 * 영상 페이지(/watch)에서만 건다. 유튜브는 페이지를 갈아 끼우는 방식이라
 * 홈으로 나가도 이 스크립트는 그대로 살아 있다. 그때 걸어 둔 채로 두면
 * 홈 화면에서 상단 막대와 스크롤이 사라진다.
 */

const STYLE_ID = "fz-winfill-style";
const ON = "fz-winfill";
const FLAT = "fz-flat";
const PATH = "fz-path";
const PLAYER = "#movie_player";

const CSS = `
html.${ON}{overflow:hidden !important;}
/* 재생기에서 문서 뿌리까지 올라가는 길 위의 요소에만 표시를 달고, 그 길에서
   벗어난 것은 모두 감춘다. z-index 만 높여서는 부족하다. 재생기의 조상이
   쌓임 맥락을 만들면 재생기의 z-index 는 그 안에서만 통하고, 제목이나 추천
   목록처럼 뒤에 오는 요소가 그 위에 그려진다. */
html.${ON} .${PATH} > :not(.${PATH}):not(${PLAYER}){visibility:hidden !important;}
html.${ON} ${PLAYER}{position:fixed !important;left:0 !important;top:0 !important;
  width:100vw !important;height:100vh !important;max-width:none !important;
  max-height:none !important;border-radius:0 !important;z-index:2147483000 !important;
  /* 재생기 바탕이 비쳐 보이면 뒤에 있는 페이지 바탕과 극장 모드의 검은 띠가
     서로 다른 색으로 드러난다. */
  background:#000 !important;}
/* 조상 요소에 transform 이나 contain 이 걸려 있으면 fixed 의 기준이 창이 아니라
   그 조상이 된다. 걸려 있는 조상만 골라 풀어 둔다. */
.${FLAT}{transform:none !important;filter:none !important;perspective:none !important;
  contain:none !important;will-change:auto !important;backdrop-filter:none !important;}
`;

export interface WindowFill {
  /** 원하는 상태를 넘기면 지금 걸 수 있는지 보고 맞춘다. 실제로 걸렸는지를 돌려준다. */
  sync(wanted: boolean): boolean;
}

export function createWindowFill(): WindowFill {
  let active = false;
  let chain: HTMLElement[] = [];
  let flat: HTMLElement[] = [];

  function ensureStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function target(): HTMLElement | null {
    if (location.pathname !== "/watch") return null;
    const player = document.querySelector<HTMLElement>(PLAYER);
    return player && player.offsetWidth > 0 ? player : null;
  }

  function ancestors(el: HTMLElement): HTMLElement[] {
    const list: HTMLElement[] = [];
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) list.push(p);
    return list;
  }

  function sameChain(next: HTMLElement[]): boolean {
    return next.length === chain.length && next.every((el, i) => el === chain[i]);
  }

  function unflatten(): void {
    for (const el of flat) el.classList.remove(FLAT);
    for (const el of chain) el.classList.remove(PATH);
    flat = [];
    chain = [];
  }

  function flatten(next: HTMLElement[]): void {
    unflatten();
    chain = next;
    for (const el of next) {
      const cs = getComputedStyle(el);
      const holds = cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" ||
        (!!cs.backdropFilter && cs.backdropFilter !== "none") ||
        /paint|layout|strict|content/.test(cs.contain) ||
        /transform|perspective|filter/.test(cs.willChange);
      if (holds) flat.push(el);
    }
    for (const el of flat) el.classList.add(FLAT);
    for (const el of next) el.classList.add(PATH);
  }

  // 유튜브가 video 요소를 새 상자에 맞춰 다시 재게 한다. 한 번으로는 놓치는
  // 경우가 있어 조금 뒤에 두 번 더 알린다.
  function nudge(): void {
    for (const delay of [0, 120, 500]) {
      setTimeout(() => window.dispatchEvent(new Event("resize")), delay);
    }
  }

  function sync(wanted: boolean): boolean {
    const player = wanted ? target() : null;
    if (!player) {
      if (active) {
        active = false;
        document.documentElement.classList.remove(ON);
        unflatten();
        nudge();
      }
      return false;
    }

    // 극장 모드를 오가면 재생기가 다른 조상 밑으로 옮겨 간다. 그때는 다시 훑는다.
    const next = ancestors(player);
    if (active && sameChain(next)) return true;

    ensureStyle();
    flatten(next);
    active = true;
    document.documentElement.classList.add(ON);
    nudge();
    return true;
  }

  return { sync };
}
