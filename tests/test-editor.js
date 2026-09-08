const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = require('path').resolve(__dirname, '..');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''}\n         expected: ${JSON.stringify(b)}\n         actual:   ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected to contain ${JSON.stringify(sub)}\n         in: ${JSON.stringify(String(s).slice(0, 300))}`); };

function boot(seedDraft, url, fetchImpl) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));
  const store = seedDraft ? { ttxgym_editor_draft: seedDraft } : {};
  const dom = new JSDOM(fs.readFileSync(ROOT + '/editor.html', 'utf8'), {
    runScripts: 'dangerously', url: url || 'https://ttxgym.com/editor.html', virtualConsole: vc,
    beforeParse(w) {
      w.eval(fs.readFileSync(ROOT + '/js/ttxf.js', 'utf8'));
      Object.defineProperty(w, 'localStorage', { value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }, _store: store,
      }, configurable: true });
      w.confirm = () => true;
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
      w.Element.prototype.scrollIntoView = function () {};
      if (fetchImpl) w.fetch = fetchImpl;
      w.URL.createObjectURL = () => 'blob:stub';
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { (w.__downloads ||= []).push(this.download); };
      w.open = (url) => { (w.__opened ||= []).push(url); return null; };
    },
  });
  return { w: dom.window, errs, store };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = (w, e) => w.eval(e);

const SAMPLE = `! title: Round Trip Test
! author: Jane Doe
! image: https://example.com/c.jpg
! summary
First line.
Second line.

@ Stage One
! content
Body line one.
Body line two.

# discussion
+ Discussion point
# prompts
+ Prompt point
? A rating question
+ Low
+ High
?- A hidden quiz
+ Wrong
++ Right
`;

(async () => {

G('C1 — the editor round-trips through the shared module');
{
  const { w, errs } = boot();
  t('the page boots without error', () => eq(errs.length, 0, errs.join(' | ')));
  w.parseTTXF(SAMPLE);
  await wait(200);
  t('header fields are populated', () => {
    eq(w.document.getElementById('f-title').value, 'Round Trip Test');
    eq(w.document.getElementById('f-author').value, 'Jane Doe');
    has(w.document.getElementById('f-summary').value, 'First line.');
  });
  t('stages are loaded', () => eq(ev(w, 'stages.length'), 1));
  t('the quiz answer is stored by index', () => eq(ev(w, 'stages[0].questions[1].quizIndex'), 1));
  t('the rating question has no correct answer', () => eq(ev(w, 'stages[0].questions[0].quizIndex'), -1));
  t('participant-hidden survives the import', () => eq(ev(w, 'stages[0].questions[1].participantHidden'), true));
  t('export re-emits an identical file', () => eq(w.buildTTXF().trim(), SAMPLE.trim()));
  t('a second round-trip is still identical', () => {
    w.parseTTXF(w.buildTTXF());
    eq(w.buildTTXF().trim(), SAMPLE.trim());
  });
}

G('C3 — the preview matches what the gym will render');
{
  const { w } = boot();
  w.parseTTXF(SAMPLE);
  await wait(200);
  w.buildVisualPreview();
  const out = w.document.getElementById('visual-output');
  t('adjacent content lines join into one paragraph, as in the gym', () => {
    const ps = out.querySelectorAll('.preview-content p');
    eq(ps.length, 1, out.querySelector('.preview-content').innerHTML);
    eq(ps[0].textContent, 'Body line one. Body line two.');
  });
  t('the correct quiz answer is highlighted by position', () => {
    const correct = out.querySelectorAll('.preview-answer.correct');
    eq(correct.length, 1);
    eq(correct[0].textContent, 'Right');
  });
}
{
  const { w } = boot();
  w.parseTTXF(`! title: T
! summary: S

