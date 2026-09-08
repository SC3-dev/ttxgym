/* Cross-page journeys: library -> builder -> gym, and the paths into the gym.
   These exist because the pieces each worked in isolation while the chain between
   them did not — the builder's preview hit a temporal dead zone in the gym. */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = require('path').resolve(__dirname, '..');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const wait = ms => new Promise(r => setTimeout(r, ms));

function bootPage(file, { url, store = {}, fetchImpl } = {}) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(fs.readFileSync(`${ROOT}/${file}`, 'utf8'), {
    runScripts: 'dangerously', url, virtualConsole: vc,
    beforeParse(w) {
      w.eval(fs.readFileSync(`${ROOT}/js/ttxf.js`, 'utf8'));
      Object.defineProperty(w, 'localStorage', { value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }, _store: store,
      }, configurable: true });
      w.BroadcastChannel = class { constructor() { this.onmessage = null; } postMessage(m) { (w.__posted ||= []).push(m); } close() {} };
      w.confirm = () => true;
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
      w.URL.createObjectURL = () => 'blob:stub';
      w.URL.revokeObjectURL = () => {};
      w.open = (u) => { (w.__opened ||= []).push(u); return null; };
      w.HTMLAnchorElement.prototype.click = function () { (w.__downloads ||= []).push(this.download); };
      if (fetchImpl) w.fetch = fetchImpl;
    },
  });
  return { w: dom.window, errs, store };
}

const noParseError = (w) => {
  const pe = w.document.getElementById('parse-error');
  if (pe.classList.contains('visible')) throw new Error('gym reported: ' + pe.textContent.trim());
};

(async () => {

G('library → Customise → builder → Preview in TTX Gym');
{
  const source = fs.readFileSync(`${ROOT}/lib/scenarios/byod1.ttxf`, 'utf8');
  const store = {};

  const { w: ed, errs: edErrs } = bootPage('editor.html', {
    url: 'https://ttxgym.com/editor.html?load=byod1', store,
    fetchImpl: () => Promise.resolve({ ok: true, text: () => Promise.resolve(source) }),
  });
  await wait(400);
  t('the builder loads the library scenario', () => {
    eq(ed.document.getElementById('f-title').value, 'Bring your own device');
    eq(ed.eval('stages.length'), 4);
    eq(edErrs, []);
  });

  ed.postToNewTab();
  t('Preview hands the scenario over and opens the gym', () => {
    eq(ed.__opened, ['gym/']);
    ok(store.preview, 'nothing was handed over');
  });

  const { w: gym, errs: gymErrs } = bootPage('gym/index.html', { url: 'https://ttxgym.com/gym/', store });
  await wait(300);
  t('the gym opens the preview without an error', () => { noParseError(gym); eq(gymErrs, []); });
  t('every stage came through', () => eq(gym.eval('roundCounter'), 4));
  t('the welcome screen gives way to the exercise', () =>
    eq(gym.document.getElementById('welcome-screen').style.display, 'none'));
  t('the preview is fully usable, not just rendered', () => {
    ok(gym.document.querySelector('.choice'), 'no answer options');
    ok(gym.document.querySelector('.actions-list'), 'no actions panel');
    ok(gym.document.querySelector('[data-meta-key="facilitator"]'), 'no session details');
  });
  t('a preview can be saved as a session', () => {
    gym.exportSession();
    ok(/\.ttxs$/.test(gym.__downloads[0]), gym.__downloads[0]);
  });
  t('the preview is consumed, so a reload does not resurrect it', () => {
    eq(store.preview, undefined);
  });
}

G('the gym reaches a scenario the same way from every entry point');
{
  const source = fs.readFileSync(`${ROOT}/lib/scenarios/byod1.ttxf`, 'utf8');

  // ?q= — the library's Run Exercise link
  const { w: viaQ, errs: qErrs } = bootPage('gym/index.html', {
    url: 'https://ttxgym.com/gym/?q=byod1',
    fetchImpl: () => Promise.resolve({ ok: true, text: () => Promise.resolve(source) }),
  });
  await wait(300);
  t('?q= loads from the library', () => { noParseError(viaQ); eq(viaQ.eval('roundCounter'), 4); eq(qErrs, []); });

  // preview — the builder
  const { w: viaPreview } = bootPage('gym/index.html', {
    url: 'https://ttxgym.com/gym/', store: { preview: source },
  });
  await wait(300);
  t('a preview loads from the builder', () => { noParseError(viaPreview); eq(viaPreview.eval('roundCounter'), 4); });

  // demo — the welcome screen
  const { w: viaDemo } = bootPage('gym/index.html', { url: 'https://ttxgym.com/gym/' });
  await wait(100);
  viaDemo.document.querySelector('.welcome-demo-btn').click();
  t('the demo button loads from the welcome screen', () => { noParseError(viaDemo); eq(viaDemo.eval('roundCounter'), 3); });

  // all three should leave the page in the same shape
  t('all three entry points produce the same working page', () => {
    [viaQ, viaPreview, viaDemo].forEach((w, i) => {
      ok(w.document.querySelector('.choice'), `entry ${i}: no answer options`);
      ok(w.document.getElementById('mirror-frame').dataset.mounted, `entry ${i}: no mirror`);
      ok(!w.document.getElementById('times-total-row').classList.contains('hide'), `entry ${i}: no total row`);
      ok(w.eval('sessionKey'), `entry ${i}: autosave disabled`);
    });
  });
}

G('a broken preview says something useful');
{
  const { w } = bootPage('gym/index.html', {
    url: 'https://ttxgym.com/gym/', store: { preview: 'not a scenario at all' },
  });
  await wait(200);
  t('junk in the preview slot is reported, not swallowed', () => {
    const pe = w.document.getElementById('parse-error');
    ok(pe.classList.contains('visible'), 'no error shown');
    ok(pe.textContent.includes('No stages found'), pe.textContent.trim());
  });
}

G('every library scenario survives the whole chain');
{
  const files = fs.readdirSync(`${ROOT}/lib/scenarios`).filter(f => f.endsWith('.ttxf'));
  const broken = [];
  for (const f of files) {
    const source = fs.readFileSync(`${ROOT}/lib/scenarios/${f}`, 'utf8');
    const store = {};
    const { w: ed } = bootPage('editor.html', {
      url: `https://ttxgym.com/editor.html?load=${f.replace('.ttxf', '')}`, store,
      fetchImpl: () => Promise.resolve({ ok: true, text: () => Promise.resolve(source) }),
    });
    await wait(250);
    ed.postToNewTab();
    const { w: gym, errs } = bootPage('gym/index.html', { url: 'https://ttxgym.com/gym/', store });
    await wait(150);
    const pe = gym.document.getElementById('parse-error');
    if (pe.classList.contains('visible')) broken.push(`${f}: ${pe.textContent.trim().slice(0, 80)}`);
    else if (errs.length) broken.push(`${f}: ${errs[0]}`);
    else if (gym.eval('roundCounter') === 0) broken.push(`${f}: no stages`);
  }
  t(`all ${files.length} scenarios go library → builder → gym cleanly`, () => ok(!broken.length, broken.join(' | ')));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
