# Tokens SOT — Claude Code Notes

## Project Overview

Figma plugin that extracts design tokens (variables + styles) and exports them to CSS, Sass, Less, Stylus, JavaScript, JSON, Tailwind v3, and Tailwind v4.

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS
- **UI Primitives**: Radix UI (Dialog, Checkbox, ToggleGroup, Select)
- **Build**: `npm run build` (UI via Vite, plugin main via esbuild, then typecheck)

## Architecture

```
src/
  main/figma/       # Figma plugin sandbox code (runs in Figma's main thread)
    styles.ts        # Style extraction: text, paint, effect styles → NormalizedToken
    variables.ts     # Variable extraction with alias resolution
  shared/
    types.ts         # Shared types: TokenFormat, ExportOptions, TypographyTokenValue, etc.
    messages.ts      # Plugin ↔ UI message types
  ui/
    pages/App.tsx    # Main app shell, format selector, preview, export actions
    state/           # React context state (app-state.tsx) + selectors
    components/      # UI components (modals, sidebar, common)
    exporters/       # Format-specific renderers (css.ts, sass.ts, tailwindv4.ts, etc.)
    utils/           # Formatting utilities (units.ts, casing.ts, color.ts)
```

## Typography Export System

### Extraction (`src/main/figma/styles.ts`)
- `convertTextStyle()` is async — reads `style.boundVariables` to resolve Figma variable bindings
- Extracts: fontFamily, fontStyle, fontWeight, fontSize, lineHeight, letterSpacing, paragraphSpacing, textCase, textDecoration
- Stores variable alias references (fontFamilyAlias, fontSizeAlias, etc.) when properties are bound to variables

### Export Formats for Typography

| Format | Typography Output |
|--------|-------------------|
| **CSS** | Individual custom properties per axis (`--token-font-family`, `--token-font-size`, etc.). Optional `.text-{name}` utility classes via `emitUtilityClasses` option. |
| **Sass** | Default: Sass map `(font-family: ..., font-size: ..., text-transform: ...)`. Mixins mode: `@mixin token-name { ... }` via `typographyFormat: 'mixins'` |
| **Less** | Default: Individual variables (`@token-font-family`, etc.). Mixins mode: `.token-name() { ... }` via `typographyFormat: 'mixins'` |
| **Stylus** | Hash object with all properties |
| **JavaScript** | Object with fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textTransform, textDecoration |
| **JSON** | Raw value object. DTCG mode: `$type`/`$value` structure per W3C spec (`.tokens.json`) |
| **Tailwind v3** | `module.exports` with fontFamily, fontSize, fontWeight, letterSpacing categories |
| **Tailwind v4** | CSS `@theme` directive with `--font-*`, `--text-*`, `--text-*--{modifier}` naming. `@layer components` for textTransform/textDecoration |

### Key Utilities (`src/ui/utils/units.ts`)
- `roundTo()` — Cleans IEEE 754 float garbage in letterSpacing
- `quoteFontFamily()` — Wraps multi-word families in quotes (e.g., "DM Mono")
- `buildFontStack()` — Combines quoted family + user-configured fallbacks
- `mapTextCase()` / `mapTextDecoration()` — Figma enum → CSS value mapping
- `formatLetterSpacing()` / `formatWithUnit()` — Applies rounding and px/rem conversion

### ExportOptions Typography Fields
- `typographyFormat: 'default' | 'mixins'` — Sass/Less typography output style
- `useDTCG: boolean` — JSON DTCG standard compliance
- `emitUtilityClasses: boolean` — CSS utility class generation
- `fontFallbacks: Record<string, string>` — Per-family fallback stacks

## Configure Modal

Format-specific sections appear conditionally:
- **Sass/Less**: Typography Format toggle (Default / Mixins)
- **CSS**: "Emit Utility Classes" checkbox
- **JSON**: "Use DTCG format" checkbox
- **All formats**: Font Fallbacks editor (auto-detects families from selected typography tokens)

## Dialog Animation

The modal overlay uses `backdrop-blur-[8px]` which requires a paint frame to compute. Entry animations (`animate-dialog-overlay-in`, `animate-dialog-content-in`) defined in `tailwind.config.ts` prevent a visual glitch where content was briefly visible before blur rendered.
