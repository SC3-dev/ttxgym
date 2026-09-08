/* Runs every suite and prints one summary. `npm test` from the repo root. */
const { execFileSync } = require('child_process');
const path = require('path');

const suites = [
  ['ttxf.js module', 'test-ttxf.js'],
  ['gym player', 'test-b.js'],
  ['format integration', 'test-c.js'],
  ['scenario builder', 'test-editor.js'],
  ['exercise library', 'test-lib.js'],
  ['participant window', 'test-participant.js'],
  ['features', 'test-f.js'],
  ['page-to-page flows', 'test-flow.js'],
  ['sidebar', 'test-sidebar.js'],
  ['offline / standalone', 'test-standalone.js'],
];

let total = 0, failed = 0, broken = [];
for (const [label, file] of suites) {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8' });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    broken.push(label);
  }
  const line = out.trim().split('\n').pop();
  const m = line.match(/(\d+) passed, (\d+) failed/);
  if (m) { total += +m[1]; failed += +m[2]; }
  console.log(String(label).padEnd(22) + line);
  if (m && +m[2] > 0) console.log(out.split('\n').filter(l => l.includes('FAIL')).join('\n'));
}
console.log('─'.repeat(46));
console.log(`TOTAL: ${total} passed, ${failed} failed`);
process.exit(failed || broken.length ? 1 : 0);
