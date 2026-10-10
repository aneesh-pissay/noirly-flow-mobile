# Publishing Noirly Flow on Google Play

Step-by-step guide for releasing the Android app (`com.noirly.flow`) through the
Play Console, written against this repo's setup:

- Bare React Native 0.87 (no Expo/EAS). Builds come from Gradle in `android/`.
- Package name (application ID) `com.noirly.flow`, set in
  `android/app/build.gradle`. **Play locks it on the first upload**: after
  that it can never change for this listing, so make sure it is the one you
  want before step 8.
- `targetSdkVersion 36`, `minSdkVersion 24`, only the `INTERNET` permission.
- Release signing reads `android/keystore.properties` and
  `android/app/noirly-flow-release.keystore` (both git-ignored). They were made
  by `android/create-release-keystore.ps1`.
- Sign-in uses Noirly Identity (email/password) and native Google Sign-In
  (`googleWebClientId` in `src/config.ts`).

> **Automated path:** builds, uploads, the store listing and promotion run from
> GitHub Actions with fastlane. See [CI_CD.md](CI_CD.md) for setup; this guide
> covers what happens in each step and the Console-only settings. Store
> images: [STORE_ASSETS.md](STORE_ASSETS.md).

Play Console menu names change from time to time. If a label below doesn't
match, use the Console's search box.

---

## 0. Before you start: blockers in this repo

Play checks these during review. Sort them out before you submit for production.

| # | Requirement | Status in the code today | What to do |
|---|---|---|---|
| 1 | **Privacy policy URL**, public, not a PDF, not behind a login | **Built:** Flow's own policy at `/privacy` in `noirly-flow` (linked from Menu → Privacy policy), which links to Identity's policy for account data | Deploy noirly-flow, then use `https://noirly.flow.aneesh-pissay.in/privacy` |
| 2 | **Account deletion.** Apps that let users create accounts must offer deletion both inside the app and on a web page | **Built:** Menu → Delete account in the app, and `/delete-account` on Identity | Deploy Identity and Flow and set the env var below. The web URL is `https://noirly.identity.aneesh-pissay.in/delete-account` |
| 3 | **Reviewer login**: the app opens on a login screen | n/a | Create a dedicated reviewer account (verified email + password) with some sample data. It goes into *App access* (step 6). |
| 4 | **Google Sign-In for `com.noirly.flow`**: Google matches the package name *and* the signing SHA-1, and Play re-signs the app with its own key | The Android OAuth client in Google Cloud was made for the old package name `com.noirlyflow` | Create Android OAuth clients for `com.noirly.flow` with the upload SHA-1 now, and the Play **app signing** SHA-1 after the first upload (step 9). |

The upload SHA-1 is the one from `noirly-flow-release.keystore`, which
`create-release-keystore.ps1` printed.

### Turning on account deletion in production

1. **Deploy `noirly-flow`.** It adds `DELETE /api/me` and
   `POST /api/identity/account-deleted`.
2. **Deploy `noirly-identity`** with this env var, so deleting an account on
   the web also deletes the person's Flow data:

   ```
   ACCOUNT_DELETION_WEBHOOKS=noirly-flow=https://noirly.flow.aneesh-pissay.in/api/identity/account-deleted
   ```

   Optionally set `PRIVACY_CONTACT_EMAIL`. Otherwise the pages show the address
   from `EMAIL_FROM`.
3. Optional: run `npm run account:retry-deletions` in `noirly-identity` on a
   schedule (e.g. daily). It re-sends notices Flow didn't accept because it was
   down.
4. Read both privacy policies once on production and change anything that
   isn't true for you:
   - Flow's, at `noirly.flow.aneesh-pissay.in/privacy` (the one the Play listing
     uses). Settings are in `noirly-flow/src/lib/legal.ts`.
   - Identity's, at `noirly.identity.aneesh-pissay.in/privacy`. Settings are in
     `noirly-identity/lib/legal.ts`.
5. Rebuild the app (step 3) so it includes Menu → Privacy policy and Delete
   account.

---

## 1. Back up the signing key (do this once, now)

The release keystore is your **upload key**. If you lose it, uploads stop
until Google resets it, which takes days and needs support.

1. Copy these two files to a password manager or another safe place outside
   the repo:
   - `android/app/noirly-flow-release.keystore`
   - `android/keystore.properties` (holds the passwords)
2. Never commit them. `.gitignore` already excludes both.

Get the upload key's fingerprints (you'll need the SHA-1 and SHA-256 later):

```powershell
keytool -list -v -keystore android\app\noirly-flow-release.keystore -alias noirly-flow
```

(The password is `storePassword` in `android\keystore.properties`.)

---

## 2. Set the version

`android/app/build.gradle` reads both from Gradle properties:

```powershell
.\gradlew.bat bundleRelease -PversionCode=2 -PversionName=1.0.1
```

- `versionCode` must go up by at least 1 on **every** upload. Play rejects a
  code that was already used, even on a testing track. Without the property
  it is `1`.
- `versionName` is what users see. Without the property it is `1.0.0`.

