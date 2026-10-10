/* Fill Zoom — 화면에 보이는 글
 *
 * 글은 static/_locales/<언어>/messages.json 에 있고, 크롬이 브라우저 언어에 맞는
 * 것을 골라 준다. 맞는 언어가 없으면 manifest 의 default_locale(영어)을 쓴다.
 * 여기서는 열쇠만 넘긴다. 빌드가 소스에 쓰인 열쇠가 두 언어에 모두 있는지 확인한다.
 *
 * 글 안의 $1, $2 자리는 뒤에 넘긴 값으로 채워진다.
 */
export function t(key: string, ...values: Array<string | number>): string {
  return chrome.i18n.getMessage(key, values.map(String)) || key;
}
