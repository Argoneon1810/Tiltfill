# Fill Zoom Chrome Web Store 정식 출시 조사 보고서

- 작성 시각: 2026-09-30 09:13
- 대상: Fill Zoom 1.5.0 (Manifest V3, `https://*.youtube.com/*` 전용)
- 함께 보는 문서: 코드리뷰 보고서 `docs/reports/2026-09-30_0913_release-code-review.md`

## 1. 조사 범위와 읽는 법

이 문서는 Chrome Web Store(이하 CWS)에 처음으로 확장을 정식 출시하는 개발자를 위해 썼다. 조사한 주제는 7가지다.

1. 개발자 계정 등록
2. 스토어 등록정보 자산(아이콘, 스크린샷, 타일, 설명)
3. 개인정보 보호 관행 탭과 사용자 데이터 정책
4. 프로그램 정책(상표, 단일 목적, 최소 권한, 난독화, 원격 코드)
5. 심사 절차와 반려 코드
6. MV3 기술 요건(패키징, 버전, 단축키, 서비스 워커, 콘텐츠 스크립트)
7. 출시 후 운영(업데이트, 롤백, API, 리뷰, 통계)과 YouTube 전용 확장의 위험

각 항목은 웹 조사 뒤에 팩트체크를 한 번 더 거쳤다. 확인 상태는 아래 표기를 쓴다.

| 표기 | 뜻 |
|---|---|
| **확인됨** | 공식 문서나 신뢰할 수 있는 출처로 확인했다 |
| **확인됨(보충)** | 확인했고, 팩트체크에서 내용을 보탰다 |
| **교정됨** | 팩트체크에서 틀렸거나 낡은 내용으로 판정되어 고쳐 썼다 |
| **미확인** | 공식 출처로 확인하지 못했다. 참고로만 쓴다 |
| **누락 보완** | 처음 조사에서 빠졌고 팩트체크가 추가했다 |

저장소 코드(`static/manifest.json`, `scripts/build.mjs`, `src/*.ts`)는 이 보고서를 쓰면서 직접 다시 읽었다. 코드에 관한 서술은 그 결과를 기준으로 한다.

---

## 2. 출시 절차 한눈에 보기

순서대로 모두 해야 하는 일이다. `[코드]` 표시는 저장소를 고쳐야 하는 일이고, 자세한 내용은 코드리뷰 보고서에 있다.

### 2.1 계정 등록
- [ ] 오래 쓸 전용 Gmail을 정한다. SSAFY 같은 조직 계정은 피한다. **계정 이메일은 나중에 바꿀 수 없다.**
- [ ] 그 Google 계정에 2단계 인증(2SV)을 켠다. 켜지 않으면 게시도 업데이트도 안 된다.
- [ ] 개발자 배포 계약과 프로그램 정책에 동의하고, 1회 등록비를 해외 결제가 되는 카드로 낸다(US$5로 알려져 있다. 결제 화면에서 금액을 확인한다).
- [ ] 연락처 이메일을 입력하고 인증 링크로 인증한다.
- [ ] 퍼블리셔 이름을 정한다. 본인 이름이나 중립적인 이름을 쓰고, "YouTube"가 들어간 이름은 쓰지 않는다.
- [ ] 거래자/비거래자(Trader/Non-Trader)를 신고한다. 무료이고 수익이 없는 개인 프로젝트면 보통 비거래자다.

### 2.2 자산 준비
- [ ] `[코드]` 아이콘 16/32/48/128 PNG를 만들어 manifest의 `icons`와 `action.default_icon`에 넣는다. **지금 manifest에는 `icons`가 없다.**
- [ ] 스토어 아이콘 128x128 PNG(그림 96x96 + 사방 16px 투명 여백)
- [ ] 스크린샷 1~5장, 정확히 1280x800 또는 640x400. 직접 만든 영상이나 CC 영상으로 찍는다.
- [ ] 소형 프로모션 타일 440x280(문서상 필수)
- [ ] (선택) 마키 타일 1400x560, 시연 동영상
- [ ] 개인정보처리방침 페이지를 공개 URL로 올린다(GitHub Pages 등). 필수 여부는 해석이 갈리지만 올리는 편이 안전하다.

### 2.3 패키징
- [ ] `[코드]` `npm run build`로 `dist/`를 만든 뒤, **`dist/` 안의 파일들**을 zip으로 묶는다. zip 루트에 `manifest.json`이 있어야 한다.
- [ ] 그 zip을 풀어 `chrome://extensions`에서 "압축해제된 확장 프로그램 로드"로 설치해 보고 동작을 확인한다.
- [ ] 이름, 설명, 아이콘을 확정한다. 제출한 뒤에는 대시보드에서 manifest 메타데이터를 고칠 수 없고, 버전을 올려 다시 올려야 한다.
- [ ] `grep -E "eval\(|new Function|https?://" dist/*.js`로 원격 코드나 eval이 섞이지 않았는지 확인한다.

### 2.4 등록정보 탭과 개인정보 탭 작성
- [ ] Store listing: 상세 설명, 카테고리 1개, 언어, 아이콘, 스크린샷, 소형 타일, (선택) 홈페이지와 지원 URL
- [ ] Privacy practices: 단일 목적, 권한별 사유(storage, host), 원격 코드 "아니오", 데이터 유형 체크(해당 없음), 인증 3개 체크, 개인정보처리방침 URL
- [ ] Distribution: 공개 범위(Public / Unlisted / Private), 게시 지역
- [ ] (선택) Test instructions: 심사자용 재현 절차

### 2.5 제출
- [ ] 출시 날짜를 맞추려면 "심사 후 자동 게시" 체크를 끄고 제출한다. 승인 뒤 30일 안에 직접 게시해야 한다.

### 2.6 심사
- [ ] 대부분 며칠, 길면 몇 주가 걸린다. 신규 개발자의 첫 확장이므로 1~3주를 잡는다. 3주가 넘으면 One Stop Support에 문의한다.
- [ ] 반려되면 메일의 위반 코드(예: Yellow Zinc, Purple Lithium)를 확인하고 고쳐서 다시 제출한다. 새 계정을 만들지 않는다.

### 2.7 게시
- [ ] 게시 뒤 스토어 페이지에서 설명, 이미지, 개인정보 섹션이 제대로 보이는지 확인한다.
- [ ] 실제로 스토어에서 설치해 YouTube에서 동작을 확인한다.

### 2.8 운영
- [ ] 업데이트할 때마다 `version`을 올린다(1.5.0 → 1.5.1).
- [ ] 대시보드 알림(리뷰 완료, 지원 요청)을 켜고 연락처 이메일을 자주 본다.
- [ ] YouTube 플레이어가 바뀌면 빨리 고쳐 배포한다. 기능이 깨진 채로 두면 정책 위반이 될 수 있다.
- [ ] 권한을 넓히지 않는다. 넓히면 기존 사용자의 확장이 꺼진다.
- [ ] (권장) 안정되면 Verified uploads를 켜고 개인키를 백업한다.

---

## 3. 반드시 알아야 할 것

1. **2단계 인증 없이는 게시도 업데이트도 안 된다.** 정책 원문: "2-Step Verification is required for all developer accounts prior to publishing an extension or updating an existing extension."
2. **계정 이메일은 바꿀 수 없고, 삭제한 계정의 이메일은 다시 쓸 수 없다.** 계정 삭제도 되돌릴 수 없다.
3. **설명, 아이콘, 스크린샷 중 하나라도 없으면 반려된다(Yellow Zinc).** 지금 저장소에는 아이콘이 하나도 없다. 가장 확실한 반려 사유다.
4. **YouTube는 Google의 상표다.** 확장 이름, 로고, 아이콘에 허가 없이 쓰면 안 된다. 빨간 재생 버튼을 닮은 아이콘도 안 된다. 2023년에 YouTube 상표 문제로 삭제된 확장("YouTube Tweaks")이 1년 넘게 이의를 제기했지만 복구되지 않은 사례가 있다. 이름은 지금처럼 YouTube 없이 두는 편이 가장 안전하다(4.4절의 출처 충돌 참고).
5. **"Fill Zoom"은 기존 확장 "Zoom to Fill - Ultrawide Video"(사용자 20만 명), "Zoom To Fill"(사용자 약 2천 명)과 이름이 매우 비슷하다.** 사칭·지식재산 정책은 혼동을 일으키는 이름을 금지한다. 출시 전에 이름을 다시 검토한다.
6. **단일 목적 정책**: 기능은 좁고 이해하기 쉬운 하나의 목적이어야 한다. 광고 차단, 다운로드 같은 무관한 기능을 붙이면 Red Magnesium 계열로 반려된다.
7. **개인정보 탭은 실제 동작과 일치해야 한다.** 어긋나면 삭제될 수 있다. 로컬에서만 처리해도 사용자 데이터를 "handle"하면 공개 의무가 생긴다는 점에 주의한다. 이 확장은 영상 프레임을 캔버스로 읽는다.
8. **난독화는 금지(Red Titanium), minify는 허용.** 원격 JS/WASM 실행과 eval은 금지(Blue Argon).
9. **키워드 스팸 금지(Yellow Argon).** 같은 키워드를 5번 넘게 부자연스럽게 반복하거나, 지원하지 않는 사이트나 브랜드를 나열하거나, 출처 없는 후기를 넣으면 안 된다.
10. **심각하거나 반복된 위반은 계정 정지로 이어진다.** 제재를 피하려고 새 계정을 만들면 연관 계정까지 즉시 해지될 수 있다. 이의 제기는 위반 1건당 1회다.
11. **출시 후 권한을 넓히면 기존 사용자의 확장이 자동으로 꺼진다.** 사용자가 승인해야 다시 켜진다.
12. **게시한 확장은 삭제할 수 없고 게시 중단(unpublish)만 할 수 있다.** 테스트 목적의 공개 게시는 하지 않는다.

---

## 4. 주제별 상세

### 4.1 개발자 계정 등록

#### 4.1.1 등록비는 1회, 금액은 US$5로 알려져 있다 — 확인됨(보충)
- 내용: 공식 등록 페이지(최종 갱신 2024-02-13)에는 "one-time registration fee"라고만 적혀 있고 금액은 없다. US$5는 2010년 TechCrunch, 2020년 9to5Google, 2026년 2차 출처에서 일관되게 확인된다. 한 번 내면 확장을 여러 개 올릴 수 있고 연회비는 없다.
- **출처 충돌**: 프로그램 정책 조사의 누락 보완 항목은 "5달러"를 공식 등록 페이지 출처로 적었지만, 다른 두 팩트체크는 공식 페이지에 금액이 없다고 확인했다. 이 보고서는 "공식 문서에는 금액 없음, 2차 출처로 US$5"를 따른다.
- 환불 불가는 2차 출처에만 있고 공식 문서에는 언급이 없다.
- 이 확장에 할 일: 해외 결제가 되는 카드를 준비하고 결제 화면의 금액을 확인한다.
- 출처: https://developer.chrome.com/docs/webstore/register , https://techcrunch.com/2010/08/19/chrome-fee/amp/ , https://9to5google.com/2020/03/12/chrome-web-store-fee/ , https://www.extensionradar.com/blog/chrome-web-store-developer-fee-2026

