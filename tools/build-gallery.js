#!/usr/bin/env node
/*
 * A static site cannot list a directory over HTTP, so the builder needs a manifest
 * to know what artwork exists. Generating it — rather than hand-maintaining a list —
 * means dropping a file into a category folder is the whole job of adding to the
 * gallery, and the list cannot silently fall out of step with the folder.
 *
 * Categories are the subfolders of lib/exercise_data/. Adding a category is
 * `mkdir` — no code change here or in the builder.
 *
 *   node tools/build-gallery.js
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'lib', 'exercise_data');
const OUT = path.join(DIR, 'gallery.json');
const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;

// news.jpeg is the backdrop %news() draws on, not artwork to insert on its own.
const SYSTEM = new Set(['news.jpeg']);

// The order categories appear in the picker. Anything not listed follows,
// alphabetically — so a new folder shows up without being registered here.
const ORDER = ['icons', 'stock-photos', 'screenshots', 'documents', 'diagrams'];

// TTXGYM_Brokenshield_teal.png -> "Brokenshield", variant "teal"
function describe(file) {
  const stem = file.replace(IMAGE, '');
  let name = stem.replace(/^TTXGYM[_ ]/i, '').replace(/[_-]+/g, ' ').trim();
  let variant = '';
  const m = /\s+(teal|red|blue|amber|green|grey|gray)$/i.exec(name);
  if (m) { variant = m[1].toLowerCase(); name = name.slice(0, m.index).trim(); }
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return { label: name, variant };
}

const heading = c => c.replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

function build(opts) {
  const quiet = !!(opts && opts.quiet);
  const say = m => { if (!quiet) console.log(m); };

  const categories = fs.readdirSync(DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });

  const entries = [];
  categories.forEach(category => {
    fs.readdirSync(path.join(DIR, category))
      .filter(f => IMAGE.test(f) && !SYSTEM.has(f))
      .sort((a, b) => a.localeCompare(b))
      .forEach(file => {
        const d = describe(file);
        entries.push({
          file: `${category}/${file}`,
          label: d.label,
          variant: d.variant,
          category,
          heading: heading(category),
          bytes: fs.statSync(path.join(DIR, category, file)).size,
        });
      });
  });

  // an image left loose in the root is almost certainly a mistake, so say so
  const loose = fs.readdirSync(DIR)
    .filter(f => IMAGE.test(f) && !SYSTEM.has(f));

  const payload = { categories: categories.map(c => ({ name: c, heading: heading(c) })), images: entries };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 1) + '\n');

  say(`gallery.json written — ${entries.length} images across ${categories.length} categories`);
  categories.forEach(c => {
    const n = entries.filter(e => e.category === c).length;
    say(`  ${heading(c).padEnd(14)} ${n === 0 ? '(empty)' : n}`);
  });
  if (loose.length) {
    say(`  note: ${loose.length} image(s) sit outside any category and were skipped:`);
    loose.forEach(f => say(`    ${f}`));
  }
  const spaced = entries.filter(e => /\s/.test(e.file));
  if (spaced.length) say(`  note: ${spaced.length} filename(s) contain spaces and need URL encoding`);
  return payload;
}

if (require.main === module) build();
module.exports = { build, describe, IMAGE, SYSTEM, DIR, OUT };
