# 스토어 등록 글 모음

크롬 웹 스토어 개발자 대시보드에 붙여 넣을 글과 고를 값을 탭 순서대로 모았습니다.
회색 상자 안의 글을 그대로 복사해 넣으면 됩니다.

## 올리기 전에

1. `main` 을 GitHub 에 푸시합니다. 개인정보처리방침의 주소가 `main` 의 파일을 가리킵니다.
2. `npm run package` 를 돌립니다. `release/tiltfill-<버전>.zip` 이 올릴 파일입니다.

## 패키지 탭

`release/tiltfill-<버전>.zip` 을 올립니다. 이름과 짧은 설명은 zip 안에서 읽어 가므로 따로 넣지 않습니다.

| 항목 | 한국어 | 영어 |
| --- | --- | --- |
| 이름 | Tiltfill | Tiltfill |
| 짧은 설명 | 유튜브 영상을 돌리고, 검은 띠를 잘라 화면을 채웁니다. 돌린 방향 그대로 뜨는 PIP 와 창 채움을 함께 씁니다. 데이터를 모으지 않습니다. | Rotate YouTube videos and crop black bars to fill the player. Rotation carries into picture-in-picture. No data collected. |

## 스토어 등록정보 탭

### 상세 설명 — 영어 (기본 언어)

```
Tiltfill rotates videos on YouTube™ and crops their black bars so the picture fills the player.

• Rotate: turn the picture in 90° steps. Useful when a vertical video was uploaded sideways.
• Fill: remove the bars above and below, or at the sides. A small preview shows what gets cropped, and you drag a box on it to choose the part that stays visible.
• Detect: finds black bars that are baked into the video file itself.
• Picture-in-picture: opens the video in a small always-on-top window that keeps your rotation and crop, with captions.
• Fill window: makes the player fill the browser window without going fullscreen.
• Wheel seeking: scroll horizontally (or hold Shift and scroll) over the player to jump 5 seconds. Hold Ctrl for 10 seconds, or Alt to step frame by frame.

Everything is controlled from a small panel inside the player, so it works in fullscreen too. The keyboard shortcuts are listed in the toolbar popup.

Privacy: Tiltfill collects nothing and sends nothing. It only changes how the video is displayed. Detection and the preview read the video picture inside your browser; that picture is never stored or transmitted. Your settings stay in the browser.

After installing, reload any video tabs that were already open.

Source code (GPL-3.0): https://github.com/Argoneon1810/Tiltfill

Screenshots show "Charge" (CC BY 4.0) by Blender Foundation | studio.blender.org, cropped by this extension.

YouTube is a trademark of Google LLC. Tiltfill is an independent project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube.
```

### 상세 설명 — 한국어

```
Tiltfill 은 유튜브 영상을 돌리고, 검은 띠를 잘라 내 그림이 재생기를 채우게 합니다.

• 회전: 그림을 90도씩 돌립니다. 세로로 찍은 영상이 눕혀져 올라와 있을 때 씁니다.
• 화면 채우기: 위아래나 좌우의 띠를 없앱니다. 작은 미리보기에 잘리는 부분이 표시되고, 그 위의 상자를 끌어 남길 부분을 고릅니다.
• 감지: 영상 파일 안에 들어 있는 검은 띠를 찾아냅니다.
• PIP: 영상을 항상 위에 뜨는 작은 창으로 띄웁니다. 돌린 방향과 잘라 낸 띠가 그대로 적용되고 자막도 나옵니다.
• 창 채움: 전체화면으로 가지 않고 재생기를 브라우저 창 가득 채웁니다.
• 휠로 넘기기: 재생기 위에서 휠을 가로로 굴리면(또는 Shift 를 누른 채 굴리면) 5초씩 넘어갑니다. Ctrl 을 누르면 10초씩, Alt 를 누르면 한 프레임씩 넘어갑니다.

조작은 모두 재생기 안의 작은 패널에서 하고, 전체화면에서도 똑같이 됩니다. 단축키는 도구 모음의 확장 아이콘을 누르면 볼 수 있습니다.

개인정보: 아무것도 모으지 않고 어디로도 보내지 않습니다. 영상이 보이는 방식만 바꿉니다. 감지와 미리보기는 영상 화면을 브라우저 안에서 읽을 뿐이고, 읽은 화면을 저장하거나 전송하지 않습니다. 설정은 브라우저 안에만 저장합니다.

설치한 뒤에는 이미 열려 있던 영상 탭을 새로고침해 주세요.

소스 코드 (GPL-3.0): https://github.com/Argoneon1810/Tiltfill

스크린샷의 영상은 Blender Foundation 의 "Charge" (CC BY 4.0, studio.blender.org) 이며, 이 확장으로 잘라 낸 모습입니다.

YouTube 는 Google LLC 의 상표입니다. Tiltfill 은 독립 프로젝트이며 Google LLC 나 YouTube 와 제휴하거나 그 후원, 보증을 받지 않았습니다.
```

### 그 밖의 항목