#### 4.1.2 게시와 업데이트 전에 2단계 인증 필수 — 확인됨
- 내용: 모든 개발자 계정에 필수다.
- 할 일: myaccount.google.com > 보안 > 2단계 인증을 켠다. OTP 앱이나 패스키를 쓰고 백업 코드를 따로 보관한다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/two-step-verification , https://developer.chrome.com/blog/policy-update-2sv

#### 4.1.3 거래자/비거래자 신고 — 교정됨
- 내용: 모든 개발자가 신고해야 한다. 거래자는 "자신의 영업·사업·직업 목적으로 활동하는 자연인 또는 법인"이다. 거래자는 법적 이름, 주소, SMS 인증 전화번호, 이메일을 내고, 이 정보가 목록 페이지 하단에 공개된다. 경우에 따라 신분 증빙을 요구받는다. Google은 개별 판정을 해 주지 않는다.
- **교정**: 처음 조사는 "2024-02-17부터 모든 개발자 신고 의무"라고 적었다. 실제로 공시 요건 자체는 2022-05-28(New Deal for Consumers)부터 시행되었고, 2024-02-17은 EU DSA에 따라 거래자 정보의 확인·검증이 시작된 날이다.
- 할 일: Fill Zoom은 무료이고 결제·광고·구독이 없으므로 보통 비거래자가 맞다. 이 경우 EU 사용자에게 소비자보호법상 권리가 적용되지 않는다는 표시가 붙는다. 후원, 유료 기능, 회사 명의 배포를 하게 되면 다시 신고해야 할 수 있다.
- **누락 보완**: 거래자 신고 시 주소가 공개되므로 공개돼도 되는 주소를 쓰라고 공식 문서가 권고한다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure , https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq

#### 4.1.4 연락처 이메일 인증, 계정 이메일 변경 불가 — 확인됨(보충)
- 내용: 연락처 이메일은 인증해야 하고 나중에 바꿀 수 있다. 계정을 만들 때 쓴 이메일은 바꿀 수 없어서, 바꾸려면 새 계정을 만들고 항목을 이전해야 한다. 공식 문서는 게시 전용 새 이메일을 권한다.
- **누락 보완**: 삭제한 개발자 계정의 이메일로는 새 계정을 다시 등록할 수 없다. 등록할 때 개발자 배포 계약과 프로그램 정책에 동의해야 한다.
- 할 일: 정책 경고와 심사 결과가 이 주소로 오므로 자주 보는 전용 Gmail을 쓴다.
- 출처: https://developer.chrome.com/docs/webstore/register , https://developer.chrome.com/docs/webstore/set-up-account

#### 4.1.5 퍼블리셔 이름과 주소 — 확인됨
- 내용: 퍼블리셔 이름은 확장 제목 아래에 공개된다. 실제 주소는 구매나 구독 기능이 있을 때만 필수다.
- **누락 보완**: 인증된 퍼블리셔(verified publisher)는 퍼블리셔 이름 대신 공식 웹사이트 URL을 표시할 수 있다(선택, Search Console 도메인 인증 필요).
- 할 일: 본인 이름이나 중립적인 브랜드명을 쓴다. Fill Zoom은 주소를 넣지 않아도 된다.
- 출처: https://developer.chrome.com/docs/webstore/set-up-account , https://developer.chrome.com/docs/webstore/program-policies/policies

#### 4.1.6 퍼블리셔 구조와 생성 한도 — 확인됨(일부 미확인)
- 내용: 개인/그룹 퍼블리셔 구분은 없어졌다. Admin은 어떤 퍼블리셔에든 Viewer, Item Manager, Editor, Admin 역할로 구성원을 초대할 수 있다(문서 2026-04-15 갱신). "계정 수명 동안 퍼블리셔는 하나만 추가 생성 가능하고 삭제해도 한도는 복구되지 않는다"는 규정이 있다.
- **미확인**: "기본 퍼블리셔 외에 하나 더, 최대 2개"라는 해석은 공식 근거가 없다.
- 할 일: 기본 퍼블리셔를 그대로 쓰고, 퍼블리셔를 함부로 만들거나 지우지 않는다. 계정을 잃을 때를 대비해 믿을 수 있는 백업 Admin을 두는 방안을 검토한다.
- 출처: https://developer.chrome.com/docs/webstore/share-ownership

#### 4.1.7 한국에서 등록할 때의 결제 문제 — 미확인
- 내용: 대한민국(South Korea)은 공식 지원 국가 목록에 있다. 2023년 개인 블로그 한 건에 결제 화면에서 국가가 없거나 우편번호 오류가 났다는 사례가 있다. 2026년에도 재현되는지는 확인하지 못했다.
- 할 일: pay.google.com의 결제 프로필 국가를 대한민국으로 맞추고 시도한다. 청구 정보를 사실과 다르게 입력해 우회하는 방법은 권하지 않는다. 계속 실패하면 CWS 지원에 문의한다.
- 출처: https://developer.chrome.com/docs/webstore/register , https://velog.io/@ino5/Chrome-%EC%9B%B9-%EC%8A%A4%ED%86%A0%EC%96%B4-%EA%B0%9C%EB%B0%9C%EC%9E%90-%EB%93%B1%EB%A1%9D-%EC%88%98%EC%88%98%EB%A3%8C-%EA%B2%B0%EC%A0%9C-%EC%84%A4%EC%A0%95-%EC%98%A4%EB%A5%98%EA%B5%AD%EA%B0%80-%EC%9A%B0%ED%8E%B8%EB%B2%88%ED%98%B8

#### 4.1.8 계정 정지와 제재 우회 — 확인됨
- 내용: 심각하거나 반복된 위반은 계정 정지로 이어진다. 제재 우회는 "immediate termination of your developer account, and possibly related developer accounts"로 처리된다. 기능이 같은 확장을 여러 개 올리는 것도 스팸으로 금지된다.
- **누락 보완**: 이의 제기는 위반 1건당 1회이고, 남용하면 이후 이의 제기 권리를 잃을 수 있다.
- 할 일: YouTube 공식 제휴로 오해될 표현을 쓰지 않는다. 테스트용 중복 확장을 공개하지 않는다. 반려되면 고쳐서 다시 낸다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/policies

#### 4.1.9 계정 삭제 — 확인됨(보충)
- 내용: 계정 삭제는 영구적이다. 퍼블리셔의 마지막 Admin은 소유권을 공유하거나 퍼블리셔를 먼저 지워야 계정을 삭제할 수 있다. 게시된 항목이 있는 퍼블리셔는 항목을 먼저 게시 중단해야 삭제할 수 있다. 등록비 환불은 공식 문서에 언급이 없다.
- 출처: https://developer.chrome.com/docs/webstore/account-deletion

#### 4.1.10 Verified uploads — 확인됨(권장)
- 내용: 2025-05-07에 나온 선택 기능이다. 대시보드 Package 탭에 RSA 공개키를 등록하면 그 개인키로 서명한 업로드만 받는다. 확장 ID는 유지된다. 개인키를 잃으면 지원팀을 통해 교체해야 하고 최대 1주일이 걸리며, 그동안 업데이트가 막힌다.
- 할 일: 첫 출시가 안정되면 켜고, 개인키를 두 곳 이상에 백업한다.
- 출처: https://developer.chrome.com/blog/verified-uploads-cws , https://developer.chrome.com/docs/webstore/update

---

### 4.2 스토어 등록정보 자산

#### 4.2.1 필수 자산과 반려 조건 — 확인됨
- 내용: 설명 칸이 비었거나 아이콘 또는 스크린샷이 없으면 반려된다. 제목, 카테고리, 개발자 이름, 프로모션 이미지가 오해를 부르거나 낡은 내용이어도 위반이다.
- 할 일: 설명에 적은 기능(상하 채움, 좌우 채움, 꽉 채움, 여백 감지, 회전, 단축키)이 1.5.0의 실제 기능과 일치하는지 점검한다. BACKLOG.md에만 있는 기능은 빼야 한다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/listing-requirements

#### 4.2.2 이미지 규격 요약 — 확인됨(보충)

| 자산 | 규격 | 필수 여부 | 비고 |
|---|---|---|---|
| 스토어 아이콘 | 128x128 PNG | 필수 | 그림 96x96 + 사방 16px 투명 여백. 밝은/어두운 배경 모두에서 보이게. 테두리와 큰 그림자 금지 |
| manifest 아이콘 | 16/32/48/128 PNG | 128 필수, 48 강력 권장, 16 선택 | PNG 권장. BMP/GIF/ICO/JPEG 허용, WebP/SVG 불가 |
| 스크린샷 | 1280x800(권장) 또는 640x400 | 최소 1장, 최대 5장 | 모서리 각지게, 여백 없이(full bleed). 다른 해상도는 업로드 거부 |
| 소형 프로모션 타일 | 440x280 | 문서상 필수 | 없으면 목록에서 뒤로 밀림. 로케일별로 따로 못 만듦 |
| 마키 타일 | 1400x560 | 선택 | 추천 캐러셀 노출용 |
| 시연 동영상 | YouTube 링크 | 사실상 선택(아래 참고) | 로케일별 업로드 가능 |

- **누락 보완**: 스토어 아이콘에 알파 채널이 없으면 스토어가 둥근 모서리 프레임 안에 넣어 표시하므로 투명 배경 PNG로 저장한다.
- **교정(부분)**: 소형 타일의 "PNG 또는 JPEG" 형식은 images 문서에 명시되어 있지 않다. "알파 채널이 있으면 거부된다"는 말은 커뮤니티 보고일 뿐이다(미확인). 안전하게 24비트로 평탄화해 저장하는 정도로만 참고한다.
- **출처 충돌**: cws-dashboard-listing 문서는 YouTube 동영상 링크를 필수 목록에 넣었지만, 프로그램 정책은 설명, 아이콘, 스크린샷이 없을 때만 반려한다고 적는다. 실제로는 선택으로 운영되는 것으로 보인다(신뢰도 낮음). 30~60초짜리 적용 전후 영상을 만들어 두면 안전하다.
- 할 일: 아이콘은 "화면을 채우는 화살표/프레임" 같은 독자 기호로 만들고 YouTube 재생 버튼 모양(빨간 둥근 사각형 + 삼각형)은 쓰지 않는다. 스크린샷 후보는 다음과 같다.
  1. 레터박스가 있는 원본과 채운 뒤의 비교
  2. 재생기 안 버튼과 페이지 패널
  3. 확장 팝업
  4. 여백 감지와 미리보기
  5. 단축키 안내
- 출처: https://developer.chrome.com/docs/webstore/images , https://developer.chrome.com/docs/webstore/cws-dashboard-listing , https://developer.chrome.com/docs/webstore/best-listing , https://developer.chrome.com/docs/extensions/reference/manifest/icons

#### 4.2.3 요약(summary)과 이름 글자 수 — 확인됨
- 내용: 스토어 요약은 manifest `description`에서 가져오며 최대 132자다. 스토어 제목은 manifest `name`에서 가져오며 최대 75자다. `short_name`은 12자 이하가 권장된다(누락 보완).
- **수치 정정**: 조사 결과마다 현재 설명 길이를 "약 50자", "약 60자"로 다르게 적었다. 저장소에서 직접 세어 보니 **55자**다. 어느 쪽이든 132자 안이다.
- 할 일: 요약은 일반 텍스트로 쓰고 최상급 표현이나 경쟁 제품 언급을 피한다. 5.4절의 초안을 참고한다.
- 출처: https://developer.chrome.com/docs/extensions/reference/manifest/description , https://developer.chrome.com/docs/extensions/reference/manifest/name , https://developer.chrome.com/docs/webstore/prepare

