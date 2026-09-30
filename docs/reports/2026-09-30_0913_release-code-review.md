# Fill Zoom 출시 전 코드리뷰

- 작성 시각: 2026-09-30 09:13
- 대상 커밋: `a2aaaeb` (main, "유튜브에서만 돌게 하고 단축키를 안 겹치는 조합으로 바꿈")
- 대상 버전: manifest `0.4.0` (Manifest V3, `https://*.youtube.com/*` 전용)
- 범위: `src/{background,content,core,popup,shortcuts,types,ui}.ts`, `static/{manifest.json,popup.html,popup.css}`, `scripts/build.mjs`, `package.json`, `tsconfig.json`, `.gitignore`, `README.md`
- 관점: 스토어 규정 준수, 유튜브 동작 정확성, UX·접근성·다국어, 성능·누수, 보안·개인정보, 빌드·품질
- 함께 볼 문서: [`docs/researchs/2026-09-30_0913_chrome-web-store-release-research.md`](../researchs/2026-09-30_0913_chrome-web-store-release-research.md) (스토어 정책·등록 절차 웹 조사)

> 판정 표기: **confirmed**는 코드로 확인된 것, **plausible**은 코드 경로는 맞지만 실제 유튜브 페이지나 크롬 버전에서 돌려 보지 않아 확정하지 못한 것입니다. 여러 검토 관점에서 같은 문제가 나온 경우에는 한 항목으로 합쳤습니다.

---

## 1. 요약: 출시 전 반드시 고칠 것

### Blocker

- [ ] **B1. 아이콘이 하나도 없다.** manifest에 `icons`와 `action.default_icon`이 없고, 저장소에 PNG도 없다. 스토어 패키지에는 128x128 아이콘이 필요하다. (`static/manifest.json`)

### High

- [ ] **H1. 채움·비율·회전·이동값이 사이트 전체에 저장되어 다음 영상에도 적용된다.** 한 영화에서 감지한 2.39 비율이나 90도 회전이 이후의 16:9 영상과 쇼츠에 그대로 걸려 화면이 과하게 잘린다. (`src/core.ts:53`)
- [ ] **H2. 설치 직후 이미 열려 있던 유튜브 탭에서 팝업이 "유튜브 영상이 있는 탭에서만 동작합니다"라고 잘못 안내한다.** 새로고침하라는 안내가 없어 첫 사용에서 "동작하지 않는다"는 리뷰로 이어지기 쉽다. (`src/popup.ts:77-81`)

### 출시 전에 고치기를 권하는 Medium

- [ ] M1. 홈 미리보기, Studio 등의 영상에도 확대가 걸림 (`src/core.ts:77`)
- [ ] M2. 영상이 없는 페이지에도 런처 단추와 전체 덮개 레이어가 뜸 (`src/ui.ts:219`, `src/ui.ts:114`)
- [ ] M3. 영상이 숨겨지면 50ms 재시도가 끝없이 돎 (`src/core.ts:233`)
- [ ] M4. 업데이트·비활성화 뒤 옛 콘텐츠 스크립트가 고아로 남음 (`src/core.ts:671`, `src/ui.ts:943`)
- [ ] M5. macOS에서 브라우저 단축키가 Option+Shift+8/9(°, ·) 입력을 모든 사이트에서 가로챔 (`src/shortcuts.ts:86`)
- [ ] M6. 팝업 '직접 입력' 비율 칸이 입력 도중 닫힘 (`src/popup.ts:363`)
- [ ] M7. 릴리스 zip 스크립트가 없음 (`package.json:5`)
- [ ] M8. UI 문자열이 전부 한국어 하드코딩, `_locales` 없음 (배포 지역을 한국으로 한정할지 결정 필요) (`static/manifest.json:4`)

스토어 대시보드 작업(개인정보 관행 탭, 권한 사유 작성)은 코드 결함이 아니지만 제출 때 필요합니다. 근거는 I1에 정리했습니다.

---

## 2. 심각도별 상세

### Blocker

#### B1. manifest에 아이콘이 없고 저장소에 이미지 파일도 없음

- 심각도: blocker
- 위치: `static/manifest.json:1` (최상위 `icons`, `action.default_icon` 없음)
- 문제: `static/`에는 `manifest.json`, `popup.html`, `popup.css`뿐이고, `npm run build` 결과인 `dist/`에도 이미지가 없습니다. Chrome Web Store는 패키지 안에 128x128 아이콘을 두도록 요구하고, 등록 정보에도 스토어 아이콘이 필요합니다. 아이콘이 없으면 툴바와 `chrome://extensions`에 회색 글자 아이콘이 표시됩니다.
- 근거:
  ```json
  "action": { "default_popup": "popup.html", "default_title": "Fill Zoom" }
  ```
  `ls dist` → `background.js content.js manifest.json popup.css popup.html popup.js`
- 보완 방법:
  1. `static/icons/`에 16, 32, 48, 128px PNG를 추가합니다. `build.mjs`가 `static/`을 통째로 복사하므로 하위 폴더도 `dist/`에 들어갑니다.
  2. manifest에 다음을 넣습니다.
     ```json
     "icons": { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png", "128": "icons/128.png" },
     "action": { "default_popup": "popup.html", "default_title": "Fill Zoom",
                 "default_icon": { "16": "icons/16.png", "32": "icons/32.png" } }
     ```
  3. 128px 아이콘은 투명 여백을 두고 실제 그림을 96x96 안에 맞춥니다(스토어 가이드). 스토어 등록용 스크린샷(1280x800 등)도 따로 준비합니다.
- 검증 판정: **confirmed**. manifest 두 벌(static, dist) 모두에 아이콘 키가 없고 이미지 파일도 없음을 확인했습니다. 업로드 단계에서 바로 거부되는지는 확정하지 못했지만, 등록 정보를 완성할 수 없으므로 출시 차단 요소로 봅니다.

---

### High

#### H1. 상태 전체가 `site:<hostname>` 한 키에 저장되어 모든 영상에 이어짐

- 심각도: high
- 위치: `src/core.ts:53`, `:519`, `:647-649`, `:488`, `:116`, `:556-557`
- 문제: `fit`, `sourceRatio`, `rotation`, `panX`, `panY`가 `site:www.youtube.com` 키 하나에 저장되고 시작할 때 복원됩니다. 영상이 바뀌어도(SPA 전환, 쇼츠 넘기기, 새로고침, `loadedmetadata`) 초기화하는 코드가 없습니다. 그래서 시네마스코프 영상에서 '감지'로 잡은 2.39 비율이 다음 날 16:9 영상이나 9:16 쇼츠에도 적용됩니다. 이때 `contentSize()`가 그림 높이를 `vw/2.39`로 계산해 배율이 부풀고 좌우가 크게 잘립니다. 90도 회전도 다음 영상에 남습니다. 사용자는 원인이 이 확장인지 알아채기 어렵습니다.
- 근거:
  ```ts
  // core.ts:53
  const STORE_KEY = "site:" + location.hostname;
  // core.ts:519
  chrome.storage.local.set({ [STORE_KEY]: { ...state } })
  // core.ts:647-649
  chrome.storage.local.get(STORE_KEY, (obj) => { ... Object.assign(state, saved) ... })
  // core.ts:488 (detect 성공 시)
  setState({ sourceRatio: ratio });
  // core.ts:116
  const declared = state.sourceRatio > 0 ? state.sourceRatio : intrinsic;
  ```
  저장소 전체에 `yt-navigate`, videoId, src 변경을 처리하는 코드가 없습니다. `onVideoEvent`(`core.ts:552`)는 `schedule(true)`만 부릅니다.
- 보완 방법:
  - 사이트 전체에 남길 값은 `fit` 하나로 한정합니다.
  - `sourceRatio`, `rotation`, `panX/panY`는 영상 ID(URL의 `v=` 또는 `/shorts/ID`) 단위로 저장하거나, `yt-navigate-finish` 또는 `loadedmetadata`에서 videoId나 `currentSrc`가 바뀐 것을 확인하면 0으로 되돌립니다.
  - 되돌렸을 때는 토스트로 알리고, 팝업에 "이 설정은 이 영상에만 적용됩니다"처럼 동작을 밝혀 둡니다.
  - 쇼츠와 홈 미리보기 쪽 문제는 M1에서 함께 다룹니다.
