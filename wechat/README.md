# YiMu for WeChat Mini Programs

English | [简体中文](README.zh-CN.md)

A native WeChat Mini Program with a Canvas 2D board, local AI in a WeChat Worker, a unified learning center, all 16 interactive lessons, and an About/privacy page. No backend, login, cloud environment, external AI key, network fonts, or runtime npm dependencies are required.

## Run

From the repository root:

```sh
npm ci
npm run build:wechat
npm test
```

Import **the `wechat/` directory** from the **Mini Program** entry in WeChat DevTools, not the Mini Game entry. `project.config.json` points to `miniprogram/` as its code root. Supply an **AppID registered for a regular Mini Program**, not a Mini Game AppID. The checked-in `touristappid` is only a local placeholder, subject to DevTools guest/test-account restrictions, and cannot publish a release. Use a current stable base library supporting Canvas 2D and Worker, compile, then preview on physical Android and iOS devices.

Never add an AppSecret, upload private key, or identity documents to the repository. Local `project.private.config.json` is ignored by Git.

## Missing `miniprogram/game.json` / environment reports `mg`

This repository maintains the website and regular Mini Program. Use a regular Mini Program AppID with this project.

DevTools is loading the project as a **Mini Game**. This repository supplies a regular Mini Program with `app.js` and `app.json`, so no `game.json` is expected.

1. Close the project and re-import `wechat/` through the regular Mini Program entry.
2. Ensure `project.config.json` uses `"compileType": "miniprogram"` and `"miniprogramRoot": "miniprogram/"`.
3. Check local `project.private.config.json` for conflicting project-type or code-root fields. Correct only those fields; retain other local settings.
4. Verify the AppID belongs to a regular Mini Program in the WeChat console. Choose a Mini Program test account, rather than a Mini Game test account, if testing locally.
5. If account type and configuration are correct, clear DevTools cache and recompile. Re-import from a fresh project record if the old record retains Mini Game mode, keeping source files intact.

`npm run check:wechat` now validates the checked-in and local configuration, but cannot infer account type from the AppID or change a cached DevTools session. Do not add an empty `game.json` or rename `app.json`; import this project with a regular Mini Program AppID.

## Features and behavior

- Local stone sounds accompany legal human/AI moves and actual lesson placements. Toggle **落子音效** in game settings; the preference persists. Preview, undo, pass, dead-group marking, and restoring progress remain quiet. Playback respects the device silent switch. Audio stops in the background and resources are released on exit.
- 9×9, 13×13 and 19×19 boards; Black/White choice; three AI search settings.
- Tap once to play. Hold for 0.4 seconds to preview; drag while holding to inspect another point; release dismisses without playing. Preview can be disabled.
- Liberties, influence, estimated territory, global board mode, undo, pass, scoring and whole-group dead-stone marking. Chinese area scoring with 7.5 komi; completed games count once.
- Contextual explanations, tactical risks, actual searched response/candidate evidence, and interpretation of the AI's played response.
- One learning center with progress, topic/completion filters, and the first unfinished lesson. All 16 courses use native touch interactions.
- Local persistence, shareable page routes, native feedback, a privacy explanation, and a local-data deletion action.

Leaving the game page or backgrounding terminates the Worker. Returning restarts a pending AI turn; stale messages cannot place stones. Worker errors expose retry rather than running the full search on the UI thread. Global-mode changes preserve ongoing AI work.

## Shared core

`npm run build:wechat` converts the existing `dist/engine.js`, `dist/lessons.js`, and `dist/ai.js` into checked-in CommonJS modules in `miniprogram/shared/` and `miniprogram/workers/`. Worker rules are copied into the isolated Worker package and search timing uses `Date.now()`.

**Do not edit generated files.** Change their `dist/` sources, regenerate, and commit both. `npm run check:wechat` rejects stale generated modules and checks JS, JSON, expected page/component files, and source package size. `npm run build` remains the website build; Vercel still serves `dist/`.

Platform-specific page state, gestures, course interactions and storage live in `pages/`, `components/`, and `utils/`. The Mini Program does not use the DOM, browser localStorage, or browser Workers.

## Privacy and release preparation

Game/lesson records stay in device-local WeChat storage. They are separate from the website and other devices; browser-save import is not implemented. Application code makes no server/AI/analytics requests. Window dimensions and pixel ratio are used locally for layout. Copying links uses the clipboard; feedback uses WeChat's native feedback flow.

Before uploading:

1. Set a real AppID and configure developers/testers.
2. Confirm the correct service category and whether the teaching-plus-play product must use the Mini Program or Mini Game platform. This project is a **regular Mini Program** (`compileType: miniprogram`); code completion does not imply category approval.
3. Complete required Mini Program filing and any category-specific qualifications.
4. Set the real `filingNumber` and optional public `contact` in `miniprogram/config.js`. The About page shows the configured number; also complete the platform's required official filing display. Never enter a fabricated number.
5. Configure public name, account icon, description, privacy guidance, review notes and screenshots. Public-account icon/review screenshots are not supplied in this code package.
6. Upload a trial version using WeChat DevTools, verify on real devices, submit for review, and publish after approval. GitHub/Vercel deployment does **not** upload or publish the Mini Program.

## Validation limits

Tests cover all lessons, shared rules, previews, undo/persistence, scoring lock, progress merging, Worker transport and invalidation, page lifecycle, and the Canvas touch event chain. Templates/styles have also passed compilation with the official WXML/WXSS compiler wrapper. API/Canvas interaction tests use a simulated platform, not real WeChat DevTools or devices.

Complete device testing of tap/hold/drag/cancellation on all board sizes, both colors and all AI settings, background/page transitions, global mode, every lesson, scoring, storage errors, sharing and platform privacy/filing configuration. See the [Chinese guide](README.zh-CN.md) for a fuller checklist and suggested review description.
