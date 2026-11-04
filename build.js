#!/usr/bin/env node
// Bundles src/ into the single-file game (crater-critters.html).
//   node build.js          build once
//   node build.js --watch  rebuild whenever src/ changes
// No dependencies: src/index.html is a template with <!--STYLE--> and <!--SCRIPT-->
// placeholders; src/style.css is inlined; src/js/*.js are concatenated in
// filename order (_header.js first) into one classic script.
const fs = require('fs'), path = require('path');
const ROOT = __dirname, SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'crater-critters.html');

function build() {
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
  const files = fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).sort();
  const js = files.map(f => fs.readFileSync(path.join(SRC, 'js', f), 'utf8')).join('');
  const html = tpl.replace('<!--STYLE-->\n', css).replace('<!--SCRIPT-->\n', "'use strict';\n" + js);
  // syntax check the bundled script before writing
  try { new Function(js.replace(/^'use strict';/, '')); }
  catch (e) { console.error('build: syntax error in bundled script:', e.message); return false; }
  fs.writeFileSync(OUT, html);
  console.log(`build: ${files.length} modules, ${(html.length / 1024).toFixed(0)} KB -> ${path.basename(OUT)}`);
  return true;
}

if (!build()) process.exit(1);
if (process.argv.includes('--watch')) {
  let t; const kick = () => { clearTimeout(t); t = setTimeout(build, 80); };
  fs.watch(SRC, { recursive: true }, kick);
  console.log('build: watching src/ ...');
}