- 검증 판정: **confirmed**. 저장·복원 경로와, 저장된 비율이 다음 영상의 배율 계산에 쓰이는 경로가 코드에서 바로 이어집니다. 쇼츠와 홈 미리보기까지 영향을 받는 부분은 실제 페이지에서 돌려 보지는 않았습니다.

#### H2. 이미 열린 유튜브 탭에서 팝업이 원인과 다른 안내를 띄움

- 심각도: high
- 위치: `src/popup.ts:70-81`, `src/background.ts`, `src/core.ts:621-622`
- 문제: MV3의 `content_scripts`는 설치·업데이트 뒤 새로 불러오는 페이지에만 주입됩니다. 설치 직후 보고 있던 유튜브 탭에는 콘텐츠 스크립트가 없어 `sendMessage`가 실패하고, 팝업은 "유튜브 영상이 있는 탭에서만 동작합니다"만 띄운 채 모든 조작을 흐리게 막습니다. `send()`가 `lastError`를 버리므로 "스크립트 없음"과 "영상 없음"을 구분하지 못합니다. 홈이나 검색처럼 영상이 없는 유튜브 페이지도 `if (!attach()) return false;` 때문에 같은 문구가 나옵니다. `background.ts`에는 `onInstalled` 처리가 없어 온보딩도 없습니다.
- 근거:
  ```ts
  // popup.ts:70-73
  chrome.tabs.sendMessage(..., (response) => { void chrome.runtime.lastError; resolve(response || null); })
  // popup.ts:77-81
  function receive(response) {
    if (!response) {
      document.body.classList.add("novideo");
      el.readout.textContent = "유튜브 영상이 있는 탭에서만 동작합니다";
  ```
- 보완 방법:
  1. 팝업에서 현재 탭 URL과 `lastError`를 보고 문구를 셋으로 나눕니다.
     - 유튜브가 아닌 탭: "유튜브 영상 페이지에서 열어 주세요"
     - 유튜브인데 `Receiving end does not exist`: "확장을 막 설치했거나 업데이트했습니다. 이 탭을 새로고침해 주세요"와 새로고침 버튼(`chrome.tabs.reload`)
     - 유튜브인데 영상이 없음: "영상을 재생하면 조작할 수 있습니다"
  2. 더 나아가려면 `scripting` 권한을 추가하고 `runtime.onInstalled`(install/update)에서 열린 유튜브 탭에 `chrome.scripting.executeScript`로 주입합니다. 권한이 하나 늘어나므로 스토어 권한 사유도 함께 적어야 합니다(웹 조사 보고서의 권한 절 참고).
- 검증 판정: **confirmed**. 크롬은 MV3에서 이미 열린 탭에 manifest 콘텐츠 스크립트를 주입하지 않고, 팝업 코드는 모든 실패를 같은 문구로 바꿉니다. 첫 사용에서 가장 먼저 부딪히는 문제라 high로 둡니다.

---

### Medium

#### M1. 문서에서 가장 큰 video를 고르므로 홈 미리보기, 쇼츠, Studio 영상에도 확대가 걸림

- 심각도: medium
- 위치: `src/core.ts:77-85`, `:254-260`, `:671-674`, `static/manifest.json` matches
- 문제: `pickVideo()`는 경로(`/watch`, `/shorts`)를 따지지 않고 80x60보다 큰 video 중 가장 넓은 것을 고릅니다. `pickBox`의 `.html5-video-player`는 인라인 미리보기 재생기와도 맞습니다. 시청 재생기가 숨겨지면(offsetWidth 0) 건너뛰므로, 홈·검색에서 마우스를 올려 재생되는 미리보기가 대상이 되어 저장된 fit, rotation, `overflow:hidden`이 걸립니다. `*.youtube.com` 매칭 때문에 `studio.youtube.com` 편집 미리보기도 대상입니다.
- 근거:
  ```ts
  for (const v of document.querySelectorAll("video")) {
    if (v.offsetWidth > 80 && v.offsetHeight > 60) list.push(v);
  }
  list.sort((a, b) => b.offsetWidth * b.offsetHeight - ...);
  ```
- 보완 방법: `location.pathname`이 `/watch`, `/shorts/`, `/live/`, `/embed/`일 때만 attach하고, 후보를 `#movie_player video, #shorts-player video`처럼 좁힙니다. `ytd-video-preview`, `#inline-player`는 제외합니다. 매칭 도메인 축소는 L2 참고.
- 검증 판정: **confirmed**(코드 경로). 유튜브 DOM의 세부 동작은 실제 페이지에서 돌려 보지 않았습니다.

#### M2. 영상이 없는 페이지에도 런처 단추와 전체 덮개 레이어가 뜨고, 기본값으로 하드웨어 오버레이를 막음

- 심각도: medium
- 위치: `src/ui.ts:89`, `:114-116`, `:219-221`, `:717`, `:740-743`, `:943`
- 문제:
  1. `host()`는 재생기 box가 없으면 `document.body`를 반환하고, 레이어는 `position:fixed`가 됩니다. `shown`의 기본값이 true이고 `sync()`가 1초마다 도므로, 홈·검색·채널 화면에서도 런처 단추(`top:60px; right:24px`)가 유튜브 UI 위에 떠 있습니다. music, m 도메인도 같습니다.
  2. `.fz-layer`는 `translateZ(0)`와 `rgba(0,0,0,.01)` 배경으로 영상의 하드웨어 오버레이 승격을 일부러 막습니다. 이것이 기본값으로 항상 붙으므로 채움을 쓰지 않는 사용자도 모든 재생에서 오버레이를 잃습니다.
- 근거:
  ```ts
  // ui.ts:219-221
  return (document.fullscreenElement as HTMLElement | null) || FZ.getBox() || document.body;
  // ui.ts:717
  layer.style.position = (h === document.body && !document.fullscreenElement) ? "fixed" : "absolute";
  // ui.ts:114-116
  .fz-layer{...z-index:2147483646;background:rgba(0,0,0,.01);transform:translateZ(0);...}
  ```
- 보완 방법: `FZ.getBox()`가 없으면 런처와 패널을 붙이지 않고 레이어를 뗍니다(토스트만 잠깐 예외). 예:
  ```ts
  if (!FZ.getBox() && !document.fullscreenElement) { panel?.remove(); launcher?.remove(); stopPreview(); dropLayerIfIdle(); return; }
  ```
  덮개는 패널이 펼쳐졌을 때나 채움·회전이 켜졌을 때로 한정하고, 접힌 런처는 덮개 없이 둡니다.
- 검증 판정: **confirmed**. 런처가 뜨는 것은 코드로 확정입니다. 전력 소모 증가는 측정하지 않았으므로 그 부분은 plausible입니다.

#### M3. 영상이 숨겨지면 `isSettled` 실패로 50ms 재시도가 끝없이 돎

- 심각도: medium
- 위치: `src/core.ts:145-146`, `:233-237`, `:279-283`, `:671-674`
- 문제: 채움이나 회전이 켜진 상태에서 video가 DOM에는 남은 채 크기가 0이 되면(미니플레이어를 끈 채 시청 페이지에서 홈으로 이동) `isSettled()`가 계속 false입니다. `apply()` → `scheduleSettle()` → 50ms 뒤 `apply()`가 끝없이 이어집니다. 1초 interval은 `video.isConnected`가 true라 `attach()`를 다시 부르지 않습니다. H1 때문에 채움을 한 번 켠 사용자는 대부분 이 상태에 들어갑니다.
- 근거:
  ```ts
  // core.ts:145-146
  if (!vw || !vh || !bw || !bh) return false;
  // core.ts:233-237
  if (!isSettled(...)) { signature = ""; scheduleSettle(); return; }
  // core.ts:279-283
  clearSettle(); for (const delay of [50, 120, 260, 500, 900]) settleTimers.push(setTimeout(() => schedule(true), delay));
  ```
