# AGENTS.md

This guide is for agentic coding assistants working in this repo.

## Repository overview
- Figma plugin with two runtimes:
- Main thread (plugin): `src/main.ts` uses Figma APIs.
- UI thread (React): `src/ui/main.tsx` and `src/ui/pages`.
- Cross-thread messages are typed in `src/shared/messages.ts`.
- Token models live in `src/shared/types.ts`.
- UI build output in `dist/` and inlined by `scripts/build-plugin.cjs`.

## Commands
### Install
- `npm install`

### Build
- Full build: `npm run build` (UI + main + typecheck).
- UI only: `npm run build:ui` (Vite, outputs `dist/index.html`).
- Main only: `npm run build:main` (esbuild, outputs `dist/code.js`).

### Dev / watch
- `npm run dev` (watch main + UI).
- UI only: `npm run dev:ui`.
- Main only: `npm run dev:main`.

### Lint
- `npm run lint`
- `npm run lint:fix`

### Typecheck
- `npm run typecheck`

### Tests (Vitest)
- `npm test` (same as `vitest`).
- Run a single test file: `npx vitest path/to/file.test.ts`.
- Run a single test by name: `npx vitest -t "test name"`.
- Run a single file and test name: `npx vitest path/to/file.test.ts -t "test name"`.

Note: No test files were found in the repo right now.

### Versioning (patch/minor/major)
This repo uses `npm version` to bump `package.json`, sync `manifest.json`, build, and create a git tag — all in one command.

**Release workflow:**
1. Ensure the working tree is clean (commit or stash any changes first).
2. Run the appropriate version command:
   - Patch release (x.y.Z): `npm version patch -m "chore(release): %s"`
   - Minor release (x.Y.0): `npm version minor -m "chore(release): %s"`
   - Major release (X.0.0): `npm version major -m "chore(release): %s"`
3. Push the commit and tag: `git push origin <branch> --follow-tags`
4. Open a PR from the release branch into `main`.

What `npm version` does automatically (via the `version` lifecycle hook):
- Runs `npm run build` (full build + typecheck).
- Runs `node scripts/sync-manifest-version.cjs` to write the new version into a `VERSION` text file at the project root (for reference only).
- Stages `dist/` and `VERSION` so they are included in the version commit.
- Creates an annotated git tag `v<version>` (e.g. `v1.2.3`).

> **Important:** `manifest.json` intentionally has no `version` field — Figma rejects unknown
> properties and will refuse to load the plugin if one is present. Do not add it.

On tag push, `.github/workflows/release.yml` runs the build again in CI, verifies that
`package.json` and the git tag contain the same version number, and asserts that
`manifest.json` contains no `version` field.

## Editor / tooling rules
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot rules found in `.github/copilot-instructions.md`.

## Code style guidelines
### General
- Use TypeScript with `strict` mode (see `tsconfig.json`).
- Prefer explicit types at module boundaries and for complex objects.
- Keep functions focused; extract helpers for repeated logic.
- Do not edit generated files in `dist/`.
- Preserve existing patterns and architecture.

### Imports
- External packages first, then internal modules.
- Use `import type` for type-only imports.
- Prefer path alias `@/` for `src/` (see `tsconfig.json` and `vite.config.ts`).
- Avoid circular imports between `main/`, `ui/`, and `shared/`.

### Formatting
- Follow existing file style; do not reformat unrelated code.
- Most files use 2-space indentation; some exporters use tabs. Match local file.
- Use single quotes for strings (consistent with existing code).
- Keep JSX props on one line unless readability suffers.
- Use trailing commas where already present in the file.

### Naming
- Components: `PascalCase` and `React.FC` or `FC` typing.
- Hooks: `useX`.
- Types and interfaces: `PascalCase`.
- Variables and functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for module-level constants.
- Token identifiers: keep `id`/`key`/`name` semantics from `src/shared/types.ts`.

### React / UI
- UI lives under `src/ui/` and uses Tailwind classes.
- Prefer small components; keep logic close to UI when simple.
- Use `useMemo`/`useCallback` for derived values and handlers used in lists.
- Access global state via `useAppState`/`useAppDispatch` from `src/ui/state/app-state.tsx`.
- Send plugin messages via `usePluginBridge`.

### State and messaging
- Message contracts are typed in `src/shared/messages.ts`; update both sides if you change them.
- Main thread must guard Figma API usage; see `src/main.ts` error handling patterns.
- UI should be resilient to missing data and show fallbacks.

### Error handling
- Wrap Figma API calls with `try/catch` and log errors.
- In main thread, report errors back to UI with `{ type: 'error' }` messages.
- In UI, catch exporter errors and fall back to empty output or friendly notices.
- Avoid swallowing errors silently; use `console.error` with context.

### Types and data
- Token modeling is centralized in `src/shared/types.ts`; do not duplicate types.
- `TokenTreeNode` represents tree structure; `NormalizedToken` represents leaf tokens.
- When adding new token kinds or formats, update both types and renderers.

### Export pipeline
- Exporters live in `src/ui/exporters/` and should be pure functions.
- Keep formatter output deterministic and stable.
- Use `buildTokenSections` and `buildExportChunks` for grouping.

### Styling / Tailwind
- Tailwind config is in `tailwind.config.ts`.
- Use `cn` helper (`src/ui/utils/cn.ts`) for conditional classes.
- Reuse UI primitives in `src/ui/components/ui/`.

### Testing
- Use Vitest + React Testing Library (deps already installed).
- Put tests next to code or in `src/` with `.test.ts(x)` naming.
- Prefer testing exported functions and user behavior over implementation details.

## Architecture references
- `ARCHITECTURE.md` (if present) describes runtime surfaces and message flow.
- UI entry: `src/ui/main.tsx`.
- Main entry: `src/main.ts`.
- Plugin manifest: `manifest.json`.

## File map
- `src/main/figma/` Figma API data loaders.
- `src/ui/pages/` page-level UI.
- `src/ui/components/` reusable components.
- `src/ui/state/` state and selectors.
- `src/ui/utils/` formatting helpers.
- `scripts/` build tooling.

## Common tasks
### Add a new export format
- Define format in `TokenFormat` and UI selector.
- Add renderer in `src/ui/exporters/` and wire into `RENDERERS`.
- Update `buildExportArtifacts` logic if format needs special chunking.

### Add a new settings option
- Extend `ExportOptions` in `src/shared/types.ts`.
- Update defaults in `src/main.ts` and `src/ui/state/app-state.tsx`.
- Add controls in `src/ui/components/modals/ConfigureModal.tsx`.

## Notes for agents
- Prefer edits in `src/`; do not modify `dist/`.
- Keep watch/build commands in mind: UI HTML is inlined into `dist/code.js`.
- If unsure about UI vs main thread behavior, check `src/main.ts`, `src/ui/state/app-state.tsx`, and `src/shared/messages.ts` first.

## Conventions observed
- ESLint rules are defined in `package.json`.
- `@typescript-eslint/no-unused-vars` ignores underscore-prefixed args/vars.
- React 19 with JSX runtime (`react-jsx`).

## Safety
- Do not add secrets or credentials to the repo.
- Avoid changes that require Figma permissions without documenting them.