#### 4.2.4 상세 설명 작성법과 키워드 스팸 — 확인됨
- 내용: 무엇을 하는지 한 문장으로 시작하고 기능 목록을 쓴다. 같은 키워드의 부자연스러운 5회 초과 반복, 사이트·브랜드·지역 나열, 출처 없는 후기는 금지된다.
- 할 일: "Netflix, Twitch…" 같은 미지원 사이트를 나열하지 않는다. "ultrawide, 21:9, crop…" 같은 태그 목록을 넣지 않는다. 권한을 쓰는 이유와 데이터를 수집하지 않는다는 점을 적어 개인정보 탭과 맞춘다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/listing-requirements , https://developer.chrome.com/docs/webstore/best-listing

#### 4.2.5 카테고리 — 미확인
- 내용: 카테고리 1개와 언어는 필수다(확인됨). "Productivity > Tools", "Lifestyle > Entertainment" 같은 2단계 구조와 구체적인 이름은 공식 문서로 확인하지 못했다.
- 할 일: 대시보드 드롭다운에서 직접 확인하고 기능을 가장 정확히 나타내는 것을 고른다. 잘못 고르는 것도 메타데이터 위반이다.
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-listing

#### 4.2.6 현지화(_locales) — 확인됨(권장)
- 내용: 등록정보 언어는 `_locales`를 기준으로 한다. 여러 언어를 지원하려면 `default_locale`이 필요하고, `_locales`가 없으면 `default_locale`도 없어야 한다.
- 할 일: 지금은 `_locales`가 없으니 대시보드에서 기본 언어를 한국어로 등록하면 된다. 영어권까지 노린다면 `_locales/ko`, `_locales/en`을 만들고 `name`, `description`을 `__MSG_appName__`, `__MSG_appDesc__`로 바꾼다. Featured 배지를 노리려면 영어 지원이 필수다(4.7.8).
- 출처: https://developer.chrome.com/docs/extensions/reference/manifest/default-locale , https://developer.chrome.com/docs/extensions/develop/ui/i18n

#### 4.2.7 추가 필드 — 확인됨
- 내용: 홈페이지 URL, 지원 URL, 공식 URL, 성인 콘텐츠 선언은 선택 항목이다.
- 할 일: GitHub 저장소나 GitHub Pages를 홈페이지로, GitHub Issues를 지원 URL로 등록한다. 성인 콘텐츠는 "아니오"로 선언한다. 개인정보처리방침 URL은 이와 별개로 Privacy 탭에 넣는다.
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-listing

#### 4.2.8 이미지 일관성과 과장 금지 — 확인됨
- 내용: 아이콘, 타일, 스크린샷의 색과 기호를 맞추고, 실제 동작을 그대로 보여 준다. "Editor's Choice", "No.1"처럼 스토어 지위를 과장하는 문구는 금지된다.
- 출처: https://developer.chrome.com/docs/webstore/best-listing , https://developer.chrome.com/docs/webstore/program-policies/listing-requirements

---

### 4.3 개인정보 보호 관행 탭과 사용자 데이터

#### 4.3.1 Privacy practices 탭은 필수 — 확인됨
- 내용: 단일 목적, 권한별 사유, 원격 코드 여부, 데이터 사용 체크박스와 인증, 개인정보처리방침 URL을 채워야 게시하거나 업데이트할 수 있다. 공개한 내용은 스토어 페이지의 개인정보 섹션에 그대로 표시된다(누락 보완).
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy , https://9to5google.com/2020/11/18/chrome-web-store-disclosure/

#### 4.3.2 단일 목적 — 확인됨(보충)
- 내용: "an extension must have a single purpose that is narrow and easy to understand." 단일 목적 위반 코드는 Red Magnesium, Red Copper, Red Lithium, Red Argon이다. Red Nickel, Red Potassium, Red Silicon은 기만·사칭 계열이므로 구분한다.
- 할 일: 5.1절 초안을 쓴다. 코드를 보면 채움 외에 **회전(0/90/180/270도)**과 **보이는 영역 이동(panX/panY)** 기능도 있다. 이 둘도 "영상 표시 방식 조정"이라는 한 목적 안에 있다고 서술해야 설명과 기능이 어긋나지 않는다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/policies , https://developer.chrome.com/docs/webstore/troubleshooting

#### 4.3.3 권한별 사유 — 확인됨(보충)
- 내용: manifest의 권한마다 사유를 적는다. Purple Potassium의 공식 의미는 "과도한 권한 요청"이다. 쓰지 않는 권한뿐 아니라 목적에 비해 넓은 권한도 포함된다.
- 코드 확인 결과: `storage`는 `core.ts`, `ui.ts`, `popup.ts`에서 `chrome.storage.local`로 실제로 쓴다. `tabs.query`와 `tabs.sendMessage`는 `tabs` 권한 없이 동작하고 탭 URL을 읽지 않으므로 `tabs`를 추가하지 않는다. `commands`는 권한이 아니라서 사유 칸이 없다.
- 할 일: 5.2절 초안을 쓴다.
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy , https://developer.chrome.com/docs/webstore/troubleshooting

#### 4.3.4 host 권한 범위 — 교정됨
- 내용: `*://*/*`, `<all_urls>` 같은 광범위 host 권한은 심층 심사 대상이다. Fill Zoom은 `https://*.youtube.com/*` 하나라서 이미 좁다.
- **교정**: 처음 조사는 "`host_permissions`를 빼면 설치 경고와 심사 부담이 줄어든다"고 적었다. 실제로는 `content_scripts.matches`도 같은 호스트 접근 경고를 띄우므로 **빼도 설치 경고는 줄지 않는다.** 코드에 `host_permissions`에만 의존하는 API(탭 URL 읽기, `scripting.executeScript`)가 없으므로 중복이라서 빼는 것은 가능하다. 다만 4.6.8의 재주입을 택하면 host 권한이 필요하다.
- 할 일: `*.youtube.com`은 music.youtube.com, studio.youtube.com까지 포함한다. 실제 지원 대상이 www와 m뿐이라면 `https://www.youtube.com/*`, `https://m.youtube.com/*`로 좁히는 것을 검토한다. 좁히려면 **첫 출시 전에** 정한다. 출시 뒤에 범위를 넓히면 기존 사용자의 확장이 꺼진다.
- 출처: https://developer.chrome.com/docs/webstore/review-process , https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions , https://developer.chrome.com/docs/webstore/program-policies/permissions

#### 4.3.5 원격 코드 — 확인됨(보충)
- 내용: 원격 코드는 패키지 밖에서 불러와 실행하는 JS나 WASM이다. JSON, CSS 같은 데이터는 해당하지 않는다. eval과 외부 script 태그도 Blue Argon 위반이다. 난독화는 Red Titanium이고, minify는 허용된다.
- 코드 확인 결과: `src/`에 `fetch`, XHR, `eval`, `new Function`, 외부 URL이 없다. `ui.ts`의 `innerHTML = ICON`은 번들에 들어 있는 상수 SVG라서 원격 코드가 아니다. `build.mjs`는 bundle만 하고 minify는 하지 않는다.
- 할 일: 대시보드에서 "No, I am not using remote code"를 고른다. 난독화 도구를 쓰지 않는다.
- 출처: https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code , https://developer.chrome.com/docs/webstore/review-process , https://developer.chrome.com/docs/webstore/program-policies/code-readability

#### 4.3.6 데이터 유형 9개와 인증 3개 — 확인됨(보충)
- 내용: 데이터 유형은 개인 식별 정보, 건강 정보, 금융·결제 정보, 인증 정보, 개인 커뮤니케이션, 위치, 웹 기록, 사용자 활동, 웹사이트 콘텐츠의 9개다. 공식 문서는 이름을 스크린샷으로만 보여 주고, 9to5Google 보도와 대시보드 화면으로 확인된다. 인증 원문은 다음 3개다.
  - "I do not sell or transfer user data to third parties, outside of the approved use cases"
  - "I do not use or transfer user data for purposes that are unrelated to my item's single purpose"
  - "I do not use or transfer user data to determine creditworthiness or for lending purposes"
- 할 일: 인증 3개는 모두 사실이므로 체크한다. 데이터 유형은 5.3절을 따른다.
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy , https://9to5google.com/2020/11/18/chrome-web-store-disclosure/

#### 4.3.7 로컬 처리도 "handle"에 해당할 수 있다 — 확인됨(보충)
- 내용: User Data FAQ 원문은 "Extensions are required to disclose how they handle user data, even when data is processed or stored locally on a user's device and is not transmitted to external servers or third parties."이다. "handle"의 정의는 "collecting, transmitting, using, or sharing user data"이고, 예시로 "Clipping or scraping content from a website that the user visits, such as taking screenshots or capturing data from a web page"를 든다.
- 코드 확인 결과: `core.ts`는 영상 프레임을 캔버스에 그려 `getImageData`로 여백을 감지하고, `toDataURL("image/jpeg", 0.6)`로 만든 이미지를 `tabs.sendMessage` 응답으로 팝업 미리보기에 넘긴다. 이 이미지는 확장 안에서만 오가고 저장되지 않으며 외부로 나가지 않는다. 그래도 심사자가 "웹페이지 콘텐츠 캡처"로 볼 여지가 있다.
- 할 일: 설명, 권한 사유, 개인정보처리방침에 "영상 프레임은 여백 감지와 미리보기를 위해 브라우저 안에서만 일시적으로 분석되며 저장·전송되지 않는다"고 명시한다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq

#### 4.3.8 개인정보처리방침 URL — 확인됨(출처 간 해석 차이)
- 내용: 정책은 "user data를 handle하면 방침을 게시하라"는 조건부다. FAQ Q5는 handle하지 않으면 "no special or new obligations"라고 한다. 제3자 가이드(2026-04)는 대시보드가 데이터 유형을 체크했을 때만 방침 URL을 강제한다고 하고, 다른 가이드는 수집이 없어도 두라고 권한다.
- **출처 충돌**: 프로그램 정책 조사는 "Fill Zoom처럼 수집하지 않으면 필수는 아니다", 개인정보 조사는 "프레임 처리가 handle로 해석될 수 있으니 두는 편이 안전하다"로 결론이 다르다. 대시보드가 이 칸을 강제하는지는 확인하지 못했다(미확인). 이 보고서는 **방침 페이지를 두는 쪽**을 권한다. 흔한 반려 사유인 Purple Lithium을 미리 막을 수 있다.
- **누락 보완**: 방침 URL은 공개 접근이 가능해야 한다. 링크가 깨지거나 로그인해야 보이면 Purple Lithium("missing or inaccessible")이다. GitHub에 올렸다면 저장소가 public인지 확인한다.
- 할 일: GitHub Pages나 public 저장소의 `PRIVACY.md`에 다음을 담는다: 수집하지 않음, `chrome.storage.local`에 설정만 저장, 외부 전송·제3자 공유·광고·분석 없음, 영상 프레임은 로컬에서 일시 분석, 연락처, Limited Use 준수 문구.
- 참고: 방침 번호 "Q14" 인용은 재확인하지 못했다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq , https://developer.chrome.com/docs/webstore/program-policies/privacy , https://developer.chrome.com/docs/webstore/troubleshooting , https://ultrafastutilities.com/chrome-web-store-privacy-policy-requirements

