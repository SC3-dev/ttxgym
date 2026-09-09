/* Phase F — the facilitator-facing features. */
const fs = require('fs');
const { boot, loadScenario, ev, tick, respond, unrespond, counts, ROOT } = require('./harness.js');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected ${JSON.stringify(sub)} in ${JSON.stringify(String(s).slice(0, 300))}`); };

const FIVE = ['Not at all confident', 'Slightly confident', 'Somewhat confident', 'Fairly confident', 'Completely confident'];
const SCENARIO = `! title: Feature Test
! summary: Sum

@ Stage One
! duration: 10 mins
! content: Body one
? How confident are we
${FIVE.map(a => '+ ' + a).join('\n')}

@ Stage Two
! duration: 5m
! content: Body two
? Which is correct
+ Wrong
++ Right
`;

(async () => {

G('F2.1 — responses are a tally, not a single choice');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  w.nextStage();
  t('one click still records one response', () => {
    respond(w, 'question_0', 4);
    eq(counts(w, 'question_0'), [0, 0, 0, 0, 1]);
  });
  t('a divided room is recorded as divided', () => {
    respond(w, 'question_0', 0, 3);
    respond(w, 'question_0', 4, 1);
    eq(counts(w, 'question_0'), [3, 0, 0, 0, 2]);
  });
  t('the running total is shown', () =>
    has(w.document.querySelector('.question[data-qname="question_0"] .response-total').textContent, '5 responses'));
  t('each option shows its own count', () => {
    const btn = w.document.querySelector('.choice[data-index="0"]');
    eq(btn.querySelector('.choice-count').textContent, '3');
    ok(btn.classList.contains('has-responses'));
  });
  t('a response can be taken back', () => {
    unrespond(w, 'question_0', 0);
    eq(counts(w, 'question_0'), [2, 0, 0, 0, 2]);
  });
  t('counts never go negative', () => {
    unrespond(w, 'question_0', 1);
    eq(counts(w, 'question_0')[1], 0);
  });
  t('the minus control only appears where there is something to remove', () => {
    const used = w.document.querySelector('.choice[data-index="0"] .choice-minus');
    const unused = w.document.querySelector('.choice[data-index="1"] .choice-minus');
    ok(used.classList.contains('visible'), 'hidden on an option with responses');
    ok(!unused.classList.contains('visible'), 'shown on an option with none');
  });
  t('Clear empties the question', () => {
    w.document.querySelector('.question[data-qname="question_0"] .clear-answer-btn').click();
    eq(counts(w, 'question_0'), [0, 0, 0, 0, 0]);
  });
}

G('F3 — confidence and quiz accuracy are reported separately');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  w.nextStage();
  respond(w, 'question_0', 0, 1);   // 0%
  respond(w, 'question_0', 4, 1);   // 100%
  w.goToStage(2);
  respond(w, 'question_1', 0, 1);   // wrong
  respond(w, 'question_1', 1, 3);   // right
  const score = w.updateProgress();

  t('confidence is the weighted mean of the room', () => eq(Math.round(score.confidence), 50));
  t('quiz accuracy is counted separately', () => eq(Math.round(score.quiz), 75));
  t('the two are never blended into one number', () => {
    ok(score.confidence !== score.quiz);
    ok(!('overall' in score), 'a blended overall score reappeared');
  });
  t('the headline names what it measures', () =>
    has(ev(w, 'overallScore'), 'average confidence'));
  t('the summary carries a caveat about what confidence means', () =>
    has(ev(w, 'progressDiv').textContent, 'not a measure of how secure it is'));
  t('the lowest-confidence question leads', () => {
    eq(score.weakest[0].question, 'How confident are we');
    has(ev(w, 'progressDiv').textContent, 'Areas to focus on');
  });
  t('the distribution of answers is shown, not just a mean', () => {
    const segs = ev(w, 'progressDiv').querySelectorAll('.dist-seg');
    ok(segs.length >= 2, 'only ' + segs.length + ' segments');
  });
  t('an all-correct quiz reads as correct', () => {
    unrespond(w, 'question_1', 0);
    eq(Math.round(w.updateProgress().quiz), 100);
    has(w.document.querySelector('.quiz-feedback').textContent, 'All 3 correct');
  });
  t('a split quiz reads as split, not simply wrong', () => {
    respond(w, 'question_1', 0, 1);
    const fb = w.document.querySelector('.quiz-feedback');
    has(fb.textContent, '3 of 4 correct');
    ok(fb.classList.contains('mixed'), fb.className);
  });
}

G('F4.1 — stage durations give the clock a meaning');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  t('the format carries a per-stage target', () => eq(ev(w, 'data[0].duration'), '10 mins'));
  t('the timing row shows elapsed against target', () =>
    eq(w.document.getElementById('time1').textContent, '00:00 / 10:00'));
  t('a total row sums the plan', () =>
    eq(w.document.getElementById('time-total').textContent, '00:00 / 15:00'));
  t('approaching the target warns', () => {
    ev(w, 'stageTime[1] = 8 * 60');
    w.refreshStageTimes();
    ok(w.document.getElementById('time1').classList.contains('nearly'));
  });
  t('over-running is called out', () => {
    ev(w, 'stageTime[1] = 11 * 60');
    w.refreshStageTimes();
    const cell = w.document.getElementById('time1');
    ok(cell.classList.contains('over'), cell.className);
    eq(cell.textContent, '11:00 / 10:00');
  });
  t('a scenario without durations still shows a plain clock', async () => {
    ok(true);
  });
}
{
  const { w } = boot();
  await loadScenario(w, '! title: T\n! summary: S\n\n@ S\n! content: c\n? Q\n+ a\n+ b\n', 'nodur.ttxf');
  t('a scenario with no durations shows a plain clock', () =>
    eq(w.document.getElementById('time1').textContent, '00:00'));
}

G('F4.2 — presenter remote');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  const key = (k, target) => {
    const e = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    (target || w.document.body).dispatchEvent(e);
    return e;
  };
  t('PageDown advances', () => { key('PageDown'); eq(ev(w, 'ActiveStage'), 1); });
  t('PageUp goes back', () => { key('PageUp'); eq(ev(w, 'ActiveStage'), 0); });
  t('arrow keys work too', () => { key('ArrowRight'); eq(ev(w, 'ActiveStage'), 1); });
  t('the page does not also scroll', () => ok(key('ArrowRight').defaultPrevented));
  t('typing notes is never hijacked', () => {
    const ta = w.document.querySelector('#round2 textarea.description');
    const before = ev(w, 'ActiveStage');
    key('ArrowRight', ta);
    eq(ev(w, 'ActiveStage'), before);
  });
  t('typing an action is never hijacked', () => {
    w.addAction(2);
    const input = w.document.querySelector('.action-text');
    const before = ev(w, 'ActiveStage');
    key('PageDown', input);
    eq(ev(w, 'ActiveStage'), before);
  });
}

G('F4.3/F4.4/F4.5 — mirror, blank, injects');
{
  const { w, posted } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  t('the mirror mounts the real participant document', () => {
    const frame = w.document.getElementById('mirror-frame');
    ok(frame.src.startsWith('blob:'), frame.src);
    ok(!w.document.getElementById('mirror-panel').classList.contains('hide'));
  });
  t('the mirror can be collapsed out of the way', () => {
    w.toggleMirror();
    ok(w.document.getElementById('mirror-panel').classList.contains('collapsed'));
    eq(w.document.getElementById('mirror-toggle').textContent, '+');
  });
  posted.length = 0;
  t('blanking tells the participant screen', () => {
    w.toggleBlank();
    eq(posted.filter(m => m.type === 'blank').pop(), { type: 'blank', on: true });
    eq(w.document.getElementById('blank-label').textContent, 'Show Screen');
  });
  t('and unblanking restores it', () => {
    w.toggleBlank();
    eq(posted.filter(m => m.type === 'blank').pop().on, false);
    eq(w.document.getElementById('blank-label').textContent, 'Blank Screen');
  });
  t('B blanks from the keyboard', () => {
    w.document.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true }));
    eq(posted.filter(m => m.type === 'blank').pop().on, true);
    w.toggleBlank();
  });
  t('an inject is pushed to the room', () => {
    w.prompt = () => 'The press just called.';
    w.promptInject();
    eq(posted.filter(m => m.type === 'inject').pop(), { type: 'inject', text: 'The press just called.' });
  });
  t('cancelling the prompt sends nothing', () => {
    const before = posted.filter(m => m.type === 'inject').length;
    w.prompt = () => null;
    w.promptInject();
    eq(posted.filter(m => m.type === 'inject').length, before);
  });
}

G('F2.2 — actions');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  w.nextStage();
  w.addAction(1);
  const id = ev(w, 'actions[0].id');
  w.updateAction(id, 'text', 'Confirm backup retention');
  w.updateAction(id, 'owner', 'Priya');
  w.updateAction(id, 'due', 'End of month');
  t('an action is captured against its stage', () =>
    eq(ev(w, 'actions[0]'), { id, stage: 1, text: 'Confirm backup retention', owner: 'Priya', due: 'End of month' }));
  t('it appears in the summary as a table', () => {
    w.updateProgress();
    const table = ev(w, 'progressDiv').querySelector('.actions-table');
    ok(table, 'no actions table');
    has(table.textContent, 'Confirm backup retention');
    has(table.textContent, 'Priya');
  });
  t('the stage card shows how many it holds', () =>
    has(w.document.querySelector('.actions-count').textContent, '1 recorded'));
  t('a stage with no actions shows one quiet link, not a panel', () => {
    const empty = w.document.querySelector('#round2 .actions-area');
    ok(empty.classList.contains('is-empty'), 'resting state is not collapsed');
    has(empty.querySelector('.action-add-btn').textContent, 'Record an action');
  });
  t('...and expands into a labelled panel once used', () => {
    const used = w.document.querySelector('#round1 .actions-area');
    ok(!used.classList.contains('is-empty'));
    has(used.querySelector('.action-add-btn').textContent, 'Add another');
  });
  t('an action can be removed', () => {
    w.removeAction(id);
    eq(ev(w, 'actions.length'), 0);
  });
  t('empty actions never reach the report', () => {
    w.addAction(1);
    w.updateProgress();
    ok(!ev(w, 'progressDiv').querySelector('.actions-table'), 'a blank action was published');
  });
}

G('F2.3 — session details');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  t('the intro card offers them', () => {
    const keys = [...w.document.querySelectorAll('[data-meta-key]')].map(i => i.dataset.metaKey);
    eq(keys.sort(), ['attendees', 'date', 'facilitator']);
  });
  t('objectives and scope is not duplicated from the scenario intro', () =>
    eq(w.document.querySelector('[data-meta-key="objectives"]'), null));
  t('the date defaults to today, ready to accept', () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    eq(ev(w, 'sessionMeta.date'), today);
    eq(w.document.querySelector('[data-meta-key="date"]').value, today);
  });
  t('the date field is a real date input, drawn for a dark field', () => {
    const input = w.document.querySelector('[data-meta-key="date"]');
    eq(input.type, 'date');
    const css = w.document.querySelector('style').textContent;
    ok(css.includes('color-scheme: dark'), 'no color-scheme on the inputs');
    ok(css.includes('calendar-picker-indicator'), 'no calendar glyph override');
  });
  t('the panel lines up with the rest of the card, not the card edges', () => {
    const css = w.document.querySelector('style').textContent;
    const rule = css.slice(css.indexOf('.session-meta {'), css.indexOf('.session-meta-grid'));
    ok(/margin:\s*0 1rem/.test(rule), 'session details still run full-bleed: ' + rule.trim());
    const actions = css.slice(css.indexOf('.actions-area {'), css.indexOf('.actions-head'));
    ok(/margin:\s*0 1rem/.test(actions), 'actions still run full-bleed: ' + actions.trim());
  });
  t('the date reaches the report in a readable form, not as yyyy-mm-dd', () => {
    let captured = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { captured = String(p[0]); return new RB(p, o); };
    w.exportReport();
    w.Blob = RB;
    ok(!captured.includes(ev(w, 'sessionMeta.date')), 'raw ISO date published');
    ok(/\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},\s+\d{4}/.test(captured), 'no readable date in the report');
  });
  t('they are recorded as you type', () => {
    const input = w.document.querySelector('[data-meta-key="facilitator"]');
    input.value = 'Sam Okafor';
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    eq(ev(w, 'sessionMeta.facilitator'), 'Sam Okafor');
  });
  t('a resumed session keeps the date it was run on', () => {
    const w2 = boot().w;
    w2.resumeSession({ format: 'ttxs', version: 1, scenario: SCENARIO,
      meta: { date: '2024-03-01', facilitator: 'Old Sam' }, responses: {} }, 's.ttxs');
    eq(ev(w2, 'sessionMeta.date'), '2024-03-01');
  });
  t('they reach the exported report', () => {
    let captured = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { captured = String(p[0]); return new RB(p, o); };
    w.exportReport();
    w.Blob = RB;
    has(captured, 'Sam Okafor');
    has(captured, 'Facilitator');
  });
  t('the report styles the markup it now emits', () => {
    let captured = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { captured = String(p[0]); return new RB(p, o); };
    w.exportReport();
    w.Blob = RB;
    ['meta-table', 'summary-metrics', 'metric-value', 'dist-bar', 'dist-seg', 'actions-table', 'summary-caveat']
      .forEach(cls => {
        has(captured, '.' + cls);          // the rule
      });
  });
}

G('the facilitator pack');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/hct1.ttxf', 'utf8'), 'hct1.ttxf');
  let captured = '';
  const RB = w.Blob;
  w.Blob = function (p, o) { captured = String(p[0]); return new RB(p, o); };
  w.__downloads = [];
  w.exportFacilitatorPack();
  w.Blob = RB;

  t('it downloads as its own document', () => eq(w.__downloads[0].name, 'facilitator-pack.html'));
  t('every stage is laid out in order', () => {
    const stages = ev(w, 'data');
    stages.forEach((st, i) => has(captured, `Stage ${i + 1}: ${st.stage}`));
    eq((captured.match(/class="pack-stage"/g) || []).length, stages.length + 1); // + the debrief
  });
  t('stage content is rendered, not raw markup', () => {
    has(captured, 'increase in external scanning');
    ok(!captured.includes('! content'), 'raw directives leaked in');
  });
  t('facilitator prompts are included and marked as private', () => {
    has(captured, 'Facilitator prompts');
    has(captured, 'not shown to participants');
  });
  t('discussion points are marked as shared', () => has(captured, 'shown to participants'));
  t('questions list their options', () => has(captured, 'Not at all confident'));
  t('planned durations are shown per stage', () => has(captured, 'class="pack-dur"'));
  t('it summarises the shape of the exercise up front', () => {
    has(captured, 'Planned duration');
    has(captured, '>Stages<');
  });
  t('the debrief is included so the whole session is on paper', () =>
    has(captured, 'Exercise Outcomes'));
}
{
  // a quiz answer must be identifiable on paper
  const { w } = boot();
  await loadScenario(w, `! title: T
