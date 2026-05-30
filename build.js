#!/usr/bin/env node
// build.js — Build production HTML with inlined JS bundle
// Usage: node build.js

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rollup } from 'rollup';
import resolvePlugin from '@rollup/plugin-node-resolve';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

console.log('🔨 Building NUSANTARA for production...\n');

// Step 1: Run Rollup to bundle JS
console.log('📦 Bundling JS modules with Rollup...');
let bundleJS;
try {
  const bundle = await rollup({
    input: resolve(root, 'js/game.js'),
    plugins: [resolvePlugin()],
  });
  const { output } = await bundle.generate({
    format: 'iife',
    name: 'Nusantara',
  });
  bundleJS = output[0].code;
  await bundle.close();
} catch (e) {
  console.error('❌ Rollup bundling failed!');
  console.error(e.message || e);
  process.exit(1);
}

console.log(`✅ Bundle created: ${(bundleJS.length / 1024).toFixed(1)} KB`);

// Also write raw bundle for debugging
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/bundle.js'), bundleJS, 'utf-8');

// Step 2: Generate production HTML
const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NUSANTARA: Warisan Terakhir</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:'Segoe UI',sans-serif}
canvas{display:block;margin:auto;image-rendering:pixelated}
#gameContainer{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
#loading{position:absolute;color:#D4AF37;font-size:18px;text-align:center;top:50%;left:50%;transform:translate(-50%,-50%)}
#loading .sub{font-size:12px;color:#D4AF3788;margin-top:8px}
</style>
</head>
<body>
<div id="gameContainer">
<canvas id="gameCanvas"></canvas>
<div id="loading">MEMUAT NUSANTARA...<div class="sub">Harap tunggu sebentar</div></div>
</div>
<script>
// NUSANTARA: Warisan Terakhir — Production Build (bundled)
${bundleJS}
</script>
</body>
</html>`;

// Step 3: Write production HTML
const outPath = resolve(root, 'dist/index.html');
writeFileSync(outPath, html, 'utf-8');

const htmlSize = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
console.log(`✅ Production HTML: ${htmlSize} KB → ${outPath}`);
console.log('\n🎉 Build selesai! Buka dist/index.html di browser.');
console.log('   Tidak perlu HTTP server — bisa langsung dari file://\n');
