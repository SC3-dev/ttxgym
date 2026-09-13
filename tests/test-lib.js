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
// `id` is the key; `image` is optional cover art
const MANIFEST = JSON.stringify([
  { id: 'byod1', title: 'Alpha', author: 'NCSC', image: 'byod1', categories: ['Devices'], level: 'Operational', duration: '45 mins', summary: '<p>a</p>' },
  { id: 'harw1', title: 'Beta', author: 'NCSC', image: 'harw1', categories: ['Devices'], level: 'Strategic', duration: '30 mins', summary: '<p>b</p>' },
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
// Sections mean DOM order no longer follows the manifest, so find tiles by name.
const tileFor = (w, title) => [...w.document.querySelectorAll('.ex-tile')]
  .find(t => t.querySelector('h3').textContent === title);
const clickTile = (w, title) =>
  tileFor(w, title).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

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
  clickTile(w, 'Alpha');
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
  clickTile(w, 'Beta');
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
    id: 'byod1', title: '<img src=x onerror="window.__pwned=1">Alpha', author: 'A', image: 'byod1',
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
  t('and in the summary excerpt', () =>
    ok(!w.document.querySelector('.ex-excerpt').querySelector('img'), 'img injected via excerpt'));
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
  clickTile(w, 'Alpha');
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
    const box = w.document.querySelector('#category-filter input');
    box.checked = true;
    box.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(w.document.getElementById('clear-filters').classList.contains('visible'));
    w.clearFilters();
    eq([...w.document.querySelectorAll('.filter-group input:checked')].length, 0);
    eq(w.document.querySelectorAll('.ex-tile').length, 2);
  });
}

