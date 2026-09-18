#!/usr/bin/env node
/*
 * Release notes for updates.html, read out of the commit history on main.
 *
 * Generated rather than fetched. The GitHub API would mean the page breaks when
 * an office shares an IP and burns the sixty-an-hour anonymous limit, breaks
 * again offline, and cannot appear in the standalone build at all. The history
 * is already in the repository; reading it at build time costs nothing and the
 * page stays as static as the rest of the site.
 *
 * Commit messages here are written subject-then-body, so the subject becomes the
 * headline and the body becomes the note. Bodies are hard-wrapped, so wrapped
 * lines are rejoined into paragraphs and "  - " items into lists.
 *
 *   node tools/build-updates.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'lib', 'updates.json');
const BRANCH = 'main';

// Field and record separators. Neither can appear in a commit message, so a
// message containing newlines, quotes or pipes still parses back cleanly.
const SEP = String.fromCharCode(31);
const END = String.fromCharCode(30);

/* Housekeeping, not news. An explicit list rather than a clever rule, because a
   rule that guesses will one day drop something that mattered. */
const SKIP = [
  /^Update manifest\.json$/i,
  /^Create CNAME$/i,
  /^Initial commit$/i,
  /^typo\.?$/i,
  /^Update README(\.md)?$/i,
  /^Delete /i,
];

const git = args => execFileSync('git', args,
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

function repoURL() {
  try {
    return git(['remote', 'get-url', 'origin']).trim()
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '');
  } catch (e) { return ''; }
}

/* A hard-wrapped body into blocks: paragraphs, and lists where the author used
   "  - ". Continuation lines are indented further than the marker. */
function blocks(body) {
  const out = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) { out.push({ type: 'p', text: para.join(' ') }); para = []; }
  };
  const flushList = () => {
    if (list && list.length) out.push({ type: 'ul', items: list.slice() });
    list = null;
  };

  String(body).split('\n').forEach(raw => {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { flushPara(); flushList(); return; }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      if (!list) list = [];
      list.push(bullet[1].trim());
      return;
    }
    if (list) {
      // indented under a bullet: the rest of that item
      if (/^\s{3,}/.test(line)) { list[list.length - 1] += ' ' + line.trim(); return; }
      flushList();
    }
    para.push(line.trim());
  });
  flushPara();
  flushList();
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

function build(opts) {
  const quiet = !!(opts && opts.quiet);
  const say = m => { if (!quiet) console.log(m); };

  const raw = git(['log', BRANCH, '--no-merges', '--date=short',
                   '--format=%H' + SEP + '%h' + SEP + '%ad' + SEP + '%s' + SEP + '%b' + END]);

  const all = raw.split(END).map(c => c.replace(/^\n/, '')).filter(c => c.trim())
    .map(chunk => {
      const parts = chunk.split(SEP);
      return {
        sha: parts[0], short: parts[1], date: parts[2],
        title: (parts[3] || '').trim(), body: parts[4] || '',
      };
    })
    .filter(c => c.sha);
  const commits = all.filter(c => !SKIP.some(re => re.test(c.title)));

  const byMonth = new Map();
  commits.forEach(c => {
    const key = c.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push({ sha: c.short, date: c.date, title: c.title, blocks: blocks(c.body) });
  });

  const releases = Array.from(byMonth.entries()).map(([month, entries]) => ({
    month,
    heading: MONTHS[Number(month.slice(5)) - 1] + ' ' + month.slice(0, 4),
    entries,
  }));

  const payload = {
    repo: repoURL(),
    branch: BRANCH,
    // the newest commit considered, skipped or not, so staleness is detectable
    head: all.length ? all[0].sha : '',
    count: commits.length,
    releases,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 1) + '\n');

  const detailed = commits.filter(c => c.body.trim()).length;
  say('updates.json written - ' + commits.length + ' entries across ' + releases.length + ' months');
  say('  ' + detailed + ' with notes, ' + (commits.length - detailed) + ' headline only');
  return payload;
}

if (require.main === module) build();
module.exports = { build, blocks, SKIP, OUT };
