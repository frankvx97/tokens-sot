# Test Suite: bugs-typography-improvements

**Branch:** `bugs-typography-improvements`
**Date:** 2026-04-07 (updated)
**Prerequisite:** Run `npm run build` and load the plugin in Figma.

---

## Prerequisites — Test Data Setup

Before running the tests, ensure your Figma file has these configured:

1. **A text style with bound variables** — e.g., a "Heading/2xl" style where font-family, font-size, font-weight, line-height, and letter-spacing properties are set via Figma variables from a "primitives" collection (not hardcoded values).
2. **A primitives variable collection** — containing font-weight variables (e.g., "fonts/weight/regular" = "Regular", "fonts/weight/semibold" = "Semibold"), font-size, line-height, letter-spacing, and font-family variables.
3. **A text style with `textCase: UPPER`** — e.g., a "Subheading" style set to uppercase in the text style editor.
4. **A text style with `textDecoration: UNDERLINE`** — e.g., a "Paragraph/md-link" style set to underline.
5. **A text style with a multi-word font family** — e.g., "DM Mono", "Fira Code", or "Source Sans Pro".
6. **A text style with negative letter-spacing** — e.g., a heading style with tracking like -0.6 or -1.0.
7. **At least one color style, one effect style, and one dimension variable** — to verify non-typography exports aren't broken.

---

## Priority Guide

Tests are organized into 4 priority tiers. Work through them in order — if P0 fails, stop and fix before continuing.

- **P0 — Blocker**: Plugin won't work or existing features are broken. Must pass before any release.
- **P1 — Critical**: Core deliverables for this branch. The main bugs and typography improvements.
- **P2 — Important**: New features (Tailwind v4, DTCG, utility classes). High value but lower risk.
- **P3 — Nice to have**: Polish, edge cases, and UX refinements. Can ship with known gaps.

---

## P0 — Blocker (14 tests)

*If any of these fail, the build is broken or existing functionality regressed. Test these first.*

### Build & Load

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 1.1 | Clean build | Run `npm run build` | Build completes with no errors (typecheck passes) | |
| 1.2 | Plugin loads | Open Figma, run the plugin | Plugin UI loads, Variables/Styles tabs work | |

### Non-Regression — Existing Features Must Still Work

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 13.1 | Color tokens (CSS) | Select color styles, export as CSS | Colors export correctly as `--{name}: #hex;` | |
| 13.2 | Color tokens (Sass) | Export colors as Sass | Colors export as `${name}: #hex;` | |
| 13.3 | Effect/shadow tokens | Export effect styles as CSS | Shadows export correctly with x, y, blur, spread, color | |
| 13.4 | Gradient tokens | Export gradient paint styles | Gradients export correctly as `linear-gradient(...)` | |
| 13.5 | Variables (non-style) | Switch to Variables tab, select variables, export | Variables export correctly in all formats | |
| 13.6 | Multi-file export | Configure > Multiple Files, export | Download produces ZIP with correct files per collection | |
| 13.7 | Casing options | Change Token Casing to camelCase, export | Token names use camelCase | |
| 13.8 | Copy button | Click Copy | Preview content is copied to clipboard | |

### Modal — Not Broken

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 2.2 | Modal is centered | Open Configure modal | Modal appears centered horizontally and vertically in the plugin window | |
| 2.4 | Modal close works | Click X button or Cancel | Modal closes, returns to main view | |
| 14.1 | Settings persist | Change settings, Save, re-open Configure | Previous settings are retained | |
| 14.4 | All existing settings work | Verify: Naming Convention, Color Format, Unit Format, Export Strategy, Advanced Options | All settings function as before | |

---

## P1 — Critical (47 tests)

*Core deliverables: the bugs being fixed and the typography improvements that motivated the branch.*

### Modal Glitch Fix (Bug)

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 2.1 | Modal opens smoothly | Click "Configure" button | Modal fades in smoothly with overlay blur. No flash of unblurred content behind the modal. | |
| 2.3 | Overlay blur visible | Open Configure modal | Dark semi-transparent overlay with blur effect covers the background content | |
| 2.5 | Repeat open/close | Open and close the modal 5 times quickly | No visual glitches, always centered, always smooth animation | |