| 항목 | 넣을 값 |
| --- | --- |
| 카테고리 | Lifestyle 아래의 Entertainment 를 권합니다. 목록에 없으면 Make Chrome Yours 아래의 Functionality & UI 를 고릅니다. 대시보드의 목록을 보고 정하세요. |
| 언어 | English 와 한국어. zip 안의 번역 파일을 읽어 자동으로 잡힙니다. |
| 스토어 아이콘 | `static/icons/128.png` |
| 스크린샷 | 아래 "스크린샷" 절 |
| 작은 프로모션 타일 | `docs/store/promo-440x280.png` |
| 홈페이지 URL | `https://github.com/Argoneon1810/Tiltfill` |
| 지원 URL | `https://github.com/Argoneon1810/Tiltfill/issues` |
| 성인 콘텐츠 | 아니오 |

## 개인정보 보호 관행 탭

### 단일 목적

```
Tiltfill has one purpose: giving the viewer control over how a video on YouTube is shown in the player. Rotating the picture, cropping black bars so the picture fills the player, choosing which part stays visible, showing the same adjusted picture in a picture-in-picture window, making the player fill the browser window, and seeking with the mouse wheel are all controls for viewing that one video. The button in the player, the panel, the toolbar popup and the keyboard shortcuts are ways to reach those controls.
```

### 권한 사유

storage

```
Stores the settings the user chooses (fit mode, whether window fill is on, wheel direction, frames per fine step, whether the preview picture is on, whether the player button is hidden) in chrome.storage.local so they apply on the next visit. Only these settings are stored, and nothing is sent anywhere.
```

호스트 권한 (`https://*.youtube.com/*`)

```
Runs a content script on YouTube pages to apply a CSS transform to the video element, add a button and a control panel to the player, and read video frames locally in the browser to detect black bars and draw a preview. Frames are never stored or transmitted. The extension does not access any site other than YouTube.
```

### 나머지 항목

| 항목 | 답 | 근거 |
| --- | --- | --- |
| 원격 코드 | No, I am not using remote code | 소스에 `fetch`, `eval`, 바깥 스크립트가 없습니다. |
| 데이터 유형 9개 | 모두 체크하지 않음 | 모으거나 보내는 것이 없습니다. 저장하는 것은 설정뿐입니다. |
| 인증 3개 | 모두 체크 | 팔거나 넘기지 않고, 목적 밖에 쓰지 않고, 신용 평가에 쓰지 않습니다. |
| 개인정보처리방침 URL | `https://github.com/Argoneon1810/Tiltfill/blob/main/PRIVACY.md` | `main` 을 푸시한 뒤에 열립니다. |

심사에서 영상 화면을 읽는 것을 문제 삼으면 데이터 유형의 "Website content" 를 체크하고 다시 냅니다.
방침에는 그 처리 방식이 이미 적혀 있습니다.

## 테스트 안내 탭

```
1. Install the extension, then open any video on https://www.youtube.com in a new tab. A video with black bars shows the effect best, for example a 2.39:1 film trailer.
2. A small button appears at the top right of the player. Click it to open the panel. (Shortcut: Ctrl+Alt+Shift+1)
3. In the panel, choose "Fill height", "Fill width" or "Fill both". The black bars disappear. If the bars are baked into the video, click "Detect" while the video is playing.
4. Choose a rotation in the second row of the panel. Click "PIP" (or press Alt+P) to open the rotated video in a small window.
5. Click "Fill window" to make the player fill the browser window.
6. Hold Shift and scroll over the player to jump 5 seconds. Hold Alt as well to step frame by frame.
No login or account is needed.
```

## 스크린샷

`docs/store/screenshots/` 에 1280×800 으로 세 장을 찍어 두었습니다. 순서대로 올립니다.

| 파일 | 화면 |
| --- | --- |
| `1-before.png` | 채우기 전. 위아래에 검은 띠가 있습니다. |
| `2-after.png` | 같은 장면에서 Fill height 를 고른 뒤 |
| `3-panel.png` | 패널을 펼친 모습. 잘리는 부분을 보여 주는 미리보기가 함께 보입니다. |

영상은 Blender Studio 의 **Charge** 입니다. CC BY 4.0 이라 출처만 밝히면 쓸 수 있습니다. 그래서 상세 설명
끝에 출처 줄을 넣어 두었습니다. 재생기를 창에 가득 채운 상태에서 찍어, 유튜브의 다른 영상 썸네일이나
로고가 들어가지 않았습니다. 화면의 글은 영어입니다.

회전과 PIP 를 보여 주는 장면은 없습니다. 회전은 눕혀서 올라온 영상이 있어야 뜻이 통하고, PIP 창은 페이지
밖에 뜨는 창이라 같은 방식으로 찍히지 않습니다. 더 넣고 싶으면 직접 찍어 보태면 됩니다. 스토어는 다섯
장까지 받습니다.

다시 찍으려면 유튜브 영상 페이지에서 `F12`, `Ctrl+Shift+M` 으로 기기 툴바를 켜고 크기를 `1280` × `800` 으로
맞춘 뒤, 기기 툴바 오른쪽의 `⋮` 에서 **Capture screenshot** 을 누릅니다.