With CI (CI_CD.md) you don't set either by hand: the version name comes from
the tag or `package.json`, and the code is one more than the highest on Play.

Optional: the launcher label comes from `app_name` in
`android/app/src/main/res/values/strings.xml` (currently `NoirlyFlow`). Change
it to `Noirly Flow` if you want a space under the icon.

---

## 3. Build the release bundle (.aab)

Play needs an **Android App Bundle**, not an APK.

```powershell
cd D:\Projects\NoirlyFlow
npm install
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
```

Output: `android\app\build\outputs\bundle\release\app-release.aab`

### Check it is signed with the release key, not the debug key

`build.gradle` silently falls back to the **debug** key when
`keystore.properties` is missing, and Play rejects debug-signed bundles. Check
the signer:

```powershell
keytool -printcert -jarfile app\build\outputs\bundle\release\app-release.aab
```

The owner must read `CN=Noirly Flow, OU=Mobile, O=Noirly, …`. If it says
`CN=Android Debug`, `keystore.properties` wasn't found: fix that and rebuild.

---

## 4. Test the release build on a device first

Release builds run the bundled JS with Hermes and no Metro server, so test
them before uploading.

```powershell
cd D:\Projects\NoirlyFlow\android
.\gradlew.bat assembleRelease
adb install -r app\build\outputs\apk\release\app-release.apk
```

Then run the Maestro flows in **Noirly Testing** (Mobile testing → App ID
`com.noirly.flow`, flows folder `noirly-testing/specs/noirly-mobile/flow`,
variables `EMAIL` / `PASSWORD`). Also check by hand:

- Email sign-in, then a cold restart keeps you signed in
- Google sign-in (works here with the upload key, as long as its SHA-1 is registered)
- Tasks, Board, Search, Workspace, Activity export
- No red error screens and no `localhost` URLs

---

## 5. Store listing (Grow users → Store presence → Main store listing)

| Field | Limit | Suggestion |
|---|---|---|
| App name | 30 chars | `fastlane/metadata/android/en-US/title.txt` |
| Short description | 80 chars | `…/en-US/short_description.txt` |
| Full description | 4000 chars | `…/en-US/full_description.txt` |
| App icon | 512×512 PNG, 32-bit with alpha, ≤ 1 MB | `…/en-US/images/icon.png` (generated, STORE_ASSETS.md) |
| Feature graphic | 1024×500 JPG or 24-bit PNG, no alpha | `…/en-US/images/featureGraphic.jpg` (generated) |
| Phone screenshots | 2–8; each side 320–3840 px; long side ≤ 2× short side | `…/en-US/images/phoneScreenshots/` (8 framed shots, generated) |
| Tablet screenshots | Optional (7" and 10") | Skip for v1 if the app isn't tuned for tablets |

All of these are uploaded by the *Update Play Store listing* workflow
(CI_CD.md). The images are rendered from real app screenshots by
`tools/store-art` (STORE_ASSETS.md).

Also set:

- **App category:** Productivity
- **Contact details:** a support email (shown publicly). A website is
  optional.
- **Privacy policy:** the URL from step 0 (also asked for under *App content*)

---

## 6. App content (Policy and programs → App content)

Each item needs to be completed once. The suggested answers below fit the
current code, but go through them against how the app actually behaves.

1. **Privacy policy:** the URL from step 0.
2. **App access:** "All or some functionality is restricted". Add the
   reviewer account's email and password, with one line on how to sign in:
   *"Tap 'Use email instead', enter the credentials."*
3. **Ads:** No, the app doesn't contain ads.
4. **Content rating:** fill in the IARC questionnaire with an email. Category
   is *Utility, Productivity, Communication or Other*. Users can interact or
   share content (shared workspaces, comments), so answer **Yes** to user
   interaction. No violence, gambling and so on. Expected result: Everyone /
   PEGI 3, possibly with an "Users Interact" notice.
5. **Target audience:** 18+ (or 13+). Don't include under-13 age groups, or
   the app falls under the Families policy.