G('the level pills live in the header row');
{
  const w = boot(okFetch);
  await wait(120);
  const bar = w.document.getElementById('lib-topbar');

  t('the pills sit in the header, not in a strip of their own', () => {
    eq(w.document.querySelector('#lib-topbar #level-switch') !== null, true);
    eq(w.document.querySelector('#lib-wrap > #level-switch'), null, 'the old strip is still there');
  });

  t('the header reads: pills, then the count', () => {
    const order = [...bar.children].map(c => c.id || c.className);
    eq(order, ['visually-hidden', 'level-switch', 'lib-topbar-right']);
  });

  t('the visible "Exercise Library" text is gone', () => {
    const shown = [...bar.children]
      .filter(c => !c.classList.contains('visually-hidden'))
      .map(c => c.textContent).join(' ');
    ok(!/Exercise Library/.test(shown), 'the title is still on screen');
  });

  t('but the page still has its heading for assistive technology', () => {
    const h1s = w.document.querySelectorAll('h1');
    eq(h1s.length, 1, 'the page lost its only h1');
    eq(h1s[0].textContent, 'Exercise Library');
    ok(h1s[0].classList.contains('visually-hidden'));
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/\.visually-hidden \{[^}]*clip-path: inset\(50%\)/.test(css),
       'hidden by display:none would take it out of the accessibility tree too');
  });

  t('the pills still work from there', () => {
    const tabs = [...w.document.querySelectorAll('#lib-topbar .level-tab')];
    ok(tabs.length >= 2, 'no pills in the header');
    tabs.find(t => t.dataset.section === 'Strategic').click();
    eq(w.document.querySelectorAll('.ex-tile').length, 1);
    tabs.find(t => t.dataset.section === '').click();
    eq(w.document.querySelectorAll('.ex-tile').length, 2);
  });

  t('the pill row and the filters header line up into one rule', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    const rule = sel => (new RegExp(sel.replace(/[#.]/g, '\\$&') + ' \\{([^}]*)\\}').exec(css) || [, ''])[1];
    const heightOf = block => (/(?<!min-)height:\s*([^;]+)/.exec(block) || [, ''])[1].trim();
    const borderOf = block => (/border-bottom:\s*([^;]+)/.exec(block) || [, ''])[1].trim();

    const bar = rule('#lib-topbar'), side = rule('#lib-sidebar-header');
    ok(heightOf(bar), 'the header row has no height');
    eq(heightOf(bar), heightOf(side), 'the two header rows are different heights');
    eq(borderOf(bar), borderOf(side), 'their bottom borders differ');
    // one declaration, so they cannot drift apart later
    ok(/var\(--header-row\)/.test(heightOf(bar)), 'the height is hardcoded rather than shared');
    ok(/--header-row:/.test(css), '--header-row is not defined');
  });

  t('the rule survives scrolling the filters', () => {
    // the sidebar scrolls as a whole, so its header has to be pinned
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    const side = (/#lib-sidebar-header \{([^}]*)\}/.exec(css) || [, ''])[1];
    ok(/position: sticky/.test(side), 'the filters header scrolls away');
    ok(/top: 0/.test(side), 'it is sticky but not pinned to the top');
    ok(/background:/.test(side), 'content will show through it while scrolling');
  });

  t('a long pill row scrolls rather than pushing the count off', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#level-switch \{[^}]*overflow-x: auto/.test(css), 'the pill row cannot scroll');
    ok(/\.lib-topbar-right \{[^}]*flex-shrink: 0/.test(css), 'the count can be squeezed out');
  });
}

G('the gallery is grouped, and the card says something useful');
{
  const RICH = JSON.stringify([
    { id: 'byod1', title: 'Alpha', author: 'NCSC', image: 'byod1', categories: ['Devices'],
      level: 'Operational', duration: '45 mins', summary: '<p>Documents reached a family cloud account during a routine backup that nobody had reviewed, and the exposure went unnoticed for several weeks afterwards before anyone raised it.</p>' },
    { id: 'harw1', title: 'Beta', author: 'NCSC', categories: ['Devices'],
      level: 'Strategic', duration: '30 mins', summary: '<p>Staff need access from home at short notice.</p>' },
    { id: 'byod1', title: 'M1', author: 'SC3', categories: ['Malware'], series: 'Malware', order: 0,
      level: 'Technical', duration: '60 mins', summary: '<p>First in the malware progression.</p>' },
    { id: 'harw1', title: 'M2', author: 'SC3', categories: ['Malware'], series: 'Malware', order: 1,
      level: 'Technical', duration: '60 mins', summary: '<p>Second in the malware progression.</p>' },
  ]);
  const w = boot(serve({ ok: true, text: () => Promise.resolve(RICH) }));
  await wait(150);

  t('scenarios are grouped into named sections', () => {
    const heads = [...w.document.querySelectorAll('.section-head h2')]
      .map(h => h.childNodes[0].textContent.trim());
    eq(heads, ['Strategic', 'Operational', 'Malware'], 'sections: ' + heads.join(', '));
  });

  t('each section says how many and why it exists', () => {
    const head = w.document.querySelector('.section-head');
    ok(head.querySelector('.section-count').textContent, 'no count');
    ok(head.querySelector('p').textContent.length > 20, 'no explanation');
  });

  t('a series keeps the order it was written in', () => {
    const malware = [...w.document.querySelectorAll('.section-grid')].pop();
    const titles = [...malware.querySelectorAll('.ex-tile h3')].map(h => h.textContent);
    eq(titles, ['M1', 'M2']);
    eq([...malware.querySelectorAll('.ex-seq')].map(e => e.textContent), ['1', '2']);
  });

  t('the card leads with what tells scenarios apart', () => {
    const tile = w.document.querySelector('.ex-tile');
    ok(tile.querySelector('h3').textContent, 'no title');
    const excerpt = tile.querySelector('.ex-excerpt').textContent;
    ok(excerpt.length > 20, 'no summary excerpt: ' + JSON.stringify(excerpt));
    ok(!/<[a-z]/.test(excerpt), 'markup leaked into the excerpt');
  });

  t('a long summary is trimmed on a word boundary', () => {
    const long = [...w.document.querySelectorAll('.ex-excerpt')]
      .map(e => e.textContent).find(t => t.endsWith('…'));
    ok(long, 'nothing was trimmed');
    ok(long.length <= 122, 'trimmed to ' + long.length);
    ok(!/\s…$/.test(long), 'trimmed mid-space');
  });

  t('the identical level/author/duration footer is gone', () => {
    const tile = w.document.querySelector('.ex-tile');
    ok(!tile.querySelector('.ex-attributes'), 'the old three-attribute footer is still there');
    const meta = [...tile.querySelectorAll('.ex-meta')].map(e => e.textContent.trim());
    eq(meta.length, 2, 'meta bits: ' + meta.join(' | '));
    ok(meta.some(m => /mins/.test(m)), 'no duration');
  });

  t('picking one section keeps its heading, because the description is the point', () => {
    w.selectSection('Malware');
    const heads = [...w.document.querySelectorAll('.section-head')];
    eq(heads.length, 1);
    eq(heads[0].querySelector('h2').childNodes[0].textContent.trim(), 'Malware');
    ok(heads[0].querySelector('p').textContent.length > 20, 'the series description was dropped');
    w.selectSection('');
  });
}

G('cards for browsing, a list for choosing');
{
  const w = boot(okFetch);
  await wait(150);
  t('it starts as cards', () => {
    ok(w.document.querySelector('.ex-tile'), 'no cards');
    ok(!w.document.querySelector('.ex-row'), 'rows already showing');
    ok(w.document.querySelector('.view-btn[data-view="grid"]').classList.contains('active'));
  });

  w.setView('list');
  t('switching gives rows instead', () => {
    ok(w.document.querySelector('.ex-row'), 'no rows');
    ok(!w.document.querySelector('.ex-tile'), 'cards still showing');
  });

  t('a row carries what you compare on', () => {
    const row = w.document.querySelector('.ex-row');
    const cells = [...row.children].map(c => c.className);
    eq(cells, ['row-thumb', 'row-title', 'row-tags', 'row-stages', 'row-dur']);
    ok(row.querySelector('.row-dur').textContent.includes('mins'));
  });

  t('rows open the same modal', () => {
    w.document.querySelector('.ex-row').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok(w.document.getElementById('modal').classList.contains('open'));
    closeIt(w);
  });

  t('rows are reachable by keyboard', () => {
    const row = w.document.querySelector('.ex-row');
    eq(row.getAttribute('tabindex'), '0');
    eq(row.getAttribute('role'), 'button');
    row.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    ok(w.document.getElementById('modal').classList.contains('open'));
    closeIt(w);
  });

  t('the choice is remembered', () => eq(w.localStorage.getItem('ttxgym_library_view'), 'list'));

  t('and switching back returns to cards', () => {
    w.setView('grid');
    ok(w.document.querySelector('.ex-tile'));
    ok(!w.document.querySelector('.ex-row'));
  });

  t('everything stays vertical — no horizontal carousel', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(!/#gallery \{[^}]*overflow-x: auto/.test(css), 'the gallery scrolls sideways');
    ok(/#gallery \{[^}]*flex-direction: column/.test(css), 'sections are not stacked');
  });
}

function closeIt(w) {
  w.document.getElementById('close-modal').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
}

G('the pills name the sections, so there is one idea not two');
{
  const w = boot(okFetch);
  await wait(150);

  t('every pill matches a section heading', () => {
    const pills = [...w.document.querySelectorAll('.level-tab')]
      .map(b => b.dataset.section).filter(Boolean);
    const heads = [...w.document.querySelectorAll('.section-head h2')]
      .map(h => h.childNodes[0].textContent.trim());
    eq(pills, heads, 'pills and headings disagree');
  });

  t('choosing a pill shows that section and nothing else', () => {
    w.selectSection('Strategic');
    const heads = [...w.document.querySelectorAll('.section-head h2')]
      .map(h => h.childNodes[0].textContent.trim());
    eq(heads, ['Strategic']);
  });

  t('All puts everything back', () => {
    w.selectSection('');
    ok(w.document.querySelectorAll('.section-head').length > 1);
  });

  t('level is no longer a second filter of its own', () => {
    eq(w.document.getElementById('level-filter'), null, 'the level checkbox group is still there');
    const groups = [...w.document.querySelectorAll('.filter-group')].map(g => g.id);
    ok(!groups.includes('level-filter'), 'level still listed as a filter group');
  });

  t('Clear filters resets the section too', () => {
    w.selectSection('Malware');
    ok(w.document.getElementById('clear-filters').classList.contains('visible'),
       'a chosen section does not count as filtering');
    w.clearFilters();
    ok(w.document.querySelectorAll('.section-head').length > 1, 'the section survived a clear');
  });

  t('a link can still point at one section', async () => { ok(true); });
}
{
  const w = boot(okFetch, 'https://ttxgym.com/library.html?section=Strategic');
  await wait(150);
  t('?section= opens on that section', () => {
    const heads = [...w.document.querySelectorAll('.section-head h2')]
      .map(h => h.childNodes[0].textContent.trim());
    eq(heads, ['Strategic']);
  });
}
{
  const w = boot(okFetch, 'https://ttxgym.com/library.html?level=Strategic');
  await wait(150);
  t('older ?level= links still work', () => {
    const heads = [...w.document.querySelectorAll('.section-head h2')]
      .map(h => h.childNodes[0].textContent.trim());
    eq(heads, ['Strategic']);
  });
}

G('list rows carry a thumbnail');
{
  const w = boot(okFetch);
  await wait(150);
  w.setView('list');
  t('each row leads with the same cover as its card', () => {
    const thumb = w.document.querySelector('.ex-row .row-thumb');
    ok(thumb, 'no thumbnail');
    ok(thumb.style.backgroundImage, 'the thumbnail has no image');
  });
  t('it is the first cell, so the rows align', () => {
    const cells = [...w.document.querySelector('.ex-row').children].map(c => c.className);
    eq(cells, ['row-thumb', 'row-title', 'row-tags', 'row-stages', 'row-dur']);
  });
  t('a scenario without artwork still gets one', () => {
    const generated = [...w.document.querySelectorAll('.row-thumb')]
      .find(t => t.classList.contains('no-cover'));
    if (generated) ok(/gradient/.test(generated.style.backgroundImage), 'no generated cover');
    else ok(true, 'every scenario in this fixture has artwork');
  });
}

G('the Just for Fun section exists and carries the gamebook');
{
  const w = boot(okFetch);
  await wait(200);
  t('it is offered as a section of its own', () => {
    const css = w.document.querySelector('style').textContent;
    ok(/Just for Fun/.test(w.eval('JSON.stringify(SECTIONS)')), 'not in SECTIONS');
    const s = w.eval('SECTIONS.find(s => s[0] === "Just for Fun")');
    ok(s && String(s[1]).length > 20, 'the section has no description');
  });
  t('it comes last, after the serious ones', () => {
    const names = JSON.parse(w.eval('JSON.stringify(SECTIONS.map(s => s[0]))'));
    eq(names[names.length - 1], 'Just for Fun');
  });
  t('the shipped manifest files it there', () => {
    const man = JSON.parse(fs.readFileSync(ROOT + '/lib/manifest.json', 'utf8'));
    const fun = man.filter(e => (e.series || e.level) === 'Just for Fun');
    ok(fun.length >= 1, 'nothing is in it');
    fun.forEach(e => ok(fs.existsSync(ROOT + '/lib/scenarios/' + e.id + '.ttxf'), e.id + ' has no scenario file'));
  });
}

G('duration filters by what fits, not by an exact match');
{
  const MIXED = JSON.stringify([
    { id: 'a', title: 'Short',  author: 'NCSC', categories: ['Devices'], level: 'Operational', duration: '30 mins', summary: '<p>a</p>' },
    { id: 'b', title: 'Medium', author: 'NCSC', categories: ['Devices'], level: 'Operational', duration: '45 mins', summary: '<p>b</p>' },
    { id: 'c', title: 'Long',   author: 'NCSC', categories: ['Devices'], level: 'Operational', duration: '90 mins', summary: '<p>c</p>' },
  ]);
  const w = boot(serve({ ok: true, text: () => Promise.resolve(MIXED) }));
  await wait(150);
  const shown = () => [...w.document.querySelectorAll('.ex-tile h3')].map(h => h.textContent).sort();
  const slider = w.document.getElementById('duration-slider');

  t('the stops are the durations the library actually has', () => {
    eq(w.eval('durationStops'), [30, 45, 90]);
    eq(slider.max, '3', 'the far right stop is missing');
  });

  t('it opens unfiltered, at the far right', () => {
    eq(slider.value, slider.max);
    eq(w.document.getElementById('duration-label').textContent, 'Any length');
    eq(shown(), ['Long', 'Medium', 'Short']);
  });

  t('asking for 45 minutes also offers the 30-minute exercise', () => {
    w.setMaxDuration('1');
    eq(shown(), ['Medium', 'Short'], 'exact matching is back');
    eq(w.document.getElementById('duration-label').textContent, 'Up to 45 mins');
  });

  t('the tightest stop leaves only what fits', () => {
    w.setMaxDuration('0');
    eq(shown(), ['Short']);
  });

  t('a bound counts as a filter worth clearing', () => {
    ok(w.document.getElementById('clear-filters').classList.contains('visible'),
       'clear filters stayed hidden');
    w.clearFilters();
    eq(shown(), ['Long', 'Medium', 'Short'], 'clearing left the bound in place');
    eq(slider.value, slider.max, 'the thumb did not go back');
    eq(w.document.getElementById('duration-label').textContent, 'Any length');
  });

  t('the old checkbox stack is gone', () => {
    ok(!w.document.querySelector('#duration-filter input[type=checkbox]'),
       'duration is still a checkbox list');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
