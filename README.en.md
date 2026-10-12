# Tiltfill

[한국어](README.md) | **English**

A Chrome extension that rotates YouTube videos and crops their black bars so the picture fills the player.

## Features

- **Rotate**: turn the video in 90° steps. A vertical video that was uploaded sideways can be set upright.
- **Fill**: crop the black bars above and below, or at the sides, so the picture fills the player. Bars baked into the video file are found and cropped too.
- **PIP**: open the video in a small always-on-top window. Your rotation and crop carry over.
- **Fill window**: make the player fill the browser window without going fullscreen.
- **Wheel seeking**: use the mouse wheel to jump 5 seconds, 10 seconds, or one frame at a time.

## Install

Open [Tiltfill on the Chrome Web Store](https://chromewebstore.google.com/detail/tiltfill/ekodgikandbohjbgfofemohoefkpgkpd) and click **Add to Chrome**. Then reload any YouTube tabs that were already open.

### Build from source

Build it yourself if you want to change the code or try a version that is not on the store yet. You need Node.js 22.18 or later.

1. Clone the repository and build. This creates a `dist` folder.

   ```
   git clone https://github.com/Argoneon1810/Tiltfill.git
   cd Tiltfill
   npm install
   npm run build
   ```

2. Open `chrome://extensions` in Chrome and turn on **Developer mode** at the top right.
3. Click **Load unpacked** and choose the `dist` folder. Not the repository folder, the `dist` folder inside it.
4. Reload any YouTube tabs that were already open. Tabs opened before the extension was loaded do not get it.

To update, run `git pull` and `npm run build` again, reload Tiltfill on `chrome://extensions`, then reload the YouTube tab.

## How to use

### Opening the panel

When you open a video on YouTube, a small button appears at the top right of the player. Click it to open the panel. Everything below is done from this panel. It works the same way in fullscreen.

The button disappears together with YouTube's control bar. Move the mouse and it comes back.

If you do not want to see even that button, click the Tiltfill button added to the right side of YouTube's control bar. The button and the panel are hidden together, and clicking again brings them back.

### Filling the player

Choose one of the four buttons at the top of the panel.

| Button | What it does |
| --- | --- |
| **Original** | Nothing. |
| **Fill height** | Fits the picture to the player's height. The bars above and below go away and the sides are cropped. |
| **Fill width** | Fits the picture to the player's width. The bars at the sides go away and the top and bottom are cropped. |
| **Fill both** | Enlarges until no bar is left on any side. |

Below the buttons, a line such as `1.34× · sides 26% cropped` shows how much the picture was enlarged and how much is cropped.

**If you choose a fill mode and nothing changes**, the bars are part of the picture inside the video file. With the video playing, click **Detect** next to **Picture ratio**. It reads the picture for a second or two and finds the bars. If detection gets it wrong, or you already know the ratio, choose it from the **Picture ratio** list.

### Choosing what gets cropped

Filling the player crops part of the picture. When that happens, a small preview of the video appears in the panel, with a bright box marking the part that is on screen.

- Drag the box and the visible part follows. Click outside the box and the box moves there.
- Double-click, or click **Center**, to go back to the middle.
- After clicking the preview you can also move it with the arrow keys. Hold `Shift` for larger steps.
- If the preview is heavy on your computer, turn off **Picture**. The video picture goes away and only the box remains. Everything still works.

### Rotating

Choose a direction from the four buttons under the fill buttons: upright, 90° right, 180°, 90° left.

If you rotate by 90° without a fill mode, the picture shrinks so all of it is visible, and empty space remains at the sides. To fill that space too, choose a fill mode as well.

### PIP

Click **PIP** in the panel or press `Alt+P`. The video moves into a small always-on-top window. Close the window or press the same key again and it returns. While the window is open, the player in the tab is blank.

- Your rotation and crop apply in the window too. Chrome's built-in picture-in-picture shows a rotated video lying down again.
- Click the window to play or pause. `Space` does the same, and the left and right arrow keys jump 5 seconds.
- Move the mouse over the window and a bar with rotation and picture ratio controls appears at the top.
- If captions are on in YouTube, they show in the window as well.
- The keyboard shortcuts and wheel seeking work in this window too.

### Fill window

Click **Fill window** in the panel. The player fills the inside of the browser window, and the rest of the page, such as the title and comments, is hidden. Click again to turn it off. The setting stays on for the next video.

### Wheel seeking

Scroll the wheel horizontally over the player or the PIP window to move through the video. On a mouse without a horizontal wheel, hold `Shift` and scroll.

| How you scroll | Per notch |
| --- | --- |
| Just scroll | 5 seconds |
| Holding `Alt` | One frame. The video pauses. |
| Holding `Ctrl` | 10 seconds |

- If the direction feels backwards, click **Flip wheel** in the panel.
- To step several frames at a time with `Alt`, enter the number of frames in **Fine step** in the panel.

### What is remembered and what is not

Things that are closer to taste, such as the fill mode, fill window, and the wheel settings, are remembered and used next time.

The picture ratio, the rotation, and the position of the cropped area only fit one video, so they go back to the start when you move to another video.

## Keyboard shortcuts

These work in a YouTube tab or in the PIP window. They do not fire while you are typing in the search box or a comment.

| Key | What it does |
| --- | --- |
| `Ctrl+Alt+Shift+1` | Open or close the panel |
| `Ctrl+Alt+Shift+2` | Show or hide the button and the panel altogether |
| `Ctrl+Alt+Shift+3` | Cycle through the fill modes |
| `Ctrl+Alt+Shift+4` | Cycle through the rotations |
| `Ctrl+Alt+Shift+5` | Reset fill, rotation, and fill window |
| `Ctrl+Alt+Shift+6` | Turn fill window on or off |
| `Alt+P` | Open or close PIP |

The digits are the number row above the letters. Three modifier keys are required so that the shortcuts are not pressed by accident while typing.

The two below also work when you are not looking at a YouTube tab. You can change them at `chrome://extensions/shortcuts`.

| Key | What it does |
| --- | --- |
| `Alt+Shift+8` | Cycle through the fill modes |
| `Alt+Shift+9` | Reset everything |

On a Mac the labels read Control and Option, and the last two are `Control+Shift+8` and `Control+Shift+9`.

## Good to know

- **It works on `www.youtube.com` only.** It does not work on YouTube videos embedded in other sites, or on YouTube Music.
- **Videos with bars on all four sides are not filled completely yet.** Some bars remain. The plan to fix this is in [BACKLOG.md](BACKLOG.md) (Korean).
- **Detection can fail on dark scenes.** Try again on a bright scene.
- **Protected videos show no detection and no preview picture.** YouTube Movies are an example. Choose the picture ratio yourself and everything else works the same.
- **The PIP window does not keep the video's aspect ratio by itself when you drag its edge.** If empty space appears, click once inside the window and it fits the picture again.
- **PIP that keeps the rotation needs Chrome 116 or later.** On older versions it opens Chrome's built-in picture-in-picture.
- **Stepping frame by frame is accurate once the video has played for a moment.** A video that has never played is assumed to run at 30 frames per second.
- **It clashes with extensions that do the same thing.** Google's Picture-in-Picture extension also uses `Alt+P`, and other extensions that make the player fill the window conflict with fill window. Keep only one of them on.
- **If clicking the extension icon says the extension is not attached to this tab yet**, reload that tab.
- **The interface is in Korean and English.** It is Korean when Chrome's language is Korean, and English otherwise.

## Permissions and privacy

Tiltfill collects nothing and sends nothing anywhere. The source contains no code that sends data out.

It asks for two things: access to YouTube pages, and `storage` to keep your settings. It reads the video picture for detection and the preview, but that happens inside the browser, and the settings are stored only in the browser. The full policy is in [PRIVACY.md](PRIVACY.md).

## For those who want to change it

The source is TypeScript and lives in `src/`. What you load into Chrome is the build output in `dist/`.

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds once. |
| `npm run watch` | Rebuilds whenever a file changes. No type check. |
| `npm run typecheck` | Type-checks only. |
| `npm run package` | Builds fresh and writes the zip for the store into `release/`. |

After building, reload Tiltfill on `chrome://extensions` and reload the YouTube tab to see the change.

| File | What it does |
| --- | --- |
| `src/core.ts` | Scale calculation, applying fill and rotation, black bar detection |
| `src/ui.ts` | The panel and buttons in the player, key handling |
| `src/pip.ts` | The PIP window |
| `src/winfill.ts` | Fill window |
| `src/frames.ts` | Wheel seeking |
| `src/shortcuts.ts` | Every shortcut and the wheel step sizes |
| `src/popup.ts` | The popup shown when you click the extension icon |
| `src/background.ts` | The service worker that passes browser shortcuts to the tab |
| `static/_locales/` | The interface text, in `ko` and `en` |
| `static/manifest.json` | Permissions and version |

- To change a shortcut, edit `src/shortcuts.ts` only. The hints on screen and the `commands` in `manifest.json` are generated from it by the build.
- When you add or remove interface text, edit both `ko` and `en` `messages.json`. The build stops if a key exists in only one of them.

Code comments and [CHANGELOG.md](CHANGELOG.md) are in Korean. The changelog records what changed in each version and why, including the causes of problems that came from the YouTube player and from Chrome, so it is the first place to look when you run into an odd symptom.

## License

[GPL-3.0-or-later](LICENSE). Copyright (C) 2026 Jinhoon Choi.