- 보완 방법: video의 `offsetWidth === 0`이거나 `getClientRects().length === 0`이면 재시도하지 말고 바로 return합니다(복귀는 ResizeObserver가 알려 줌). 재시도 연쇄는 트리거 한 번당 한 번으로 제한하고, 숨김이 오래가면 `detach()`합니다.
- 검증 판정: **confirmed**(루프 자체). 다만 루프가 `requestAnimationFrame`을 거치므로 보이는 탭에서만 돌고, 강제 레이아웃은 레이아웃이 더러울 때만 생깁니다. "초당 20번 강제 레이아웃"은 과장이고, 정확히는 20Hz 타이머와 rAF 깨우기입니다. 유튜브가 홈 이동 때 `ytd-watch-flexy`를 숨기는 동작은 실행해 확인하지 않았습니다.

#### M4. 업데이트·비활성화 뒤 옛 콘텐츠 스크립트가 고아로 남고 정리되지 않음

- 심각도: medium (두 검토 결과를 합침: 사용자 영향 medium, 자원 누수 관점 low)
- 위치: `src/core.ts:519`, `:659-674`, `src/ui.ts:757`, `:915-922`, `:930-943`
- 문제: 확장이 자동 업데이트되거나 꺼지면 기존 탭의 콘텐츠 스크립트는 고아가 됩니다. interval 두 개, capture 단계 keydown, fullscreenchange, resize, Observer들이 계속 돌고, 재생기 버튼·패널·video transform도 남습니다. storage 저장은 `Extension context invalidated` 예외가 try/catch에 먹혀 조용히 버려지고, 새 팝업과 단축키는 옛 스크립트와 통신하지 못합니다. 확장을 제거해도 새로고침 전까지 확대와 UI가 남습니다. 코드 전체에 `clearInterval`도, `chrome.runtime.id` 확인도 없습니다.
- 근거:
  ```ts
  // core.ts:519, ui.ts:757
  try { chrome.storage.local.set(...) } catch (e) { /* 무시 */ }
  // core.ts:671, ui.ts:943: setInterval 등록만 있고 해제 경로 없음
  ```
- 보완 방법: interval 콜백 첫 줄에서 `if (!chrome.runtime?.id) { teardown(); return; }`로 고아 상태를 감지합니다. `teardown()`은 interval 해제, `detach()`, `clearTransform`, `stopPreview()`, Observer 해제, 리스너 제거, 레이어·버튼 제거를 합니다. 리스너를 `AbortController` signal로 묶으면 한 번에 풀 수 있습니다. H2의 방법 2(재주입)를 택한다면 `window.__fzContent__` 가드를 버전이나 `chrome.runtime.id` 기준으로 바꿔야 합니다.
- 검증 판정: **confirmed**. 새 인스턴스가 옆에서 같이 돌지는 않으므로(MV3는 기존 탭에 재주입하지 않음) 점점 커지는 누수는 아닙니다. 업데이트 직후의 UX 결함입니다.

#### M5. macOS에서 브라우저 단축키가 Option+Shift+8/9 문자 입력을 가로챔

- 심각도: medium
- 위치: `src/shortcuts.ts:86-89`, `scripts/build.mjs:28`, `src/shortcuts.ts:102-110`
- 문제: `chrome.commands` 단축키는 유튜브 탭에만 걸리지 않고 크롬 창 어디서든 동작합니다. `build.mjs`가 `suggested_key.default`만 쓰므로 macOS에서는 Option+Shift+8(°), Option+Shift+9(·)이 됩니다. 맥 사용자는 Gmail이나 문서 편집기에서 이 글자를 칠 수 없고, 유튜브가 아닌 탭에서는 아무 반응도 보지 못합니다. `keyLabel`은 플랫폼과 무관하게 "Ctrl"/"Alt"로 표시합니다.
- 근거:
  ```ts
  // shortcuts.ts:86-89
  "cycle-fit": { suggested: "Alt+Shift+8", ... },
  "reset-fit": { suggested: "Alt+Shift+9", ... }
  // build.mjs:28
  { suggested_key: { default: c.suggested }, description: c.description }
  ```
- 보완 방법: `suggested_key.mac`에 글자를 입력하지 않는 조합(예: `MacCtrl+Shift+8`)을 따로 두거나, 브라우저 명령에서 `suggested_key`를 빼고 사용자가 `chrome://extensions/shortcuts`에서 정하게 합니다. `keyLabel`은 macOS에서 ⌃⌥⇧ 또는 Control/Option으로 표시하고, 팝업 안내는 `chrome.commands.getAll()`의 실제 값을 보여 줍니다.
- 검증 판정: **confirmed**. 페이지 단축키 Ctrl+Option+Shift+숫자가 VoiceOver 보조키와 겹친다는 부분은 VoiceOver 사용자에게만 해당해 **plausible**입니다.

#### M6. 팝업 '직접 입력' 비율 칸이 입력 도중 닫히고 중간값이 적용됨

- 심각도: medium
- 위치: `src/popup.ts:363-366`, `:92-93`, `:322-326`
- 문제: 키를 누를 때마다 `patch()` → `render()`가 돌고, `render()`는 값이 프리셋과 0.005 이내면 select를 프리셋으로 바꾸고 입력칸을 숨깁니다. 2.4를 치려고 '2'를 누르는 순간 2 : 1이 선택되고 입력칸이 사라집니다. '1'로 시작하는 값(1.5 등)도 1 : 1에 걸립니다. 입력 중간값이 영상에 적용되고 저장됩니다.
- 근거: `popup.ts:363-366` input 이벤트 → `patch({ sourceRatio: value })` → `popup.ts:323-326` `el.ratio.value = preset; el.customRow.classList.add('hidden')`
- 보완 방법: `change`, Enter, blur에서만 patch합니다. 또는 직접 입력 모드 플래그를 두어 그동안 `render()`가 select와 입력칸을 되돌리지 못하게 하고, 입력칸에 초점이 있을 때는 value를 덮어쓰지 않습니다.
- 검증 판정: **confirmed**. 재현 절차가 코드와 일치합니다.

#### M7. 릴리스 zip을 만드는 스크립트가 없음

- 심각도: medium (두 검토 결과를 합침: medium, low)
- 위치: `package.json:5`, `.gitignore`, `README.md:14-15`
- 문제: 스토어에는 `manifest.json`이 zip 최상위에 있는 파일을 올려야 합니다. scripts는 `typecheck`, `build`, `watch`뿐이라 손으로 압축해야 하고, `dist` 폴더째 압축(manifest가 하위 폴더로 들어감), 저장소 루트 압축, 타입 검사를 거치지 않은 watch 산출물 업로드 같은 실수가 생기기 쉽습니다.
- 근거:
  ```json
  "scripts": { "typecheck": "tsc --noEmit", "build": "tsc --noEmit && node scripts/build.mjs", "watch": "node scripts/build.mjs --watch" }
  ```
- 보완 방법: `scripts/package.mjs`를 추가해 `dist/`의 내용물을 zip 루트에 두고 `release/fill-zoom-<version>.zip`으로 만듭니다(Windows는 `Compress-Archive -Path dist\*` 또는 `archiver`). `"package": "npm run build && node scripts/package.mjs"`로 등록하고, 항상 새로 빌드한 dist를 씁니다. `release/`, `*.zip`은 `.gitignore`에 추가합니다(L15).
- 검증 판정: **confirmed**. 참고로 현재 dist에는 소스맵이 없고 미니파이도 하지 않아(background 33줄, content 1415줄, popup 383줄) 코드 가독성 정책 면의 문제는 없습니다. 앞으로 소스맵을 켜더라도 제출 zip에는 넣지 않도록 합니다.

#### M8. UI 문자열 전체가 한국어 하드코딩이고 `default_locale`/`_locales`가 없음