6. **News app:** No.
7. **Data safety** (suggested answers for this app):
   - Collects data: **Yes**. Shares with third parties: **No** (Google
     Sign-In and your own servers count as service providers, not sharing).
   - Encrypted in transit: **Yes** (HTTPS/WSS only).
   - Users can request deletion: **Yes**, with the web deletion URL from
     step 0.
   - Data types:
     - *Personal info → Name, Email address*: collected, required, for
       App functionality and Account management
     - *App activity → Other user-generated content* (tasks, comments,
       checklists): collected, required, for App functionality
     - *App info and performance*: none (there's no crash SDK). Add it if you
       add one later.
8. **Account deletion:** in-app path plus the web URL (step 0).
9. **Government apps, financial features, health, VPN:** No.

---

## 7. Play App Signing (Test and release → App integrity)

New apps must use Play App Signing. You keep the **upload key** (your
keystore), and Google holds the **app signing key** used for the APKs that
users download.

1. On the first upload, Play offers *Google-generated app signing key*.
   Accept it.
2. Once it's set up, open **App integrity → App signing** and copy, from the
   *App signing key certificate* section:
   - **SHA-1**, needed for Google Sign-In (step 9)
   - **SHA-256**, for Android App Links if you add them later

---

## 8. Internal testing first (Test and release → Testing → Internal testing)

Internal testing reaches up to 100 testers within minutes and needs no full
review. It's the fastest way to get a Play-signed build onto a phone.

1. **Testers:** create an email list (your own Google account plus
   teammates) and save.
2. **Create new release** → upload `app-release.aab`.
3. **Release name:** `1.0 (1)`. **Release notes:** "First internal build."
4. **Next → Save → Start rollout to Internal testing.**
5. Copy the **opt-in link**, open it on the phone with a tester account,
   accept, then install from Play.

---

## 9. Fix Google Sign-In for the Play-signed build

The build installed from Play is signed with the **app signing key**, so its
SHA-1 differs from your upload key. Until both places below know it, Google
sign-in fails on Play installs (typically `DEVELOPER_ERROR` / code 10).

1. **Google Cloud Console** → the project that owns
   `919812667870-…apps.googleusercontent.com` → *APIs & Services →
   Credentials → Create credentials → OAuth client ID*:
   - Application type **Android**
   - Package name `com.noirly.flow`
   - SHA-1: the **app signing** SHA-1 from step 7

   Each Android client holds one package name and one SHA-1, so you need one
   per key: create another for `com.noirly.flow` with the **upload** SHA-1
   (step 1) so local release builds can sign in too. Clients for the old
   package name `com.noirlyflow` can be deleted. Leave `googleWebClientId` in
   `src/config.ts` as it is (the Web client).
2. **Noirly Identity** admin → *Clients* → `noirly-flow-mobile` → **Android
   SHA-1** field. Add the app signing SHA-1 on a new line and keep the
   upload/debug ones. The field takes several fingerprints.
3. Changes can take a few minutes. Reinstall from Play and try Google sign-in
   again.

---

## 10. Closed testing: required before production on personal accounts

If the developer account is a **personal** account created after
13 Nov 2023, Play blocks production until you have run a **closed test with
at least 12 testers opted in for at least 14 days in a row**. Organization
accounts skip this. *Dashboard* shows which applies to you.

1. **Testing → Closed testing → Create track** (or use *Alpha*).
2. Add at least 12 testers (an email list or a Google Group). Leave some
   margin, since people drop out.
3. Upload the same or a newer `.aab` (bump `versionCode` if it's new).
4. **Send for review.** Closed tracks are reviewed, which takes hours to a few
   days.
5. Send testers the opt-in link. They must **stay opted in** for 14 days.
   Ask them to actually use the app.
6. After 14 days: **Dashboard → Apply for production**. Answer the questions
   about the test (what testers did, what you fixed). Google replies within
   about 7 days.

---

## 11. Production release

1. **Test and release → Production → Countries/regions:** add India, or
   *all countries*.
2. **Create new release** → upload a new `.aab` (higher `versionCode`) or
   **promote** the tested release from closed testing.
3. Release notes for users, e.g. *"First release of Noirly Flow."*
4. **Next** → fix any errors the Console lists (warnings are optional).
5. **Send for review** (*Publishing overview → Send changes for review*).
   Reviews usually take 1–7 days, sometimes longer for a new app.
6. Optional: turn on **Managed publishing** if you want to choose when an
   approved release goes live.
7. Optional: use a **staged rollout** (e.g. 20% at first), then raise it to
   100%.

---

## 12. Every later update

With CI: bump `"version"` in `package.json`, push a `v<version>` tag, and the
*Release to closed testing* workflow does the rest (CI_CD.md, step 7). By hand:

1. Pick the next `versionCode` and a `versionName` (step 2).
2. `.\gradlew.bat bundleRelease -PversionCode=<n> -PversionName=<x.y.z>`, then check the signer (step 3).
3. Test the release APK and run the Maestro flows (step 4).
4. Upload to **Internal testing** first, then promote to **Production**.

---

## Troubleshooting

| Problem | Cause / fix |
|---|---|
| Google sign-in fails on every build after the rename | No Android OAuth client for `com.noirly.flow` with that build's SHA-1 (step 9) |
| Old app still on the test phone | `com.noirlyflow` is a different app now: `adb uninstall com.noirlyflow` |
| *"You uploaded an APK or Android App Bundle that was signed in debug mode"* | `keystore.properties` missing at build time; see step 3 |
| *"Version code 1 has already been used"* | Bump `versionCode` |
| Google sign-in fails only when installed from Play | App signing SHA-1 not registered; see step 9 |
| *"Your app targets API level X…"* | Raise `targetSdkVersion` in `android/build.gradle` to the level Play currently requires |
| Rejected: account deletion / privacy policy | Step 0 items 1–2 |
| Rejected: *App access* / reviewer couldn't log in | Reviewer account credentials wrong or email not verified (step 6.2) |
| Upload key lost | *App integrity → App signing → Request upload key reset* (needs a new keystore's `.pem`) |
