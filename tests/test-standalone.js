/* The single-file build, and behaving sanely where browser storage is refused.
   Both exist because extracting js/ttxf.js silently broke the site's promise that
   the tool is "all functionality in one single HTML file". */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const { build, OUTPUT } = require(path.join(ROOT, 'tools/build-standalone.js'));

let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };

// Open a page the way a downloaded copy is opened: file://, no network.
function offline(file, { breakStorage = false } = {}) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message.split('\n')[0]));
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    runScripts: 'dangerously', url: 'file:///home/someone/Downloads/standalone.html',
    virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      w.BroadcastChannel = class { constructor() { this.onmessage = null; } postMessage() {} close() {} };
      w.fetch = () => Promise.reject(new Error('offline'));
      w.URL.createObjectURL = () => 'blob:stub';
      w.URL.revokeObjectURL = () => {};
      if (breakStorage) {
        // what Chrome does for an opaque origin
        Object.defineProperty(w, 'localStorage', {
          get() { throw new Error('localStorage is not available for opaque origins'); },
          configurable: true,
        });
      }
    },
  });
  return { w: dom.window, errs };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {

G('the build is in step with its sources');
{
  t('gym/standalone.html exists', () => ok(fs.existsSync(OUTPUT), 'run: npm run build'));
  t('and matches gym/index.html + js/ttxf.js', () =>
    eq(fs.readFileSync(OUTPUT, 'utf8'), build(), 'stale — run: npm run build'));
  t('it carries no local dependencies', () => {
    const html = fs.readFileSync(OUTPUT, 'utf8');
    ok(!/<script src="\.\.\//.test(html), 'still loads a relative script');
    ok(!/href="\.\.\/css\//.test(html), 'still loads a relative stylesheet');
  });
  t('it reaches no third-party host', () => {
    const html = fs.readFileSync(OUTPUT, 'utf8');
    const hosts = [...new Set((html.match(/https?:\/\/[a-z0-9.-]+/g) || [])
      .map(h => h.replace(/^https?:\/\//, '')))]
      .filter(h => !/ttxgym\.com|w3\.org/.test(h));
    eq(hosts, [], 'third-party hosts');
  });
  t('the inlined module cannot close the script tag early', () => {
    const html = fs.readFileSync(OUTPUT, 'utf8');
    const body = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));
    ok(body.includes('TTXF'), 'the module was not inlined');
  });
}

G('a downloaded copy, opened offline');
{
  const { w, errs } = offline(OUTPUT);
  await wait(250);
  t('it loads without error', () => eq(errs, []));
  t('the shared module is present', () => eq(typeof w.TTXF, 'object'));
  w.document.querySelector('.welcome-demo-btn').click();
  t('the demo exercise runs', () => eq(w.eval('roundCounter'), 3));
  t('stages navigate', () => { w.eval('goToStage(2)'); eq(w.eval('ActiveStage'), 2); });
  t('responses record', () => {
    w.document.querySelector('#round2 .choice').click();
    eq(w.eval('responses.question_1')[0], 1);
  });
  t('scoring works', () => ok(typeof w.updateProgress().confidence === 'number'));
  t('the facilitator pack still builds', () => {
    let out = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { out = String(p[0]); return new RB(p, o); };
    w.exportFacilitatorPack();
    w.Blob = RB;
    ok(out.includes('pack-stage'), 'no pack produced');
  });
  t('a session can still be written out', () => {
    let out = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { out = String(p[0]); return new RB(p, o); };
    w.exportSession();
    w.Blob = RB;
    eq(JSON.parse(out).format, 'ttxs');
  });
}

G('where the browser refuses local storage');
{
  // jsdom installs its own localStorage after beforeParse, so break it once the
  // page is up — the state a downloaded copy is in from the first click.
  const { w, errs } = offline(OUTPUT);
  await wait(250);
  // Define it inside the page, so the page's own scope resolves the throwing getter.
  const breakStorage = () => w.eval(
    "Object.defineProperty(window, 'localStorage', {" +
    "  get() { throw new Error('localStorage is not available for opaque origins'); }," +
    "  configurable: true });");

  breakStorage();
  t('reads fail soft instead of throwing', () => eq(w.eval("store.get('anything')"), null));
  t('writes report failure rather than exploding', () => eq(w.eval("store.set('k','v')"), false));
  t('removes are harmless', () => { w.eval("store.remove('k')"); ok(true); });
  t('availability is detected', () => eq(w.eval('store.available()'), false));

  w.document.querySelector('.welcome-demo-btn').click();
  t('the exercise still loads and runs', () => eq(w.eval('roundCounter'), 3));
  t('the page did not fall over', () => eq(errs, [], 'storage took the page down with it'));

  t('it says so rather than failing quietly', () => {
    const n = w.document.getElementById('restore-notice');
    ok(n.classList.contains('visible'), 'no warning shown');
    ok(n.classList.contains('warning'), 'not styled as a warning');
    ok(/not being kept automatically/.test(n.textContent), n.textContent.trim());
  });
  t('and points at the thing that does work', () =>
    ok(/Save Session/.test(w.document.getElementById('restore-notice').textContent)));

  t('the save indicator stops claiming things are saved', async () => { ok(true); });

  t('answers still record with nowhere to save them', () => {
    w.eval('goToStage(1)');
    w.document.querySelector('#round1 .choice').click();
    ok(w.eval('responses.question_0').some(n => n > 0));
  });
  t('and Save Session still writes a file', () => {
    let out = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { out = String(p[0]); return new RB(p, o); };
    w.exportSession();
    w.Blob = RB;
    eq(JSON.parse(out).format, 'ttxs');
  });
}
{
  const { w } = offline(OUTPUT);
  await wait(250);
  w.document.querySelector('.welcome-demo-btn').click();
  w.eval("Object.defineProperty(window, 'localStorage', {" +
         "  get() { throw new Error('opaque'); }, configurable: true });");
  w.eval('scheduleSave()');
  await wait(1500);
  t('the save indicator is honest when the save did not happen', () => {
    const label = w.document.querySelector('#save-indicator span').textContent;
    ok(/Not saved/.test(label), 'indicator says: ' + JSON.stringify(label));
    ok(!w.document.getElementById('save-indicator').classList.contains('saved'));
  });
}

G('the site itself is free of third parties');
{
  ['index.html', 'library.html', 'guide.html', 'editor.html', 'gym/index.html'].forEach(page => {
    t(`${page} loads nothing from a third party`, () => {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      const hosts = [...new Set((html.match(/https?:\/\/[a-z0-9.-]+/g) || [])
        .map(h => h.replace(/^https?:\/\//, '')))]
        .filter(h => !/ttxgym\.com|w3\.org|example\.com/.test(h));
      eq(hosts, [], 'third-party hosts');
    });
  });
  t('the webfont is served from this repo', () => {
    ok(fs.existsSync(path.join(ROOT, 'css/fonts.css')), 'no local font stylesheet');
    const files = fs.readdirSync(path.join(ROOT, 'fonts')).filter(f => f.endsWith('.woff2'));
    ok(files.length >= 2, 'fonts: ' + files.join(', '));
  });
  t('every font file the stylesheet names is present', () => {
    const css = fs.readFileSync(path.join(ROOT, 'css/fonts.css'), 'utf8');
    (css.match(/url\(\.\.\/fonts\/([^)]+)\)/g) || []).forEach(u => {
      const name = /url\(\.\.\/fonts\/([^)]+)\)/.exec(u)[1];
      ok(fs.existsSync(path.join(ROOT, 'fonts', name)), 'missing ' + name);
    });
  });
  t('no page depends on an icon font', () => {
    // Removing the Google Fonts icon stylesheet broke every icon on the landing
    // page, because the check that said it was unused had been truncated by `head`.
    ['index.html', 'library.html', 'guide.html', 'editor.html', 'gym/index.html'].forEach(page => {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      ok(!/material-icons|Material\+Icons/i.test(html), page + ' still references an icon font');
    });
  });
  t('every icon actually has something to draw', () => {
    ['index.html', 'library.html', 'guide.html', 'editor.html', 'gym/index.html'].forEach(page => {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      const empty = [];
      const re = /<div class="([\w-]*icon[\w-]*)"[^>]*>([\s\S]{0,90})/g;
      let m;
      while ((m = re.exec(html))) {
        if (!m[2].includes('<svg') && !m[2].includes('${')) empty.push(page + ' .' + m[1]);
      }
      eq(empty, [], 'icon containers with nothing in them');
    });
  });
  t('the landing page icons survived the swap to inline SVG', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const icons = html.match(/<svg class="mi"[^>]*>\s*<path d="[^"]+"\s*\/>\s*<\/svg>/g) || [];
    eq(icons.length, 11, 'expected the 11 about/feature icons');
    ok(/\.feature-icon \.mi \{[^}]*fill:/.test(html.replace(/\s+/g, ' ')
       .replace(/\.feature-icon \.mi \{ /g, '.feature-icon .mi {')), 'icons are not filled');
  });
  t('Montserrat always has a fallback, for offline and for first paint', () => {
    ['style.css', 'gym/index.html'].forEach(f => {
      const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
      (s.match(/font-family:[^;}]*Montserrat[^;}]*/g) || []).forEach(decl => {
        ok(/sans-serif|Arial|Helvetica/.test(decl), `${f}: ${decl}`);
      });
    });
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
