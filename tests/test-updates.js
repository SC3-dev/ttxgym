/* updates.html and the release notes behind it (tools/build-updates.js).

   The notes are generated from the commit history rather than fetched from the
   GitHub API, so the tests are about two things: that the generator turns a
   hard-wrapped commit message into something readable, and that the page renders
   what it is given without trusting it. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const gen = require(path.join(ROOT, 'tools/build-updates.js'));

let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected ${JSON.stringify(sub)} in ${JSON.stringify(String(s).slice(0, 200))}`); };

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/updates.json'), 'utf8'));
const page = fs.readFileSync(path.join(ROOT, 'updates.html'), 'utf8');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

/* Renders the page with whatever notes the test wants to give it. */
function boot(data) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));
  const dom = new JSDOM(page, {
    runScripts: 'dangerously', url: 'https://ttxgym.com/updates.html', virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.resolve({
        ok: data !== null,
        statusText: 'Not Found',
        json: () => Promise.resolve(data),
      });
    },
  });
  return { w: dom.window, errs };
}
const settle = () => new Promise(r => setTimeout(r, 40));

(async () => {

G('a commit message becomes a release note');
{
  t('a hard-wrapped paragraph is put back together', () => {
    eq(gen.blocks('The rail no longer scrolls: the exercise details stay at\nthe top, and the list scrolls inside it.'),
       [{ type: 'p', text: 'The rail no longer scrolls: the exercise details stay at the top, and the list scrolls inside it.' }]);
  });

  t('a blank line starts a new paragraph', () => {
    const b = gen.blocks('First thing.\n\nSecond thing.');
    eq(b.length, 2);
    eq(b[1].text, 'Second thing.');
  });

  t('an indented list becomes a list, with wrapped items rejoined', () => {
    const b = gen.blocks('Data loss, fixed:\n\n  - Discussion points were textareas, but the format\n    writes each on one line.\n  - A block inserted at a caret was nested.\n');
    eq(b[0], { type: 'p', text: 'Data loss, fixed:' });
    eq(b[1].type, 'ul');
    eq(b[1].items, [
      'Discussion points were textareas, but the format writes each on one line.',
      'A block inserted at a caret was nested.',
    ]);
  });

  t('a subject-only commit has no note at all, rather than an empty one', () => {
    eq(gen.blocks(''), []);
    eq(gen.blocks('\n\n  \n'), []);
  });

  t('housekeeping is left out, by an explicit list rather than a guess', () => {
    const skipped = s => gen.SKIP.some(re => re.test(s));
    ['Update manifest.json', 'Create CNAME', 'typo', 'Delete old.txt'].forEach(s =>
      ok(skipped(s), s + ' should not be news'));
    ['Add %news() headlines, rendered as a broadcast still', 'Fix the typo handling in the parser']
      .forEach(s => ok(!skipped(s), s + ' was dropped and should not have been'));
  });
}

G('the generated notes');
{
  t('every entry came from a commit that really exists', () => {
    const shas = manifest.releases.flatMap(r => r.entries).map(e => e.sha);
    ok(shas.length >= 50, 'only ' + shas.length + ' entries');
    // a handful is enough; resolving ninety would be slow and prove the same thing
    [shas[0], shas[Math.floor(shas.length / 2)], shas[shas.length - 1]].forEach(sha => {
      const type = git(['cat-file', '-t', sha]);
      eq(type, 'commit', sha + ' is not a commit');
    });
  });

  /* A manifest can never contain the sha of the commit that adds it, so this
     cannot check that it is current. It can check it belongs to this history. */
  t('and the manifest was built from this branch, not another one', () => {
    ok(manifest.head, 'no head recorded');
    eq(git(['merge-base', '--is-ancestor', manifest.head, 'main']) , '',
       'the recorded head is not an ancestor of main');
    eq(manifest.branch, 'main');
  });

  t('newest first, and grouped by month', () => {
    const months = manifest.releases.map(r => r.month);
    eq(months.slice().sort().reverse(), months, 'the months are out of order');
    manifest.releases.forEach(r => {
      const dates = r.entries.map(e => e.date);
      eq(dates.slice().sort().reverse(), dates, r.month + ' is out of order');
      r.entries.forEach(e => has(e.date, r.month));
    });
  });

  t('every entry has a date, a title and a sha', () => {
    manifest.releases.flatMap(r => r.entries).forEach(e => {
      ok(/^\d{4}-\d{2}-\d{2}$/.test(e.date), 'bad date ' + e.date);
      ok(e.title && e.title.trim(), e.sha + ' has no title');
      ok(/^[0-9a-f]{7,}$/.test(e.sha), 'bad sha ' + e.sha);
    });
  });

  t('and the build regenerates it, so it does not rot unnoticed', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    has(pkg.scripts.build, 'build-updates.js');
  });
}

G('the page');
{
  t('renders a timeline from the notes it is given', async () => {
    const { w, errs } = boot(manifest);
    await settle();
    eq(errs, []);
    const d = w.document;
    eq(d.querySelectorAll('.up-month').length, manifest.releases.length, 'wrong number of months');
    eq(d.querySelectorAll('.up-entry').length,
       manifest.releases.reduce((n, r) => n + r.entries.length, 0), 'wrong number of entries');
    has(d.querySelector('.up-month-head').textContent, manifest.releases[0].heading);
  });

  t('only the newest entry is marked as the latest', async () => {
    const { w } = boot(manifest);
    await settle();
    eq(w.document.querySelectorAll('.up-entry.latest').length, 1);
    eq(w.document.querySelector('.up-entry').classList.contains('latest'), true,
       'the marker is not on the first entry');
  });

  t('an entry with no note is shown compactly rather than as a gap', async () => {
    const { w } = boot({
      repo: 'https://github.com/x/y', branch: 'main', count: 2, releases: [{
        month: '2026-09', heading: 'September 2026', entries: [
          { sha: 'aaaaaaa', date: '2026-09-18', title: 'With a note', blocks: [{ type: 'p', text: 'Detail.' }] },
          { sha: 'bbbbbbb', date: '2026-09-17', title: 'Without one', blocks: [] },
        ],
      }],
    });
    await settle();
    const entries = w.document.querySelectorAll('.up-entry');
    ok(!entries[0].classList.contains('terse'), 'an entry with a note was treated as terse');
    ok(entries[1].classList.contains('terse'), 'an entry with no note was not');
    ok(!entries[1].querySelector('.up-body'), 'an empty note body was rendered anyway');
  });

  t('each entry links to the commit it came from', async () => {
    const { w } = boot(manifest);
    await settle();
    const link = w.document.querySelector('.up-entry .up-sha');
    has(link.getAttribute('href'), manifest.repo + '/commit/');
    eq(link.getAttribute('rel'), 'noopener', 'a target=_blank link without rel=noopener');
  });

  /* A commit message is data, not markup. It is written by whoever committed,
     and on a public repository that need not be someone trusted. */
  t('a commit message cannot inject markup', async () => {
    const { w } = boot({
      repo: 'https://github.com/x/y', branch: 'main', count: 1, releases: [{
        month: '2026-09', heading: 'September 2026', entries: [{
          sha: 'ccccccc', date: '2026-09-18',
          title: '<img src=x onerror=alert(1)>',
          blocks: [{ type: 'p', text: '<script>alert(2)</script>' }],
        }],
      }],
    });
    await settle();
    const d = w.document;
    eq(d.querySelectorAll('.up-title img, .up-body script').length, 0, 'markup got through');
    has(d.querySelector('.up-title').textContent, '<img src=x');
  });

  t('but backticks still read as code, the way the rest of the site writes them', async () => {
    const { w } = boot({
      repo: '', branch: 'main', count: 1, releases: [{
        month: '2026-09', heading: 'September 2026', entries: [{
          sha: 'ddddddd', date: '2026-09-18', title: 'Touches `editor.html`', blocks: [],
        }],
      }],
    });
    await settle();
    const code = w.document.querySelector('.up-title code');
    ok(code, 'no code span');
    eq(code.textContent, 'editor.html');
  });

  t('and says so plainly when the notes cannot be loaded', async () => {
    const { w, errs } = boot(null);
    await settle();
    eq(errs, []);
    const text = w.document.getElementById('up-timeline').textContent;
    has(text, 'Could not load');
    ok(w.document.querySelector('#up-timeline a[href*="github.com"]'), 'no way to read it elsewhere');
  });
}

G('the page belongs to the site');
{
  const { w } = boot(manifest);
  const d = w.document;

  t('it carries the site navigation and footer', () => {
    ok(d.getElementById('site-nav'), 'no nav');
    ok(d.getElementById('mobile-nav'), 'no mobile nav');
    ok(d.getElementById('site-footer'), 'no footer');
    ['index.html', 'guide.html', 'library.html', 'editor.html', 'gym/'].forEach(h =>
      ok(d.querySelector('#site-nav .nav-links a[href="' + h + '"]'), 'no nav link to ' + h));
  });

  t('nothing in the nav claims to be this page', () => {
    eq(d.querySelectorAll('#site-nav .nav-links a.active').length, 0,
       'the nav marks a page active that is not the one being shown');
  });

  t('and every page with a footer links to it', () => {
    ['index.html', 'library.html', 'guide.html'].forEach(f => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      has(src.slice(src.indexOf('<footer')), 'href="updates.html"');
    });
  });

  t('it is findable, and says what it is', () => {
    has(page, '<title>TTX Gym - Updates</title>');
    has(page, 'rel="canonical" href="https://ttxgym.com/updates.html"');
    ok(!page.includes('noindex'), 'the page asks not to be indexed');
    ok(d.querySelector('noscript'), 'no fallback for a reader without scripting');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