#### 4.3.9 방침과 공개 내용의 일치 — 확인됨
- 내용: 방침은 수집·사용·공유 방식과 공유 대상을 모두 밝혀야 하고, 대시보드 공개 내용과 일치해야 한다. 등록 요건은 개인정보 필드가 실제 동작이나 방침과 어긋나면 삭제될 수 있다고 한다.
- 할 일: 방침에 "수집 없음"이라고 쓰면 데이터 유형 체크박스도 모두 비운다. 나중에 분석, 오류 보고, 원격 설정을 넣으면 방침, 체크박스, 설치 전 고지를 함께 고친다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/privacy , https://developer.chrome.com/docs/webstore/program-policies/listing-requirements

#### 4.3.10 Limited Use — 교정됨
- 내용: 데이터는 단일 목적을 제공하거나 개선하는 데만 쓸 수 있다. 맞춤 광고는 금지다. 제3자 이전은 단일 목적 제공, 법 준수, 악성코드·사기 방지, 인수합병 때만 허용된다.
- **교정**: 인수합병 때의 이전은 사용자의 명시적 사전 동의를 받은 뒤에만 허용된다. 사람의 데이터 열람은 완전 금지가 아니다. 명시적 동의, 집계·익명화된 내부 운영, 보안·남용 조사, 법적 요구가 있으면 예외다. Limited Use 준수 공개 문구는 대시보드 체크로 끝나지 않고 확장에 속한 웹사이트(방침 페이지 등)에도 게시해야 한다(누락 보완).
- 할 일: 방침에 "The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements." 문구를 넣어 둔다. 무해하다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/limited-use

#### 4.3.11 수집 시 고지와 동의 — 확인됨
- 내용: 데이터를 다루면 눈에 띄게 고지하고(prominently disclose) 명시적 동의(affirmative and informed consent)를 받아야 한다(Purple Nickel). 데이터를 다루면 HTTPS 같은 최신 암호화로 안전하게 처리해야 한다(Purple Copper, 누락 보완).
- 할 일: 지금은 해당 없다. 사용 통계나 오류 전송을 넣게 되면 수집 전에 동의 UI를 보인다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/policies , https://developer.chrome.com/docs/webstore/program-policies/user-data-faq

---

### 4.4 프로그램 정책: 상표와 사칭

#### 4.4.1 Chrome Web Store 브랜딩 가이드 — 확인됨
- 내용: Google 상표(YouTube 포함)를 서면 허가 없이 확장 이름, 회사명, 로고로 쓰면 안 된다. 호환 대상을 밝힐 때는 "for", "for use with", "compatible with" 뒤에 ™를 붙인다(가이드 예시는 "for Google Chrome™"). 상표를 제목이나 설명에 쓰면 귀속 문구(예: "YouTube is a trademark of Google LLC.")를 넣는다. 변형하지 않은 Google 서비스 스크린샷은 기능 설명 용도로 쓸 수 있다(누락 보완).
- 출처: https://developer.chrome.com/docs/webstore/branding

#### 4.4.2 이름에 "for YouTube"를 붙여도 되는가 — 교정됨, 출처 충돌 있음
- **교정**: 처음 조사는 YouTube 브랜드 가이드가 "for YouTube" 형태의 이름을 허용한다고 적었다. 팩트체크 결과는 다르다. YouTube API 브랜딩 가이드 원문은 "You must never use the YouTube name or any abbreviation, acronym, or variant of the word YouTube, such as YT or You-Tube in conjunction with the overall name of your application."이다. 허용되는 예외는 "great app for YouTube"처럼 설명 문장 안에서 호환 대상을 밝히는 경우뿐이다.
- **출처 충돌**: Chrome 브랜딩 가이드는 "for YouTube™" 형태를 허용하는 것으로 읽히지만, YouTube API 브랜딩 가이드는 앱 이름에 YouTube를 쓰는 것을 금지한다. 다만 YouTube API 가이드는 YouTube API를 쓰는 클라이언트용이고, Fill Zoom은 API를 쓰지 않으므로 직접 적용되는지 불확실하다. 같은 카테고리의 "Aspect Ratio Changer for YouTube™"는 "for YouTube™" 이름에 귀속·비제휴 문구를 붙여 게시되어 있다.
- 할 일: **이름에는 YouTube를 넣지 않는다.** "YouTube Fill Zoom", "YT Zoom"처럼 앞에 붙이는 형태는 어느 가이드로도 안 된다. 설명 본문에서 "works with YouTube™"처럼 서술하고, 끝에 다음 귀속·면책 문구를 넣는다.
  > YouTube is a trademark of Google LLC. This extension is an independent project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube.
- 출처: https://developers.google.com/youtube/terms/branding-guidelines , https://developer.chrome.com/docs/webstore/branding , https://chromewebstore.google.com/detail/aspect-ratio-changer-for/iliinafimaknnhelpmjaochndmjlolla

#### 4.4.3 로고와 아이콘 — 확인됨
- 내용: Google 상표나 그 변형을 확장 로고로 쓰면 안 된다.
- 할 일: 빨간 둥근 사각형 안의 흰 삼각형처럼 YouTube를 연상시키는 아이콘을 피한다. 스크린샷에 YouTube 화면이 보이는 것은 기능 설명 용도라 괜찮지만, 로고를 강조하거나 공식 제품처럼 꾸미지 않는다.
- 출처: https://developer.chrome.com/docs/webstore/branding , https://developers.google.com/youtube/terms/branding-guidelines

#### 4.4.4 실제 삭제 사례 — 확인됨
- 내용: "YouTube Tweaks"는 2023년 9월 Google 상표팀 요청으로 미국 스토어에서 내려갔고, 1년 넘게 이의를 제기했지만 복구되지 않았다. 새 항목으로 다시 올리라는 안내만 받았다. Chrome DevRel(Oliver Dunk)은 서드파티 확장이 대부분 "Something for Product Name" 형식을 쓴다고 언급했다.
- 의미: 출시 뒤에 이름 때문에 삭제되면 사용자와 리뷰를 모두 잃는다. 처음부터 안전한 이름으로 등록한다.
- 출처: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/-x2d1RfMmOI

#### 4.4.5 공식 제휴·보증 암시 금지 — 확인됨
- 내용: "don't represent that your product is authorized by, endorsed by, or produced by another company."
- 할 일: 설명, 스크린샷, 팝업에 "YouTube 공식", "YouTube 제공" 같은 표현을 쓰지 않는다. 재생기에 넣는 버튼은 YouTube 버튼처럼 보여도 되지만, 툴팁이나 라벨에 "Fill Zoom"을 밝히는 편이 안전하다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property

#### 4.4.6 기존 확장과의 이름 혼동 — 확인됨(보충)
- 내용: "Zoom to Fill - Ultrawide Video"는 사용자 20만 명, 평점 3.8(691개), 버전 3.0.9, 2026-09-24 업데이트다. "Zoom To Fill"은 사용자 약 2천 명, 평점 3.3(13개), 2026-04-16 업데이트다. zoomtofill.com 도메인이 어느 확장의 것인지는 확인하지 못했다. 저장소 폴더명도 `zoom_to_fill`이다.
- 할 일: 스토어에서 "Fill Zoom", "Zoom Fill"을 검색해 본다. 가능하면 구별되는 고유 이름으로 바꾼다(예: "LetterFit", "BarCrop". 쓰기 전에 중복을 검색한다). 이름을 유지한다면 최소한 아이콘과 설명을 확실히 다르게 만든다. 설명에 경쟁 제품명을 나열하지 않는다.
- 출처: https://chromewebstore.google.com/detail/zoom-to-fill-ultrawide-vi/adpjimagbfpknkodpofjphpbdlfkeiho , https://chromewebstore.google.com/detail/zoom-to-fill/gjdbakmcldoaklnobplcbcillcbbcjmm , https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property

#### 4.4.7 지식재산권과 스크린샷 저작권 — 확인됨(권장)
- 내용: 타인의 상표, 저작권, 특허를 침해하면 안 되며 저작권 침해는 DMCA 신고로 처리된다.
- 할 일: 스크린샷에 타인의 영상 프레임이나 썸네일이 들어가지 않도록 직접 만든 영상이나 CC 라이선스 영상을 쓴다(공식 근거가 아닌 권고). 오픈소스 라이브러리를 쓰면 라이선스 고지를 넣는다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property , https://support.google.com/chrome_webstore/answer/7508032?hl=en

---

### 4.5 심사 절차

#### 4.5.1 심사 기간 — 확인됨
- 내용: 대부분 며칠 안에 끝나지만 몇 주가 걸릴 수 있고, 3주가 넘으면 지원팀에 문의하라고 안내한다. "24시간 이내 몇 %" 같은 공식 수치는 없다.
- 출처: https://developer.chrome.com/docs/webstore/review-process

#### 4.5.2 더 자세히 심사하는 경우 — 확인됨(보충)
- 내용: 신규 개발자, 신규 확장, 위험한 권한 요청, 큰 코드 변경, 광범위한 host 권한, 민감한 실행 권한, 많은 코드량이다. Fill Zoom은 앞의 둘에 해당한다.
- 대시보드의 "Due to the Host Permission, your extension may require an in-depth review" 경고 문구는 공식 문서가 아니라 제3자 블로그 출처다.
- 출처: https://developer.chrome.com/docs/webstore/review-process , https://extensionbooster.net/blog/chrome-extension-host-permission-in-depth-review-warning-fix-guide/

#### 4.5.3 이 확장과 관련 있는 반려 코드 — 확인됨(교정 포함)

| 코드 | 뜻 | Fill Zoom 위험 | 대응 |
|---|---|---|---|
| Yellow Zinc | 메타데이터 누락·부족 | **높음**(아이콘 없음) | 아이콘, 스크린샷, 설명, 소형 타일 준비 |
| Purple Lithium | 개인정보처리방침 없음 또는 접근 불가 | 중간 | 공개 방침 URL 등록 |
| Yellow Argon | 키워드 스팸 | 낮음 | 키워드 반복·나열 금지 |
| Yellow Magnesium | 기능 미작동 | 중간 | zip으로 직접 설치 테스트, 테스트 안내 작성 |
| Purple Potassium | 과도한 권한 | 낮음 | 권한 추가 금지, 사유 작성 |
| Purple Magnesium | 불필요한 브라우징 활동 수집, 사용자 데이터 공개 노출 | 낮음 | 수집 기능 추가 금지 |
| Purple Nickel / Copper | 고지·동의 부족 / 비보안 전송 | 해당 없음 | 수집 시 적용 |
| Blue Argon | MV3 원격 코드 | 낮음 | eval·CDN 금지 유지 |
| Red Titanium | 난독화 | 낮음 | minify만 허용 |
| Red Magnesium, Copper, Lithium, Argon | 단일 목적 위반 | 낮음 | 무관한 기능 추가 금지 |
| Red Nickel / Potassium / Silicon | 메타데이터와 다른 기만적 기능 / 설명과 다른 기능 / 공개하지 않은 동작 | 낮음 | 설명과 기능 일치 |
| Red Zinc | 기만적 설치 | 해당 없음 | — |