### Configure Modal — Format Selector

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 15.1 | Format selector in modal | Open Configure modal | "Output Format" section appears at the top with all 8 formats (CSS, Sass, TW v3, TW v4, Less, Stylus, JS, JSON) in a 4-column grid | |
| 15.2 | Format syncs to main dropdown | Select "Less" in the modal format selector, Save | The main format dropdown now shows "Less" and the preview updates accordingly | |
| 15.3 | Format-specific sections react | Switch format inside the modal | Conditional sections update immediately: Typography toggle for Sass/Less, CSS Options for CSS, JSON Options for JSON | |
| 15.4 | Current format highlighted | Open Configure while Sass is selected | The "Sass" option is highlighted/active in the Output Format grid | |

### CSS Export — No More Shorthand (Bug)

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 6.1 | No font shorthand | Select Text styles, export as CSS | Typography tokens emit individual properties (`--{name}-font-family`, `--{name}-font-size`, `--{name}-line-height`, `--{name}-font-weight`, `--{name}-letter-spacing`), NOT a single shorthand like `56px/64px Outfit` | |
| 6.2 | All inside :root | Check CSS output structure | All custom properties are inside `:root { }` block | |
| 6.3 | Section comments | Check CSS output | Section comments like `/* Typography */` still appear | |
| 6.4 | Non-typography tokens unaffected | Select Color + Text styles, export as CSS | Color tokens still export as single `--{name}: #hex;` declarations | |

### Typography Alias Resolution (Bound Variables)

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 3.1 | Variable-bound text style loads | Select text styles that use variables, switch to Styles tab | Plugin loads without errors, styles appear in the sidebar | |
| 3.2 | CSS alias references | Select variable-bound text styles, export as CSS | Properties reference primitive variables: `--heading-2xl-font-family: var(--fonts-family-headings);` instead of hardcoded `Outfit` | |
| 3.3 | Sass alias references (map) | Same styles, export as Sass (Default format) | Map references variables: `font-family: $fonts-family-headings` instead of hardcoded value | |
| 3.4 | Sass alias references (mixins) | Same styles, export as Sass (Mixins format) | Mixin references variables: `font-family: $fonts-family-headings;` | |
| 3.5 | Font-weight alias resolved | Export a text style whose font-weight is bound to a variable | Font-weight shows variable reference (e.g., `$fonts-weight-semibold`) instead of hardcoded `600` | |
| 3.6 | Less alias references | Export variable-bound text styles as Less | Properties reference variables: `@fonts-family-headings` | |
| 3.7 | Fallback to resolved value | Export a text style where only some properties are variable-bound | Bound properties show alias references, unbound properties show resolved values | |
| 3.8 | Values match Figma | Compare exported resolved values against Figma's Design panel | font-size, line-height, font-weight, letter-spacing values match | |

### Font Weight String → Numeric Conversion

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 16.1 | Weight variables (Sass) | Select primitives > fonts collection, export as Sass | Weight variables show numeric values: `$fonts-weight-regular: 400;` `$fonts-weight-semibold: 600;` `$fonts-weight-bold: 800;` (not "Regular", "Semibold", "Extrabold") | |
| 16.2 | Weight variables (CSS) | Same collection, export as CSS | `--fonts-weight-regular: 400;` (numeric, not string) | |
| 16.3 | Weight variables (JSON) | Same collection, export as JSON | Values are numeric `400`, `500`, `600`, `800` (not `"Regular"`, `"Medium"`) | |
| 16.4 | Non-weight strings unaffected | Export a non-weight string variable (e.g., font-family "Outfit") | String is preserved as-is, not converted to a number | |

