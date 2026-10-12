# Changelog

Google Play shows `fastlane/metadata/android/en-US/changelogs/default.txt` as
"What's new" for every build the closed-testing workflow uploads. Update it
together with this file. The build number (`versionCode`) is set by CI, one
above the highest on any Play track; the version name comes from
`package.json`.

## 1.1.0

A pass to make Flow feel like a phone app rather than a shrunken web page,
in the same Warm Gold theme as the web app.

### Added

- **Onboarding**: three pages on first launch (Capture, Organise, Together),
  shown once per install.
- **Account screens** backed by Noirly Identity: create an account (with live
  password rules), forgot password, set a new password from the emailed link
  (also `noirlyflow://reset-password?token=…`), and verify email with resend.
  A sign-in refused for an unverified address goes to the verify screen.
- **Quick add sheet** behind a floating **+** button: title, due date shortcuts
  (Today, Tomorrow, Next week, Pick date) and priority.
- **Themed launcher icon**: light and dark schemes from the web theme, and a
  monochrome layer for Android 13+ themed icons.

### Changed

- **Inbox and project lists** are grouped into Overdue, Today, Upcoming,
  No date and Done, with round checkboxes and larger rows.
- **Boards** page one column at a time, with the next one peeking in, and a row
  of column tabs with task counts.
- **Header**: search and filters are icon buttons beside the List / Board /
  Calendar tabs; filters open as a single scrolling row of chips with a count
  badge.
- **Sign in** offers Google or email, with show / hide password, *Forgot
  password?* and *Create an account*.
- Tab screens leave room for the status bar.

### Fixed

- Sign-in fields and bottom sheets were hidden under the keyboard (the app is
  edge to edge, so Android no longer resizes the window for it).
- The launcher icon's mark was too large for its mask; it now sits inside the
  safe zone with even padding.
- Google sign-in reported "unavailable" on a second attempt in the same session.

## 1.0.0

First release: inbox, boards, calendar, team workspaces and live updates.