- 심각도: medium (store-compliance 관점에서는 info로 판정된 항목과 합침)
- 위치: `static/manifest.json:4-5`, `static/popup.html:2`, `src/shortcuts.ts:86-88`, `src/core.ts:43-50`, `:462-485`, `src/ui.ts:498-562`, `:614-637`
- 문제: manifest의 name/description, 팝업, 페이지 패널, 토스트·오류 문구, 명령 설명이 모두 한국어 리터럴입니다. 형식 오류는 아니며 한국 한정 출시라면 막히지 않습니다. 전 세계에 공개하면 영어권 사용자는 설명과 UI를 읽을 수 없고 `chrome://extensions/shortcuts`의 명령 이름도 한국어로 나옵니다. description은 55자로 132자 제한 안입니다.
- 근거: `"description": "유튜브 영상의 검은 여백을 잘라내 화면을 채웁니다. ..."`, `description: "채움 방식 바꾸기"`, `"원래 크기로 되돌리기"`
- 보완 방법: 먼저 배포 지역과 언어를 정합니다. 해외 배포라면 `static/_locales/{ko,en}/messages.json`을 만들고 `"default_locale"`을 둔 뒤 name/description을 `__MSG_name__`으로 바꿉니다. 코드는 `chrome.i18n.getMessage`, popup.html은 `data-i18n` 속성으로 채우고, `build.mjs`가 commands description에도 `__MSG_` 키를 넣게 합니다. 한국 한정이라면 스토어 등록 언어와 배포 지역을 그에 맞춥니다(웹 조사 보고서의 등록 정보 절 참고).
- 검증 판정: **confirmed**.

---

### Low

#### L1. `host_permissions`가 코드에서 쓰이지 않음

- 심각도: low
- 위치: `static/manifest.json:7`
- 문제: fetch, 교차 출처 요청, `chrome.scripting`, `tab.url` 읽기, `captureVisibleTab` 등 host 권한이 필요한 API를 쓰지 않습니다. `content_scripts.matches`만으로 주입이 되고, `tabs.query`/`tabs.sendMessage`는 host 권한이 필요 없습니다. 설치 경고는 matches 때문에 어차피 같지만, 심사에서 "쓰지 않는 권한"으로 지적받거나 사유를 따로 적어야 합니다.
- 근거: `"host_permissions": ["https://*.youtube.com/*"]`. chrome.* 호출은 `commands.onCommand`, `tabs.query`, `tabs.sendMessage`, `runtime.onMessage`, `storage.local`, `storage.onChanged`뿐입니다. `popup.ts:86`의 호스트는 콘텐츠 스크립트가 보낸 `location.hostname`입니다.
- 보완 방법: `host_permissions`를 지우고 팝업, 브라우저 단축키, 감지가 그대로 되는지 확인합니다. 단, H2에서 URL 판별(`tab.url`)이나 `scripting` 주입을 택하면 host 권한이 다시 필요해지므로, H2의 방식을 먼저 정한 뒤 결정합니다.
- 검증 판정: **confirmed**. 이 정도 중복으로 반려되는 일은 드물어 low입니다.

#### L2. 매치 패턴 `*.youtube.com`이 실제 대상보다 넓음 (studio, music, m, tv)

- 심각도: low (세 관점의 항목을 합침)
- 위치: `static/manifest.json:7`, `:16-17`, `README.md:4`, `src/core.ts:79`
- 문제: 와일드카드 서브도메인 때문에 `studio.youtube.com`(크리에이터의 비공개 영상 편집 화면), `music.youtube.com`, `m.youtube.com`에도 스크립트와 조작판이 들어갑니다. music과 m은 재생기 구조가 달라 UI 가정(M2, L13)이 맞지 않습니다. 팝업을 열면 Studio 화면의 프레임도 JPEG로 뽑아 팝업에 넘깁니다(기기 밖으로 나가지는 않음). 최소 권한 원칙에 어긋나고 권한 사유 작성도 모호해집니다.
- 근거: `"matches": ["https://*.youtube.com/*"]`
- 보완 방법: 실제로 테스트한 도메인만 적습니다. 예: `["https://www.youtube.com/*"]`, 필요하면 `https://m.youtube.com/*` 추가. 또는 `exclude_matches: ["https://studio.youtube.com/*"]`. 스토어 설명과 README에 지원 범위를 밝힙니다.
- 검증 판정: **confirmed**.

#### L3. 디버그용 `window.FZ`, `FZ.stats()`가 출시 빌드에 남음 / popup.html에 `<title>` 없음

- 심각도: low (보안 관점에서는 info로 판정된 항목과 합침)
- 위치: `src/content.ts:12-13`, `:20`, `src/ui.ts:884-893`, `dist/content.js:1412`, `static/popup.html` `<head>`
- 문제: core 객체 전체가 `window.FZ`로 노출되고, `FZ.stats()`는 성능 측정값을 돌려줍니다. 콘텐츠 스크립트는 isolated world에서 돌기 때문에 유튜브 페이지 스크립트는 접근할 수 없어 보안 문제는 아닙니다. 다만 출시물에 남은 개발용 코드이고, `stats`의 `fps: number | "영상 프레임마다"` 때문에 `Core.stats`가 `() => unknown`으로 느슨합니다. 별개로 popup.html에 `<title>`이 없습니다. `src/` 와 `dist/` 어디에도 `console.log`는 없습니다.
- 근거:
  ```ts
  /** 콘솔에서 FZ.stats() 를 부를 수 있게 남겨 둔다. */
  FZ?: Core;
  ...
  window.FZ = FZ;
  ```
- 보완 방법: `build.mjs`의 esbuild 옵션에 `define: { __DEV__: JSON.stringify(watch) }`를 넣고 `if (__DEV__) { window.FZ = FZ; FZ.stats = ... }`로 감쌉니다. popup.html에 `<title>Fill Zoom</title>`을 추가합니다.
- 검증 판정: **confirmed**. 한 검토 결과는 줄 번호를 `content.ts:35`로 잘못 적었으며 실제는 20행입니다.

#### L4. 메시지 patch와 저장값을 검증 없이 state에 합침

- 심각도: low (보안·빌드 관점 두 항목을 합침)
- 위치: `src/core.ts:523-524`, `:626`, `:648-649`, `:263`, `src/popup.ts:164`, `:344`, `:349`
- 문제: `setState`와 저장값 복원이 `Object.assign`과 타입 단언만 거칩니다. 키·타입·범위를 검사하지 않고, 저장 형식에 스키마 버전도 없습니다. 지금은 이 확장의 팝업과 서비스 워커만 메시지를 보낼 수 있어 악용 경로는 없습니다. 하지만 앞으로 `FitState` 형태를 바꾸면 옛 저장값이 그대로 들어와 `FIT_LABEL[state.fit]`이 undefined가 되거나 이상한 `rotation`이 transform 문자열에 들어가고, 그 값이 다시 저장됩니다. 팝업도 `frame.url`을 검사 없이 `img.src`에 넣습니다.
- 근거:
  ```ts
  // core.ts:649
  if (saved && typeof saved === "object") Object.assign(state, saved as Partial<FitState>);
  // core.ts:263
  const turn = state.rotation ? ` rotate(${state.rotation}deg)` : "";
  ```
- 보완 방법: `types.ts`에 `sanitizeState(input: unknown): Partial<FitState>`를 만듭니다. `fit`은 `FIT_ORDER`에 있는지, `rotation`은 0/90/180/270인지, `sourceRatio`는 0 또는 0.2~5인지, `panX/panY`는 -100~100의 유한한 수인지 확인합니다. `setState`와 복원 모두 이 함수를 거치게 하고, 저장값은 `{ v: 1, ...state }`처럼 버전을 붙입니다. 팝업은 `frame.url`이 `data:image/jpeg;base64,`로 시작할 때만 씁니다. H1의 저장 구조를 바꿀 때 같이 하면 좋습니다.
- 검증 판정: **confirmed**. 심사 거절 사유는 아닙니다.

