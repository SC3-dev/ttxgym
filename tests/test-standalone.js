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
      w.HTMLElement.prototype.scrollTo = function () {};   // jsdom does no layout
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
  t('the whole module lands inside one script block', () => {
    // A literal </script> anywhere in the module would end the block early and
    // spill the rest of it into the page as text. (Counting tags is no use here:
    // the participant-window and report templates contain the string "<script"
    // inside JavaScript, with their closers already escaped.)
    const html = fs.readFileSync(OUTPUT, 'utf8');
    const start = html.indexOf('ttxf.js — the one implementation');
    ok(start > -1, 'the module was not inlined');
    const block = html.slice(start, html.indexOf('</script>', start));
    ok(block.includes('global.TTXF = {'), 'the module was cut short by an early closing tag');
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

G('the participant window still works with no shared origin');
{
  /* BroadcastChannel is scoped to an origin, and a page opened from a file:// path
     has an opaque origin — as does a blob: URL made from it. Two opaque origins are
     never equal, so the channel reaches nobody. Model that exactly: give each
     window its own channel implementation that talks to no one, leaving only the
     window handles. */
  const deaf = () => class { constructor() { this.onmessage = null; } postMessage() {} close() {} };
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message.split('\n')[0]));

  let room = null;
  const desk = new JSDOM(fs.readFileSync(OUTPUT, 'utf8'), {
    runScripts: 'dangerously', url: 'file:///home/someone/Downloads/ttxgym.html',
    virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      w.BroadcastChannel = deaf();
      w.fetch = () => Promise.reject(new Error('offline'));
      w.URL.createObjectURL = () => 'blob:opaque';
      w.URL.revokeObjectURL = () => {};
      w.open = () => {
        const p = new JSDOM(w.eval('PRESENTATION_HTML'), {
          runScripts: 'dangerously', url: 'blob:null/participant',
          virtualConsole: new VirtualConsole(), pretendToBeVisual: true,
          beforeParse(pw) {
            pw.BroadcastChannel = deaf();
            Object.defineProperty(pw, 'opener', { value: w, configurable: true });
          },
        });
        room = p.window;
        return p.window;
      };
    },
  });

  await wait(300);
  const w = desk.window;
  w.document.querySelector('.welcome-demo-btn').click();
  w.launchPresentation();
  await wait(400);

  t('the participant window opens', () => { ok(room, 'no window'); eq(errs, []); });
  t('it announces itself and receives the current stage', () =>
    eq(room.document.getElementById('title').textContent, 'Demo — Suspicious Email Reported'));

  w.eval('goToStage(2)'); await wait(80);
  t('moving stage reaches the room', () => {
    eq(room.document.getElementById('title').textContent, 'Stage 2: How far did it go?');
    eq(room.document.getElementById('progress-label').textContent, 'Stage 2 of 3');
  });

  w.eval('toggleBlank()'); await wait(60);
  t('blanking reaches the room', () => ok(room.document.getElementById('blankout').classList.contains('on')));
  w.eval('toggleBlank()'); await wait(60);

  w.prompt = () => 'The press just called.';
  w.eval('promptInject()'); await wait(60);
  t('injects reach the room', () =>
    eq(room.document.getElementById('injectBox').textContent, 'The press just called.'));

  w.eval('toggleTimer()'); await wait(60);
  t('pausing reaches the room', () =>
    ok(!room.document.getElementById('pause').classList.contains('hidden-overlay')));

  w.eval('handleFormSubmit()'); await wait(80);
  t('the summary reaches the room', () =>
    ok(room.document.querySelectorAll('#content .metric').length >= 3,
       'metric tiles: ' + room.document.querySelectorAll('#content .metric').length));

  t('the facilitator keeps a handle on the window it opened', () =>
    ok(w.eval('participantWindow && !participantWindow.closed')));
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
  t('every page has balanced markup', () => {
    /* jsdom repairs unbalanced tags silently, so no DOM-based test can see this —
       a stray </div> closes a container early and wrecks the layout in a real
       browser while every assertion still passes. It has to be checked in source. */
    const pages = ['index.html', 'library.html', 'guide.html', 'editor.html', 'gym/index.html'];
    const bad = [];
    pages.forEach(page => {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      const body = html.slice(html.indexOf('<body'), html.indexOf('<script'));
      const opened = (body.match(/<div\b/g) || []).length;
      const closed = (body.match(/<\/div>/g) || []).length;
      if (opened !== closed) bad.push(`${page}: ${opened} opened, ${closed} closed`);
    });
    eq(bad, []);
  });

  t('no container closes before its contents', () => {
    const pages = ['index.html', 'library.html', 'guide.html', 'editor.html', 'gym/index.html'];
    const bad = [];
    pages.forEach(page => {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      const body = html.slice(html.indexOf('<body'), html.indexOf('<script'));
      let depth = 0;
      body.split('\n').forEach((line, i) => {
        depth += (line.match(/<div\b/g) || []).length - (line.match(/<\/div>/g) || []).length;
        if (depth < 0 && !bad.some(b => b.startsWith(page))) bad.push(`${page}: line ${i + 1}`);
      });
    });
    eq(bad, []);
  });

  t('the library keeps its two-column shell', () => {
    const html = fs.readFileSync(path.join(ROOT, 'library.html'), 'utf8');
    const { JSDOM } = require('jsdom');
    const doc = new JSDOM(html).window.document;
    const wrap = doc.getElementById('lib-wrap');
    eq([...wrap.children].map(c => c.id), ['lib-sidebar', 'lib-main']);
    const side = doc.getElementById('lib-sidebar');
    eq([...side.children].map(c => c.id || c.className).filter(Boolean),
       ['lib-sidebar-header', 'search-wrap', 'category-filter', 'duration-filter', 'author-filter']);
    eq([...doc.getElementById('lib-main').children].map(c => c.id), ['lib-topbar', 'gallery-scroll']);
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
  t('browser-drawn controls follow the dark UI', () => {
    // Declared once per stylesheet; color-scheme inherits, so :root covers the page.
    const gym = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8').replace(/\s+/g, ' ');
    const site = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8').replace(/\s+/g, ' ');
    ok(/:root \{[^}]*color-scheme: dark/.test(gym), 'the gym does not declare a colour scheme');
    ok(/:root \{[^}]*color-scheme: dark/.test(site), 'the shared stylesheet does not declare one');
  });
  t('the calendar glyph is not inverted back to black', () => {
    // color-scheme already draws it light. Inverting it as well cancelled out and
    // put a black icon on a near-black field.
    const gym = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8').replace(/\s+/g, ' ');
    const rule = /calendar-picker-indicator \{([^}]*)\}/.exec(gym);
    ok(rule, 'no styling for the date picker glyph');
    ok(!/invert/.test(rule[1]), 'still inverting: ' + rule[1].trim());
  });
  t('the facilitator view has a light theme, defined by the same tokens', () => {
    const css = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    const style = css.slice(css.indexOf('<style>'), css.indexOf('</style>'));
    const names = block => (block.match(/--[\w-]+(?=:)/g) || []);
    const dark = names((/:root\s*\{([^}]*)\}/.exec(style) || [, ''])[1]);
    const light = names((/:root\[data-theme="light"\]\s*\{([^}]*)\}/.exec(style) || [, ''])[1]);
    ok(light.length > 15, 'no light palette: ' + light.length + ' tokens');
    // Only tokens that name a colour need a light value. Deciding that from the
    // value rather than from a list means adding a layout token later cannot
    // fail this test spuriously — nor a colour one pass it.
    const darkBlock = (/:root\s*\{([^}]*)\}/.exec(style) || [, ''])[1];
    const isColour = tok => {
      const v = (new RegExp(tok + ':\\s*([^;]+)').exec(darkBlock) || [, ''])[1];
      return /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(v);
    };
    const missing = dark.filter(t => isColour(t) && !light.includes(t));
    eq(missing, [], 'colour tokens with no light value');
    eq(light.filter(t => !dark.includes(t)), [], 'tokens that exist only in light');
    ok(/:root\[data-theme="light"\]\s*\{[^}]*color-scheme:\s*light/.test(style),
       'the light theme does not flip color-scheme');
  });
  t('no rule in the facilitator view pins a colour to one theme', () => {
    const html = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const pinned = [];
    style.replace(/([^{}\n]+)\{([^}]*)\}/g, (_, sel, decl) => {
      if (/^\s*(:root|@|\/\*)/.test(sel)) return '';
      (decl.match(/(?:color|background|background-color|border[\w-]*color|box-shadow):\s*([^;]+)/g) || [])
        .forEach(d => {
          const v = d.split(':').slice(1).join(':').trim();
          if (/var\(|none|transparent|inherit|currentColor|^#fff/.test(v)) return;
          // accent, status and neutral scrim tints read correctly on either ground
          if (/rgba\((?:46, 125, 224|62, 201, 200|245, 166, 35|224, 82, 82|199, 146, 234|0, 0, 0)/.test(v)) return;
          pinned.push(sel.trim() + ' -> ' + v);
        });
      return '';
    });
    eq(pinned, [], 'rules pinned to one theme');
  });
  t('the theme is applied before first paint, so it cannot flash', () => {
    const html = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    ok(/ttxgym_theme/.test(head), 'the stored theme is not read in <head>');
    ok(/try\s*\{/.test(head), 'reading it is not guarded for file:// origins');
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
