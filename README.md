# Moss

A little company while you focus. Moss is a small leaf-eared creature that floats on your desktop, plants and waters a little garden during focus sessions, takes breaks, and celebrates the time you make for your work.

**Native desktop prototype, built for macOS on Apple Silicon.** No account, API key, new hardware, or internet connection is required to use it.

## Download

Get the macOS Apple Silicon app from [GitHub Releases](https://github.com/ramzyraz/moss/releases/latest). Download the ZIP, extract it, and move Moss.app to Applications. Builds are currently unsigned and not notarized; macOS may block opening them. See the release notes before installing.

## Run

Requires Node.js 22.12 or newer, npm, and Apple Command Line Tools (`xcode-select --install`) to compile the small macOS window bridge. Node headers must be available under the Node installation’s `include/node`, or through `NODE_INCLUDE_DIR`.

```sh
npm ci
npm start
```

To produce a standalone macOS app:

```sh
npm run package
open release/0.4.0/Moss-darwin-arm64/Moss.app
```

The local build is unsigned and not notarized. Distribution to other Macs needs a signing/notarization workflow. Windows x64 is available as a preview with automated native checks. Linux and Intel Mac builds have not been validated.

## Meet your companion

- Click Moss or the little timer badge to open focus controls.
- Drag Moss, or use the small grip below the timer, to move it.
- Choose 1–120 minutes and optionally write one intention.
- Pause and resume whenever you need; completed focus sessions add a permanent flower.
- Start a break yourself after a session. A break never starts the next focus session automatically.
- Try the 20-second demo (and its 10-second break) without changing saved progress.
- Close controls to leave just the creature. The leaf menu-bar icon can reopen controls, hide/show Moss, pause/resume, or quit.
- Preferences include **Follow me across apps**, an optional completion chime, and break length. The follow option keeps Moss above windows and on other desktops, including full-screen apps and Stage Manager. Turn it off to keep Moss on one desktop with normal window ordering. The choice is saved; existing floating-window preferences are preserved.

Moss measures time you choose to spend in a session. It does not inspect your screen, keyboard, browsing, or app usage. Each completed session adds a flower to your saved garden. Houses and decorations are future ideas.

## Timer behavior and data

The main process owns the timer. Absolute deadlines keep it accurate when the UI is hidden; the renderer cannot award itself progress. Laptop sleep pauses the session. Reopening the app restores an interrupted session as paused, so time away does not silently earn credit. Closing the controls or hiding the creature does **not** pause a running session.

Progress, preferences, and the creature's position are stored in `~/Library/Application Support/Moss/progress.json`. Writes use a temporary file and atomic rename. A corrupted file is backed up before recovery. Checkpoints occur every 30 seconds and on user actions; an abrupt process crash can restore up to 30 seconds of extra remaining time. Normal quitting saves the paused session immediately.

Daily totals use the local calendar date on completion. Lifetime totals are retained; the most recent 1,000 session records are kept. No telemetry or network requests are made by application code.

## Development

```sh
npm test       # Timer and persistence tests
npm run smoke # Native UI integration test, isolated temporary profile
npm run build # TypeScript + local assets
```

The smoke test starts real Electron windows, drives the renderer controls, advances an isolated test clock, checks saved data, and writes screenshots/results to `artifacts/`. It does not alter your normal Moss profile.

- `src/core/timer.ts`: focus/break state machine and progress accounting.
- `src/core/store.ts`: local persistence, validation and recovery.
- `src/main.ts`: transparent window, tray, safe IPC, sleep handling and native smoke test.
- `native/overlay.mm`: main-process Node-API bridge for macOS window collection behavior. Explicitly joins other applications on macOS 13+; uses full-screen auxiliary behavior on older supported Macs. No Accessibility or Screen Recording permission is needed by the app.
- `src/preload.ts`: narrowly scoped bridge; renderers have no Node.js access.
- `src/renderer/`: controls, creature states and CSS motion.
- `assets/moss-sprites.png`: four generated poses, selected with CSS background positioning.

The character uses four illustrated poses with CSS movement, not a full frame-by-frame animation set. OS reduced-motion preferences disable movement. Source and artwork provenance: [ARTWORK.md](ARTWORK.md).

## Windows preview

Download the [0.4.0 Windows x64 preview](https://github.com/ramzyraz/moss/releases/tag/v0.4.0). Earlier Mac and Windows versions are available in [all releases](https://github.com/ramzyraz/moss/releases).

A portable Windows x64 preview can be built with `npm ci` then `npm run package:windows` on Windows. Apple Command Line Tools are not needed there. Extract the entire release ZIP and open `Moss-win32-x64/Moss.exe`; keep the other files beside it. Do not run the executable from inside the ZIP or copy the executable alone.

The preview is unsigned, so Windows may show an unrecognized-app warning. Review it before deciding whether to run it. Always-on-top applies to ordinary windows on the current Windows desktop. Virtual-desktop following and exclusive full-screen applications are not supported in this preview. Progress is stored under `%APPDATA%/Moss/progress.json`. Close controls to return to the companion; use Little preferences → Quit Moss to exit.

Please test dragging, click-through, compact/full controls, focus/breaks, sleep/resume, reopening saved progress, and 100%/150% display scaling. Automated tests do not replace checks on your own Windows desktop.

## Visibility update (0.1.1)

The creature uses a non-focusable floating window, so it does not need to take focus from the app you are working in. The saved `alwaysOnTop` preference now controls window level, all-desktop visibility, and full-screen/Stage Manager membership together. Normal focus controls remain a regular window. This does not duplicate Moss across physical monitors; it stays on the monitor where you positioned it.

Native tests inspect the actual window collection flags with the option on and off and check persistence. Switching among VS Code, Codex, and Firefox still needs an interactive check on the user’s desktop; the previous Computer Use permission was unavailable.

## Compact view (0.1.2)

Click **−** in the controls title bar to leave only the animated avatar. Click the avatar to reopen the controls, or drag it to move Moss. Closing the controls or pressing Escape also collapses them. Focus and break timers continue uninterrupted. The existing “Follow me across apps” preference applies to the compact avatar too.

## Garden (0.2.0)

Moss plants and waters a flower during focus. Four stages follow active session time: seed (0–25%), sprout (25–65%), bud (65–100%), and bloom on completion. Pausing, sleeping, or quitting preserves checkpointed growth; offline time does not grow plants. Ending an unfinished session discards that session’s plant, with no change to earned flowers.

Each completed focus session adds one permanent flower. The garden is reconstructed from the saved lifetime session count, so existing sessions become flowers automatically and history trimming cannot remove flowers. Patches hold 12 flowers; arrow controls browse every patch. Choose daisy, sunflower, or lavender before starting a session. Each seed has its own growth artwork and becomes a permanent flower on completion. Existing flowers keep their original colors. Select **Arrange garden**, choose a flower, then choose a destination plot; occupied plots swap flowers. Seed choices and flower positions are saved locally. Breaks and the 20-second demo never add flowers. Compact mode shows Moss and the active planting patch; click it to open the saved garden and controls.

Garden art is original SVG/CSS with planting, tending, and watering motion, using the existing Moss character artwork. Reduced-motion settings disable animation while retaining visible growth stages. This first release has one flower species; houses, vegetables, and decorations are not implemented.

## Gardening motion and window fix (0.2.1)

Full controls and the floating garden now appear one at a time. Close or minimize controls to return to the compact garden. During active focus, Moss repeats an eight-second sequence of reaching, digging, sowing (seed stage), and watering with falling drops. Pauses and breaks stop the gardening actions; reduced-motion preferences remain respected. Growth stages still depend on active focus time, independently of animation loops.

## Contributions

Bug reports and focused pull requests are welcome. Branch changes and official releases are owner-controlled. Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change and [RELEASING.md](RELEASING.md) for the release process.

### Simple and Living garden

In **Little preferences → Garden style**, choose **Simple** (the default) or **Living garden**. Both share your flowers, focus history, and saved progress. Compact mode stays the same in either style.

During focus in Living garden, a small Moss walks between flowers on the visible patch, waters them, pulls a little weed, and rests. Pausing, taking a break, arranging flowers, or enabling reduced motion rests the gardener. Nothing withers or disappears.

Completed sessions unlock a lantern (3), bench (5), pond (10), and tiny cottage (20); existing sessions count. Select an unlocked decoration and then one of the four decoration spots beside the flowers. Selecting a placed decoration lets you move or put it away. Moving onto another decoration swaps them; placing an item from the shelf returns the previous occupant to the shelf. These four spots are shared across garden patches. Simple mode hides decorations without losing their positions.
