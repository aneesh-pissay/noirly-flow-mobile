# Noirly Flow (mobile)

Native React Native client for [Noirly Flow](https://noirly.flow.aneesh-pissay.in/). Sign-in uses [`@noirly-dev/identity-mobile`](https://github.com/noirly-dev/noirly-identity-mobile) — **no WebViews**.

## Setup

1. GitHub Packages auth (`.npmrc` already scopes `@noirly-dev`):

```bash
export NODE_AUTH_TOKEN=ghp_xxx   # read:packages
npm install
```

2. Register a public Identity client (once):

```bash
# in noirly-identity against prod
npm run client:register -- --type=public \
  --client-id=noirly-flow-mobile \
  --name=NoirlyFlowMobile \
  --redirect-uri=noirlyflow://oauth
```

3. Optional Google: set `googleWebClientId` in `src/config.ts` to Identity’s `GOOGLE_CLIENT_ID`.

4. Run:

```bash
npm start
npm run android
# or
npm run ios
```

## Hosts

| Service | URL |
| --- | --- |
| Identity | https://noirly.identity.aneesh-pissay.in |
| Flow API | https://noirly.flow.aneesh-pissay.in |

Deep links: `noirlyflow://invite/{token}`

## App ID

Android application ID: **`com.noirly.flow`** (`applicationId` and `namespace`
in `android/app/build.gradle`; Kotlin sources in `com/noirly/flow/`). Google
Play locks it after the first upload. The `noirlyflow://` URL scheme and the
native module's `com.noirlyflow.nativeutils` package are separate and stay as
they are. Releasing: [docs/PLAY_STORE_RELEASE.md](docs/PLAY_STORE_RELEASE.md), automated with fastlane and GitHub Actions ([docs/CI_CD.md](docs/CI_CD.md)). Store art: [docs/STORE_ASSETS.md](docs/STORE_ASSETS.md).

## Features

Parity with the web app (`noirly-flow/docs/FEATURES.md`):

- **Workspaces** — personal + team, switcher, create team, create project (Menu). The last workspace and project are remembered across launches.
- **Inbox & projects** — list / board / calendar; search, *assigned to me*, status / priority / due filters; quick add with priority + due date; open / shown counts; view-only notice.
- **List** — tap the box to complete, swipe to delete, long-press for quick edit (status, priority, due, delete). Due, tag and assignee chips.
- **Board** — long-press and drag a card to any slot in any column (the board scrolls at the edges); hold without moving for quick edit. Same dense positions and status mapping as web dnd-kit; canceled hidden. Screen readers get move up / down / to-column actions instead.
- **Calendar** — month grid with prev / next, tasks per day, undated list.
- **Task editor** — title, description, status, priority, project (move to/from Inbox), due date, repeat (daily / weekly), assignees, tags (+ create), checklist (add / toggle / remove), subtasks, comments with author names, task activity.
- **Members** — roles, change role, remove, invite links by role with **Copy** (clipboard) and **Share**.
- **Activity** — readable feed, *Load more*, **Export CSV** through the system save dialog (or *Share CSV*).
- **Search** — the web Cmd+K palette: create task / project from the query, jump to Inbox / Activity / Settings / workspaces, search hits.
- **Settings** — Identity name / email + *Open Identity*, Flow profile with the web timezone list.
- **Realtime** — live board updates (last-writer-wins), presence avatars + live dot, 30s / 60s fallback polling.

## Native module

`modules/noirly-flow-native` is a local TurboModule (Kotlin + Objective-C++), autolinked through the `file:` dependency in `package.json`. It provides what the app had no library for:

| API | Android | iOS |
| --- | --- | --- |
| `copyToClipboard(text)` | `ClipboardManager` | `UIPasteboard` |
| `saveTextFile(name, contents, mime)` | Storage Access Framework *Create document* (no storage permission) | `UIDocumentPickerViewController` export |
| `getPreference` / `setPreference` | `SharedPreferences` | `NSUserDefaults` |

The JS spec is `modules/noirly-flow-native/src/NativeNoirlyFlowNative.ts`; change the Kotlin and `.mm` files with it. After pulling, rebuild the app (`npm run android`, or `cd ios && pod install` then `npm run ios`) — a JS reload alone won't pick up native code.