#### L5. 키 입력·패널 이벤트가 `isTrusted`를 확인하지 않고, 조작판이 Shadow DOM 없이 페이지에 붙음

- 심각도: low (보안 관점과 격리 관점 두 항목을 합침)
- 위치: `src/ui.ts:915-922`, `:199`, `:198-204`, `:712-718`
- 문제: capture 단계 keydown과 패널 click 리스너가 `event.isTrusted`를 보지 않아 유튜브 페이지의 스크립트(서드파티 포함)가 가짜 이벤트로 채움·회전·감지를 조작할 수 있습니다. 피해는 화면 표시 설정 정도입니다. 스타일은 `document.head`의 전역 `<style id="fz-style">`이고 패널은 light DOM에 바로 붙으므로 유튜브 전역 CSS가 스며들거나 부딪칠 수 있습니다. 페이지가 `id="fz-style"` 요소를 먼저 넣으면 스타일 주입이 건너뛰어집니다.
- 근거:
  ```ts
  // ui.ts:915
  document.addEventListener("keydown", (event) => { if (typing(event.target)) return; ... ACTIONS[action](); }, true);
  // ui.ts:199
  if (document.getElementById("fz-style")) return;
  ```
- 보완 방법: 핸들러 첫 줄에 `if (!event.isTrusted) return;`를 넣습니다. 패널·런처·토스트와 스타일은 `attachShadow({ mode: 'closed' })` 안에 두고, 재생기 조작줄의 버튼만 바깥에 남깁니다. 스타일 요소는 id로 찾지 말고 참조를 변수로 들고 있습니다.
- 검증 판정: **confirmed**. `.fz-` 접두사 덕분에 CSS 충돌 가능성은 낮습니다.

#### L6. 재생기 버튼·자동 숨김·전체화면 버튼을 문서의 첫 요소에서 찾음

- 심각도: low
- 위치: `src/ui.ts:812-814`, `:848`, `src/core.ts:500` (비교: `core.ts:88`)
- 문제: core는 `video.closest()`로 실제 재생기를 잡지만, ui와 전체화면 처리는 `document.querySelector`로 문서에서 처음 나오는 `.ytp-right-controls`, `.html5-video-player`, `.ytp-fullscreen-button`을 씁니다. 쇼츠 재생기, 인라인 미리보기, SPA 전환 뒤 숨은 재생기가 먼저 나오면 버튼이 보이지 않는 조작줄에 붙고, `fz-idle` 상태가 다른 재생기를 따라가며, 전체화면 버튼이 엉뚱한 재생기를 누를 수 있습니다. 1초마다 다시 확인하므로 영구히 고정되지는 않지만, rail이 바뀔 때 옛 버튼을 지우지 않아 중복으로 남을 수 있습니다.
- 근거: `const rail = document.querySelector(".ytp-right-controls");`
- 보완 방법: 셋 다 `FZ.getBox()` 기준으로 찾고(`box?.querySelector(...)`), box가 바뀌면 이전 버튼을 제거합니다.
- 검증 판정: **plausible**. 어긋남은 코드에 있지만 실제로 숨은 재생기가 DOM 순서상 먼저 오는지는 현재 유튜브 DOM에 달려 있어 정적으로 확정할 수 없습니다.

#### L7. 감지 도중 영상이 바뀌거나 광고가 끼면 섞인 비율이 저장됨

- 심각도: low
- 위치: `src/core.ts:461-491`
- 문제: `detect()`는 350ms 간격으로 5번(약 1.4초) 표본을 모으는데, 매번 바깥 `video`를 다시 읽고 요소·src·해상도 변화나 광고 상태를 확인하지 않습니다. 광고와 본편이 같은 video 요소에서 재생되므로 광고 중 감지하면 광고 기준 비율이 저장되고, H1 때문에 이후 영상에도 남습니다.
- 근거:
  ```ts
  const tick = () => { const s = sampleBars(); ... if (++n < 5) { setTimeout(tick, 350); return; }
  const base = video.videoWidth / video.videoHeight; ... setState({ sourceRatio: ratio });
  ```
- 보완 방법: 시작할 때 `target`, `currentSrc`, `videoWidth/Height`를 기억하고 tick마다 비교해 달라지면 "영상이 바뀌어 감지를 멈췄습니다"로 끝냅니다. `#movie_player.ad-showing`일 때는 감지를 거절합니다.
- 검증 판정: **confirmed**. 좁은 시간 창이 필요해 low입니다.

#### L8. 팝업의 전체화면 버튼: '해제'는 아무것도 하지 않고, '전환'은 사실상 실패할 수 있음

- 심각도: low (두 항목을 합침, 판정이 서로 다름)
- 위치: `src/popup.ts:337`, `:384-386`, `src/core.ts:498-507`, `static/popup.html:73`
- 문제:
  1. (confirmed) 전체화면 상태에서 버튼 문구가 "전체화면 해제"로 바뀌지만, `requestFullscreen()`은 이미 전체화면이면 `{fullscreen:true}`만 돌려주고 해제하지 않습니다.
  2. (plausible) 팝업 클릭의 사용자 활성화가 유튜브 탭 문서로 전달되지 않으면 `.ytp-fullscreen-button.click()`이나 `requestFullscreen()`이 거부됩니다. 코드도 실패를 예상해 `popup.ts:384-386`에 안내 문구를 넣어 두었습니다. 늘 보이는 버튼이 거의 항상 실패 안내만 띄우면 "설명된 기능이 동작하지 않음"으로 보일 수 있습니다.
- 근거:
  ```ts
  // popup.ts:337
  el.fullscreen.textContent = (report && report.fullscreen) ? "전체화면 해제" : "전체화면으로 전환";
  // core.ts:499
  if (document.fullscreenElement) { done({ fullscreen: true }); return; }
  ```
- 보완 방법: 전체화면일 때는 `document.exitFullscreen()`을 부릅니다(해제에는 사용자 활성화가 필요 없음). 전환은 먼저 여러 크롬 버전에서 실제 성공률을 수동으로 확인하고, 거의 실패한다면 버튼을 없애고 재생기 버튼이나 `f` 키를 안내합니다. 창 전체화면이면 충분하다면 `chrome.windows.update(windowId, { state: 'fullscreen' })`도 방법입니다.
- 검증 판정: 1은 **confirmed**, 2는 **plausible**(크롬이 확장 메시지를 거쳐 활성화를 넘기는지 실행해 보지 않음). 원래 근거에 적힌 `popup.html:525`는 틀렸고 실제 버튼은 73행입니다.

#### L9. 팝업의 주기 프레임 응답이 방금 바꾼 상태를 잠깐 되돌림

- 심각도: low
- 위치: `src/popup.ts:159`, `:174`, `:91-94`
- 문제: 500ms마다 오는 frame 응답이 setState 이전 스냅숏을 담고 있으면 낙관적으로 갱신한 화면을 되돌렸다가 다시 바꿔 버튼 표시가 깜빡입니다.
- 근거: `if (!drag) receive(response);`
- 보완 방법: 요청마다 순번을 붙여 마지막 patch 이후에 보낸 frame 응답만 state에 반영하거나, frame 응답에서는 그림만 바꿉니다.
- 검증 판정: **confirmed**. 겉모양 깜빡임입니다.

#### L10. 미리보기 그림을 끄면 팝업 상태·배율 표시가 갱신되지 않음

- 심각도: low
- 위치: `src/popup.ts:157`, `:174`, `:177`
- 문제: 주기 갱신 경로는 `refreshFrame` 하나뿐인데 `picture`가 false면 바로 return합니다. 그림을 끈 사용자는 팝업을 연 채로 전체화면 전환, 영상 변경, 단축키 조작을 해도 표시가 예전 값에 머뭅니다.
- 근거: `if (framePending || !picture) return;`
- 보완 방법: 그림이 꺼져 있으면 `getState`를 주기적으로 보냅니다. 더 나은 방법은 `runtime.connect` 포트로 콘텐츠 스크립트가 상태 변화를 밀어 주는 것입니다.
- 검증 판정: **confirmed**.