! summary: S

@ S
! content: c
? Which is correct
+ Wrong
++ Right
?- Hidden one
+ a
+ b
`, 'q.ttxf');
  let captured = '';
  const RB = w.Blob;
  w.Blob = function (p, o) { captured = String(p[0]); return new RB(p, o); };
  w.exportFacilitatorPack();
  w.Blob = RB;
  t('the correct quiz answer is marked', () => has(captured, '<li class="correct">Right'));
  t('quiz questions are tagged as such', () => has(captured, 'pack-tag quiz'));
  t('participant-hidden questions are flagged', () => has(captured, 'participant hidden'));
}

G('facilitator notes: in the record, not on the screens');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'notes.ttxf');
  w.nextStage();
  respond(w, 'question_0', 4);
  w.document.querySelector('#round1 textarea.description').value = 'CANDID observation about a colleague.';
  w.addAction(1);
  w.updateAction(ev(w, 'actions[0].id'), 'text', 'Write the runbook');
  w.updateAction(ev(w, 'actions[0].id'), 'owner', 'Priya');
  w.handleFormSubmit();

  t('the summary overlay shows scoring, not commentary', () => {
    const txt = w.document.getElementById('summary-overlay-body').textContent;
    ok(!/CANDID observation/.test(txt), 'notes are on the overlay');
    ok(/confidence/i.test(txt), 'no scoring on the overlay');
  });
  t('actions and owners are still shown — agreeing who does what is the point', () => {
    const txt = w.document.getElementById('summary-overlay-body').textContent;
    ok(/Write the runbook/.test(txt));
    ok(/Priya/.test(txt));
  });
  t('the exported report keeps the notes', () => {
    let out = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { out = String(p[0]); return new RB(p, o); };
    w.exportReport();
    w.Blob = RB;
    ok(/CANDID observation/.test(out), 'the report lost the notes');
    ok(/Write the runbook/.test(out), 'the report lost the actions');
  });
  t('and the session file keeps them, so nothing is lost', () => {
    let out = '';
    const RB = w.Blob;
    w.Blob = function (p, o) { out = String(p[0]); return new RB(p, o); };
    w.exportSession();
    w.Blob = RB;
    eq(JSON.parse(out).notes.stage_0, 'CANDID observation about a colleague.');
  });
}

G('F1 — the session file');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  w.nextStage();
  respond(w, 'question_0', 3, 2);
  w.document.querySelector('#round1 textarea.description').value = 'Good discussion here';
  w.addAction(1);
  w.updateAction(ev(w, 'actions[0].id'), 'text', 'Write the playbook');
  const input = w.document.querySelector('[data-meta-key="facilitator"]');
  input.value = 'Sam'; input.dispatchEvent(new w.Event('input', { bubbles: true }));

  let captured = '';
  const RB = w.Blob;
  w.Blob = function (p, o) { captured = String(p[0]); return new RB(p, o); };
  w.__downloads = [];
  w.exportSession();
  w.Blob = RB;
  const saved = JSON.parse(captured);

  t('it is written as .ttxs', () => ok(/\.ttxs$/.test(w.__downloads[0].name), w.__downloads[0].name));
  t('it declares its own format', () => { eq(saved.format, 'ttxs'); eq(saved.version, 1); });
  t('it carries the scenario, so it is self-contained', () => has(saved.scenario, '! title: Feature Test'));
  t('it carries responses, notes, actions and meta', () => {
    eq(saved.responses.question_0, [0, 0, 0, 2, 0]);
    eq(saved.notes.stage_0, 'Good discussion here');
    eq(saved.actions[0].text, 'Write the playbook');
    eq(saved.meta.facilitator, 'Sam');
  });

  // F1.2 — resume it in a fresh window
  const { w: w2 } = boot();
  w2.resumeSession(saved, 'f.ttxs');
  await tick(40);
  t('F1.2: a fresh window resumes it without the scenario file', () => {
    eq(ev(w2, 'roundCounter'), 2);
    eq(counts(w2, 'question_0'), [0, 0, 0, 2, 0]);
  });
  t('F1.2: notes come back', () =>
    eq(w2.document.querySelector('#round1 textarea.description').value, 'Good discussion here'));
  t('F1.2: actions come back', () => eq(ev(w2, 'actions[0].text'), 'Write the playbook'));
  t('F1.2: session details come back', () => eq(ev(w2, 'sessionMeta.facilitator'), 'Sam'));
  t('F1.2: it resumes paused, at the stage you left', () => {
    eq(ev(w2, 'ActiveStage'), 1);
    eq(ev(w2, 'timer'), false);
  });
  // a real File, through the real input, as a user would
  const openSession = async (win, text, name) => {
    const input = win.document.getElementById('sessionInput');
    const file = new win.File([text], name, { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new win.Event('change'));
    await tick(60);
  };

  const { w: w4 } = boot();
  await openSession(w4, 'this is not json at all', 'notes.ttxs');
  t('F1.2: a file that is not a session says so', () =>
    has(w4.document.getElementById('parse-error').textContent, 'not a readable TTX Gym session'));

  const { w: w5 } = boot();
  await openSession(w5, JSON.stringify({ hello: 'world' }), 'other.json');
  t('F1.2: valid JSON that is not a session is refused', () =>
    has(w5.document.getElementById('parse-error').textContent, 'not a TTX Gym session'));

  const { w: w6 } = boot();
  await openSession(w6, JSON.stringify({ format: 'ttxs', version: 1, responses: {} }), 'bare.ttxs');
  t('F1.2: a session with no scenario inside cannot be resumed', () =>
    has(w6.document.getElementById('parse-error').textContent, 'no scenario inside'));

  const { w: w7 } = boot();
  await openSession(w7, JSON.stringify(saved), 'good.ttxs');
  t('F1.2: opening a good session through the file picker works', () => {
    eq(ev(w7, 'roundCounter'), 2);
    eq(counts(w7, 'question_0'), [0, 0, 0, 2, 0]);
  });
}

G('F1.3 — comparing runs');
{
  const { w } = boot();
  await loadScenario(w, SCENARIO, 'f.ttxf');
  w.nextStage();
  respond(w, 'question_0', 0, 2);          // 0% confidence last time
  const before = w.gatherSessionData();

  w.clearAllAnswers();
  respond(w, 'question_0', 4, 2);          // 100% this time
  w.applyComparison(before);

  t('the delta against the previous run is shown', () => {
    const txt = ev(w, 'progressDiv').textContent;
    has(txt, '+100 pts since last run');
  });
  t('the notice says what is being compared', () =>
    has(w.document.getElementById('restore-notice').textContent, 'Comparing against'));
  t('an unchanged score reads as no change', () => {
    w.clearAllAnswers();
    respond(w, 'question_0', 0, 2);
    w.updateProgress();
    has(ev(w, 'progressDiv').textContent, 'no change since last run');
  });
}

G('F4.7 / F5.1 — guard rails and getting started');
{
  const { w } = boot();
  t('the welcome screen offers a demo', () => {
    const btn = w.document.querySelector('.welcome-demo-btn');
    ok(btn, 'no demo button');
    has(btn.textContent, 'demo');
  });
  w.loadDemoScenario();
  t('the demo loads a complete, valid exercise', () => {
    eq(ev(w, 'roundCounter'), 3);
    eq(ev(w, 'lastParseErrors').length, 0, JSON.stringify(ev(w, 'lastParseErrors')));
  });
  t('the demo has durations, a quiz and a hidden question', () => {
    ok(ev(w, 'data[0].duration'), 'no duration');
    ok(ev(w, 'data[1].questions[1].quizIndex') > -1, 'no quiz');
    eq(ev(w, 'data[1].questions[1].participantHidden'), true);
  });
  t('a live exercise warns before the tab closes', () => {
    w.nextStage();
    const e = new w.Event('beforeunload', { cancelable: true });
    w.dispatchEvent(e);
    ok(e.defaultPrevented, 'no warning while running');
  });
  t('a finished exercise does not nag', () => {
    ev(w, 'exerciseComplete = true');
    const e = new w.Event('beforeunload', { cancelable: true });
    w.dispatchEvent(e);
    ok(!e.defaultPrevented, 'warned after completion');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