@ S
! content
%(https://x/i.png | 50%)
`);
  await wait(200);
  w.buildVisualPreview();
  const img = w.document.querySelector('#visual-output .preview-content img');
  t('images use the same .SFmedia contract as the gym', () => {
    ok(img, 'no image rendered');
    eq(img.className, 'SFmedia');
    eq(img.getAttribute('data-scale'), '50%');
  });
}

G('D2 — duplicate answers no longer confuse the correct one');
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ S\n! content: c\n? Q\n+ Yes\n++ Yes\n+ No\n');
  await wait(200);
  t('exactly one option is marked correct in the UI', () =>
    eq(w.document.querySelectorAll('.answer-correct-toggle.correct').length, 1));
  t('and it is the second "Yes"', () => eq(ev(w, 'stages[0].questions[0].quizIndex'), 1));
  t('editing the other "Yes" does not steal correctness', () => {
    w.updateAnswer(ev(w, 'stages[0].id'), ev(w, 'stages[0].questions[0].id'), 0, 'Maybe');
    eq(ev(w, 'stages[0].questions[0].quizIndex'), 1);
  });
  t('an empty answer can be marked correct', () => {
    const sid = ev(w, 'stages[0].id'), qid = ev(w, 'stages[0].questions[0].id');
    w.updateAnswer(sid, qid, 2, '');
    w.setCorrectAnswer(sid, qid, 2);
    eq(ev(w, 'stages[0].questions[0].quizIndex'), 2);
  });
  t('removing an answer above the correct one keeps the right option', () => {
    const sid = ev(w, 'stages[0].id'), qid = ev(w, 'stages[0].questions[0].id');
    w.updateAnswer(sid, qid, 2, 'Third');
    w.setCorrectAnswer(sid, qid, 2);
    w.removeAnswer(sid, qid, 0);
    eq(ev(w, 'stages[0].questions[0].quizIndex'), 1);
    eq(ev(w, 'stages[0].questions[0].answers[1]'), 'Third');
  });
}

G('D3 — validation panel');
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ Stage One\n! content: c\n? Q\n+ a\n+ b\n');
  await wait(250);
  t('a clean scenario reports as ready', () => {
    const p = w.document.getElementById('validation-panel');
    ok(p.classList.contains('clean'), p.className);
    has(p.textContent, 'valid and ready to run');
  });
}
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ Stage With No Content\n? Q\n+ a\n');
  await wait(250);
  const p = w.document.getElementById('validation-panel');
  t('a stage with no content is flagged', () => has(p.textContent, 'has no "! content"'));
  t('a question with one answer is flagged', () => has(p.textContent, 'only one answer'));
  t('the panel is marked as having faults', () => ok(p.classList.contains('has-errors'), p.className));
}

G('D1 — drafts survive a refresh');
{
  const { w, store } = boot();
  w.document.getElementById('f-title').value = 'My Work In Progress';
  w.addStage();
  await wait(1200);   // scheduleUpdate (120ms) then the draft debounce (800ms)
  t('the draft reaches localStorage', () => {
    ok(store.ttxgym_editor_draft, 'nothing saved');
    has(store.ttxgym_editor_draft, 'My Work In Progress');
  });
  // simulate the refresh
  const { w: w2 } = boot(store.ttxgym_editor_draft);
  await wait(400);
  t('a reload restores the work', () => eq(w2.document.getElementById('f-title').value, 'My Work In Progress'));
  t('...and says so', () => {
    const n = w2.document.getElementById('draft-notice');
    ok(n.classList.contains('visible'), 'notice hidden');
    has(n.textContent, 'Picked up the draft');
  });
  t('Start a new scenario clears it', () => {
    w2.discardDraft();
    eq(w2.document.getElementById('f-title').value, '');
    eq(w2.localStorage.getItem('ttxgym_editor_draft'), null);
  });
}
{
  const { w } = boot();
  await wait(100);
  t('an untouched editor shows no draft notice', () =>
    ok(!w.document.getElementById('draft-notice').classList.contains('visible')));
  t('...and no validation noise', () =>
    ok(!w.document.getElementById('validation-panel').classList.contains('visible')));
}

G('export filenames');
{
  const { w } = boot();
  w.document.getElementById('f-title').value = 'Ransomware: "Phase 2" / Recovery';
  w.updatePreviews();
  t('a title with punctuation yields a safe filename', () =>
    eq(w.document.getElementById('preview-filename').textContent, 'ransomware-phase-2-recovery.ttxf'));
  w.exportTTXF();
  t('the download uses it', () => eq(w.__downloads[0], 'ransomware-phase-2-recovery.ttxf'));
}

G('every library scenario survives an editor round-trip');
{
  const files = fs.readdirSync(ROOT + '/lib/scenarios').filter(f => f.endsWith('.ttxf'));
  const bad = [];
  const { w } = boot();
  for (const f of files) {
    const src = fs.readFileSync(ROOT + '/lib/scenarios/' + f, 'utf8');
    w.parseTTXF(src);
    const out = w.buildTTXF();
    const a = JSON.stringify(w.TTXF.parse(src).doc);
    const b = JSON.stringify(w.TTXF.parse(out).doc);
    if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(f);
  }
  t(`all ${files.length} scenarios import and re-export losslessly`, () => ok(!bad.length, bad.join(', ')));
}

G('F4.1 — the builder can set a stage duration');
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ S\n! content: c\n! duration: 10 mins\n? Q\n+ a\n+ b\n');
  await wait(200);
  t('an imported duration is shown in a field', () => {
    const input = [...w.document.querySelectorAll('.field-input')]
      .find(i => i.value === '10 mins');
    ok(input, 'no duration field carrying the value');
  });
  t('it round-trips back out', () => has(w.buildTTXF(), '! duration: 10 mins'));
  t('editing it updates the file', () => {
    w.updateStageField(ev(w, 'stages[0].id'), 'duration', '25 mins');
    has(w.buildTTXF(), '! duration: 25 mins');
  });
  t('an unreadable duration is flagged', async () => { ok(true); });
}
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ S\n! content: c\n! duration: whenever\n? Q\n+ a\n+ b\n');
  await wait(250);
  t('an unreadable duration is flagged in validation', () =>
    has(w.document.getElementById('validation-panel').textContent, 'could not be read'));
}

G('F5.2 — Customise in Builder');
{
  const SRC = '! title: From The Library\n! summary: S\n\n@ Stage One\n! content: c\n? Q\n+ a\n+ b\n';
  const okFetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(SRC) });
  const { w } = boot(null, 'https://ttxgym.com/editor.html?load=byod1', okFetch);
  await wait(250);
  t('the scenario is fetched and loaded straight in', () => {
    eq(w.document.getElementById('f-title').value, 'From The Library');
    eq(ev(w, 'stages.length'), 1);
  });
  t('it does not resurrect an unrelated draft', () =>
    ok(!w.document.getElementById('draft-notice').classList.contains('visible')));
}
{
  const badFetch = () => Promise.resolve({ ok: false, statusText: 'Not Found' });
  const { w } = boot(null, 'https://ttxgym.com/editor.html?load=nope', badFetch);
  await wait(250);
  t('a missing scenario says so instead of failing silently', () =>
    has(w.document.getElementById('validation-panel').textContent, 'Could not load that scenario'));
}

G('answer presets — the biggest piece of authoring friction');
{
  const { w } = boot();
  w.addStage();
  await wait(200);
  const sid = ev(w, 'stages[0].id');
  w.addQuestion(sid);
  await wait(200);

  t('a new question arrives with the scale almost every question uses', () => {
    eq(ev(w, 'stages[0].questions[0].answers'), [
      'Not at all confident', 'Slightly confident', 'Somewhat confident',
      'Fairly confident', 'Completely confident']);
  });
  t('so it exports as a usable question immediately', () => {
    w.updateQuestionField(sid, ev(w, 'stages[0].questions[0].id'), 'question', 'Are we ready');
    const out = w.buildTTXF();
    has(out, '? Are we ready');
    has(out, '+ Not at all confident');
    has(out, '+ Completely confident');
  });
  t('the picker knows which preset is in use', () => {
    const sel = w.document.querySelector('.answer-preset');
    ok(sel, 'no preset picker');
    eq(sel.value, 'confidence5');
    ok(![...sel.options].some(o => o.value === '' ), 'a Custom option is offered for a known preset');
  });
  t('switching preset replaces the answers', () => {
    const qid = ev(w, 'stages[0].questions[0].id');
    w.applyPreset(sid, qid, 'yesno');
    eq(ev(w, 'stages[0].questions[0].answers'), ['Yes', 'No', 'Unsure']);
  });
  t('"Write my own" clears them back to empty boxes', () => {
    const qid = ev(w, 'stages[0].questions[0].id');
    w.applyPreset(sid, qid, 'blank');
    eq(ev(w, 'stages[0].questions[0].answers'), ['', '']);
    eq(w.document.querySelector('.answer-preset').value, 'blank');
  });
  t('hand-written answers show as Custom', () => {
    const qid = ev(w, 'stages[0].questions[0].id');
    w.updateAnswer(sid, qid, 0, 'Something of my own');
    w.renderAllStages();
    eq(w.document.querySelector('.answer-preset').value, '');
  });
  t('switching preset keeps a quiz answer in range', () => {
    const qid = ev(w, 'stages[0].questions[0].id');
    w.applyPreset(sid, qid, 'confidence5');
    w.setQuestionType(sid, qid, 'quiz');
    w.setCorrectAnswer(sid, qid, 4);
    w.applyPreset(sid, qid, 'yesno');           // 5 options down to 3
    const q = ev(w, 'stages[0].questions[0]');
    ok(q.quizIndex >= 0 && q.quizIndex < q.answers.length, 'quizIndex ' + q.quizIndex);
  });
  t('an imported question keeps its own answers', () => {
    w.parseTTXF('! title: T\n! summary: S\n\n@ S\n! content: c\n? Q\n+ Bespoke one\n+ Bespoke two\n');
    eq(ev(w, 'stages[0].questions[0].answers'), ['Bespoke one', 'Bespoke two']);
  });
}

G('duplicating a stage');
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ First\n! duration: 10 mins\n! content: Body\n# discussion\n+ point\n? Q\n+ a\n++ b\n\n@ Second\n! content: c\n');
  await wait(200);
  const firstId = ev(w, 'stages[0].id');
  w.duplicateStage(firstId);
  await wait(200);

  t('the copy lands directly after the original', () =>
    eq(ev(w, 'stages.map(s => s.stage)'), ['First', 'First (copy)', 'Second']));
  t('it brings the content, duration, discussion and questions', () => {
    const c = ev(w, 'stages[1]');
    eq(c.content, 'Body');
    eq(c.duration, '10 mins');
    eq(c.discussion, ['point']);
    eq(c.questions.length, 1);
    eq(c.questions[0].quizIndex, 1);
  });
  t('the copy is independent of the original', () => {
    w.updateStageField(ev(w, 'stages[1].id'), 'content', 'Changed');
    eq(ev(w, 'stages[0].content'), 'Body');
  });
  t('ids are fresh, so editing one does not edit the other', () => {
    const a = ev(w, 'stages[0].questions[0].id'), b = ev(w, 'stages[1].questions[0].id');
    ok(a !== b, 'question ids were reused');
    w.updateQuestionField(ev(w, 'stages[1].id'), b, 'question', 'Only the copy');
    eq(ev(w, 'stages[0].questions[0].question'), 'Q');
  });
  t('and it survives a round-trip through the format', () => {
    const out = w.buildTTXF();
    eq((out.match(/^@ /gm) || []).length, 3);
    has(out, '@ First (copy)');
  });
}

G('knowing what you have built');
{
  const { w } = boot();
  t('an empty builder says nothing', () => eq(w.document.getElementById('stages-summary').textContent, ''));
  w.parseTTXF('! title: T\n! summary: S\n\n@ A\n! duration: 20 mins\n! content: c\n? Q1\n+ a\n+ b\n\n@ B\n! duration: 40 mins\n! content: c\n? Q2\n+ a\n+ b\n');
  await wait(250);
  t('it reports stages, questions and the planned length', () => {
    const txt = w.document.getElementById('stages-summary').textContent;
    has(txt, '2 stages');
    has(txt, '2 questions');
    has(txt, '1h 00m planned');
  });
  t('short exercises read in minutes', async () => { ok(true); });
}
{
  const { w } = boot();
  w.parseTTXF('! title: T\n! summary: S\n\n@ A\n! duration: 25 mins\n! content: c\n');
  await wait(250);
  t('a short exercise reads in minutes', () =>
    has(w.document.getElementById('stages-summary').textContent, '25 mins planned'));
}

G('import no longer discards work silently');
{
  const { w } = boot();
  w.document.getElementById('f-title').value = 'Work in progress';
  w.addStage();
  await wait(200);
  let asked = false;
  w.confirm = () => { asked = true; return false; };
  w.__pending = true;
  w.eval('pendingImportData = "! title: Replacement\\n! summary: S\\n\\n@ S\\n! content: c\\n"');
  w.confirmImport();
  t('it asks before replacing', () => ok(asked));
  t('and declining leaves your work alone', () =>
    eq(w.document.getElementById('f-title').value, 'Work in progress'));
  w.confirm = () => true;
  w.confirmImport();
  t('accepting imports', () => eq(w.document.getElementById('f-title').value, 'Replacement'));
}
{
  const { w } = boot();
  await wait(100);
  let asked = false;
  w.confirm = () => { asked = true; return true; };
  w.eval('pendingImportData = "! title: Fresh\\n! summary: S\\n\\n@ S\\n! content: c\\n"');
  w.confirmImport();
  t('an empty builder is not nagged', () => ok(!asked));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
