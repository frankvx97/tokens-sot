/**
 * Reads the version from package.json and writes it into manifest.json.
 * Run automatically via the `version` lifecycle hook in package.json so
 * manifest.json always stays in sync after `npm version patch|minor|major`.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.version = pkg.version;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json version synced to ${pkg.version}`);
