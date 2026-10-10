/* Tiltfill — service worker */
import { BROWSER_COMMANDS, type BrowserCommand } from "./shortcuts";
import type { Message } from "./types";

chrome.commands.onCommand.addListener(async (command) => {
  const entry = BROWSER_COMMANDS[command as BrowserCommand];
  if (!entry) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  const message: Message = { type: entry.message };
  chrome.tabs.sendMessage(tab.id, message, () => {
    // 영상이 있는 프레임만 응답하므로, 응답이 없는 경우는 정상이다.
    void chrome.runtime.lastError;
  });
});