### textCase & textDecoration — All Formats

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 4.1 | textCase in CSS | Select a text style with UPPER case, export as CSS | Output includes `--{name}-text-transform: uppercase;` | |
| 4.2 | textDecoration in CSS | Select a text style with UNDERLINE, export as CSS | Output includes `--{name}-text-decoration: underline;` | |
| 4.3 | No transform when ORIGINAL | Select a normal text style (no case override), export as CSS | No `text-transform` property appears for that token | |
| 4.4 | textCase in Sass (default) | Select uppercase style, export as Sass (Default format) | Map includes `text-transform: uppercase` | |
| 4.5 | textDecoration in Sass (default) | Select underline style, export as Sass (Default format) | Map includes `text-decoration: underline` | |
| 4.7 | textCase in Less (default) | Select uppercase style, export as Less (Default format) | Output includes `@{name}-text-transform: uppercase;` | |
| 4.9 | textCase in Stylus | Select uppercase style, export as Stylus | Hash includes `text-transform: uppercase` | |
| 4.10 | textCase in JS | Select uppercase style, export as JavaScript | Object includes `textTransform: 'uppercase'` | |
| 4.11 | textDecoration in JS | Select underline style, export as JavaScript | Object includes `textDecoration: 'underline'` | |
| 4.12 | textCase in JSON | Select uppercase style, export as JSON (non-DTCG) | JSON value object contains `"textCase": "UPPER"` | |

### Typography Formatting Quality

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 5.1 | Multi-word font quoted (CSS) | Select a text style using "DM Mono" or similar, export as CSS | Font family appears as `"DM Mono"` (in double quotes) | |
| 5.2 | Multi-word font quoted (Sass) | Same, export as Sass | Font family appears as `"DM Mono"` | |
| 5.4 | Single-word font not quoted | Select a text style using "Outfit" or "Manrope", export as CSS | Font family appears as `Outfit` (no quotes) | |
| 5.5 | Letter-spacing rounded | Select a style with negative tracking, export as CSS | Letter-spacing value is rounded to max 3 decimal places (no float garbage like `-0.6000000238418579`) | |
| 5.6 | Font size respects px setting | Configure > Unit: px. Export as CSS | Font sizes appear as `16px`, `24px`, etc. | |
| 5.7 | Font size respects rem setting | Configure > Unit: rem. Export as CSS | Font sizes appear as `1rem`, `1.5rem`, etc. | |
| 5.8 | Line height AUTO | Select a style with AUTO line-height, export as CSS | Line height appears as `normal` | |
| 5.9 | Letter-spacing zero | Select a style with 0 letter-spacing, export as CSS | Letter spacing appears as `normal` | |

### Sass/Less Typography Format Toggle

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 8.1 | Toggle visible for Sass | Select Sass in format selector (main or modal), open Configure | "Typography" section with "Default / Mixins" toggle is visible | |
| 8.2 | Toggle visible for Less | Select Less format, open Configure | "Typography" section with "Default / Mixins" toggle is visible | |
| 8.5 | Default format (Sass) | Set Typography to Default, export Sass | Typography tokens exported as `$name: (font-family: ..., font-size: ..., ...);` map format | |
| 8.6 | Mixins format (Sass) | Set Typography to Mixins, export Sass | Typography tokens exported as `@mixin name { font-family: ...; font-size: ...; }` | |
| 8.7 | Default format (Less) | Set Typography to Default, export Less | Typography tokens exported as individual variables: `@name-font-family: ...;` `@name-font-size: ...;` | |
| 8.8 | Mixins format (Less) | Set Typography to Mixins, export Less | Typography tokens exported as `.name() { font-family: ...; font-size: ...; }` | |

---

## P2 — Important (32 tests)

*New features: Tailwind v4, DTCG JSON, CSS utility classes, font fallbacks. High value, but isolated — a bug here doesn't break existing exports.*

### Tailwind v3 Updates

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 10.1 | Label renamed | Open format selector dropdown | Shows "Tailwind v3" (not just "Tailwind") | |
| 10.2 | letterSpacing category | Select text styles, export as Tailwind v3 | Output includes a `letterSpacing: { ... }` section with typography token entries | |
| 10.3 | Font family quoted | Export a multi-word font in Tailwind v3 | Font family appears quoted: `['"DM Mono"']` | |
| 10.4 | Existing functionality | Export colors + spacing + shadows in Tailwind v3 | Non-typography tokens export correctly (colors, spacing, boxShadow) | |

