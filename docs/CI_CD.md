# CI/CD: Google Play with fastlane and GitHub Actions

Everything needed to ship Noirly Flow (`com.noirly.flow`) from GitHub:

| Workflow | File | Runs | Does |
|---|---|---|---|
| **CI** | `.github/workflows/android-ci.yml` | every PR and push to `main` | TypeScript, lint, Jest |
| **Release to closed testing** | `.github/workflows/android-closed-testing.yml` | tag `v*` (e.g. `v1.0.1`), or by hand | builds a signed `.aab`, uploads it to the closed testing track |
| **Update Play Store listing** | `.github/workflows/play-store-listing.yml` | by hand, and on `main` when `fastlane/metadata/**` changes | title, descriptions, icon, feature graphic, screenshots, contact details, Data safety, closed testers |
| **Promote to production** | `.github/workflows/android-production.yml` | by hand | moves the latest closed testing release to production (optional staged rollout) |

They call the lanes in `fastlane/Fastfile`, which you can also run locally
with `bundle exec fastlane android <lane>`.

---

## What CI can and cannot set up

Google's Play Developer API covers releases and the store listing, but not
every Console setting. Those are one-time clicks (step 6).

| Set by CI | Only in the Play Console |
|---|---|
| App bundles and releases on any track, release notes | **The very first upload** (step 5) |
| Title, short and full description | Privacy policy URL |
| Icon, feature graphic, phone screenshots | App access (reviewer login), Ads, Content rating, Target audience, News, other declarations |
| Contact email, website, default language | App category and tags |
| Data safety form (from Play's CSV) | Countries and regions of the closed testing track |
| Closed testers as a Google Group | Testers as individual email lists |
| Promotion to production, staged rollout | Pricing (free is the default) |

---

## 1. Put the app on GitHub

```bash
git remote add origin https://github.com/<you>/noirly-flow-mobile.git
```

```bash
git push -u origin main
```

## 2. Google Play service account (once)

1. **Google Cloud Console** → pick or create a project → *APIs & Services →
   Library* → enable **Google Play Android Developer API**.
2. *IAM & Admin → Service accounts → Create service account*, e.g.
   `play-publisher`. No Cloud roles are needed.
3. Open it → *Keys → Add key → Create new key → JSON*. Keep the file safe.
4. **Play Console** → *Users and permissions → Invite new users* → the
   service account's email. Under *App permissions* add **Noirly Flow** and
   tick:
   - *Release apps to testing tracks* and *Release to production…*
   - *Manage testing tracks and edit tester lists*
   - *Manage store presence*
   - *View app information*

   Then *Invite user*. It can take up to a day before the API accepts the key.

## 3. GitHub secrets and variables

*Repository → Settings → Secrets and variables → Actions*:

| Secret | Value |
|---|---|
| `PLAY_SERVICE_ACCOUNT_JSON` | the whole JSON key from step 2 |
| `ANDROID_KEYSTORE_BASE64` | the upload keystore, base64: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\noirly-flow-release.keystore"))` (PowerShell) or `base64 -w0 android/app/noirly-flow-release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` from `android/keystore.properties` |
| `ANDROID_KEY_ALIAS` | `keyAlias` (`noirly-flow`) |
| `ANDROID_KEY_PASSWORD` | `keyPassword` (same as the store password for this PKCS12 key) |
| `NOIRLY_PACKAGES_TOKEN` | a GitHub token with `read:packages` that can read the `@noirly-dev` packages |

| Variable (optional) | Value |
|---|---|
| `PLAY_CLOSED_TESTERS_GROUP` | a Google Group email whose members are your closed testers, e.g. `noirly-flow-testers@googlegroups.com` |

Optional but recommended: under *Settings → Environments*, create
`closed-testing` and `production`, and give `production` required reviewers so
promotion needs an approval.

## 4. Check the store listing files

Everything Play shows is in `fastlane/metadata/android/`:

```
contact_email.txt  contact_website.txt  default_language.txt
en-US/title.txt  short_description.txt  full_description.txt
en-US/changelogs/default.txt      release notes (or <versionCode>.txt for one version)
en-US/images/icon.png             512×512
en-US/images/featureGraphic.jpg   1024×500
en-US/images/phoneScreenshots/    8 × 1080×1920
```

How the images are made and refreshed: [STORE_ASSETS.md](STORE_ASSETS.md).

## 5. First upload, by hand (once)

Google's API cannot upload to an app that has never had a build ("Package not
found"). So the first one goes through the Console:

1. GitHub → *Actions → Release to closed testing → Run workflow*, **untick
   "Upload to Google Play"**, run.
2. When it finishes, download the `noirly-flow-aab-<n>` artifact and unzip it.
3. Play Console → *Test and release → Testing → Closed testing → Alpha* (or
   *Internal testing*) → *Create new release*. Accept **Play App Signing**,
   upload `app-release.aab`, add release notes, *Save* → *Review release* →
   *Start rollout*.
4. Copy the **app signing SHA-1** (*App integrity → App signing*) into Google
   Cloud and Identity for Google Sign-In (PLAY_STORE_RELEASE.md, step 9).

From now on CI does the uploads.

## 6. One-time Play Console settings

The API can't set these. Answers that fit this app are in
[PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md), step 6.

1. *Policy and programs → App content*:
   - **Privacy policy:** `https://noirly.identity.aneesh-pissay.in/privacy`
   - **App access:** reviewer account email and password
   - **Ads:** no ads
   - **Content rating:** questionnaire
   - **Target audience:** 18+ (or 13+)
   - **News app:** no
   - **Data safety:** fill it in once here, or let CI do it with a CSV (below)
   - **Account deletion:** `https://noirly.identity.aneesh-pissay.in/delete-account`
   - **Government apps, financial features, health:** no
2. *Grow users → Store presence → Store settings*: category **Productivity**,
   contact details (CI also sets these).
3. *Testing → Closed testing → Alpha*: **Countries/regions**, and **Testers**
   (an email list, or leave it to the `PLAY_CLOSED_TESTERS_GROUP` variable).

### Data safety through CI (optional)

Play Console → *App content → Data safety* → *Export to CSV*. That's Play's own
template with every question. Fill it in, save it as
`fastlane/metadata/android/data-safety.csv`, and commit. The listing workflow
then uploads it on every change.

## 7. Day to day

- **New test build:** bump `"version"` in `package.json` (e.g. `1.0.1`), commit,
  then tag and push:

  ```bash
  git tag v1.0.1
  ```

  ```bash
  git push origin v1.0.1
  ```

  The version code is set automatically (one more than the highest on Play).
  Release notes come from `en-US/changelogs/default.txt`, or
  `en-US/changelogs/<versionCode>.txt` if present.
- **Listing change:** edit files under `fastlane/metadata/android/` and merge to
  `main`, or run *Update Play Store listing* by hand.
- **Go live:** *Actions → Promote to production → Run workflow*. Use rollout
  `0.2` for 20%, raise it later by running again with `1`.

### Notes

- **Draft-only phase:** until the app's first release is published from the
  Console, Google accepts only *draft* releases. The closed-testing lane detects
  that error, uploads a draft instead, and tells you to roll it out once in the
  Console.
- **Production access:** new personal developer accounts must run a closed test
  with at least 12 opted-in testers for 14 days before production is unlocked
  (PLAY_STORE_RELEASE.md, step 10). Promotion fails until then.
- **Local runs:** put the JSON key at `fastlane/play-service-account.json`
  (git-ignored), then `bundle install` and `bundle exec fastlane android <lane>`.