- **교정**: Purple Lithium은 방침이 "접근할 수 없는" 경우(깨진 링크)까지 포함한다. Purple Magnesium은 사용자 데이터의 공개 노출도 포함한다. Red 계열에는 단일 목적 위반 외에 기만·사칭, 기만적 설치, 난독화가 있다. 상표 사칭은 이 코드들보다 정책의 impersonation/IP 조항에 해당한다. Troubleshooting 문서 최종 갱신일은 2026-07-20이다.
- 출처: https://developer.chrome.com/docs/webstore/troubleshooting

#### 4.5.4 반려와 이의 제기 — 교정됨
- 내용: 반려되면 퍼블리셔 이메일로 위반 정책과 이의 제기 방법이 온다. 기존에 게시된 버전과 등록정보는 그대로 유지되고, 사용자에게는 따로 알림이 가지 않는다. 이의 제기는 대시보드 항목 페이지의 Appeal 버튼이나 One Stop Support 양식으로 한다.
- **교정**: 처음 조사는 "보통 3일 안에 답이 온다"고 적었다. 공식 문구는 "지원 대기열과 위반 종류에 따라 최대 3일이 걸릴 수 있다(may take up to three days)"이다.
- 할 일: 먼저 위반 코드에 맞춰 고쳐 다시 제출한다. 오판이라고 확신할 때만 Appeal로 근거를 낸다.
- 출처: https://developer.chrome.com/docs/webstore/review-process

#### 4.5.5 공개 범위 — 확인됨
- 내용: Public, Unlisted(링크가 있어야 설치), Private(신뢰 테스터 이메일이나 Google 그룹)가 있고 모두 같은 심사를 거친다. 게시 지역도 고를 수 있다. 테스트용 항목을 따로 올릴 때는 이름에 "BETA"나 "DEVELOPMENT BUILD"를 붙이고 설명에도 밝힌다. 그러지 않으면 중복 스팸으로 볼 수 있다(누락 보완).
- 할 일: Private이나 Unlisted로 먼저 통과시켜 지인에게 설치 테스트를 받은 뒤 Public으로 바꾸는 방법이 있다. 한국어 설명이면 지역을 전체로 할지 한국만으로 할지 정한다.
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution

#### 4.5.6 지연 게시와 심사 취소 — 확인됨(보충)
- 내용: "심사 후 자동 게시"를 끄면 승인 뒤 원하는 때 게시할 수 있다. 승인 후 30일 안에 게시하지 않으면 초안으로 돌아가 다시 심사를 받아야 한다. 심사 대기 중인 제출은 취소하고 고쳐서 다시 낼 수 있다(대시보드 또는 API v2의 `cancelSubmission`). 이 내용은 update 문서에 있고 review-process 문서에는 없다.
- 출처: https://developer.chrome.com/docs/webstore/update , https://developer.chrome.com/docs/webstore/publish , https://developer.chrome.com/docs/webstore/using-api

#### 4.5.7 신규 게시자의 게시 개수 제한 — 확인됨
- 내용: MV3 기술 조사는 publish 문서를 근거로 "신규 게시자는 확장을 최대 2개까지만 게시할 수 있다"고 적었다. 테스트용 항목을 따로 만들면 이 한도를 쓴다는 점을 기억한다.
- 출처: https://developer.chrome.com/docs/webstore/publish

#### 4.5.8 Test instructions 탭 — 확인됨(보충)
- 내용: 공식 문서는 이 탭이 필수가 아니며, 제한된 자격증명이나 유료 계정이 필요할 때 유용하다고 설명한다. 재현 절차를 적어 오판을 줄이는 것은 문서에 없는 권장이다.
- 할 일: 5.5절 초안을 넣는다.
- 출처: https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions

---

### 4.6 MV3 기술 요건

#### 4.6.1 icons — 확인됨
- 내용: "You should always provide a 128x128 icon; it's used during installation and by the Chrome Web Store." 48x48은 확장 관리 페이지에 쓰인다. prepare 문서는 icons를 필수 필드로 적는다. 툴바 아이콘을 선명하게 하려면 `action.default_icon`(16/24/32)을 따로 지정한다(누락 보완).
- 코드 확인 결과: `static/`에는 `manifest.json`, `popup.html`, `popup.css`만 있고 `icons` 필드가 없다. `build.mjs`는 `static/` 전체를 `dist/`로 복사하므로 `static/icons/`에 넣으면 함께 복사된다.
- 출처: https://developer.chrome.com/docs/extensions/reference/manifest/icons , https://developer.chrome.com/docs/webstore/prepare , https://developer.chrome.com/docs/extensions/reference/api/action

#### 4.6.2 zip 구조 — 확인됨
- 내용: `manifest.json`이 zip 루트에 있어야 한다. 최대 2GB다.
- 할 일: `dist` 폴더를 통째로 묶지 말고 안의 파일을 묶는다. 소스맵, `.ts`, `node_modules`는 넣지 않는다. 패키징 스크립트를 추가한다.
- 출처: https://developer.chrome.com/docs/webstore/prepare , https://developer.chrome.com/docs/webstore/publish

#### 4.6.3 version 규칙 — 확인됨(보충)
- 내용: 점으로 나눈 정수 1~4개, 각 0~65535. 0이 아닌 수는 0으로 시작할 수 없고, 전부 0이면 안 된다. 올릴 때마다 이전보다 커야 하며 왼쪽부터 비교한다(1.2.0 > 1.1.9.9999). 사람이 읽는 표기는 `version_name`을 쓴다.
- 할 일: 1.5.0으로 첫 출시해도 된다. `package.json`과 manifest 버전을 빌드에서 맞춘다. 게시한 뒤에는 버전을 되돌릴 수 없고, 롤백에도 새 버전 번호가 필요하므로 번호에 여유를 둔다.
- 출처: https://developer.chrome.com/docs/extensions/reference/manifest/version

#### 4.6.4 commands 단축키 — 확인됨
- 내용: 제안 단축키는 최대 4개다. Ctrl 또는 Alt가 반드시 들어가고 Shift는 선택이다. Ctrl+Alt 조합은 금지된다. 허용 키는 A-Z, 0-9, Comma, Period, Home, End, PageUp, PageDown, Space, Insert, Delete, 화살표, 미디어 키다. 다른 확장이 같은 키를 쓰면 등록되지 않는다.
- 코드 확인 결과: `cycle-fit`(Alt+Shift+8), `reset-fit`(Alt+Shift+9) 2개이고 규칙을 모두 지킨다. `shortcuts.ts`의 Ctrl+Alt 금지 설명도 공식 문서와 같다. 페이지 단축키(Ctrl+Alt+Shift+1~5)는 `commands`가 아니라 콘텐츠 스크립트의 keydown 처리라서 이 규칙의 대상이 아니다.
- 할 일: README와 스토어 설명에 `chrome://extensions/shortcuts`에서 바꾸는 방법을 적는다.
- 출처: https://developer.chrome.com/docs/extensions/reference/api/commands

#### 4.6.5 macOS 단축키 — 확인됨(일부 미확인)
- 내용: macOS에서 Ctrl은 Command로 바뀌고, 실제 Control은 MacCtrl로 쓴다. MacCtrl은 `"mac"` 키에만 쓸 수 있고, 다른 플랫폼에 쓰면 검증 오류로 설치가 안 된다. Fill Zoom은 Alt+Shift라 맥에서 Option+Shift+8/9가 된다.
- **미확인**: 맥에서 Option+Shift+숫자가 특수문자 입력과 겹친다는 것은 추정이다.
- 할 일: 팝업이나 패널에 단축키를 표시할 때 `chrome.commands.getAll()`로 실제 등록된 키를 보여 주는 편이 정확하다.
- 출처: https://developer.chrome.com/docs/extensions/reference/api/commands

#### 4.6.6 서비스 워커 수명 — 확인됨
- 내용: 30초 동안 이벤트가 없으면 종료된다. 요청 하나가 5분을 넘거나 fetch 응답이 30초를 넘어도 종료된다. 전역 변수는 사라지므로 리스너는 최상위에서 동기로 등록한다.
- 코드 확인 결과: `background.ts`는 최상위에서 `chrome.commands.onCommand.addListener`를 등록하고 전역 상태가 없다. 고칠 필요가 없다.
- 출처: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

#### 4.6.7 minimum_chrome_version과 requestVideoFrameCallback — 확인됨(보충)
- 내용: `minimum_chrome_version`을 지정하면 낮은 버전의 크롬 스토어 화면에 "Not compatible"이 뜬다. 나중에 이 값을 올리면 낮은 버전 사용자의 업데이트가 알림 없이 끊긴다. `requestVideoFrameCallback`은 Chrome 83부터 지원하고, Firefox 132 출시일인 2024-10-29에 Baseline Newly available이 되었다(Widely available 예정일 2027-04-29). MV3와 scripting API는 Chrome 88 이상이다.
- 코드 확인 결과: `build.mjs`의 esbuild target은 `chrome110`이다.
- 할 일: 첫 출시부터 `"minimum_chrome_version": "110"`(또는 실제로 테스트한 버전)을 넣는 것을 권한다.
- 출처: https://developer.chrome.com/docs/extensions/reference/manifest/minimum-chrome-version , https://web.dev/blog/web-platform-10-2024 , https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback

#### 4.6.8 설치·업데이트 직후 이미 열린 탭 — 확인됨(공식 문장 없음)
- 내용: manifest에 선언한 콘텐츠 스크립트는 설치나 업데이트 시점에 이미 열려 있던 탭에 자동으로 들어가지 않는다. 업데이트 뒤 기존 탭의 옛 스크립트는 확장과 연결이 끊긴다(orphan). 공식 레퍼런스에 이 문장은 없고, Chromium 확장 포럼과 널리 알려진 실제 동작에 근거한다.
- 이 확장에서 생기는 일: 설치 직후 열어 둔 YouTube 탭에서 버튼이 안 보이고 단축키가 무반응이면 "작동 안 함" 리뷰로 이어질 수 있다.
- 할 일: 두 방법 중 하나를 고른다.
  - (A) 권한을 늘리지 않는 방법: 팝업에서 응답이 없으면 "페이지를 새로고침하세요"라고 안내한다.
  - (B) `scripting` 권한을 추가하고 `runtime.onInstalled`에서 YouTube 탭마다 `content.js`를 주입한다. 권한을 추가하면 개인정보 탭의 권한 사유도 고친다. 출시 뒤에 추가하면 경고 여부를 확인해야 하므로 첫 출시 전에 정한다.
- 코드 확인 결과: `content.ts`에 `window.__fzContent__` 중복 실행 방지 플래그가 이미 있다. 다만 업데이트 뒤 옛 스크립트가 `chrome.storage`를 부를 때 나는 "Extension context invalidated" 예외 처리는 코드리뷰에서 따로 본다.
- 출처: https://developer.chrome.com/docs/extensions/reference/api/scripting , https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts , https://groups.google.com/a/chromium.org/g/chromium-extensions/c/l6hwu8YSR0w

---

### 4.7 출시 후 운영

