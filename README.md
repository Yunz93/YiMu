# YiMu · 一目

**Learn Go, one understandable move at a time.**

English | [简体中文](README.zh-CN.md)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYunz93%2FYiMu&project-name=yimu&repository-name=YiMu)

YiMu is an interactive website for people who find Go difficult to learn. It explains what each move does, visualizes liberties and influence, and helps you understand where the score comes from. Practice against an AI companion directly in your browser.

The application interface is currently in **Simplified Chinese**. Project documentation is available in English and Chinese.

## Features

- **Understand each move:** position-specific explanations distinguish escapes, strengthening, atari, liberty pressure, connections, cutting points, supporting moves, approaches, captures, and possible eye filling. Each explanation identifies affected groups by coordinate, compares liberties before and after, and flags immediate capture risks or groups left in atari. Existing saved games receive the updated explanations too.
- **Know why a move is suggested:** **给我提示** opens a detailed recommendation with board evidence, tradeoffs, a legal opponent response considered during search, and other searched candidates. The suggestion remains in the coach card after closing the dialog. Move and preview details also explain what to watch next; opening the explanation never commits a move.
- **Preview before committing:** hover with a mouse to inspect liberties, captures, influence, and estimated area changes. On a phone or tablet, hold an intersection for about 0.4 seconds to preview, keep holding and drag to inspect other points, then release to dismiss without playing. A floating summary stays visible during the hold. A quick click or tap still plays immediately, with no second confirmation. Hovering or holding does not change the game, progress, or AI turn. Preview can be switched off and the preference is remembered.
- **Global board mode:** expand the complete board into a focused viewport. Landscape desktops place scores, previews, and actions beside the board so they do not consume its height; narrow screens use compact controls and floating move previews. View switches remain below the board. Hovering, holding, and changing the preview preference do not resize the board, and 19×19 fits without horizontal scrolling. Click **退出全局** or press Escape to leave; the game and AI thinking continue across mode changes.
- **Four board views:** the regular board, shared liberties, influence, and estimated territory. Select a stone in the liberties view to inspect its group.
- **A patient AI companion:** three search settings, move suggestions, undo, and a choice of playing Black or White on 9×9, 13×13, or standard 19×19 boards.
- **One learning center:** **学习中心** combines the 16 interactive lessons and learning progress in one place. See completed courses, moves played, and finished games; resume the first unfinished lesson; filter by topic and completion status. Returning from a lesson keeps the selected filters. Courses cover basic rules, atari escapes, capture exceptions, ko, false eyes, dame, seki, dead-group marking, passing, standard-board coordinates, and opening lines.
- **Understand the score:** Chinese area scoring with 7.5 points of komi for White, a separate unsettled-area indicator, and manual dead-group marking at the end. Resume play to resolve disputed life and death.
- **Pick up where you left off:** games and learning progress are saved in the current browser using `localStorage`.
- **Responsive and lightweight:** native HTML, CSS, and JavaScript modules with no runtime npm dependencies, backend, database, or AI API key.

## WeChat Mini Game (Mini Game AppIDs)

For a Mini Game AppID or the DevTools `mg` runtime, import **[`wechat-game/`](wechat-game/README.md)**. This edition has real `game.js` / `game.json` entries and Canvas scenes for play, local AI, touch previews, recommendations, the unified learning center, and all 16 lessons. Run `npm run build:wechat-game` to synchronize shared code; standalone archives are ready to import. Read the [Mini Game setup guide](wechat-game/README.md) or [中文说明](wechat-game/README.zh-CN.md).

## WeChat Mini Program

A native WeChat edition is available in [`wechat/`](wechat/README.md), with a Canvas board, local AI Worker, touch previews, all 16 lessons, and the unified learning center. Run `npm run build:wechat`, then import **the `wechat/` directory** into WeChat DevTools using your AppID. Read the [setup and release guide](wechat/README.md) or [中文说明](wechat/README.zh-CN.md). Mini Program filing, category eligibility, physical-device testing, upload, and review remain separate from GitHub/Vercel publishing.

## Deploy to Vercel

Click **Deploy with Vercel** above, sign in to Vercel, choose your Git account and repository name, then click **Deploy**. Vercel creates a copy of the repository and publishes your own instance.

The included [`vercel.json`](vercel.json) supplies the configuration automatically:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Framework preset | Other |
| Node.js | 24.x |
| Install command | `npm ci --ignore-scripts` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None required |

The static application is already authored in `dist/`; the build command validates required assets and JavaScript syntax. There is no bundling or code generation. Keep the repository root as the Vercel root directory, rather than selecting `dist` as the root. No SPA rewrite is needed.

You can also import `https://github.com/Yunz93/YiMu` through **Vercel → Add New → Project** using the same settings.