### Tailwind v4

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 11.1 | Format available | Open format selector dropdown (or modal) | "Tailwind v4" option appears | |
| 11.2 | File extension | Check preview filename | Shows `.css` extension (not `.js`) | |
| 11.3 | @theme block | Select tokens, export as Tailwind v4 | Output starts with `@theme {` and contains CSS custom properties | |
| 11.4 | Color tokens | Export color tokens | Appear as `--color-{name}: #hex;` | |
| 11.5 | Spacing tokens | Export dimension/number tokens | Appear as `--spacing-{name}: 1rem;` or `16px` | |
| 11.6 | Typography — font family | Export text styles | Appears as `--font-{name}: ...;` (with alias ref if variable-bound) | |
| 11.7 | Typography — font size | Export text styles | Appears as `--text-{name}: ...;` (with alias ref if variable-bound) | |
| 11.8 | Typography — modifiers | Export text styles | Modifiers: `--text-{name}--line-height:`, `--text-{name}--font-weight:`, `--text-{name}--letter-spacing:` | |
| 11.9 | textCase companion | Export an uppercase text style | `@layer components` block appears with `.text-{name} { text-transform: uppercase; }` | |
| 11.10 | textDecoration companion | Export an underline text style | `@layer components` block includes `.text-{name} { text-decoration: underline; }` | |
| 11.11 | Shadow tokens | Export effect styles | Appear as `--shadow-{name}: ...;` | |
| 11.12 | No @layer when unnecessary | Export only styles without textCase/textDecoration | No `@layer components` block in output | |

### DTCG JSON Format

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 12.1 | Checkbox visible for JSON | Select JSON format (in modal), open Configure | "JSON Options" section with "Use DTCG format" checkbox appears | |
| 12.2 | Checkbox hidden for others | Select CSS format, open Configure | No "JSON Options" section | |
| 12.3 | File extension | Enable DTCG, check preview filename | Shows `.tokens.json` extension | |
| 12.4 | $type present | Enable DTCG, export | Each token has a `"$type"` field (e.g., `"color"`, `"typography"`, `"shadow"`) | |
| 12.5 | $value present | Check output | Each token has a `"$value"` field containing the structured value | |
| 12.6 | Nested groups | Export tokens with group paths (e.g., Heading/2xl) | Output is nested: `{ "Heading": { "2xl": { "$type": "typography", "$value": {...} } } }` | |
| 12.7 | Color format | Export a color token with DTCG | Value is `{ "colorSpace": "srgb", "components": [r, g, b] }` with optional `"alpha"` | |
| 12.8 | Dimension format | Export a dimension token with DTCG | Value is `{ "value": N, "unit": "px" }` | |
| 12.9 | Typography format | Export a text style with DTCG | Value has `fontFamily` (array), `fontSize` (dimension obj), `fontWeight` (number), `lineHeight`, `letterSpacing` | |
| 12.10 | Shadow format | Export an effect style with DTCG | Value has `color` (srgb obj), `offsetX`, `offsetY`, `blur`, `spread` as dimension objects | |
| 12.11 | $description | Export a token that has a description in Figma | Output includes `"$description": "..."` | |
| 12.12 | Standard JSON still works | Disable DTCG checkbox, export as JSON | Output uses the original flat format with raw values (no $type/$value) | |

### CSS Utility Classes

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 7.1 | Utility classes disabled by default | Export CSS without changing settings | No `.text-{name}` classes appear after `:root {}` | |
| 7.2 | Enable utility classes | Configure > CSS Options > check "Emit Utility Classes" | Checkbox appears only when CSS format is selected in the modal | |
| 7.3 | Composite utility classes | With checkbox on, export CSS with typography styles | After `:root {}`, a `/* Typography Utilities */` section appears with composite `.text-{name}` classes grouping all typography properties: `font-family: var(--{name}-font-family); font-size: var(...); line-height: var(...); font-weight: var(...); letter-spacing: var(...);` | |
| 7.4 | Utility includes textTransform | Enable utility classes, export an uppercase style | Utility class also includes `text-transform: var(--{name}-text-transform);` | |

