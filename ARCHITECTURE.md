# Tokens SOT Plugin — Architecture Overview

## Runtime surfaces
- **Main (plugin) thread**: Initializes the UI, loads data from the Figma document (variables, styles, metadata), responds to UI requests, and orchestrates export/download operations that require Figma APIs (e.g., `exportAsync`, `clientStorage`).
- **UI (React) thread**: Presents the two-panel interface, manages user interactions, generates preview code, and triggers copy/download actions via postMessage to the main thread.

## Message contract
All cross-thread communication uses a typed message bus. Messages are grouped by domain:
- `init` — main → UI bootstrap payload with document data, saved settings, and plugin user info.
- `request` — UI → main actions (refresh data, download file, persist storage, close plugin).
- `event` — main → UI responses (updated data, save confirmations, errors).

## Data model
- **TokenSource** — discriminated union for Figma Variables, Figma Styles, and Manual entries. Each source resolves to a normalized `TokenNode` tree with collections/groups/items.
- **TokenValue** — normalized representation (color, typography, dimension, shadow) respecting modes/themes and alias resolution metadata.
- **ConfigState** — format, casing, color mode, unit, export split strategy, boolean flags.
- **SelectionState** — set of selected node IDs with parent-child propagation.

## State management
- React context + reducer for global plugin state (tokens, selection, config, sync status).
- Derived selectors compute filtered lists for the preview and exporters.
- Persistent settings/selections stored via `clientStorage` (global defaults) and `figma.currentPage.setSharedPluginData` for file-level overrides when available.

## UI composition
- **Shell** — Sidebar + Content layout using Tailwind grid.
- **Sidebar**
  - Segmented control (Variables / Styles) using shadcn `ToggleGroup`.
  - Accordion tree with lazy collections/groups, checkbox multi-select logic, scrollbar auto-hide.
  - "Add Manual" button launching modal for JSON paste/upload.
- **Content panel**
  - Toolbar: Format dropdown, Configure button (opens modal), Copy & Download buttons.
  - Code preview with Prism.js + JetBrains Mono styling, dark theme.
  - Status toasts for copy/download.
- **Modals**
  - Manual token modal (JSON validation, error display).
  - Configure modal (form controls for options, Save/Cancel, persists on save).

## Export pipeline
1. **Normalization**: Convert selected tokens into canonical representation.
2. **Transformation**: Apply casing, unit conversion, alias resolution, mode flattening according to config.
3. **Formatting**: Generate string output per target format (CSS, Sass, Tailwind, Stylus, JS, JSON, Less).
4. **Packaging**: Build single or multiple files; optionally create index that imports sub-files. Download via main thread using `figma.ui.postMessage` + `figma.createNodeFromSvg` fallback for binary blob (converted to base64).

## Testing strategy
- Unit tests with Vitest for normalization, transformations, casing.
- Integration tests via jsdom-powered React Testing Library for selection logic.
- Placeholder Playwright spec referencing future E2E steps.

## Build system
- Vite for UI (React + Tailwind + shadcn) output to `dist/ui.html`.
- esbuild for main thread bundling to `dist/code.js`.
- `npm run build` orchestrates both bundles and type checks. Watch mode via `npm run dev`.