#### 4.7.1 업데이트 절차 — 확인됨
- 내용: 버전을 올린 새 zip을 올리고 다시 심사를 받아야 게시된다. 통과 전까지 기존 사용자에게는 변화가 없다. 데이터 사용 방식이나 권한이 바뀌면 개인정보 탭과 방침도 함께 고친다(누락 보완).
- 출처: https://developer.chrome.com/docs/webstore/update , https://developer.chrome.com/docs/webstore/cws-dashboard-privacy

#### 4.7.2 권한 변경과 자동 비활성화 — 확인됨(경고 문구는 미확인)
- 내용: 경고가 붙는 권한을 새로 넣거나 `host_permissions`, `content_scripts.matches`를 추가·변경하면 사용자가 승인할 때까지 확장이 꺼진다. `https://*.youtube.com/*`의 경고 문구는 통상 "Read and change your data on all youtube.com sites"로 표시되지만 문서로 직접 확인하지 못했다.
- 할 일: 나중에 기능을 넓힐 계획이면 `optional_permissions`, `optional_host_permissions`로 실행 중에 요청하도록 설계한다.
- 출처: https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings , https://developer.chrome.com/docs/extensions/reference/permissions-list

#### 4.7.3 부분 롤아웃 — 확인됨(보충)
- 내용: 이미 게시되었고 7일 활성 사용자가 10,000명을 넘는 항목의 새 버전에만 쓸 수 있다. 새 초안을 올려야 옵션이 나타나고, 비율은 올릴 수만 있으며 바꿔도 재심사는 없다. 한 번에 하나만 진행할 수 있다.
- 할 일: 첫 출시와 초기 업데이트는 전체 사용자에게 한 번에 간다고 보고 매번 zip 설치 테스트를 충분히 한다.
- 출처: https://developer.chrome.com/docs/webstore/update , https://developer.chrome.com/docs/webstore/using-api

#### 4.7.4 롤백 — 확인됨(보충)
- 내용: Build > Package 또는 ⋮ 메뉴의 "Roll back to previous version"으로 직전 버전을 새 버전 번호로 재심사 없이 다시 게시한다. 1분 안에 반영되고 사유를 적어야 한다. 항상 직전 게시 버전으로만 가고, 연달아 누르면 같은 두 버전 사이를 오간다. 대기 중이거나 스테이징된 제출, 부분 롤아웃 중인 버전은 폐기된다.
- 할 일: 롤백하면 옛 코드가 새 버전이 저장한 `chrome.storage` 값을 읽는다. 저장 형식을 바꿀 때는 옛 버전이 새 데이터를 만나도 깨지지 않게 한다(모르는 키 무시, 기본값 대체).
- 출처: https://developer.chrome.com/docs/webstore/rollback , https://developer.chrome.com/blog/chrome-webstore-rollback

#### 4.7.5 Chrome Web Store API v2 — 확인됨(보충)
- 내용: API v1은 지원 중단 상태이며 **2026-10-15**까지만 지원된다. 오늘(2026-09-30) 기준 약 2주 남았다. v2 엔드포인트 형식은 `chromewebstore.googleapis.com/v2/publishers/{PUBLISHER_ID}/items/{EXTENSION_ID}:{operation}`이고, upload, publish, fetchStatus, setPublishedDeployPercentage, cancelSubmission이 있다. 지연 게시는 `publishType: STAGED_PUBLISH`로 지정한다. 항목을 처음 만드는 일은 API로 할 수 없다. Publisher ID는 대시보드 Publisher > Settings에 있다.
- 할 일: 첫 등록은 대시보드에서 직접 한다. CI 자동 게시를 만든다면 처음부터 v2로 짠다.
- 출처: https://developer.chrome.com/blog/cws-api-v2 , https://developer.chrome.com/docs/webstore/using-api , https://developer.chrome.com/docs/webstore/api

#### 4.7.6 CI 도구와 서비스 계정 — 확인됨(일부 미확인)
- 내용: `chrome-webstore-upload`는 v6.0.0부터 API v2를 쓰며 Publisher ID가 필요하다. CLI README에는 CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, PUBLISHER_ID만 나오고 서비스 계정은 언급이 없다. API v2는 서비스 계정을 지원한다. Google Cloud에서 API를 켜고 서비스 계정을 만들어 대시보드 Account에 등록하며, 퍼블리셔당 하나만 쓸 수 있다. gcloud로 가장해 토큰을 받으려면 `roles/iam.serviceAccountTokenCreator`가 필요하다.
- **미확인**: `cssnr/webstore-publish-action`의 서비스 계정 지원 여부는 재확인하지 못했다.
- 출처: https://github.com/fregante/chrome-webstore-upload/releases , https://github.com/fregante/chrome-webstore-upload-cli , https://github.com/cssnr/webstore-publish-action , https://developer.chrome.com/docs/webstore/service-accounts

#### 4.7.7 리뷰와 사용자 지원 — 미확인(일부 확인)
- 확인된 내용: 리뷰에 답변할 수 있고 언제든 수정할 수 있다. 리뷰는 삭제할 수 없고 가짜 리뷰는 신고할 수 있다. 답변해도 작성자에게 알림이 가지 않는다. 지원 허브는 Account management에서 켜고, 외부 Support URL을 쓰려면 지원 허브 표시를 꺼야 한다. 알림 이름 "Item review completed", "Item support issue received"는 문서와 같다.
- **미확인**: 답변에 "Developer" 배지가 붙는다는 점, 정책상 "의미 있는 고객 지원" 의무라는 문구.
- 할 일: 알림 두 개를 켜고, GitHub Issues를 지원 URL로 쓰거나 지원 허브를 켠다.
- 출처: https://developer.chrome.com/docs/webstore/support-users

#### 4.7.8 평점 조작 금지 — 확인됨
- 내용: 인센티브나 부정한 방법으로 평점, 리뷰, 설치 수를 부풀리면 금지되고 계정이 해지될 수 있다. 지인에게 리뷰를 부탁하는 것도 조작으로 판단될 수 있다.
- 할 일: 팝업에 보상형 리뷰 요청을 넣지 않는다. 보상 없는 평가 요청 링크가 허용되는지는 명시적으로 확인하지 못했다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/policies , https://developer.chrome.com/docs/webstore/program-policies/spam-and-abuse

#### 4.7.9 통계 — 확인됨(보충)
- 내용: 설치·제거, 노출수, 사용자(주간, 국가·언어·OS·버전별), 선택형 GA4 연동이 있고 CSV로 내보낼 수 있다. GA4 데이터는 사용자 단위가 아니고 퍼블리셔의 모든 멤버가 볼 수 있다.
- 할 일: 확장 코드에 자체 트래킹을 넣지 말고 스토어 GA4 연동을 쓴다. 자체 텔레메트리를 넣으면 개인정보 탭과 방침을 고쳐야 한다.
- 출처: https://developer.chrome.com/docs/webstore/metrics

#### 4.7.10 Featured 배지와 Established Publisher 배지 — 교정됨
- 내용: Featured 요건은 확장일 것, 본인 소유일 것, 영어 지원, 공개 게시, 정책 위반 없음, 추가 계정이나 결제 없이 핵심 기능을 쓸 수 있을 것이다. Established Publisher는 신원 확인과 좋은 이력이 쌓이면 자동 부여되며 신규 개발자는 보통 몇 달이 걸린다. 두 배지 모두 돈으로 살 수 없다.
- **교정**: Featured 추천 신청은 대시보드가 아니라 **One Stop Support 지원 양식**에서 한다.
- 할 일: 지금은 한국어 전용이라 영어 지원 요건을 채우지 못한다. `_locales`를 추가하고 팝업과 패널 문구까지 다국어로 만들어야 한다.
- 출처: https://developer.chrome.com/docs/webstore/discovery

