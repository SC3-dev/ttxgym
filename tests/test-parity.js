/* Parity: the rebuilt builder against the one it replaces.

   The rebuild is a different page with a different model, so the only meaningful
   question is whether an author ends up with the same scenario. Every shipped
   scenario is pushed through both and the parsed results compared — not the
   bytes, which the two format differently, but the exercise the gym would run.

   The second half checks the paths in and out, because those are what the rest
   of the site links to and are the only way a swap can quietly break something
   outside this page. See docs/BUILDER-DESIGN.md. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const T = require(path.join(ROOT, 'js/ttxf.js'));
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected ${JSON.stringify(sub)} in ${JSON.stringify(String(s).slice(0, 200))}`); };

function boot(page, opts) {
  const o = opts || {};
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));
  const store = o.store || {};
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), 'utf8'), {
    runScripts: 'dangerously', url: o.url || ('https://ttxgym.com/' + page), virtualConsole: vc,
    beforeParse(w) {
      w.eval(fs.readFileSync(path.join(ROOT, 'js/ttxf.js'), 'utf8'));
      w.eval(fs.readFileSync(path.join(ROOT, 'js/participant-view.js'), 'utf8'));
      Object.defineProperty(w, 'localStorage', { value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }, _store: store,
      }, configurable: true });
      w.confirm = () => true;
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
      w.Element.prototype.scrollIntoView = function () {};
      w.URL.createObjectURL = () => 'blob:stub';
      w.URL.revokeObjectURL = () => {};
      if (o.fetchImpl) w.fetch = o.fetchImpl;
      w.open = url => { (w.__opened || (w.__opened = [])).push(url); return null; };
    },
  });
  return { w: dom.window, errs, store };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* What the gym would actually run: everything the format carries, with the
   incidental differences — trailing whitespace, list padding — normalised out. */
function shape(text) {
  const { doc } = T.parse(text);
  const trim = v => String(v == null ? '' : v).replace(/\s+$/gm, '').trim();
  return {
    title: trim(doc.title), author: trim(doc.author), image: trim(doc.image),
    summary: trim(doc.summary), conclusion: trim(doc.conclusion),
    stages: (doc.stages || []).map(s => ({
      stage: trim(s.stage), content: trim(s.content), duration: trim(s.duration),
      discussion: (s.discussion || []).map(trim).filter(Boolean),
      prompts: (s.prompts || []).map(trim).filter(Boolean),
      questions: (s.questions || []).map(q => ({
        question: trim(q.question),
        answers: (q.answers || []).map(trim),
        quizIndex: q.quizIndex,
        participantHidden: !!q.participantHidden,
      })),
    })),
  };
}

