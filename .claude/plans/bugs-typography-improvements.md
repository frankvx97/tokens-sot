# Tokens SOT: Bugs, Typography Improvements & Language Support

## Context

The Tokens SOT Figma plugin exports design tokens (variables + styles) to CSS, Sass, Less, Stylus, JavaScript, JSON, and Tailwind formats. Typography export was broken across all formats: CSS used a lossy `font` shorthand, `textCase` and `textDecoration` were never emitted, multi-word font families were unquoted, letter-spacing had float garbage, Figma variable bindings on text styles were not resolved, and font-weight string variables weren't converted to numeric CSS values. The Export Configuration modal had a visual glitch, and the plugin needed Tailwind v4 and DTCG JSON support.

**Status:** All phases implemented. Document reflects the final state of the code.

---

## Phase 0: Shared Foundation (Types + Utilities) -- DONE

### 0.1 — Extended types (`src/shared/types.ts`)

- Added `'tailwindv4'` to `TokenFormat` union
- Added `TypographyFormat = 'default' | 'mixins'` type
- Added to `ExportOptions`: `typographyFormat`, `useDTCG`, `emitUtilityClasses`, `fontFallbacks`
- Added alias fields to `TypographyTokenValue.value`: `fontFamilyAlias`, `fontSizeAlias`, `lineHeightAlias`, `letterSpacingAlias`, `fontWeightAlias`

### 0.2 — Added defaults (`src/ui/state/app-state.tsx`)

- `typographyFormat: 'default'`, `useDTCG: false`, `emitUtilityClasses: false`, `fontFallbacks: {}`

### 0.3 — Typography formatting utilities (`src/ui/utils/units.ts`)

- `roundTo(value, decimals=3)` — Cleans IEEE 754 float garbage
- `quoteFontFamily(family)` — Wraps multi-word families in quotes
- `buildFontStack(family, fallbacks)` — Combines quoted family + user-configured fallback
- `mapTextCase(textCase)` — Figma enum → CSS (`UPPER→uppercase`, etc.)
- `mapTextDecoration(textDecoration)` — Figma enum → CSS (`UNDERLINE→underline`, etc.)
- `isLikelyFontWeight(name, groupPath)` — Detects weight tokens by name/path containing "weight"
- `mapFontWeightString(value)` — Converts weight names to CSS numeric values (`Regular→400`, `Semibold→600`, `Extrabold→800`, etc.)
- `TypoPropertyValue` interface for alias-or-literal rendering
- Updated `formatLetterSpacing` and `formatWithUnit` to apply rounding

---

## Phase 1: Modal Glitch Fix -- DONE

### 1.1 — Entry animations (`src/ui/components/ui/dialog.tsx`, `tailwind.config.ts`)

**Root cause**: `backdrop-blur-[8px]` needs a paint frame to compute. No animation = instant appearance = blur lag.

**Fix**:
- Keyframes in `tailwind.config.ts`: `dialog-overlay-in` (opacity fade 150ms) and `dialog-content-in` (opacity + `scale` 200ms)
- Applied `animate-dialog-overlay-in` on `DialogOverlay`, `animate-dialog-content-in` on `DialogContent`

**Modal positioning fix**: Initial implementation used `transform: translate(-50%, -48%) scale(0.96)` in the keyframe, which removed the `-translate-x-1/2 -translate-y-1/2` Tailwind classes from the resting state. After the animation ended, the element lost its centering and appeared in the bottom-right corner. Fixed by:
1. Keeping Tailwind's `-translate-x-1/2 -translate-y-1/2` classes on `DialogContent`
2. Using the CSS `scale` property (not `transform`) in the keyframe so it doesn't conflict with the translate centering

---

## Phase 2: Typography Extraction — Resolve Bound Variables -- DONE

### 2.1 — Read `boundVariables` in `convertTextStyle` (`src/main/figma/styles.ts`)

