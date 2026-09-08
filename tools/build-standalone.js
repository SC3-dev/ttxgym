#!/usr/bin/env node
/* Builds gym/standalone.html — the whole facilitator tool in one file.
 *
 * The site promises "all functionality in one single HTML file — download it for
 * local or offline use". Extracting js/ttxf.js into a shared module was the right
 * call (it retired three parsers that had drifted apart) but it quietly broke that
 * promise: gym/index.html on its own throws "TTXF is not defined" and fails
 * silently, showing the welcome screen and doing nothing when you click it.
 *
 * Rather than give up the module or the promise, this inlines it. Run `npm run
 * build` after touching gym/index.html or js/ttxf.js; `npm test` fails if the
 * built file has fallen behind.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'gym/index.html');
const MODULE = path.join(ROOT, 'js/ttxf.js');
const OUTPUT = path.join(ROOT, 'gym/standalone.html');

const MODULE_TAG = '  <script src="../js/ttxf.js"></script>';
const FONT_TAG = '  <link rel="stylesheet" href="../css/fonts.css">';
const BANNER = `
  <!-- Built by tools/build-standalone.js — do not edit.
       Everything the facilitator tool needs is in this one file. Scenario cover
       images and the webfont still load from the network when there is one; the
       tool itself works without either. -->`;

function build() {
  const html = fs.readFileSync(SOURCE, 'utf8');
  const module = fs.readFileSync(MODULE, 'utf8');

  if (!html.includes(MODULE_TAG)) throw new Error('gym/index.html no longer loads ../js/ttxf.js as expected');
  if (!html.includes(FONT_TAG)) throw new Error('gym/index.html no longer loads ../css/fonts.css as expected');

  // A closing tag inside the module source would end the inline script early.
  const safe = module.replace(/<\/script>/gi, '<\\/script>');

  return html
    .replace(MODULE_TAG, `  <script>\n${safe}\n  </script>`)
    // relative paths have nothing to resolve against once the file is moved
    .replace(FONT_TAG, '  <link rel="stylesheet" href="https://ttxgym.com/css/fonts.css">')
    .replace('<link rel="canonical" href="https://ttxgym.com/gym/">',
             '<link rel="canonical" href="https://ttxgym.com/gym/">' + BANNER)
    .replace("fetch('../lib/scenarios/' + targetFile + '.ttxf')",
             "fetch('https://ttxgym.com/lib/scenarios/' + targetFile + '.ttxf')");
}

if (require.main === module) {
  const out = build();
  fs.writeFileSync(OUTPUT, out);
  const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
  console.log(`gym/standalone.html written — ${kb} KB, no local dependencies`);
}

module.exports = { build, OUTPUT };
