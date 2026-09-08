const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = require('path').resolve(__dirname, '..');
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const G = n => console.log('\n' + n);
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected ${JSON.stringify(sub)} in ${JSON.stringify(String(s).slice(0, 200))}`); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

function boot(fetchImpl, url = 'https://ttxgym.com/library.html') {
  const vc = new VirtualConsole();
  const dom = new JSDOM(fs.readFileSync(ROOT + '/library.html', 'utf8'), {
    runScripts: 'dangerously', url, virtualConsole: vc,
    beforeParse(w) {
      w.eval(require('fs').readFileSync(ROOT + '/js/ttxf.js', 'utf8'));
      w.fetch = fetchImpl;
    },
  });
  return dom.window;
}
const MANIFEST = JSON.stringify([
  { title: 'Alpha', author: 'NCSC', image: 'byod1', categories: ['Devices'], level: 'Operational', duration: '45 mins', summary: '<p>a</p>' },
  { title: 'Beta', author: 'NCSC', image: 'harw1', categories: ['Devices'], level: 'Strategic', duration: '30 mins', summary: '<p>b</p>' },
]);
const SCENARIOS = {
  byod1: `! title: Alpha\n! summary: S\n\n@ Data Leak\n! duration: 10 mins\n! content: Documents reached a family cloud account.\n? Q\n+ a\n+ b\n`,
  harw1: `! title: Beta\n! summary: S\n\n@ Remote Access\n! duration: 15 mins\n! content: Staff need access from home at short notice.\n? Q\n+ a\n+ b\n`,
};
// The page fetches the manifest and then each scenario body; serve them apart.
const serve = (body) => (url) => {
  const m = /lib\/scenarios\/([\w-]+)\.ttxf$/.exec(String(url));
  if (m) return Promise.resolve(m[1] in SCENARIOS
    ? { ok: true, text: () => Promise.resolve(SCENARIOS[m[1]]) }
    : { ok: false, statusText: 'Not Found' });
  return Promise.resolve(body);
};
const okFetch = serve({ ok: true, text: () => Promise.resolve(MANIFEST) });
const badFetch = serve({ ok: false, statusText: 'Not Found' });
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
console.log('\nB12 — library history and error handling');
{
  const w = boot(badFetch);
  await wait(60);
  t('a failed manifest fetch tells the user', () => {
    const g = w.document.getElementById('gallery').textContent;
    ok(g.includes('could not be loaded'), 'gallery reads: ' + g.trim());
  });
}
{
  const w = boot(okFetch);
  await wait(60);
  t('the gallery renders', () => eq(w.document.querySelectorAll('.ex-tile').length, 2));
  w.document.querySelectorAll('.ex-tile')[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  t('clicking a tile opens the modal', () => ok(w.document.getElementById('modal').classList.contains('open')));
  t('...and pushes the scenario into the URL', () => eq(w.location.search, '?q=byod1'));
  t('F5.2: Customise opens the scenario in the builder', () => {
    const href = w.document.getElementById('customiser').getAttribute('href');
    eq(href, 'editor.html?load=byod1');
  });
  t('Run link points at gym/ with a trailing slash', () =>
    ok(w.document.getElementById('starter').getAttribute('href').startsWith('gym/?q='),
       w.document.getElementById('starter').getAttribute('href')));
  // Back
  w.history.back();
  await wait(40);
  t('Back actually closes the modal', () => ok(!w.document.getElementById('modal').classList.contains('open')));
  // Escape
  w.document.querySelectorAll('.ex-tile')[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok(w.document.getElementById('modal').classList.contains('open'), 'modal should be open again');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  t('Escape closes the modal', () => ok(!w.document.getElementById('modal').classList.contains('open')));
}
{
  const w = boot(okFetch, 'https://ttxgym.com/library.html?q=harw1');
  await wait(60);
  t('a deep link opens the right scenario', () => {
    ok(w.document.getElementById('modal').classList.contains('open'), 'modal not open');
    eq(w.document.getElementById('modal-title').textContent, 'Beta');
  });
  t('...without pushing a duplicate history entry', () => eq(w.location.search, '?q=harw1'));
}
{
  const HOSTILE = JSON.stringify([{
    title: '<img src=x onerror="window.__pwned=1">Alpha', author: 'A', image: 'byod1',
    categories: ['<img src=x onerror="window.__pwned=1">'], level: 'L', duration: 'D',
    summary: '<p>Ransomware</p><script>window.__pwned=1<\/script><img src=x onerror="window.__pwned=1"><a href="javascript:alert(1)">x</a>',
  }]);
  const w = boot(serve({ ok: true, text: () => Promise.resolve(HOSTILE) }));
  await wait(60);
  w.document.querySelector('.ex-tile').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(40);
  console.log('\nC7 — a hostile manifest cannot run script');
  t('nothing executed', () => eq(w.__pwned, undefined));
  t('the summary is sanitised', () => {
    const html = w.document.getElementById('modal-summary').innerHTML;
    ok(!html.includes('onerror'), html);
    ok(!html.includes('javascript:'), html);
    ok(html.includes('Ransomware'), 'legitimate markup was dropped');
  });
  t('the title is escaped in the tile', () =>
    ok(!w.document.querySelector('.ex-tile h3').querySelector('img'), 'img injected via title'));
  t('search matches words, not HTML tag names', () => {
    const search = w.document.getElementById('search');
    search.value = 'onerror';           // present only in the markup
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    eq(w.document.querySelectorAll('.ex-tile').length, 0);
    search.value = 'ransomware';        // present in the visible text
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    eq(w.document.querySelectorAll('.ex-tile').length, 1);
  });
}

G('what is inside a scenario, before you commit to it');
{
  const w = boot(okFetch);
  await wait(120);
  w.document.querySelectorAll('.ex-tile')[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(120);
  const inside = w.document.getElementById('modal-inside');
  t('the stage titles are listed', () => {
    has(inside.textContent, 'Data Leak');
    eq(inside.querySelectorAll('.inside-stages li').length, 1);
  });
  t('with what each stage is budgeted', () => has(inside.textContent, '10 min'));
  t('and what the scenario is made of', () => {
    has(inside.textContent, '1 stage');
    has(inside.textContent, '1 question');
    has(inside.textContent, '10 mins of planned discussion');
  });
  t('it lines up with every other band of the modal', () => {
    const css = w.document.querySelector('style').textContent;
    const rule = sel => {
      const m = new RegExp(sel.replace(/[.#]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(css);
      return m ? m[1].replace(/\s+/g, ' ') : '';
    };
    const gutter = sel => {
      const pad = (/padding:\s*([^;]+)/.exec(rule(sel)) || [, ''])[1].trim().split(/\s+/);
      return pad.length > 1 ? pad[1] : null;
    };
    // Every band of the modal body shares one gutter; the new one was flush to the
    // edges while everything above it was inset.
    const bands = ['.modal-actions', '.modal-tags', '#modal-summary', '#modal-inside', '.modal-meta'];
    const gutters = bands.map(gutter);
    eq(gutters, bands.map(() => '1.5rem'), 'gutters: ' + bands.map((b, i) => b + '=' + gutters[i]).join(', '));
  });
  t('it sits between the summary and the meta pills', () => {
    const kids = [...w.document.querySelector('.modal-body').children].map(e => e.id || e.className.split(' ')[0]);
    eq(kids.indexOf('modal-inside'), kids.indexOf('modal-summary') + 1);
    eq(kids.indexOf('modal-attributes'), kids.indexOf('modal-inside') + 1);
  });
  t('durations line up down the right of the stage list', () => {
    const css = w.document.querySelector('style').textContent;
    ok(/\.inside-stages li\s*\{[^}]*justify-content:\s*space-between/.test(css.replace(/\s+/g, ' ')),
       'stage rows do not align their durations');
  });
  t('the band disappears entirely when there is nothing to show', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#modal-inside:empty \{ display: none/.test(css), 'an empty band would still show its padding and rule');
  });
}
{
  const w = boot(okFetch);
  await wait(150);
  const search = w.document.getElementById('search');
  t('search reaches into the stages, not just the blurb', () => {
    search.value = 'family cloud account';       // only in stage content
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    eq(w.document.querySelectorAll('.ex-tile').length, 1);
    eq(w.document.querySelector('.ex-tile h3').textContent, 'Alpha');
  });
  t('and matches stage titles', () => {
    search.value = 'remote access';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    eq(w.document.querySelectorAll('.ex-tile').length, 1);
    eq(w.document.querySelector('.ex-tile h3').textContent, 'Beta');
  });
  t('Clear filters appears once something is filtering', () =>
    ok(w.document.getElementById('clear-filters').classList.contains('visible')));
  t('and puts everything back', () => {
    w.document.getElementById('clear-filters').click();
    eq(search.value, '');
    eq(w.document.querySelectorAll('.ex-tile').length, 2);
    ok(!w.document.getElementById('clear-filters').classList.contains('visible'));
  });
  t('it clears ticked filters too, not just the search box', () => {
    const box = w.document.querySelector('#level-filter input');
    box.checked = true;
    box.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(w.document.getElementById('clear-filters').classList.contains('visible'));
    w.clearFilters();
    eq([...w.document.querySelectorAll('.filter-group input:checked')].length, 0);
    eq(w.document.querySelectorAll('.ex-tile').length, 2);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
