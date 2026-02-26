const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// Read the built HTML file
const distDir = path.join(__dirname, '../dist');
const htmlPath = path.join(distDir, 'index.html');
let htmlContent = '<html><body><div id="root">Loading...</div></body></html>';

console.log('Looking for HTML at:', htmlPath);

// If HTML file exists (UI was built first), use it
if (fs.existsSync(htmlPath)) {
  htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  console.log('HTML file found and loaded');

  const scriptTagRegex = /<script type="module"[^>]*src=["'](.+?)["'][^>]*><\/script>/;
  const styleTagRegex = /<link rel="stylesheet"[^>]*href=["'](.+?)["'][^>]*>/;

  const inlineAsset = (match, assetPath, type) => {
    const cleanedPath = assetPath.replace(/^\.\//, '');
    const absoluteAssetPath = path.join(distDir, cleanedPath);

    if (!fs.existsSync(absoluteAssetPath)) {
      console.warn(`Unable to inline ${type}: ${absoluteAssetPath} not found.`);
      return match;
    }

    const content = fs.readFileSync(absoluteAssetPath, 'utf-8');
    return type === 'script'
      ? `<script type="module">\n${content}\n</script>`
      : `<style>\n${content}\n</style>`;
  };

  htmlContent = htmlContent.replace(scriptTagRegex, (match, assetPath) => inlineAsset(match, assetPath, 'script'));
  htmlContent = htmlContent.replace(styleTagRegex, (match, assetPath) => inlineAsset(match, assetPath, 'style'));
} else {
  console.warn('HTML file not found, using placeholder');
}

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'cjs',
  target: 'es2017',
  outfile: 'dist/code.js',
  platform: 'browser',
  define: {
    __html__: JSON.stringify(htmlContent)
  }
};

console.log('Starting esbuild...');

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  }).catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
} else {
  esbuild.build(buildOptions)
    .then(() => console.log('Build complete!'))
    .catch(err => {
      console.error('Build failed:', err);
      process.exit(1);
    });
}