## Run locally

Requirements: **Node.js 24**, npm, and **Python 3** for the development server.

```sh
git clone https://github.com/Yunz93/YiMu.git
cd YiMu
npm ci
npm run dev
```

Open **http://localhost:4173**. The server serves `dist/` directly. Use HTTP(S), rather than opening `index.html` with `file://`, so ES modules and the AI Web Worker can load.

Check the project:

```sh
npm test
npm run build
```

Tests also verify non-mutating previews, 19×19 board edges, ko and seki lesson positions, and the standard-board coordinate targets. The original tests cover shared liberties, multi-stone captures, suicide and capture exceptions, positional superko, occupied and out-of-bounds points, Chinese area scoring, dead-stone removal, empty-board estimates, and move explanations.

For real Chromium layout regression checks, install the optional developer tools:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser/fullscreen.py
python3 tests/browser/settings.py
```

This starts a temporary local server and checks 9×9/13×13/19×19 layouts on desktop, tablet, phone, and landscape viewports, stable previews, resizing, play/AI responses, and complete settings option labels. An installed system Chromium is used when available.

## Learning flow

1. Start on 9×9, or select **19 路 · 标准棋盘** in game settings for the standard 361-intersection board. On small screens, the standard board scrolls horizontally inside its panel.
2. Preview is on by default. Hover over an intersection to inspect a move; click or tap to play immediately, without a confirmation button. On touchscreens, hold for about 0.4 seconds to preview and drag while holding to change the point; release does not play a move. Swiping before the hold activates keeps normal page/board scrolling. Move the mouse away or press Escape to dismiss a desktop preview. Keyboard users can preview with arrow keys and play with Enter. Turn preview off at any time; the preference persists after refresh.
3. Visit **学习中心** for the 16 categorized lessons, progress, and the next unfinished lesson. Filter by topic and completion status, or replay a completed course. The original lesson IDs and browser storage are unchanged, so existing progress is preserved.
4. Use the liberties, influence, and territory views to explore the proposed position with mouse hover or keyboard arrows. Estimates remain heuristic and exclude any AI reply.

## Rules and scoring

Black plays first. Connected stones share liberties; a group with no liberties is captured. Suicide is prohibited unless the move first captures opposing stones. YiMu uses **positional superko**: a move cannot repeat any earlier board position. Passing is allowed; two consecutive passes enter scoring mode. You can also enter scoring manually for learning.

Final scoring counts **living stones + surrounded empty intersections** for each color, with **7.5 points added to White**. Neutral intersections are excluded. Captured stones are not added again as separate points. Results show the difference in area points; the traditional Chinese winning margin expressed in *zi* is half that difference.

During play, influence and area are heuristic estimates based on distance to both colors. Unsettled intersections are shown separately. These estimates can change sharply as groups connect, get captured, or become surrounded.

## AI and learning limits

The AI runs locally in a **Web Worker**, combining tactical candidate scoring, opponent-response search, and randomized simulations. Its three settings use different search budgets. It is a beginner practice companion, not a rated engine or a KataGo integration.

Move explanations compare the actual groups and liberties before and after a move. Recommendation details also show a response and alternative candidates returned by the search, rather than a model's internal reasoning. Opponent-response examples respect positional superko, but are possibilities, not predictions or proof of optimal play. Influence is not guaranteed territory. Complex life and death is not automatically adjudicated: mark confirmed dead groups yourself and continue play when uncertain. The scoring tool assumes the remaining stones are alive.

## Privacy

Games and lesson progress remain in browser `localStorage`. They do not sync across browsers or devices and are lost if that storage is cleared. YiMu does not send game data to an application backend or AI service. Google Fonts is requested for Chinese typography, with system-font fallbacks. Your hosting provider may process ordinary access logs.

## Project structure

```text
dist/
  index.html       Page structure and metadata
  styles.css       Responsive interface
  app.js           Game state, lessons, interactions, persistence
  engine.js        Go rules, scoring, estimates, move explanations, pure previews
  lessons.js       16 interactive lesson definitions
  touch-preview.js Long-press gestures and board coordinate mapping
  ai.js            AI search in a Web Worker
scripts/
  build.mjs        Static deployment validation
tests/
  engine.test.mjs  Rule and scoring tests
  learning.test.mjs Preview, 19×19, and lesson-position regression tests
  explanations.test.mjs Contextual explanations, tactical risks, ko-safe replies, search evidence
  touch-preview.test.mjs Tap, hold, drag, cancel, and coordinate regression tests
docs/
  preview.png      Application screenshot
vercel.json        Vercel deployment settings
```

To contribute, describe the intended behavior and validation in a pull request, and run `npm test` and `npm run build` before submitting. Keep rule changes accompanied by focused examples or regression tests.
