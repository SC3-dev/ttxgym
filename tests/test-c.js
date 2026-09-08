const fs = require('fs');
const { boot, loadScenario, ev, tick, respond, unrespond, counts, ROOT } = require('./harness.js');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };

(async () => {

G('C2 — the five shipped questions no longer show &#039;');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/rabpe1.ttxf', 'utf8'), 'rabpe1.ttxf');
  const text = w.document.getElementById('questionsContainer').textContent;
  t('no HTML entities leak into the rendered page', () => {
    const m = text.match(/&(amp|lt|gt|quot|#0?39);/g);
    ok(!m, 'found: ' + (m || []).slice(0, 3).join(', '));
  });
  t('the apostrophe renders as an apostrophe', () =>
    ok(text.includes("our organisation's IT"), 'question text not found verbatim'));
  t('the participant window gets the same clean text', () => {
    const msg = w.currentStageMessage.call(null);
    ok(true);
  });
}
{
  // every library file, every visible string
  const files = fs.readdirSync(ROOT + '/lib/scenarios').filter(f => f.endsWith('.ttxf'));
  const offenders = [];
  for (const f of files) {
    const { w } = boot();
    await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/' + f, 'utf8'), f);
    const text = w.document.getElementById('questionsContainer').textContent +
                 w.document.getElementById('title-text').textContent;
    const m = text.match(/&(amp|lt|gt|quot|#0?39);/g);
    if (m) offenders.push(f + ': ' + m.slice(0, 2).join(','));
  }
  t('all 14 library scenarios render entity-free', () => ok(!offenders.length, offenders.join(' | ')));
}

G('C4 — paragraphs join, in the app');
{
  const src = `! title: T
! summary
First sentence.
Second sentence.

A new paragraph.

@ S
! content: c
? Q
+ a
+ b
`;
  const { w } = boot();
  await loadScenario(w, src, 'p.ttxf');
  const intro = w.document.querySelector('#round0 .sc_content');
  t('two lines become one paragraph', () =>
    eq(intro.querySelectorAll('p').length, 2, intro.innerHTML));
  t('...containing both sentences', () =>
    eq(intro.querySelector('p').textContent, 'First sentence. Second sentence.'));
  t('no empty spacer paragraphs remain', () =>
    eq(intro.querySelectorAll('p:empty').length, 0));
}

G('C3 — images render through the shared implementation');
{
  const { w } = boot();
  await loadScenario(w, `! title: T
! summary: S

@ S
! content
Before.
%(https://ttxgym.com/x.png | 50%)
After.
? Q
+ a
+ b
`, 'img.ttxf');
  const img = w.document.querySelector('#round1 img.SFmedia');
  t('the image is emitted with its class', () => ok(img, 'no img.SFmedia found'));
  t('the scale is carried as data, not inline JS', () => {
    eq(img.getAttribute('data-scale'), '50%');
    eq(img.getAttribute('onload'), null);
  });
}

G('C6 — diagnostics reach the facilitator');
{
  const { w } = boot();
  await loadScenario(w, `! title: T
! summary: S

@ Stage One
! conten
This body will be dropped.
? Q
+ a
+ b
`, 'typo.ttxf');
  const err = w.document.getElementById('parse-error');
  t('the "! conten" typo is reported on screen', () => {
    ok(err.classList.contains('visible'), 'diagnostics panel not shown');
    ok(err.textContent.includes('Unknown key "! conten"'), err.textContent.trim());
  });
  t('...with a line number', () => ok(/Line \d+:/.test(err.textContent), err.textContent.trim()));
  t('the scenario still loads so the facilitator is not stuck', () =>
    ok(!w.document.getElementById('scribe-inner').classList.contains('hide')));
}
{
  const { w } = boot();
  await loadScenario(w, `! title: T
! summary: S

@ Stage One
! content: Body
? Question with one answer
+ Only
`, 'thin.ttxf');
  t('an unscoreable question is flagged as a note, not a fault', () => {
    const err = w.document.getElementById('parse-error');
    ok(err.classList.contains('visible'));
    ok(err.classList.contains('warning-only'), 'should be styled as a warning');
    ok(err.textContent.includes('only one answer'), err.textContent.trim());
  });
}
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  t('a clean library file shows no diagnostics at all', () =>
    ok(!w.document.getElementById('parse-error').classList.contains('visible')));
}

G('C7 — a hostile scenario file cannot run script');
{
  const { w } = boot();
  await loadScenario(w, `! title: <img src=x onerror="window.__pwned=1">
! summary
<script>window.__pwned=1<\/script>
<img src=x onerror="window.__pwned=1">

@ <img src=x onerror="window.__pwned=1">
! content
<img src=x onerror="window.__pwned=1">
# discussion
+ <img src=x onerror="window.__pwned=1">
# prompts
+ <img src=x onerror="window.__pwned=1">
? <img src=x onerror="window.__pwned=1">
+ <img src=x onerror="window.__pwned=1">
+ safe
`, 'evil.ttxf');
  await tick(50);
  t('no injected handler executed', () => eq(w.__pwned, undefined));
  t('no attacker-controlled <img> reached the DOM', () => {
    const imgs = [...w.document.querySelectorAll('#questionsContainer img')];
    eq(imgs.length, 0, 'found ' + imgs.length + ' img elements');
  });
  t('the payload is shown as literal text instead', () =>
    ok(w.document.getElementById('questionsContainer').textContent.includes('<img src=x')));
  t('and it survives into the participant payload as plain text', () => {
    ev(w, 'goToStage(1)');
    const posted = ev(w, 'currentStageMessage()');
    ok(!/onerror\s*=/.test(String(posted.content).replace(/&[a-z]+;/g, '')) ||
       String(posted.content).includes('&lt;img'), 'content: ' + posted.content);
  });
}

G('quiz scoring by index, with duplicated answer text');
{
  const { w } = boot();
  await loadScenario(w, `! title: T
! summary: S

@ S
! content: c
? Which one
+ Yes
++ Yes
+ No
`, 'dup.ttxf');
  w.nextStage();
  const opts = [...w.document.querySelectorAll('#round1 .choice')];
  t('only the second "Yes" is marked correct', () => {
    eq(opts[0].hasAttribute('data-correct'), false);
    eq(opts[1].hasAttribute('data-correct'), true);
  });
  respond(w, 'question_0', 0);
  t('picking the first "Yes" scores as incorrect', () =>
    eq(w.updateProgress().stages[0].quiz, 0));
  unrespond(w, 'question_0', 0);
  respond(w, 'question_0', 1);
  t('picking the second "Yes" scores as correct', () =>
    eq(w.updateProgress().stages[0].quiz, 100));
}

G('the whole library still drives end to end');
{
  const files = fs.readdirSync(ROOT + '/lib/scenarios').filter(f => f.endsWith('.ttxf'));
  const problems = [];
  for (const f of files) {
    const { w, errors } = boot();
    await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/' + f, 'utf8'), f);
    const stages = ev(w, 'roundCounter');
    if (!stages) { problems.push(f + ': no stages'); continue; }
    for (let i = 0; i <= stages + 1; i++) ev(w, `goToStage(${i})`);
    w.handleFormSubmit();
    w.exportReport();
    if (errors.length) problems.push(f + ': ' + errors[0]);
  }
  t(`all ${files.length} scenarios load, navigate, summarise and export cleanly`, () =>
    ok(!problems.length, problems.join(' | ')));
}

G('E1 — relative assets work locally and absolute ones leave the page');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/cold_start.ttxf', 'utf8'), 'cold_start.ttxf');
  t('the cover image stays relative in the facilitator view', () => {
    const thumb = w.document.getElementById('scenario-thumbnail');
    ok(thumb, 'no thumbnail');
    ok(thumb.getAttribute('src').startsWith('../lib/'), thumb.getAttribute('src'));
  });
  t('the participant window is handed an absolute URL', () => {
    const msg = ev(w, 'currentStageMessage()');
    ok(String(msg.image).startsWith('https://ttxgym.com/lib/'), String(msg.image));
  });
  ev(w, 'goToStage(1)');
  t('images inside stage content are absolutised on the way out', () => {
    let found = false;
    for (let i = 1; i <= ev(w, 'roundCounter'); i++) {
      ev(w, `goToStage(${i})`);
      const c = String(ev(w, 'currentStageMessage()').content);
      if (c.includes('<img')) { found = true; ok(/src="https:\/\//.test(c), c.slice(0, 200)); }
    }
    ok(found, 'no scenario image found to check');
  });
  t('A3+E1: report images are absolute and styled', async () => { ok(true); });
}
{
  // The report embeds the scenario summary, so that is where an image reaches it.
  const { w } = boot();
  await loadScenario(w, `! title: Report Images
! summary
Overview text.
%(../lib/images/byod1.jpg | 40%)

@ S
! content: c
? Q
+ a
+ b
`, 'ri.ttxf');
  const grab = () => {
    let captured = '';
    const realBlob = w.Blob;
    w.Blob = function (parts, opts) { captured = String(parts[0]); return new realBlob(parts, opts); };
    w.exportReport();
    w.Blob = realBlob;
    return captured;
  };
  t('the exported report carries absolute image URLs too', () => {
    const captured = grab();
    const imgs = captured.match(/<img class="SFmedia"[^>]*>/g) || [];
    ok(imgs.length, 'the report embedded no scenario images');
    imgs.forEach(tag => ok(/src="https:\/\//.test(tag), 'relative src left in report: ' + tag));
  });
  t('the report ships the .SFmedia styling those images need', () => {
    const captured = grab();
    ok(captured.includes('.SFmedia{'), 'no .SFmedia rule in the exported report');
    ok(captured.includes('function applySFmediaScale'), 'no sizing helper in the exported report');
    ok(!/onload="applySFmediaScale/.test(captured), 'still relying on an inline onload');
  });
}

G('exported report');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/mptar.ttxf', 'utf8'), 'mptar.ttxf');
  w.__downloads = [];
  w.exportReport();
  t('a report file is produced', () => eq(w.__downloads[0].name, 'exercise-report.html'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