- Made `convertTextStyle` async, propagated through `toStyleValue` → `createStyleTokenNode`
- Converted `styles.forEach` to `for...of` loop for async support
- Added `resolveVariableName()` helper using `figma.variables.getVariableByIdAsync()`
- For each property, checks `style.boundVariables[prop]` and resolves variable name
- **Key fix**: Font weight binds through `fontStyle` in Figma's API, not `fontWeight`. Code checks `bindings?.fontStyle ?? bindings?.fontWeight`
- Stores alias names in `fontFamilyAlias`, `fontSizeAlias`, `fontWeightAlias`, `lineHeightAlias`, `letterSpacingAlias`

---

## Phase 3: Fix Typography Export in All Formatters -- DONE

All formatters now: round values, quote fonts, emit textCase/textDecoration, preserve alias references, and convert font-weight strings to numeric CSS values.

### 3.1 — CSS (`src/ui/exporters/css.ts`)

- Emits individual custom properties per axis: `--{name}-font-family`, `--{name}-font-size`, etc.
- When a property has an alias (bound variable), emits `var(--{alias-name})` instead of the resolved value
- `/* Typography Utilities */` separator + composite `.text-{name}` classes when `emitUtilityClasses` is enabled (same file, after `:root {}`)
- Font weight strings converted via `isLikelyFontWeight` + `mapFontWeightString`

### 3.2 — Sass (`src/ui/exporters/sass.ts`)

- **Default format**: Map with alias references (`font-family: $fonts-family-headings`) or resolved values as fallback
- **Mixins format**: `@mixin name { ... }` with same alias/fallback logic
- `formatSassAliasRef()` helper converts alias name → `$cased-name`

### 3.3 — Less (`src/ui/exporters/less.ts`)

- **Default format**: Individual variables with alias references (`@fonts-family-headings`) or resolved values
- **Mixins format**: `.name() { ... }` with same alias/fallback logic
- `formatLessAliasRef()` helper converts alias name → `@cased-name`

### 3.4 — Stylus (`src/ui/exporters/stylus.ts`)

- Hash object with alias references or resolved values, plus textCase/textDecoration

### 3.5 — JavaScript (`src/ui/exporters/javascript.ts`)

- Object with `@alias cased-name` references for bound properties, textTransform/textDecoration

### 3.6 — Tailwind v3 (`src/ui/exporters/tailwind.ts`)

- Added `letterSpacing` category + `formatLetterSpacingPayload`
- Quoted multi-word font families

### 3.7 — JSON (`src/ui/exporters/json.ts`)

- Rounded `letterSpacing` values
- Font weight strings converted to numeric for weight tokens

### Cross-cutting: Font Weight String → Numeric

All exporters check `isLikelyFontWeight(token.name, token.groupPath)` for string-type tokens. If the path contains "weight" and the value matches a known weight name, it's converted to numeric (e.g., `"Semibold" → 600`).

---

## Phase 4: New Language Support -- DONE

### 4.1 — Renamed Tailwind → Tailwind v3 (`src/ui/components/common/FormatSelector.tsx`)

Label changed to `'Tailwind v3'`, internal value stays `'tailwind'`.

### 4.2 — Tailwind v4 (`src/ui/exporters/tailwindv4.ts`) -- NEW FILE

- CSS `@theme` directive with `--color-*`, `--spacing-*`, `--font-*`, `--text-*`, `--text-*--{modifier}`, `--shadow-*`
- Typography alias references via `var(--{alias-name})`
- `@layer components` for textCase/textDecoration companion classes
- Registered in `index.ts`, `sections.ts` (extension: `.css`), `FormatSelector.tsx`

### 4.3 — DTCG JSON (`src/ui/exporters/json.ts`)

- `renderDTCGJSON()` activated when `options.useDTCG === true`
- `$type`, `$value`, `$description` per DTCG spec (designtokens.org/tr/2025.10)
- Nested groups by `groupPath`, dimension objects `{ value, unit }`, srgb color objects
- File extension `.tokens.json` via `buildFileName` in `sections.ts`

---

## Phase 5: Configure Modal UI -- DONE

### 5.0 — Output Format selector (`src/ui/components/modals/ConfigureModal.tsx`)