#### 4.7.11 소유권 이전 — 확인됨(일부 미확인)
- 내용: One Stop Support(https://support.google.com/chrome_webstore/contact/one_stop_support)로 요청하고 이메일 회신으로 승인한다. "최대 7일"은 커뮤니티 공지로만 확인했다. 확장 ID 유지와 그룹 퍼블리셔 폐지는 공식 문서에서 명시적으로 확인하지 못했다(4.1.6의 share-ownership 문서는 개인/그룹 구분 폐지를 적고 있어 서술이 엇갈린다).
- 출처: https://developer.chrome.com/docs/webstore/share-ownership , https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UnEtO_KTAj0

#### 4.7.12 비활동과 제거 — 확인됨(보충)
- 내용: "업데이트가 없으면 자동 삭제한다"는 명시적 정책은 찾지 못했다. 정책 원문은 연락처 정보를 정확히 유지하고, 조치가 필요한 이메일에 응답하지 않으면 항목이 제거될 수 있다는 것이다. 정책은 기능이 깨진 확장을 금지하므로, YouTube 변경으로 동작하지 않는 상태가 오래 가면 제거 사유가 될 수 있다. Google 계정 비활동 정책(2년)은 개인 Google 계정에만 적용되고 Workspace 계정에는 적용되지 않는다. account-deletion 문서에는 비활동 삭제 규정이 없다.
- 할 일: 개발자 계정에 최소 2년에 한 번 이상 로그인한다. Chrome for Developers 블로그의 CWS 정책 업데이트를 구독한다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/policies , https://developer.chrome.com/blog/cws-policy-updates-2025

#### 4.7.13 게시한 항목은 삭제 불가 — 확인됨
- 내용: 게시 중단만 할 수 있고, 게시 중단한 항목은 계정에 남는다.
- 출처: https://developer.chrome.com/docs/webstore/account-deletion

---

### 4.8 YouTube 전용 확장의 위험

#### 4.8.1 YouTube 서비스 약관 — 확인됨 / 적용 해석은 미확인
- 내용: YouTube 약관(2022-01-05 시행)은 서비스·콘텐츠를 "alter, modify"하거나 "circumvent, disable, fraudulently engage with, or otherwise interfere with any part of the Service"하는 행위를 금지한다. 이 조항은 시청자에게 적용되고, 사용자 쪽에서 CSS만 바꾸는 확장이 여기에 해당하는지에 대한 공식 해석은 찾지 못했다(미확인). 같은 유형의 확장(Ultrawidify, Zoom to Fill 등)이 수년째 스토어에서 운영되고 있다.
- YouTube API 서비스 약관은 YouTube API를 "접근하거나 사용하는" API Client에만 적용되므로, API를 쓰지 않는 Fill Zoom에는 직접 적용되지 않는다. 나중에 Data API를 쓰면 약관 동의, API 키 관리, 방침 의무가 생긴다.
- 할 일: 스토어 설명에 "영상 표시 배율만 바꾸며, 다운로드·광고 차단·재생 제어 우회·데이터 수집은 하지 않는다"고 적는다. 법률 자문은 아니다.
- 출처: https://www.youtube.com/t/terms?hl=en , https://www.youtube.com/static?template=terms , https://developers.google.com/youtube/terms/api-services-terms-of-service

#### 4.8.2 광고 재생 중 확대 — 교정됨, 미확인
- 내용: Fill Zoom의 transform은 광고 영상에도 그대로 걸린다. 코드를 보면 `core.ts`, `ui.ts`에 `.ad-showing` 처리가 없다.
- **교정**: 처음 조사는 CWS 정책이 "제3자 사이트 광고 방해"를 금지하므로 위험하다고 적었다. 해당 조항 원문은 "Ads associated with your product may not interfere with any ads on a third-party website or application."으로, **확장이 스스로 광고를 붙이는 경우에만** 적용된다. 광고를 붙이지 않는 확장이 광고 영상의 배율을 바꾸는 것을 직접 금지하는 조항은 없다.
- 할 일: 정책 요건은 아니지만 위험을 줄이기 위한 권장으로, 재생기에 `ad-showing` 클래스가 있는 동안 transform을 풀고 감지를 멈추는 방안을 검토한다. 설명에 "광고를 가림" 같은 표현은 쓰지 않는다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/policies

#### 4.8.3 YouTube 플레이어 변경 — 확인됨(보충)
- 내용: 9to5Google에 따르면 2025-10-14에 Android, iOS, 웹, TV 플레이어 개편이 발표되었고 같은 주에 전 세계 배포가 시작되었다. TV는 크게 바뀌었고 모바일 가로 화면은 비교적 작게 바뀌어 "전면 개편"은 조금 과장이다. Ultrawidify도 YouTube 업데이트로 깨졌다가 고친 이력이 CHANGELOG에 반복된다(이슈 번호 #165, #263은 미확인).
- 코드 확인 결과: `.ytp-right-controls`(버튼 주입), `.ytp-fullscreen-button`, `.html5-video-player`, `#movie_player`, `.ytp-autohide` 등의 선택자에 기댄다. `ui.ts`는 `.ytp-right-controls`를 못 찾을 때의 처리가 있는지 코드리뷰에서 확인한다.
- 할 일: 선택자를 한 곳에 모으고, 못 찾아도 예외 없이 넘어가서 팝업과 단축키로는 동작하게 한다. 출시 뒤 주 1회 정도 일반, 극장, 전체화면, 미니플레이어, Shorts, 임베드, 라이브에서 스모크 테스트를 한다. 긴급 수정에도 심사 며칠이 걸린다는 점을 감안한다.
- 출처: https://9to5google.com/2025/10/14/youtube-video-player-redesign-more/ , https://www.engadget.com/entertainment/youtube/youtube-rolls-out-its-redesigned-video-player-globally-174609883.html , https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md

#### 4.8.4 지원 범위 명확화 — 누락 보완
- 내용: m.youtube.com, youtube-nocookie.com 임베드, music.youtube.com을 지원할지 정하고 권한 범위를 설명과 맞춘다. 지금 `*.youtube.com`은 youtube-nocookie.com을 포함하지 않고, `all_frames: false`라서 다른 사이트에 박힌 YouTube 임베드에서는 동작하지 않는다.
- 출처: https://developer.chrome.com/docs/webstore/program-policies/permissions

#### 4.8.5 중복 확장 금지 — 확인됨
- 내용: 비슷한 기능의 확장을 여러 개 올리면 스팸이다. 지원 사이트를 늘릴 때는 같은 확장에 권한을 추가하는 방식으로 한다(4.7.2의 비활성화 문제를 고려해 optional 권한으로).
- 출처: https://developer.chrome.com/docs/webstore/program-policies/spam-and-abuse

#### 4.8.6 경쟁 제품과 차별점 — 확인됨(일부 미확인)
- 확인된 수치(2026-09 스토어 표시값):
  - Zoom to Fill - Ultrawide Video: 사용자 20만 명, 평점 3.8, 멀티사이트, 자동 여백 제거는 유료 PRO 기능
  - Zoom To Fill: 사용자 약 2천 명, 평점 3.3, Alt+Z, 오버레이 버튼, 16:9~32:9 프리셋, "데이터 수집 없음" 명시
  - Aspect Ratio Changer for YouTube™: 사용자 292명, 프리셋 21종
- **미확인**: UltraWide for YouTube [QVI](사용자 1만 명, 익명 시청 분석 수집), YouTube Video Zoom(146명, 평점 1.0), UltraWideo(평점 4.3)의 수치.
- 차별점 후보: 무료 자동 여백 감지와 미리보기, 상하/좌우/꽉 채움 3종으로 16:9 노트북 사용자까지 겨냥, 재생기 안 버튼과 단축키, 최소 권한. "데이터 수집 없음"은 이미 경쟁 제품도 밝히고 있어 단독 차별점으로는 약하다. 설명에서 경쟁 제품명을 들어 비교하지는 않는다.

#### 4.8.7 집행 사례 — 미확인
- 내용: YouTube가 화면 비율·채움 확장을 상대로 약관을 집행하거나 기술적으로 차단한 공개 사례는 찾지 못했다. 부재 주장은 검색으로 확정할 수 없으므로 참고로만 쓴다. 광고 중 동작, 다운로드, 광고 건너뛰기처럼 범위를 넓히면 위험이 크게 올라간다.

---

## 5. 이 확장에 바로 쓸 수 있는 초안

아래 초안은 저장소 코드를 직접 읽고 실제 데이터 흐름에 맞춰 썼다. 확인한 흐름은 다음과 같다.

| 무엇 | 어디에 | 내용 | 외부 전송 |
|---|---|---|---|
| 채움 설정 | `chrome.storage.local`, 키 `site:<hostname>`(예: `site:www.youtube.com`) | `fit`(off/vertical/horizontal/both), `sourceRatio`, `panX`, `panY`, `rotation`(0/90/180/270) | 없음 |
| 패널 표시 설정 | `chrome.storage.local`, 키 `ui:panel` | `shown`, `pic`(미리보기 표시 여부) | 없음 |
| 영상 프레임 | 콘텐츠 스크립트의 캔버스(메모리) | `getImageData`로 여백 감지. 미리보기 요청 시 JPEG dataURL(최대 가로 512px, 품질 0.6)로 만들어 `tabs.sendMessage` 응답으로 팝업에 전달 | 없음. 저장하지 않음 |
| 단축키 명령 | 서비스 워커 → 활성 탭 | `cycleFit`, `resetFit` 메시지 | 없음 |

네트워크 요청(`fetch`, XHR), `eval`, 외부 URL은 `src/`에 없다. 탭 URL은 읽지 않는다.

### 5.1 단일 목적(Single purpose)

**한국어**
> YouTube 영상의 검은 여백(레터박스·필러박스)을 잘라 영상이 플레이어 화면을 채우도록 표시 방식을 조정하는 기능 하나만 제공합니다. 채움 방식(상하·좌우·꽉 채움), 보이는 영역 이동, 회전, 여백 자동 감지와 미리보기, 재생기 버튼, 팝업, 단축키는 모두 이 표시 방식을 고르고 적용하기 위한 수단입니다.

**English**
> Fill Zoom has one purpose: it adjusts how YouTube videos are displayed by cropping black bars (letterbox or pillarbox) so the picture fills the player. The fill modes (top-bottom, left-right, both), panning, rotation, automatic bar detection with preview, the player button, the popup and the keyboard shortcuts are all ways to choose and apply that display adjustment.

### 5.2 권한 사유

**storage**
> 한국어: 사용자가 고른 채움 방식, 보이는 영역 위치, 회전 각도, 감지된 원본 비율과 페이지 패널 표시 여부를 chrome.storage.local에 저장해, 다음 방문 때와 팝업·페이지 사이에서 같은 설정을 유지합니다. 설정값 외의 정보는 저장하지 않으며 외부로 전송하지 않습니다.
>
> English: Stores the user's chosen fill mode, pan position, rotation, detected source aspect ratio and whether the on-page panel is shown in chrome.storage.local, so the same settings apply on the next visit and stay in sync between the popup and the page. Only these settings are stored, and nothing is sent anywhere.

**Host permission (`https://*.youtube.com/*`)**
> 한국어: YouTube 페이지에서 콘텐츠 스크립트를 실행해 video 요소에 CSS transform을 적용하고, 재생기에 버튼과 조작 패널을 넣고, 검은 여백을 감지하기 위해 영상 프레임을 브라우저 안에서만 분석합니다. 프레임은 저장하거나 전송하지 않습니다. YouTube 외의 사이트에는 접근하지 않습니다.
>
> English: Runs a content script on YouTube pages to apply a CSS transform to the video element, add a button and control panel to the player, and analyze video frames locally in the browser to detect black bars. Frames are never stored or transmitted. The extension does not access any site other than YouTube.

(4.3.4에서 host 범위를 `www`와 `m`으로 좁히면 이 문구도 "YouTube(www.youtube.com, m.youtube.com)"로 고친다. 4.6.8의 (B)안을 택하면 `scripting` 사유를 추가한다: "설치하거나 업데이트할 때 이미 열려 있던 YouTube 탭에 이 확장의 콘텐츠 스크립트를 다시 넣어, 새로고침 없이 바로 동작하게 합니다.")

### 5.3 개인정보 보호 관행 탭 응답

| 항목 | 응답 | 근거 |
|---|---|---|
| Single purpose | 5.1절 문구 | — |
| Permission justification | 5.2절 문구 | — |
| Remote code | **No, I am not using remote code** | `src/`에 fetch, eval, new Function, 외부 스크립트 없음 |
| 데이터 유형 9개 | **모두 체크하지 않음** | 외부 수집·전송 없음. 저장은 설정값뿐 |
| 인증 3개 | **모두 체크** | 판매·이전 없음, 무관한 용도 없음, 신용 평가 없음 |
| Privacy policy URL | 공개 방침 페이지 URL을 넣는다(권장) | 4.3.8 |

"웹사이트 콘텐츠" 체크 여부에 대한 판단: 영상 프레임은 콘텐츠 스크립트와 팝업 사이에서만 오가고 저장·전송되지 않는다. "전송하지 않으면 수집이 아니다"라는 해석은 일반적이지만 공식 문서로 확정하지 못했다. 그래서 체크박스는 비우되 단일 목적, 권한 사유, 방침, 상세 설명 네 곳에 "프레임은 로컬에서 일시 분석만 한다"를 똑같이 적어 일관성을 확보한다. 심사에서 이 부분을 문제 삼으면 "Website content"를 체크하고 방침에 처리 방식을 적는 쪽으로 바꾼다.

**개인정보처리방침 초안(요지)**
> Fill Zoom 개인정보처리방침
> 1. 수집하는 정보: 없음. Fill Zoom은 개인 정보, 방문 기록, 영상 정보 등 어떤 사용자 데이터도 수집하거나 전송하지 않습니다.
> 2. 기기에 저장하는 정보: 채움 방식, 보이는 영역 위치, 회전 각도, 감지된 영상 비율, 패널 표시 여부만 브라우저의 chrome.storage.local에 저장합니다. 이 값은 사용자 기기를 떠나지 않으며 확장을 삭제하면 함께 지워집니다.
> 3. 영상 프레임 처리: 검은 여백 감지와 팝업 미리보기를 위해 재생 중인 영상 프레임을 브라우저 안에서 일시적으로 분석합니다. 이 이미지는 저장하거나 전송하지 않습니다.
> 4. 제3자 공유, 광고, 분석 도구: 없습니다.
> 5. The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.
> 6. 문의: (연락처 이메일 또는 GitHub Issues URL)
> 7. 시행일: (게시일)

### 5.4 스토어 짧은 설명(manifest `description`, 최대 132자)

글자 수는 저장소에서 `node`로 직접 셌다.

| 언어 | 초안 | 글자 수 |
|---|---|---|
| 한국어 | 유튜브 영상의 검은 여백(레터박스)을 잘라 플레이어를 꽉 채웁니다. 상하·좌우·꽉 채움과 여백 자동 감지, 단축키를 지원하며 데이터를 수집하지 않습니다. | 85 |
| 영어 | Removes black bars from YouTube™ videos so the picture fills the player. Top-bottom, left-right or full fill. No data collected. | 128 |

(현재 manifest 설명은 55자다. 한국어만 배포하면 한국어 초안을 `description`에 그대로 넣는다. 두 언어를 함께 내려면 `_locales/ko/messages.json`, `_locales/en/messages.json`에 넣고 `__MSG_appDesc__`로 참조한다.)

**상세 설명 뼈대(참고)**
> 첫 줄: YouTube™ 영상의 검은 여백을 잘라 화면을 채우는 확장입니다.
> - 상하 채움 / 좌우 채움 / 꽉 채움
> - 영상 속 검은 띠 자동 감지와 미리보기
> - 재생기 버튼, 페이지 패널, 팝업에서 조작
> - 단축키: Alt+Shift+8(채움 바꾸기), Alt+Shift+9(되돌리기). chrome://extensions/shortcuts 에서 바꿀 수 있습니다.
> - 영상 표시 배율만 바꿉니다. 다운로드, 광고 차단, 데이터 수집은 하지 않습니다. 영상 프레임은 브라우저 안에서만 분석됩니다.
> - 설치 직후 이미 열려 있던 YouTube 탭은 새로고침해 주세요(4.6.8 대응 방식에 따라 조정).
> - YouTube is a trademark of Google LLC. This extension is an independent project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube.

"YouTube"/"유튜브"가 설명 전체에서 5번을 넘지 않게 한다(4.2.4).

### 5.5 Test instructions 초안

> 1. 확장을 설치한 뒤 https://www.youtube.com 에서 위아래 또는 좌우에 검은 띠가 들어간 영상(예: 21:9 영화 예고편, 4:3 옛 영상)을 새 탭으로 엽니다.
> 2. 재생기 오른쪽 아래의 Fill Zoom 버튼이나 툴바의 확장 팝업에서 "상하 채움", "좌우 채움", "꽉 채움"을 고르면 검은 띠가 사라집니다.
> 3. 팝업의 감지 버튼을 누르면 영상 속 검은 띠를 찾아 원본 비율을 맞춥니다.
> 4. 단축키: Alt+Shift+8 채움 바꾸기, Alt+Shift+9 되돌리기. 페이지 단축키 Ctrl+Alt+Shift+1~5.
> 5. 로그인이나 계정은 필요 없습니다.

(버튼 위치와 팝업 문구는 1.5.0 실제 UI에 맞게 확인한 뒤 넣는다.)

---

## 6. 코드리뷰 보고서와 연결되는 지점

코드리뷰 보고서 `docs/reports/2026-09-30_0913_release-code-review.md`에서 함께 확인할 항목이다.

| 이 보고서의 절 | 코드에서 할 일 | 관련 파일 |
|---|---|---|
| 4.2.2, 4.6.1 | 아이콘 16/32/48/128 추가, `icons`와 `action.default_icon` 선언 | `static/manifest.json`, `static/icons/` |
| 4.6.2 | `dist/` 내용물을 루트로 묶는 패키징 스크립트 추가, 소스맵 제외 | `scripts/build.mjs`, `package.json` |
| 4.6.3 | `package.json`과 manifest 버전 동기화 | `scripts/build.mjs` |
| 4.6.7 | `minimum_chrome_version` 추가(esbuild target `chrome110`과 맞춤) | `static/manifest.json` |
| 4.3.4, 4.8.4 | host 범위를 `www`/`m`으로 좁힐지 결정, `host_permissions` 중복 여부 | `static/manifest.json` |
| 4.6.8 | 이미 열린 탭 대응(새로고침 안내 또는 `scripting` 재주입), "Extension context invalidated" 예외 처리 | `src/popup.ts`, `src/background.ts`, `src/core.ts`, `src/ui.ts` |
| 4.8.2 | 광고 재생(`ad-showing`) 중 transform 해제 검토 | `src/core.ts` |
| 4.8.3 | YouTube 선택자를 한 곳에 모으고, 못 찾을 때 조용히 넘어가기 | `src/ui.ts`, `src/core.ts` |
| 4.2.6, 4.7.10 | `_locales` 도입과 UI 문구 다국어화 | `static/`, `src/popup.ts`, `src/ui.ts` |
| 4.6.5 | 팝업 단축키 표시를 `chrome.commands.getAll()` 기준으로 | `src/popup.ts` |
| 4.3.2, 5.1 | 회전·이동 기능이 단일 목적 서술과 맞는지 확인 | `src/core.ts` |
| 4.3.5 | 번들에 eval, 외부 URL이 없는지 확인하는 검사 단계 | `scripts/build.mjs` |
| 4.7.4 | storage 스키마 하위 호환(모르는 키 무시, 기본값) | `src/core.ts`의 `Object.assign(state, saved)` |
| 4.4.5 | 재생기 버튼 툴팁에 "Fill Zoom" 명시 | `src/ui.ts` |
| 5 전체 | 개인정보 탭 서술과 실제 코드 흐름 일치 확인 | 전체 |

---

## 7. 출처 목록

### Chrome Web Store 공식 문서
- https://developer.chrome.com/docs/webstore/register
- https://developer.chrome.com/docs/webstore/set-up-account
- https://developer.chrome.com/docs/webstore/share-ownership
- https://developer.chrome.com/docs/webstore/account-deletion
- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/update
- https://developer.chrome.com/docs/webstore/rollback
- https://developer.chrome.com/docs/webstore/review-process
- https://developer.chrome.com/docs/webstore/troubleshooting
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/best-listing
- https://developer.chrome.com/docs/webstore/branding
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions
- https://developer.chrome.com/docs/webstore/support-users
- https://developer.chrome.com/docs/webstore/metrics
- https://developer.chrome.com/docs/webstore/discovery
- https://developer.chrome.com/docs/webstore/api
- https://developer.chrome.com/docs/webstore/using-api
- https://developer.chrome.com/docs/webstore/service-accounts

### 프로그램 정책
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/program-policies/two-step-verification
- https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure
- https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq
- https://developer.chrome.com/docs/webstore/program-policies/listing-requirements
- https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property
- https://developer.chrome.com/docs/webstore/program-policies/privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/limited-use
- https://developer.chrome.com/docs/webstore/program-policies/code-readability
- https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq
- https://developer.chrome.com/docs/webstore/program-policies/spam-and-abuse
- https://developer.chrome.com/docs/webstore/program-policies/permissions

### Chrome 확장 개발 문서와 블로그
- https://developer.chrome.com/docs/extensions/reference/manifest/icons
- https://developer.chrome.com/docs/extensions/reference/manifest/description
- https://developer.chrome.com/docs/extensions/reference/manifest/name
- https://developer.chrome.com/docs/extensions/reference/manifest/version
- https://developer.chrome.com/docs/extensions/reference/manifest/default-locale
- https://developer.chrome.com/docs/extensions/reference/manifest/minimum-chrome-version
- https://developer.chrome.com/docs/extensions/reference/api/commands
- https://developer.chrome.com/docs/extensions/reference/api/action
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/develop/ui/i18n
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- https://developer.chrome.com/docs/extensions/develop/migrate/improve-security
- https://developer.chrome.com/blog/policy-update-2sv
- https://developer.chrome.com/blog/verified-uploads-cws
- https://developer.chrome.com/blog/chrome-webstore-rollback
- https://developer.chrome.com/blog/cws-api-v2
- https://developer.chrome.com/blog/cws-policy-updates-2025

### YouTube / Google
- https://www.youtube.com/t/terms?hl=en
- https://www.youtube.com/static?template=terms
- https://developers.google.com/youtube/terms/branding-guidelines
- https://developers.google.com/youtube/terms/api-services-terms-of-service
- https://brand.youtube/naming-and-third-party-content/
- https://support.google.com/chrome_webstore/answer/7508032?hl=en
- https://support.google.com/chrome_webstore/contact/one_stop_support

### 웹 표준
- https://web.dev/articles/requestvideoframecallback-rvfc
- https://web.dev/blog/web-platform-10-2024
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- https://web-platform-dx.github.io/web-features-explorer/features/request-video-frame-callback/

### 커뮤니티와 보도
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/-x2d1RfMmOI
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/l6hwu8YSR0w
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UnEtO_KTAj0
- https://groups.google.com/a/chromium.org/g/chromium-apps/c/4lu5AkM6bZw
- https://techcrunch.com/2010/08/19/chrome-fee/amp/
- https://9to5google.com/2020/03/12/chrome-web-store-fee/
- https://9to5google.com/2020/11/18/chrome-web-store-disclosure/
- https://9to5google.com/2025/10/14/youtube-video-player-redesign-more/
- https://www.engadget.com/entertainment/youtube/youtube-rolls-out-its-redesigned-video-player-globally-174609883.html

### 제3자 가이드와 도구
- https://www.extensionradar.com/blog/chrome-web-store-developer-fee-2026
- https://extensionbooster.net/blog/chrome-web-store-developer-registration-fee-2026-guide/
- https://extensionbooster.net/blog/chrome-extension-host-permission-in-depth-review-warning-fix-guide/
- https://ultrafastutilities.com/chrome-web-store-privacy-policy-requirements
- https://velog.io/@ino5/Chrome-%EC%9B%B9-%EC%8A%A4%ED%86%A0%EC%96%B4-%EA%B0%9C%EB%B0%9C%EC%9E%90-%EB%93%B1%EB%A1%9D-%EC%88%98%EC%88%98%EB%A3%8C-%EA%B2%B0%EC%A0%9C-%EC%84%A4%EC%A0%95-%EC%98%A4%EB%A5%98%EA%B5%AD%EA%B0%80-%EC%9A%B0%ED%8E%B8%EB%B2%88%ED%98%B8
- https://github.com/fregante/chrome-webstore-upload/releases
- https://github.com/fregante/chrome-webstore-upload-cli
- https://github.com/fregante/chrome-webstore-upload/issues/104
- https://github.com/fregante/chrome-webstore-upload/issues/114
- https://github.com/cssnr/webstore-publish-action
- https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md
- https://github.com/tamius-han/ultrawidify/issues/165
- https://github.com/tamius-han/ultrawidify/issues/263

### 경쟁 확장(스토어 페이지)
- https://chromewebstore.google.com/detail/zoom-to-fill-ultrawide-vi/adpjimagbfpknkodpofjphpbdlfkeiho
- https://chromewebstore.google.com/detail/zoom-to-fill/gjdbakmcldoaklnobplcbcillcbbcjmm
- https://chromewebstore.google.com/detail/aspect-ratio-changer-for/iliinafimaknnhelpmjaochndmjlolla
- https://chromewebstore.google.com/detail/ultrawide-for-youtube-cus/lfphiacjligbdklkafccneapdpbkohne
- https://chromewebstore.google.com/detail/youtube-video-zoom/aofancdgpobncjjkdkfjabcneompekde
- https://chromewebstore.google.com/detail/ultrawidify/dndehlekllfkaijdlokmmicgnlanfjbi
- https://chromewebstore.google.com/detail/ultrawideo/bfbnagnphiehemkdgmmficmjfddgfhpl
- https://zoomtofill.com/