---

## P3 — Nice to Have (16 tests)

*Edge cases, polish, and secondary format coverage. Won't block a release if some fail.*

### Font Fallbacks

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 9.1 | Fallbacks section visible | Select typography styles, open Configure | "Font Fallbacks" section appears at the bottom, listing each unique font family with an input field | |
| 9.2 | Correct placeholder | Check a monospace-like font (e.g., "DM Mono") | Placeholder reads `ui-monospace, monospace` | |
| 9.3 | Correct placeholder (sans) | Check a non-mono font (e.g., "Outfit") | Placeholder reads `system-ui, sans-serif` | |
| 9.4 | Enter fallback | Type `system-ui, sans-serif` in the Outfit input, Save | Setting is saved | |
| 9.5 | Fallback in CSS output | Export as CSS | Font family appears as `Outfit, system-ui, sans-serif` | |
| 9.6 | Fallback in Sass output | Export as Sass | Font family includes the fallback stack | |
| 9.7 | Fallback in Tailwind v4 | Export as Tailwind v4 | `--font-{name}` value includes the fallback stack | |
| 9.8 | No fallback when empty | Leave fallback input empty, export | Font family appears without any fallback stack | |
| 9.9 | No section when no typography | Deselect all text styles (only colors selected), open Configure | "Font Fallbacks" section does not appear | |

### Secondary Format Coverage & UI Polish

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 4.6 | textCase in Sass (mixins) | Configure > Typography: Mixins. Select uppercase style, export as Sass | Mixin block includes `text-transform: uppercase;` | |
| 4.8 | textCase in Less (mixins) | Configure > Typography: Mixins. Select uppercase style, export as Less | Mixin block includes `text-transform: uppercase;` | |
| 5.3 | Multi-word font quoted (Tailwind v3) | Export a multi-word font in Tailwind v3 | Font family appears as `'"DM Mono"'` inside the array | |

### Configure Modal — Secondary UI

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 8.3 | Toggle hidden for CSS | Select CSS format in modal, check sections | No "Typography" toggle section appears | |
| 8.4 | Toggle hidden for JSON | Select JSON format in modal, check sections | No "Typography" toggle section appears | |
| 14.2 | Cancel discards | Change settings, Cancel, re-open Configure | Settings revert to the values before the change | |
| 14.3 | Format-specific sections toggle | Switch between formats inside the modal | Typography toggle shows only for Sass/Less. CSS Options only for CSS. JSON Options only for JSON. Transitions happen live as you click format options. | |

---

## Test Summary

| Priority | Category | Tests | Passed | Failed | Notes |
|----------|----------|-------|--------|--------|-------|
| **P0** | Build & Load | 2 | | | |
| **P0** | Non-Regression | 8 | | | |
| **P0** | Modal — Not Broken | 4 | | | |
| | | **14** | | | |
| **P1** | Modal Glitch Fix | 3 | | | |
| **P1** | Modal Format Selector | 4 | | | |
| **P1** | CSS No Shorthand | 4 | | | |
| **P1** | Alias Resolution | 8 | | | |
| **P1** | Font Weight Conversion | 4 | | | |
| **P1** | textCase/textDecoration | 10 | | | |
| **P1** | Formatting Quality | 8 | | | |
| **P1** | Sass/Less Toggle | 6 | | | |
| | | **47** | | | |
| **P2** | Tailwind v3 | 4 | | | |
| **P2** | Tailwind v4 | 12 | | | |
| **P2** | DTCG JSON | 12 | | | |
| **P2** | CSS Utility Classes | 4 | | | |
| | | **32** | | | |
| **P3** | Font Fallbacks | 9 | | | |
| **P3** | Secondary Formats | 3 | | | |
| **P3** | Modal UI Polish | 4 | | | |
| | | **16** | | | |
| | **Total** | **109** | | | |