- Added "Output Format" `OptionGroup` at the top of the modal with all 8 formats in a 4-column grid
- Synced with main dropdown via `activeFormat` prop (read) and `onFormatChange` callback (write)
- Conditional sections react live as the user switches formats inside the modal
- `OptionGroup` grid updated to support 4+ columns (`grid-cols-4`)

### 5.1 — Typography Format toggle

- Visible when `activeFormat === 'sass' || activeFormat === 'less'`
- `OptionGroup` with "Default" / "Mixins" options

### 5.2 — DTCG checkbox

- Visible when `activeFormat === 'json'`
- `CheckboxRow` "Use DTCG format"

### 5.3 — CSS Utility Classes checkbox

- Visible when `activeFormat === 'css'`
- `CheckboxRow` "Emit Utility Classes"

### 5.4 — Font Fallbacks editor

- Visible when typography tokens are selected (any format)
- Lists unique font families with text inputs for fallback stacks
- Monospace-like fonts get `ui-monospace, monospace` placeholder; others get `system-ui, sans-serif`
- Uses `getSelectedTokens()` + `useMemo` to derive unique families

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/shared/types.ts` | TokenFormat union, TypographyFormat type, ExportOptions fields, TypographyTokenValue alias fields |
| `src/ui/state/app-state.tsx` | Default export options |
| `src/ui/utils/units.ts` | roundTo, quoteFontFamily, buildFontStack, mapTextCase, mapTextDecoration, isLikelyFontWeight, mapFontWeightString, TypoPropertyValue |
| `src/ui/components/ui/dialog.tsx` | Animation classes (overlay + content) |
| `tailwind.config.ts` | Keyframes (scale-based, not transform) + animation definitions |
| `src/main/figma/styles.ts` | Async convertTextStyle, boundVariables resolution (fontStyle key for weight), resolveVariableName helper |
| `src/ui/exporters/css.ts` | Individual custom properties, alias var() references, composite utility classes, font weight conversion |
| `src/ui/exporters/sass.ts` | Alias $-references, map + mixin formats, font weight conversion |
| `src/ui/exporters/less.ts` | Alias @-references, individual vars + mixin formats, font weight conversion |
| `src/ui/exporters/stylus.ts` | Alias references, textCase/textDecoration, font weight conversion |
| `src/ui/exporters/javascript.ts` | Alias @alias references, textTransform/textDecoration, font weight conversion |
| `src/ui/exporters/tailwind.ts` | letterSpacing category, font quoting, font weight conversion |
| `src/ui/exporters/json.ts` | DTCG rendering, letterSpacing rounding, font weight conversion |
| `src/ui/exporters/tailwindv4.ts` | **New file** — @theme exporter with alias references |
| `src/ui/exporters/index.ts` | Register tailwindv4 renderer |
| `src/ui/exporters/sections.ts` | tailwindv4 extension, DTCG .tokens.json extension |
| `src/ui/components/common/FormatSelector.tsx` | Rename Tailwind v3, add Tailwind v4, ExportFormat type |
| `src/ui/pages/App.tsx` | Pass activeFormat + onFormatChange to ConfigureModal, tailwindv4 in language map |
| `src/ui/components/modals/ConfigureModal.tsx` | Output Format selector, Typography toggle, DTCG checkbox, CSS utility classes checkbox, Font Fallbacks editor, activeFormat/onFormatChange props |

## Key Decisions Made During Implementation

1. **Letter-spacing unit**: Follows existing px/rem setting — no em conversion
2. **Font fallbacks**: User-configurable per-family in the Configure modal
3. **CSS utility classes**: Same file with `/* Typography Utilities */` separator (not a separate file — avoids preview navigation complexity)
4. **Dialog animation**: Uses CSS `scale` property in keyframe, not `transform`, to avoid overriding Tailwind's translate centering
5. **Font-weight binding**: Figma binds weight through `fontStyle` key, not `fontWeight` — checked both with fallback
6. **Format selector**: Added inside Configure modal with live sync to main dropdown — conditional sections update immediately
