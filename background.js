/* Fill Zoom — service worker */

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  const type = command === "reset-fit" ? "resetFit" : "cycleFit";
  chrome.tabs.sendMessage(tab.id, { type }, () => {
    // 영상이 있는 프레임만 응답하므로, 응답이 없는 경우는 정상이다.
    void chrome.runtime.lastError;
  });
});
