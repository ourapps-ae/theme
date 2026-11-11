# Theme component

## Purpose and facilities
`theme` holds the look of an application as data: colours, spacing, corner radii, a type scale and the style of an animated background (glyphs drifting out of the dark under a glow, with specks, a scene picture behind and figures in front). One `themes.json` renders to CSS variables for the web, Swift constants for Apple and Kotlin constants for Android, so the three clients cannot drift apart. Colours are `#rrggbb` or `#rrggbbaa`.

Facilities: `theme` (Design tokens and animated background for web, Apple and Android clients).

## User inputs
`themeName` selects a theme from `themes.json` (shipped: `night`, a dark room with a warm glow rising from below; `lounge`, a slower, softer look with the glow from above). An unknown name falls back to the default. `primaryColour` and `tableColour` are optional colours that replace the theme's primary (buttons, headings, highlights) and table (playing surface) colours; empty means the theme's own. An aepm string setting cannot hold `#` and must start with a letter, so a colour is written `hex e0b35a` (six digits, or eight with opacity); code may also pass `#e0b35a`. The settings are strings with the `label` grammar; a malformed colour is refused. Scene pictures and figures are supplied by the application at run time, not by this package.

- `themeName` (string, slug; optional; default `night`)
- `primaryColour` (string, label; optional)
- `tableColour` (string, label; optional)

## Artefacts and dependencies
`component.json` maps every `implementation/` source into `components/theme/`:

- `implementation/android/src/main/java/ae/theme/BackgroundMath.kt` -> `components/theme/android/src/main/java/ae/theme/BackgroundMath.kt`
- `implementation/android/src/main/java/ae/theme/ThemeBackground.kt` -> `components/theme/android/src/main/java/ae/theme/ThemeBackground.kt`
- `implementation/android/src/main/java/ae/theme/ThemeTokens.kt` -> `components/theme/android/src/main/java/ae/theme/ThemeTokens.kt`
- `implementation/android/src/main/java/ae/theme/ThemeTypes.kt` -> `components/theme/android/src/main/java/ae/theme/ThemeTypes.kt`
- `implementation/apple/Sources/BackgroundMath.swift` -> `components/theme/apple/Sources/BackgroundMath.swift`
- `implementation/apple/Sources/ThemeBackgroundView.swift` -> `components/theme/apple/Sources/ThemeBackgroundView.swift`
- `implementation/apple/Sources/ThemeTokens.swift` -> `components/theme/apple/Sources/ThemeTokens.swift`
- `implementation/apple/Sources/ThemeTypes.swift` -> `components/theme/apple/Sources/ThemeTypes.swift`
- `implementation/web/background.ts` -> `components/theme/web/background.ts`
- `implementation/web/package.json` -> `components/theme/web/package.json` (marks the folder's modules as ES modules, for build tools that load `tokens.ts`)
- `implementation/web/build-tokens.ts` -> `components/theme/web/build-tokens.ts`
- `implementation/web/theme.css` -> `components/theme/web/theme.css`
- `implementation/web/themes.json` -> `components/theme/web/themes.json`
- `implementation/web/tokens.schema.json` -> `components/theme/web/tokens.schema.json`
- `implementation/web/tokens.ts` -> `components/theme/web/tokens.ts`

Dependencies: none.
`tools.lock.json` pins verification tools: node 26.5, python3 3.12, swiftc 6.4, kotlinc 2.2, java 26.0. Licence wording remains deferred.

## Provided interfaces
- `interfaces/theme.json` defines `theme` (ae/theme) version 1.0.0 as an OpenRPC 1.3.2 document: one method per web function (`tokens.ts`, `background.ts`, `build-tokens.ts`), each description naming the Swift and Kotlin form, and the token shape (`Tokens`, `BackgroundStyle`, `ThemeFile`, `ThemeSettings`, the host views) as JSON Schema 2020-12 under `components.schemas`. Host views the shells read: `colourTable` (every colour name to `#rrggbb`, for web-host `themeColour` and `backgroundColour`), `accentColour` and Swift `ThemeSet.accent` (apple-host tint), `shellPalette` and Kotlin `ThemeSet.palette()` (android-host `ShellPalette`; the secondary colour is the table colour). Colours resolve first, so the host settings and the installer overrides agree.

## Required interfaces
None.

## Integration
Web: import `resolveTheme` and `applyTheme` from `web/tokens.ts`, apply the result to `document.documentElement`, link `web/theme.css` for the shipped themes (`:root` is the default theme, `[data-theme=name]` the others), and construct `Background` from `web/background.ts` on a full-screen canvas with `setScene` for pictures. Apple: compile `ThemeTypes.swift`, `ThemeTokens.swift`, `BackgroundMath.swift` anywhere, and `ThemeBackgroundView.swift` in UIKit targets (iOS, tvOS, Mac Catalyst); read colours as `ThemeSet.named(name).resolved(primary:table:)` and `Color(themeColour)`. Android: add the three Kotlin files and `ThemeBackground.kt` to a Compose module; `ThemeSet.named(name).resolved(...)`. To change a look, edit `themes.json` and run `node web/build-tokens.ts themes.json --css DIR --swift DIR --kotlin DIR` to regenerate the three outputs; `tokens.schema.json` documents the shape and `validateTokens` enforces it. Other components (`controls`, `table-layout`, `card-graphics`, `chip-graphics`) read colours from these tokens.

## Visual definition and connected examples
`visual/definition.json` maps its ports to the provided and required interfaces. `visual/examples/connected.json` connects the component to an illustrative application consumer. Both image formats and a text description are in `visual/output/`.

## Infrastructure
None. Pure data, local rendering and on-device drawing. No accounts, network or deployment.

## Verification
Node tests check the token shape against the schema, that the OpenRPC interface's token schemas agree with `tokens.schema.json` and that every method it lists is an exported web function, overrides, CSS variable rendering, that the committed generated CSS, Swift and Kotlin equal what the renderers produce, and the background placement maths (visibility, fade, growth, figure boxes). The Apple check compiles the pure Swift files for macOS and runs `tests/apple/main.swift`, which compares every generated colour with `themes.json` and every glyph and speck frame with frames the TypeScript produced (`tests/fixtures/background.json`), then type-checks all Swift against the iOS simulator SDK. The Android check compiles the pure Kotlin files and runs `tests/android/Main.kt`; it needs kotlinc, which was not available where this was written, so it has not been run. Compose drawing (`ThemeBackground.kt`) is not compiled by any check here. No pixel output is compared.

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12, swiftc 6.4)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12, kotlinc 2.2, java 26.0)

## Scenarios and presentation
A recipe picks `lounge` for a home-games look and sets `primaryColour` to its brand colour; every client shows the same colours. A recipe with no scene pictures still gets the animated glyphs and specks. A new look is added by appending a theme to `themes.json` and regenerating.

## Updates and removal
Patch updates replace files only. Regenerate the CSS, Swift and Kotlin outputs after any change to `themes.json`. The component keeps no data; removal deletes its files and the generated outputs.
