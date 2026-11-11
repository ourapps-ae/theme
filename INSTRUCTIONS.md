# Theme instructions

## For the agent
Select `ourapps-ae/theme`; set `themeName` from the recipe's look answer and the two colour settings (written `hex rrggbb`) only when the user gave brand colours. Include the web, Apple and Android parts for the targets the recipe builds. Connect `theme` to every component that requires it (controls, table-layout, card-graphics, chip-graphics, and the host shells).

- Select package `ourapps-ae/theme` version `0.4.0`.
- Settings to configure:
  - `themeName` (string, slug; optional; default `night`)
  - `primaryColour` (string, label; optional)
  - `tableColour` (string, label; optional)
- Connect the provided `theme` (ae/theme 1.0.0, OpenRPC 1.3.2 document `interfaces/theme.json`) to the consumer that needs it.
- No accounts or keys are needed.

## For the developer
Supply scene pictures (a backdrop and an optional foreground figure per theme) and load them in your application; pass them to `Background.setScene`, `BackgroundScene` (Swift) or `BackgroundScene` (Kotlin). Add themes in `themes.json`, then run the build script to regenerate `theme.css`, `ThemeTokens.swift` and `ThemeTokens.kt`. Do not edit generated files.

Hosts: pass `colourTable(resolveTheme(file, settings))` as the `colours` option of web-host `webHostConfig`; pass `ThemeSet.accent` (Swift) as the apple-host `ShellConfiguration.tint`; pass `ThemeSet.palette()` fields to android-host `ShellPalette`.

## How to check
From the component directory:

- `node --test tests/web.test.ts` (web, required-local; tools: node 26.5)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12, swiftc 6.4)
- `python3 tests/native.py android` (android, platform; tools: python3 3.12, kotlinc 2.2, java 26.0)
- `python3 -m aepm review <digest> --store STORE --policy POLICY --trusted --allow-network` checks an archive fetched with `python3 -m aepm fetch ourapps-ae/theme@VERSION --store STORE --from https://ourapps.app` and runs its suites.
