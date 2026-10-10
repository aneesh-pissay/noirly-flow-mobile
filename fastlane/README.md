fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android build

```sh
[bundle exec] fastlane android build
```

Build a signed release App Bundle. Options: version_code, version_name

### android closed_testing

```sh
[bundle exec] fastlane android closed_testing
```

Build and upload to the closed testing track. Options: version_name, release_status (completed|draft)

### android store_listing

```sh
[bundle exec] fastlane android store_listing
```

Upload the store listing: text, icon, feature graphic, screenshots, contact details, data safety, closed testers

### android promote_production

```sh
[bundle exec] fastlane android promote_production
```

Promote the latest closed testing release to production. Options: rollout (0.0–1.0, default 1.0)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
