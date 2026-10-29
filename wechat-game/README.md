# YiMu for WeChat Mini Games

English | [简体中文](README.zh-CN.md)

**Use this edition with a Mini Game AppID and the DevTools `mg` environment.** It has real `game.js` and `game.json` entry files and a Canvas 2D interface. It does not depend on Mini Program App/Page APIs, WXML, WXSS, or browser DOM.

## Import

1. Update the repository or extract the **YiMu-minigame** archive.
2. Open the Mini Game import flow in WeChat DevTools.
3. Import **`wechat-game/`**, not the older `wechat/` project. For a standalone archive, select the extracted directory containing `project.config.json`, `game.js`, and `game.json` at the same level.
4. Supply your real **Mini Game AppID**. `touristappid` is only a local placeholder and cannot publish a release.
5. Keep `compileType: "game"` and `miniprogramRoot: "./"`; the entry files are at this project's root.
6. Compile with a current stable base library and preview on physical Android/iOS devices. The reported `mg` runtime is the intended target, but the user's specific DevTools/base-library combination still needs real-device acceptance.

If DevTools still searches for `miniprogram/game.json`, it is loading the old root, a stale project record, or a conflicting `project.private.config.json`. Correct the code root and re-import, retaining source files. Do not add an empty manifest to the older Mini Program project.

Standalone archives contain generated dependencies and can be imported directly. The following commands apply **only to the full repository root**:

```sh
npm ci
npm run build:wechat-game
npm run check:wechat-game
npm test
```

## Interface preview · 1.5.3

The Mini Game follows the website’s cream, sage-green, and wood palette. Players, live estimates, the preview switch, and game actions share a board card; subtle segmented views and icon navigation replace large filled controls. The learning center adds lesson-board illustrations, and settings/explanation sheets size to their content.

<p><img src="../docs/minigame-game.png" width="280" alt="Mini Game board card, live estimates, and icon navigation" /> <img src="../docs/minigame-learning.png" width="280" alt="Learning progress, resume card, and lesson illustrations" /></p>

These images use the actual application Canvas renderer with a simulated platform; they are not physical WeChat screenshots. Single-tap play, optional hold previews, AI, scoring, and all lessons retain their behavior.

Fullscreen hides the brand and slogan, compacts scores into one row, maximizes the square board within the available width/height, and anchors controls above the bottom safe area. A 320×568 viewport fits a 320px board without scrolling. The system capsule and safe areas remain clear. About no longer contains website/repository links; privacy information and local-data deletion remain available.

<img src="../docs/minigame-fullscreen.png" width="280" alt="Fullscreen Mini Game with a screen-width board, compact scores, and bottom controls" />

## Features

- Local stone sounds accompany legal human/AI moves and actual lesson placements. Toggle **落子音效** in game settings; the preference persists. Preview, undo, pass, dead-group marking, and restoring progress remain quiet. Playback respects the device silent switch. Audio stops in the background and resources are released on exit.
- Native Canvas scenes for the game, unified learning center, all 16 interactive lessons, settings, explanations, and About/privacy.
- 9×9, 13×13, and 19×19; Black/White choice; three local AI search settings in a Mini Game Worker.
- Tap once to play; hold for 0.4 seconds to preview, drag to inspect another point, release without playing. Swipes before activation scroll the scene. Multitouch/system cancellation never commits a move.
- Liberties, influence, territory estimates, and a fullscreen board mode. Main game controls remain in fullscreen; exit it for settings/new-game controls.
- Contextual move explanations, searched replies/alternatives, actual AI-response explanations, and read-only scrollable details.
- Undo, pass, consecutive-pass scoring, dead-group marking, Chinese area scoring with 7.5 komi; confirmed games count once.
- Local persistence, lesson/topic/completion filters, first unfinished lesson, scene/lesson sharing, and local-data deletion.

The scoreboard also opens explanations. Swipe vertically to read long scenes/details. Leaving the game or backgrounding cancels AI work; returning restarts a pending AI turn and stale results are ignored. Fullscreen changes preserve running AI work.

## Shared code and editions

The build synchronizes `dist/engine.js`, `dist/lessons.js`, and `dist/ai.js` into `shared/` and `workers/` CommonJS modules. Pure session/lesson/storage/gesture helpers and the Worker entry are synchronized from `wechat/miniprogram/`. Do not edit generated files; modify the source and rebuild. `game.js` and `src/` implement the Mini Game runtime and interface. The deployed code is self-contained.

| Edition | Import/serve directory | Entry |
| --- | --- | --- |
| Website | `dist/` | `index.html` |
| Regular Mini Program | `wechat/` | `miniprogram/app.js`, `app.json` |
| **Mini Game** | **`wechat-game/`** | **root `game.js`, `game.json`** |

Changing `compileType` alone does not convert one runtime to the other. GitHub/Vercel updates do not upload or publish a WeChat release.

## Release and privacy

Provide a real Mini Game AppID and developer/tester permissions. Confirm the actual game category, qualifications, filing, health/anti-addiction systems, privacy guidance, and other platform release requirements for your account. The implementation is not platform approval; regular Mini Program filing guidance does not replace Mini Game release requirements.

Configure public contact and genuine filing display information, if applicable, in `config.js`; configure the account's name, avatar, description, review screenshots, and review notes separately. Complete DevTools and physical-device testing before upload/review/publication. Never add an AppSecret, private upload key, or identity documents to source control; local `project.private.config.json` is ignored.

No login, backend, external AI key, analytics/advertising SDK, or network fonts are used. Game and lesson data stay in the device's WeChat storage. Window dimensions/safe areas are used only for layout; sharing contains scene/lesson routing, not game history or learning records. Data do not automatically synchronize with the website, regular Mini Program, other devices, or other AppIDs.

Tests cover the actual game entry, Canvas hit/touch routing, hold/drag/release, scrolling and cancellation, read-only recommendation details, Worker invalidation, lifecycle, settings/scoring/storage, all lessons, and share routes. Canvas previews use the application renderer with a simulated platform; they are **not WeChat device screenshots**. macOS DevTools and physical WeChat acceptance remain required. See the [Chinese guide](README.zh-CN.md) for the full checklist.
