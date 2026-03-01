# Changelog

All notable changes made during this session are documented here.

## [Unreleased]

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
