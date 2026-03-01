/**
 * Reads the version from package.json and writes it to a VERSION file at the
 * project root. The version is exposed to the UI build via vite.config.ts
 * (as __APP_VERSION__) and displayed in the Credits section of the sidebar.
 *
 * NOTE: manifest.json intentionally does NOT include a version field —
 * Figma's manifest schema rejects unknown properties and will refuse to load
 * the plugin if version is present.
 *
 * Run automatically via the `version` lifecycle hook in package.json so the
 * sidebar version display always stays in sync after `npm version patch|minor|major`.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));

// Write a plain VERSION file for reference (optional, not consumed by the build)
fs.writeFileSync(path.join(root, 'VERSION'), pkg.version + '\n');
console.log(`Version synced to ${pkg.version}`);
