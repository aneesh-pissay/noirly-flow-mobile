# Fonts

`@noirly-dev/ui-native` resolves each role + weight to a **static face file**
(Google Fonts registers Medium/SemiBold as separate families, so RN cannot use
`fontFamily` + `fontWeight` on one shared name). Filenames must match the
PostScript names below exactly — Android uses the filename as `fontFamily`.

## Bundled faces

| Role    | Weight | File                          |
| ------- | ------ | ----------------------------- |
| display | 400    | `Fraunces72pt-Regular.ttf`    |
| display | 600    | `Fraunces72pt-SemiBold.ttf`   |
| display | 700    | `Fraunces72pt-Bold.ttf`       |
| sans    | 400    | `HankenGrotesk-Regular.ttf`   |
| sans    | 500    | `HankenGrotesk-Medium.ttf`    |
| sans    | 600    | `HankenGrotesk-SemiBold.ttf`  |
| sans    | 700    | `HankenGrotesk-Bold.ttf`      |
| mono    | 400    | `JetBrainsMono-Regular.ttf`   |
| mono    | 500    | `JetBrainsMono-Medium.ttf`    |
| mono    | 600    | `JetBrainsMono-SemiBold.ttf`  |
| mono    | 700    | `JetBrainsMono-Bold.ttf`      |

Optical Soft / SuperSoft builds, italics, and unused weights (Thin, Light,
Black, Extra*) are not needed and should stay out of this folder.

## Register them

```bash
npx react-native-asset
```

That copies them into `android/app/src/main/assets/fonts` and links them into
the Xcode project. Rebuild the app afterwards — a Metro reload is not enough,
because fonts are registered natively at launch.

## Verify

```tsx
import { Text } from "@noirly-dev/ui-native";
<Text variant="displayLg">Handgloves</Text>;
```

If that renders in a serif, Fraunces is linked. If it renders in the system
sans, it is not.
