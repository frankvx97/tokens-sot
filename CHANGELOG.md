# Changelog

All notable changes made during this session are documented here.

## [Unreleased]

## [1.2.1] - 2026-04-28

### Added
- **Effects exporter** with shadow and blur entry support across all formats. `ShadowTokenValue` now models `layer-blur` and `background-blur` entries alongside `drop-shadow` / `inner-shadow`.
- **Split effect groups** option (Multiple Files mode) — splits effect tokens into per-group files (e.g. `shadow.css`, `blur.css`) based on the first group-path segment. Sidebar/preview routing handles the split-effect collection labels.
- **Percent line-height** support for typography tokens — Figma `PERCENT` line-height values are preserved as `{ value, unit: 'percent' }` and rendered correctly across CSS, Sass, Less, Stylus, JS, JSON, and Tailwind v4 outputs.

### Fixed
- Effect, color, and body-baseline export bugs across the CSS, Sass, Less, Stylus, JavaScript, JSON, Tailwind v3, and Tailwind v4 exporters.

## [1.2.0] - 2026-04-18

### Added
- **CSS: Typography format toggle** (Configure → CSS → Typography Format). Switches between grouped `.text-{name} { ... }` utility classes (default) and flat per-axis custom properties (`--token-font-family`, `--token-font-size`, etc.).
- **CSS: HTML Element Defaults** section (Configure → CSS). Three opt-in toggles:
  - "Include body baseline" — emits a `body { ... }` rule from a user-selected body/paragraph token (dropdown populated from the current selection).
  - "Include h1–h6 element defaults" — maps heading tokens to `h1..h6` by font-size rank (capped at 6).
  - "Add text-wrap: balance to headings" — applies `text-wrap: balance` to heading utility classes and `h1..h6` rules.
- Heading/body detection driven by Figma group path (case-insensitive match for `heading(s)?` / `body|paragraph(s)?`).
- **Tailwind v4 exporter** — `@theme` directive with `--font-*`, `--text-*`, and `--text-*--{modifier}` naming; `@layer components` for `textTransform` and `textDecoration`.
- **DTCG JSON format** — W3C Design Tokens Community Group spec output (`$type` / `$value`) via the "Use DTCG format" option.
- **Sass/Less typography format toggle** — switch between the default map/variable shape and a mixins shape (`@mixin token-name { ... }` / `.token-name() { ... }`).
- **User-configurable font fallback stacks** per font family, auto-detected from selected typography tokens.
- **Output Format selector inside Configure modal** with live conditional sections for format-specific settings.
- 18 new unit tests covering heading/body predicates, `:root` wrapper behavior, body baseline emission, `h1..h6` ranking/capping, and text-wrap balance scoping.

### Fixed
- **Empty `:root {}` block**: typography-only CSS exports no longer emit a stray empty `:root { }` wrapper. The block is only written when it contains at least one declaration.
- **Modal glitch**: entry animations added to prevent a `backdrop-blur` flash where content was briefly visible before the blur composited.
- **Modal positioning**: switched from `transform: scale(...)` to CSS `scale` so the Radix translate-based centering isn't overridden.
- **Bound variables on text styles** now resolve — `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, and `letterSpacing` aliases are preserved in the exported output instead of being flattened to literals.
- **Lossy font shorthand** replaced with per-axis CSS custom properties so every typography dimension is individually addressable.
- **Letter-spacing float garbage** (e.g. `-0.6000000238418579`) is now rounded to 3 decimals before emission.
- **Multi-word font families** are quoted correctly in the output (`"DM Mono"`).
- **Font-weight string variables** (e.g. `Regular`, `Semibold`, `Bold`) convert to numeric CSS values (`400`, `600`, `700`).
- **Whitespace-only font fallback values** are treated as empty and don't produce stray commas in the font stack.

### Changed
- "Tailwind" format renamed to "Tailwind v3" to disambiguate from the new v4 exporter.
- `textCase` → `text-transform` and `textDecoration` → `text-decoration` support added to every exporter (previously CSS-only).

## [1.1.2] - 2026-03-14

### Fixed
- Multi-mode variable collections no longer produce duplicate tree-node IDs — each variable/mode pair now gets a unique node ID (`variable:<id>:mode:<modeId>`), while `NormalizedToken.id` retains the original Figma variable ID so export and alias logic is unaffected.
- `collectSelectableIds` now only marks `token` nodes as selectable; `mode` nodes are excluded, preventing accidental over-selection in multi-mode collections.

## [1.1.1] - 2026-02-28

### Added
- Resizable sidebar — drag the splitter between the sidebar and preview panel to adjust its width (min 200 px, max 70% of the window width).
- Expand button in the header bar that resizes the plugin window to fill the available screen area.

### Fixed
- Collection drag-to-reorder now persists visually without snapping back; the UI applies `collectionOrder` from settings immediately in the selector instead of waiting for a full bootstrap.
- Token names truncate with an ellipsis when the sidebar is narrow so the chevron icon is always visible; descriptions reflow to multiple lines instead of overflowing.
- Expanded tree items (modes, groups, leaf tokens) no longer overflow the sidebar boundary — caused by Radix ScrollArea wrapping children in a `display:table` element that bypassed `overflow-hidden` on all ancestors.
- Sidebar splitter used `document.getElementById` in a `useEffect`, which returned `null` during bootstrap and never re-ran. Rewritten with a React `onPointerDown` handler and `setPointerCapture` on the element itself, eliminating the DOM-timing bug and a leaked `pointermove` listener that caused lag on window resize.
- Plugin window expand/drag-resize no longer capped at 1800×1400 px — max is now 4096×4096 (Figma clamps to the actual viewport naturally).

## [1.1.0] - 2026-02-26

### Added
- You can now rename style groups directly in the sidebar.
- The plugin window now supports resizing and minimize/restore controls.
- Window size and minimized state are remembered between sessions.
- A version number is now shown in the sidebar.
- New option to include top-level collection/style names in exported token names.

### Changed
- UI controls are more consistent across the app.
- Configure modal has clearer option groups and better selection styling.
- Contrast and accessibility were improved for better readability.

### Fixed
- Code preview is clearer for CSS-like formats, including better value highlighting.
- Color previews now include swatches with improved visibility (including alpha/low-contrast colors).
- Resize handle icon direction/style was corrected.

---