#### L11. 1초 setInterval 두 개가 영상 유무와 관계없이 레이아웃 읽기와 DOM 쓰기를 반복함

- 심각도: low (성능 관점 low와 정확성 관점 info를 합침)
- 위치: `src/core.ts:671-674`, `:159-164`, `src/ui.ts:943`, `:752`, `:645-649`
- 문제: core는 매초 `schedule(false)` 또는 `attach()`(모든 video를 `querySelectorAll`하고 `offsetWidth` 읽기)를 부르고, `currentSignature()`가 `getBoundingClientRect()`를 두 번 부릅니다. ui는 매초 `mountPlayerButton`, `sync()` → `paint(FZ.snapshot())`, `watchAutohide`를 부르고, 패널이 펼쳐져 있으면 `aria-pressed`를 같은 값으로 다시 씁니다. 둘 다 `document.hidden`을 확인하지 않습니다.
- 근거: `setInterval(() => { if (!video || !video.isConnected) attach(); else schedule(false); }, 1000);`, `setInterval(reseat, 1000);`
- 보완 방법: 1초 폴링은 영상을 다시 찾는 용도로만 쓰고 `document.hidden`이면 건너뜁니다. `currentSignature`는 rect를 한 번만 읽습니다. ui의 `reseat`은 `yt-navigate-finish`, `fullscreenchange` 같은 이벤트에서 부르고, `setAttribute`는 값이 바뀔 때만 씁니다.
- 검증 판정: **confirmed**. 다만 core의 `schedule()`은 rAF를 거치므로 숨은 탭에서는 `apply()`가 돌지 않고, 크롬은 백그라운드 타이머를 억제합니다. "백그라운드 탭에서도 비용이 쌓인다"는 원래 주장은 core에 대해서는 부분적으로 틀렸습니다. 실제 비용은 작습니다.

#### L12. 팝업이 0.5초마다 JPEG를 요청하고, 멈춘 영상도 다시 인코딩함

- 심각도: low
- 위치: `src/popup.ts:177`, `src/core.ts:377-395`, `:622`, `:575-577`
- 문제: 팝업이 열려 있는 동안 500ms마다 `drawImage` + `toDataURL('image/jpeg', 0.6)`을 하고 base64를 IPC로 넘깁니다. `currentTime` 확인이 없어 일시정지 중에도 같은 프레임을 인코딩합니다. 메시지마다 `attach()`가 `pickVideo()`를 먼저 돌립니다.
- 근거: `return { url: frameCanvas.toDataURL("image/jpeg", 0.6) };`
- 보완 방법: `currentTime`, `rotation`, `sourceRatio`로 도장을 만들어 같으면 `{ same: true }`만 돌려줍니다. 이미 붙은 video가 연결돼 있으면 `pickVideo()`를 건너뜁니다.
- 검증 판정: **confirmed**. 팝업이 열린 동안에만 해당합니다.

#### L13. 유튜브 DOM 클래스에 의존해 UI 개편 때 조용히 깨질 수 있음

- 심각도: low
- 위치: `src/ui.ts:812`, `:826`, `:844`, `:118`, `:130`, `src/core.ts:500`
- 문제: `.ytp-right-controls`, `.ytp-autohide`, `.ytp-fullscreen-button`을 못 찾으면 조용히 return합니다. 유튜브가 클래스를 바꾸면 버튼이 사라지고 런처가 조작줄과 따로 놀지만 진단이 없습니다. 런처·패널 위치(`top:60px; right:24px`)가 유튜브 오른쪽 위 오버레이와 겹칠 수 있습니다.
- 근거: `const rail = document.querySelector(".ytp-right-controls"); if (!rail) return;`
- 보완 방법: 몇 초 동안 못 찾으면 런처만으로 동작하게 두고 팝업에 "재생기 버튼을 붙이지 못했습니다" 같은 진단을 보여 줍니다. 출시 전에 일반 보기, 극장 모드, 전체화면, 미니플레이어, 좁은 창에서 겹침을 직접 확인합니다.
- 검증 판정: **confirmed**(의존성). 오버레이 겹침은 실제 페이지에서 확인해야 합니다.

#### L14. 접근성 결함 묶음

각 소항목은 심각도 low입니다.

| # | 위치 | 문제 | 보완 방법 | 판정 |
|---|---|---|---|---|
| a | `src/ui.ts:139`, `:176`, `:498-499`, `:65`, `:818-819` | 닫기 버튼의 접근 가능한 이름이 "×"뿐, 회전 버튼은 "↻ 90"/"↺ 90", 재생기 버튼은 `aria-label="Fill Zoom"` 고정에 `aria-pressed` 없음. `:focus-visible` 스타일은 `.fz-view` 하나에만 있음 | 닫기에 `aria-label="패널 접기"`, 회전에 `ROT_LABEL` 값, 재생기 버튼에 `aria-pressed=String(shown)`. 패널 버튼 전체에 `:focus-visible` 외곽선 추가 | **plausible**. 이름 문제는 확정이지만, 외곽선을 지우는 규칙이 없어 크롬 기본 포커스 링은 보일 것이므로 "포커스 표시 없음"은 과장 |
| b | `src/ui.ts:793-805`, `:575-577`, `:128`, `:494` | 패널을 열어도 포커스가 옮겨가지 않고, 접으면 body로 떨어짐. Esc로 닫을 수 없음(keydown 전파를 SEAL이 막음). 패널에 role/aria-label 없음. idle 상태 런처는 `opacity:0`인데 Tab 포커스를 받음 | 펼칠 때 선택된 채움 버튼에 `focus()`, 접을 때 런처로 되돌림. Escape로 `setExpanded(false)`. `role="region"`과 `aria-label`. idle 런처에 `visibility:hidden` 또는 `tabIndex=-1` | **confirmed** |
| c | `src/ui.ts:866-869`, `:570`, `:601`, `static/popup.html:22`, `:71` | 토스트, 감지 결과, 배율 표시, 팝업 `#readout`/`#note`에 `aria-live` 없음. 감지 중 버튼 문구가 "…" | 토스트에 `role="status" aria-live="polite"`, note에 `aria-live="polite"`, 감지 중 "감지 중"과 `aria-busy="true"` | **confirmed** |
| d | `static/popup.html:14-15`, `:34-35` | `#stage`가 `tabindex=0`인데 role/aria-label 없음, title에 방향키 안내 없음. 회전 버튼에 방향이 말로 없음 | `role="application"`과 방향키 설명이 담긴 `aria-label`, 회전 버튼에 "오른쪽으로 90도"/"왼쪽으로 90도" | **confirmed** |
| e | `src/ui.ts:529-530` | 패널의 '그림 비율' label이 select와 연결되지 않아 select 이름이 비어 있음 | `ratio.setAttribute('aria-label', '그림 비율')` 또는 id와 `htmlFor` 연결 | **confirmed** |

#### L15. 오류·안내 문구가 다음 행동을 알려 주지 않음

- 심각도: low
- 위치: `src/core.ts:467`, `:480`, `src/background.ts:11-13`
- 문제: "이 사이트의 영상은 화면을 읽을 수 없습니다"는 여러 사이트를 지원하던 시절 표현이고 대안이 없습니다. "띠가 너무 크게 잡혔습니다"는 원인도 대안도 없습니다. 유튜브가 아닌 탭에서 브라우저 단축키를 누르면 `lastError`를 버려 아무 반응이 없습니다.
- 보완 방법: "이 영상은 보호되어 화면을 읽을 수 없습니다. 드롭다운에서 비율을 직접 골라 주세요", "어두운 장면이라 띠를 잘못 잡았을 수 있습니다. 밝은 장면에서 다시 눌러 보세요"처럼 원인과 대안을 함께 씁니다. 대상 탭이 아닐 때는 `chrome.action.setBadgeText`로 잠깐 표시합니다.
- 검증 판정: **confirmed**.

#### L16. 버전을 한 곳에서 관리하지 않음