(async () => {

const files = fs.readdirSync(path.join(ROOT, 'lib/scenarios')).filter(f => f.endsWith('.ttxf')).sort();

G(`the same scenario comes out the same: ${files.length} files through both builders`);
{
  const { w: oldB } = boot('editor.html');
  const { w: newB } = boot('builder.html');

  const divergent = [];
  const lostByOld = [];
  files.forEach(f => {
    const source = fs.readFileSync(path.join(ROOT, 'lib/scenarios', f), 'utf8');
    const want = shape(source);

    oldB.parseTTXF(source);
    const fromOld = shape(oldB.buildTTXF());

    newB.load(source);
    const fromNew = shape(newB.toTTXF());

    if (JSON.stringify(fromOld) !== JSON.stringify(want)) lostByOld.push(f);
    if (JSON.stringify(fromNew) !== JSON.stringify(fromOld)) divergent.push(f);
  });

  t('the rebuild agrees with the builder it replaces on every shipped scenario',
    () => eq(divergent, [], 'these came out differently'));

  t('and both agree with the file they were given',
    () => eq(lostByOld, [], 'the existing builder already loses something in these'));
}

G('the ways in');
{
  const wanted = 'https://ttxgym.com/lib/scenarios/byod1.ttxf';
  let asked = null;
  const source = fs.readFileSync(path.join(ROOT, 'lib/scenarios/byod1.ttxf'), 'utf8');
  const { w } = boot('builder.html', {
    url: 'https://ttxgym.com/builder.html?load=byod1',
    fetchImpl: u => { asked = u; return Promise.resolve({ ok: true, text: () => Promise.resolve(source) }); },
  });
  await wait(50);

  t('?load= fetches the scenario the library named', () => {
    ok(asked, 'nothing was fetched');
    has(new URL(asked, 'https://ttxgym.com/').href, wanted);
  });

  t('and it is in the builder', () => {
    eq(w.eval('doc.title'), T.parse(source).doc.title);
    ok(w.eval('doc.stages.length') > 1, 'no stages loaded');
  });

  t('the library links to a page with that parameter', () => {
    const lib = fs.readFileSync(path.join(ROOT, 'library.html'), 'utf8');
    ok(/customiser'\)\.href = `[a-z.]+\.html\?load=/.test(lib), 'the Customise link changed shape');
  });

  t('a library id that does not exist says so instead of emptying the page', async () => {
    const { w: w2 } = boot('builder.html', {
      url: 'https://ttxgym.com/builder.html?load=nope',
      store: { ttxgym_builder_draft: JSON.stringify({ title: 'Mine', stages: [] }) },
      fetchImpl: () => Promise.resolve({ ok: false, statusText: 'Not Found' }),
    });
    return wait(50).then(() => {
      eq(w2.eval('doc.title'), 'Mine', 'it threw away the draft over a bad link');
      eq(w2.document.getElementById('b-status').className, 'bad');
    });
  });
}

G('the ways out');
{
  const { w, store } = boot('builder.html');
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/byod1.ttxf'), 'utf8'));

  t('Run it hands the scenario to the gym the way the gym expects to find it', () => {
    w.bRunInGym();
    ok(store.preview, 'nothing was left for the gym');
    eq(shape(store.preview), shape(w.eval('toTTXF()')));
    eq(w.__opened, ['gym/']);
  });

  t('which is the key the gym reads and clears', () => {
    const gym = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    has(gym, "store.get('preview')");
    has(gym, "store.remove('preview')");
  });

  t('an empty scenario is not handed over at all', () => {
    const { w: w2, store: s2 } = boot('builder.html');
    w2.eval('doc = { title: "", author: "", summary: "", conclusion: "", image: "", stages: [] };');
    w2.bRunInGym();
    ok(!s2.preview, 'it sent the gym an empty exercise');
    eq(w2.document.getElementById('b-status').className, 'bad');
  });

  t('Download names the file after the scenario, not after its id', () => {
    let named = null;
    w.HTMLAnchorElement.prototype.click = function () { named = this.download; };
    w.bExport();
    eq(named, 'bring-your-own-device.ttxf');
  });
}

G('everything the old page could do');
{
  const { w } = boot('builder.html');
  w.load('! title: T\n! author: A\n! image: https://x/c.png\n\n! summary\nBefore.\n\n@ One\n! content\nFirst.\n\n@ Two\n! content\nSecond.\n\n! conclusion\nAfter.\n');

  t('the exercise-level image survives a page that never shows it a text box', () => {
    has(w.eval('toTTXF()'), '! image: https://x/c.png');
  });

  t('and can be changed from the picker', () => {
    w.setCover('../lib/exercise_data/icons/TTXGYM_Warning_red.png');
    has(w.eval('toTTXF()'), '! image: ../lib/exercise_data/icons/TTXGYM_Warning_red.png');
    has(w.document.getElementById('b-cover-label').textContent, 'TTXGYM_Warning_red.png');
  });

  t('stages move', () => {
    w.bMoveStage(0, 1);
    eq(w.eval('doc.stages.map(s => s.stage)'), ['Two', 'One']);
    eq(w.eval('focus'), 1, 'the moved stage is no longer the one being edited');
    w.bMoveStage(1, -1);
    eq(w.eval('doc.stages.map(s => s.stage)'), ['One', 'Two']);
  });

  t('and cannot be moved off either end', () => {
    w.bMoveStage(0, -1);
    w.bMoveStage(1, 1);
    eq(w.eval('doc.stages.map(s => s.stage)'), ['One', 'Two']);
  });

  t('dragging a stage in the outline reorders it', () => {
    const rows = w.document.querySelectorAll('#b-stage-list .b-stage-row');
    eq(rows.length, 2);
    ok(rows[0].getAttribute('draggable') === 'true', 'rows are not draggable');
    const carry = { effectAllowed: '', setData: () => {}, getData: () => '0' };
    const start = new w.Event('dragstart', { bubbles: true });
    start.dataTransfer = carry;
    rows[0].dispatchEvent(start);
    const drop = new w.Event('drop', { bubbles: true, cancelable: true });
    drop.dataTransfer = carry;
    w.document.querySelectorAll('#b-stage-list .b-stage-row')[1].dispatchEvent(drop);
    eq(w.eval('doc.stages.map(s => s.stage)'), ['Two', 'One']);
    w.bMoveStage(1, -1);
  });

  t('a duplicated stage is a copy, not a second reference', () => {
    w.bDuplicateStage(0);
    eq(w.eval('doc.stages.map(s => s.stage)'), ['One', 'One (copy)', 'Two']);
    w.eval('doc.stages[1].questions.push({question:"Q", answers:["a"], quizIndex:-1, participantHidden:false});');
    eq(w.eval('doc.stages[0].questions.length'), 0, 'the copy shares its questions with the original');
    w.eval('doc.stages.splice(1, 1);');
  });

  t('starting again clears the draft rather than leaving it to come back', () => {
    const { w: w2, store } = boot('builder.html', {
      store: { ttxgym_builder_draft: JSON.stringify({ title: 'Old work', stages: [{ stage: 'S', content: 'c', duration: '', discussion: [], prompts: [], questions: [] }] }) },
    });
    ok(!w2.document.getElementById('b-notice').classList.contains('hide'), 'nothing said where this came from');
    has(w2.document.getElementById('b-notice-text').textContent, 'Old work');
    w2.bDiscardDraft();
    eq(w2.eval('doc.title'), '');
    ok(!store.ttxgym_builder_draft || !JSON.parse(store.ttxgym_builder_draft).title,
       'the old draft is still in storage');
  });

  t('the site navigation is there, so the builder is not a page you fall out of', () => {
    ok(w.document.getElementById('site-nav'), 'no site nav');
    ok(w.document.getElementById('mobile-nav'), 'no mobile nav');
    const links = Array.from(w.document.querySelectorAll('#site-nav .nav-links a')).map(a => a.getAttribute('href'));
    ['index.html', 'guide.html', 'library.html', 'gym/'].forEach(h => ok(links.includes(h), 'no link to ' + h));
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
