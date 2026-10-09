/**
 * Font assets.
 *
 * `@noirly-dev/ui-native` styles text by family name — Fraunces, HankenGrotesk,
 * JetBrainsMono — the same three faces the web apps load through next/font.
 * React Native cannot fetch a webfont, so the TTFs have to be bundled and
 * registered here. Drop them in `src/assets/fonts` (see the README there) and
 * run `npx react-native-asset`.
 *
 * Without them nothing breaks: an unknown fontFamily falls back to the platform
 * default on both platforms. The app just loses the display face, which is most
 * of what makes it look like Noirly.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ["./src/assets/fonts"],
};