- 심각도: low
- 위치: `static/manifest.json:4`, `package.json`
- 문제: manifest version `0.4.0`은 손으로 고치고, `package.json`에는 version이 없습니다. git tag나 CHANGELOG도 없어 어느 커밋이 어느 스토어 버전인지 추적하기 어렵습니다. 스토어는 이전보다 큰 버전이 아니면 업로드를 거부하므로 올리기를 잊으면 바로 드러나기는 합니다.
- 보완 방법: `package.json`에 `"version": "0.4.0"`을 두고 `build.mjs`의 `writeStatic()`에서 `manifest.version = pkg.version`으로 주입합니다. `npm version patch|minor`로 올리고 `git tag v0.4.0`을 남깁니다.
- 검증 판정: **confirmed**.

#### L17. 빌드가 Node 22.18+의 타입 스트리핑에 기대는데 강제 장치가 없음

- 심각도: low
- 위치: `scripts/build.mjs:15-16`, `package.json`, `README.md:9`
- 문제: `build.mjs`가 `../src/shortcuts.ts`를 Node로 직접 import합니다. 낮은 Node에서는 tsc는 통과하고 `ERR_UNKNOWN_FILE_EXTENSION`으로 실패합니다. `shortcuts.ts`가 import와 enum을 쓰면 안 된다는 제약도 주석으로만 지켜집니다. 출시물에는 영향이 없고 개발 환경 재현성 문제입니다.
- 보완 방법: `"engines": { "node": ">=22.18" }`, `.npmrc`에 `engine-strict=true`, `.nvmrc` 추가. 더 견고하게는 esbuild로 `shortcuts.ts`를 먼저 변환해 import하거나 commands 표를 JSON으로 분리합니다.
- 검증 판정: **confirmed**.

#### L18. 같은 로직과 상수가 popup.ts, ui.ts, popup.html에 중복되어 이미 어긋남

- 심각도: low
- 위치: `src/popup.ts:5`, `:104`, `:309`, `src/ui.ts:52-63`, `:243`, `:636`, `static/popup.html:49-58`
- 문제: 비율 프리셋이 세 곳에, `viewGeom`, `clamp`, `describe`/`noteFor` 등이 두 곳에 따로 있습니다. 안내 문구가 이미 다릅니다("영상 파일 안에 검은 띠가" / "영상 안에 검은 띠가"). 사용자 지정 비율 처리 방식도 서로 다릅니다.
- 보완 방법: `src/view.ts`에 `RATIO_PRESETS`, `Geom`, `viewGeom`, `clamp`, `describe`, `noteFor`를 모으고 두 파일이 import합니다. popup.html의 `<option>`은 스크립트로 생성합니다.
- 검증 판정: **confirmed**.

#### L19. 죽은 코드·쓰지 않는 필드 / `minimum_chrome_version` 없음

- 심각도: low (두 항목을 합침)
- 위치: `src/core.ts:629-630`, `:404`, `:322`, `:669`, `src/popup.ts:32`, `src/ui.ts:368-375`, `:942`, `scripts/build.mjs:45`
- 문제: 아무도 보내지 않는 `"spin"`, `"togglePanel"` 메시지 처리, 읽히지 않는 `Snapshot.label`, `Report.intrinsic`, `el.viewRow`가 있습니다. esbuild target은 `chrome110`인데 rVFC 대체 경로와 `webkitfullscreenchange` 리스너가 남아 있고, manifest에 최소 버전 선언이 없어 Chrome 88~109에도 설치됩니다.
- 보완 방법: 죽은 코드를 지우거나 실제 명령에 연결합니다. manifest에 `"minimum_chrome_version": "110"`을 넣거나 build 과정에서 target과 같은 값으로 주입하고, 오래된 크롬용 대체 경로를 정리합니다.
- 검증 판정: **confirmed**. 88 이상에서 쓰는 API가 대부분 지원되므로 실제 위험은 작습니다.

#### L20. 자동 테스트가 없음

- 심각도: low
- 위치: `package.json:5`, `src/core.ts:109-150`
- 문제: test 스크립트와 테스트 파일이 없습니다. `contentSize`, `scaleFor`, `isSettled`, `snapRatio`, `viewGeom`, `keyLabel` 같은 순수 계산이 `createCore()` 클로저 안에 있어 따로 테스트할 수도 없습니다. 유튜브 개편 대응 때 회귀를 막을 장치가 없습니다.
- 보완 방법: 순수 계산을 `src/math.ts`로 빼 state를 인자로 받게 하고, `node:test`로 최소한 90도 회전 시 가로세로 교환, 2.39 레터박스의 세로 배율, `snapRatio(2.37) → 2.35`를 검증합니다.
- 검증 판정: **confirmed**.

#### L21. `.gitignore`가 배포 산출물과 서명 키를 막지 않음

- 심각도: low
- 위치: `.gitignore:1`
- 문제: `node_modules/`, `dist/` 두 줄뿐입니다. release zip과, "확장 프로그램 압축" 기능을 쓰면 생기는 `.pem` 개인키가 실수로 커밋될 수 있습니다. 스토어 업로드에는 `.pem`이 필요 없어 가능성은 낮습니다.
- 보완 방법: `*.zip`, `*.crx`, `*.pem`, `release/`, `.env*`, `.DS_Store`, `Thumbs.db`를 추가합니다.
- 검증 판정: **confirmed**.

---

### Info

#### I1. 개인정보 보호 관행 탭 신고 근거: 외부 전송 없음, 영상 프레임은 로컬에서만 처리 (두 항목 합침)

- 위치: `src/core.ts:394`, `:434-452`, `:519`, `src/ui.ts:757`, `src/popup.ts:164`, `:177`
- 내용:
  - `src/`, `static/`, `scripts/`를 검색한 결과 fetch, XHR, WebSocket, sendBeacon, eval, `new Function`, 외부 URL, console 호출이 없습니다(manifest의 host 패턴 두 줄만 나옴).
  - 감지는 160px 캔버스에서 `getImageData`로 띠 비율만 계산하고 픽셀은 버립니다. 팝업이 열린 동안 최대 512px JPEG(품질 0.6)를 만들어 팝업에 넘기고 표시만 합니다. 저장·전송하지 않습니다.
  - `chrome.storage.local`에는 `site:<hostname>` → `{fit, sourceRatio, panX, panY, rotation}`, `ui:panel` → `{shown, pic}`만 저장합니다. URL, 영상 ID, 제목, 계정 정보는 없고, sync가 아니라 local입니다.
  - 서비스 워커는 commands를 활성 탭에 전달하기만 합니다.
- 대시보드 작성 권고:
  - 수집 데이터 유형은 체크하지 않고, 준수 인증 3개(판매 안 함, 무관한 목적 사용 안 함, 신용 판단 사용 안 함)에 체크하고, Remote code는 "사용 안 함"으로 둡니다.
  - 권한 사유 예시: storage는 "채움·회전 설정과 조작판 표시 여부를 기기에 저장", host(youtube)는 "유튜브 재생기의 video 요소에 CSS transform을 적용하고 페이지 안 조작판을 띄움".
  - 수집 데이터가 없으면 개인정보처리방침이 필수는 아니지만, "데이터를 수집·전송하지 않으며 영상 프레임은 기기 안에서만 처리한다"는 짧은 방침 URL을 두는 편이 심사와 신뢰에 유리합니다. 지금 저장소에는 이런 문서가 없습니다. README에도 '데이터 처리' 절을 추가합니다.
- 판정: **confirmed**(데이터 흐름). 대시보드 항목을 어떻게 체크할지는 CWS 정책 해석이므로 제출 전에 공식 문서로 다시 확인하세요. 웹 조사 보고서의 개인정보·Limited Use 절과 맞춰 보면 됩니다.

#### I2. 콘텐츠 스크립트 `onMessage`가 발신자를 확인하지 않음

- 위치: `src/core.ts:621`, `:631`
- 내용: 콘텐츠 스크립트의 `onMessage`에는 같은 확장이 보낸 메시지만 오고 `externally_connectable`도 없어 지금은 위험이 없습니다. frame 요청이 영상 프레임을 돌려주므로 나중을 대비해 `if (_sender.id !== chrome.runtime.id) return false;`와 `msg.type` 형태 확인을 둘 수 있습니다.
- 판정: **confirmed**. 실질적으로는 중복 방어입니다.

#### I3. 정적 SVG를 `innerHTML`로 넣음

- 위치: `src/ui.ts:229`, `:588`, `:821`
- 내용: `ICON`은 고정 상수라 XSS가 아닙니다. 코드 전체의 HTML 싱크는 이 두 곳뿐입니다. 정적 분석이 지적할 수 있으니 `createElementNS`로 만드는 `makeIcon()`으로 바꾸면 깔끔합니다. Trusted Types 우려는 isolated world라 추측에 가깝습니다.
- 판정: **confirmed**.

#### I4. 0.3.0(`<all_urls>`) 시절의 `site:<호스트명>` 저장값이 정리되지 않음

- 위치: `src/core.ts:53`
- 내용: 0.3.0(커밋 `9a5621a`)은 모든 사이트에서 돌았으므로 그때 조작한 사이트의 호스트명이 저장소에 키로 남아 있습니다. 스토어 첫 출시라 일반 사용자에게는 해당하지 않고, 개발자와 테스터의 로컬 설치에만 남습니다. 필요하면 `onInstalled`(update)에서 youtube가 아닌 `site:` 키를 지웁니다. H1에서 저장 키를 바꿀 때 함께 정리하면 됩니다.
- 판정: **confirmed**.

#### I5. 시작 시 저장값 복원이 먼저 도착한 setState를 덮어쓸 수 있음

- 위치: `src/core.ts:621`, `:626`, `:647-649`
- 내용: 리스너가 비동기 `storage.get` 콜백보다 먼저 등록되어, 그 사이 들어온 patch가 저장값으로 되돌아갈 수 있습니다. `storage.get`은 수 ms 안에 끝나 실제로 겪기 어렵습니다. 복원 완료 플래그를 두고 그 전 patch는 모았다가 다시 적용합니다.
- 판정: **confirmed**(경쟁 조건 존재), 영향은 매우 작음.

#### I6. 감지가 표본마다 새 캔버스를 만들고 동시 실행을 막지 않음

- 위치: `src/core.ts:427`, `:461-491`, `src/ui.ts:600`
- 내용: 감지 한 번에 160xN 캔버스 5개가 생기고, 팝업 감지와 패널 감지가 겹칠 수 있습니다. 결과는 무해합니다. 캔버스를 재사용하고 진행 중 플래그를 둡니다.
- 판정: **confirmed**.

#### I7. 팝업이 다크 테마로 고정됨

- 위치: `static/popup.css:1-11`
- 내용: `color-scheme: dark`만 있고 `prefers-color-scheme: light` 분기가 없어 밝은 테마 툴바에서 튀어 보입니다. 밝은 변수 세트를 추가하고 강조 버튼 대비(4.5:1 이상)를 두 테마에서 확인합니다.
- 판정: **confirmed**.

#### I8. LICENSE 파일과 `license` 필드가 없음

- 위치: `package.json:1`
- 내용: 스토어 등록에는 필요 없습니다. 저장소를 공개하거나 스토어 설명에 소스 링크를 걸 계획이면 MIT 등을 정해 추가하고, 비공개라면 `"license": "UNLICENSED"`로 명시합니다.
- 판정: **confirmed**.

#### I9. watch 모드가 `static/` 변경과 `BROWSER_COMMANDS` 변경을 반영하지 못함

- 위치: `scripts/build.mjs:16`, `:50-54`
- 내용: 개발 중 본 동작과 출시 빌드가 달라질 수 있습니다. `npm run build`는 dist를 지우고 새로 만들므로 출시물에는 영향이 없습니다. M7의 패키지 스크립트가 항상 새 빌드를 쓰게 하면 충분합니다.
- 판정: **confirmed**.

#### I10. 예외를 조용히 삼켜 출시 후 원인 추적이 어려움

- 위치: `src/core.ts:298`, `:410`, `:519`
- 내용: `try { apply(forceNow); } catch (e) { signature = ""; }` 등. 유튜브 DOM이 바뀌어 `apply()`가 계속 실패해도 단서가 없습니다. 최소한 `apply()` catch에 한 번만 찍히는 `console.warn("[Fill Zoom] apply failed", e)`을 둡니다.
- 판정: **confirmed**.

#### I11. 시크릿 창에서 바꾼 설정이 일반 프로필 저장소에 남음

- 위치: `static/manifest.json`, `src/core.ts:519`, `src/ui.ts:757`
- 내용: `incognito` 키가 없어 기본값 spanning으로 동작하고, `inIncognitoContext` 확인이 없습니다. 저장값은 채움 방식과 비율뿐이라 민감하지 않습니다. 시크릿에서는 저장을 건너뛰거나 `"incognito": "split"`을 두고, 처리방침에 한 줄 적습니다.
- 판정: **confirmed**.

#### I12. README 설명이 현재 동작과 어긋남

- 위치: `README.md:184`, `src/ui.ts:721-722`, `:740-743`
- 내용: 0.1.3 절의 "패널이 닫히면 [층이] 사라집니다"는 현재 동작과 다릅니다(`shown`이면 레이어가 남음). 이력 절로서는 당시에 맞았을 수 있지만, 스토어 설명을 README에서 옮겨 쓰면 틀린 설명이 나갑니다. 이력과 스토어용 설명을 나눠 정리합니다.
- 판정: **confirmed**.

---

## 3. 반박되어 제외된 항목

- 없음. 이번 검증에서 전부 반박되어 빠진 항목은 없습니다.
- 대신 검증 과정에서 다음과 같이 주장 일부를 바로잡거나 심각도를 낮췄습니다.
  - 아이콘 누락은 두 검토에서 blocker와 high로 나왔고, blocker로 합쳤습니다(B1).
  - 고아 콘텐츠 스크립트는 high에서 medium으로 낮췄습니다(M4). 많은 확장이 같은 제약을 안고 출시하고, 기능 자체가 망가지지는 않기 때문입니다.
  - 무한 재시도 루프의 "초당 20번 강제 레이아웃"은 과장으로 보고 high에서 medium으로 낮췄습니다(M3).
  - 1초 폴링의 "백그라운드 탭 비용"은 core에 대해서는 부분적으로 틀렸습니다(L11).
  - 포커스 표시 부재는 과장이라 plausible로 표시했습니다(L14-a).
  - L3은 줄 번호(content.ts:35)를, L8은 줄 번호(popup.html:525)를 바로잡았습니다.
  - `host_permissions` 중복, 버전 관리, Node 버전 강제, 디버그 전역, 입력 검증은 medium에서 low로 낮췄습니다.
  - LICENSE, 옛 저장 키, 발신자 확인, innerHTML은 info로 낮췄습니다.

---

## 4. 웹 조사 보고서와 연결되는 지점

[`docs/researchs/2026-09-30_0913_chrome-web-store-release-research.md`](../researchs/2026-09-30_0913_chrome-web-store-release-research.md)와 함께 보면 좋은 곳입니다.

- **B1 아이콘**: 스토어 등록 정보에 필요한 이미지(128px 아이콘, 스크린샷, 프로모션 타일) 규격.
- **L1, L2 권한과 매칭 범위, H2의 `scripting` 권한 추가 여부**: 최소 권한 원칙, 권한 사유 작성, 설치 경고 문구.
- **I1 데이터 흐름**: 개인정보 보호 관행 탭, Limited Use, 개인정보처리방침 필요 여부. 대시보드 체크 방식은 조사 보고서의 공식 문서 인용으로 확정하세요.
- **M8 다국어**: 등록 언어, 배포 지역 설정.
- **M7 패키징, L16 버전**: zip 구조 요구사항, 업데이트 시 버전 규칙, 심사 기간.
- **M5 단축키**: `chrome.commands`의 플랫폼별 `suggested_key` 규칙.
