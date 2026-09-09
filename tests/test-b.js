const fs = require('fs');
const { boot, loadScenario, ev, tick, respond, unrespond, counts, ROOT } = require('./harness.js');
let pass = 0, fail = 0, group = '';
const G = n => { group = n; console.log('\n' + n); };
const t = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); fail++; }
};
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };

const WITH_CONC = `! title: With Conclusion
! summary: Sum
! conclusion: BESPOKE DEBRIEF TEXT

@ Stage One
! content: Body one
? Rate it
+ Low
+ High
`;
const TWO_STAGE = `! title: No Conclusion
! summary: Sum

@ Stage One
! content: Body one
? Rate it
+ Low
+ High

@ Stage Two
! content: Body two
? Another
+ Low
+ High
`;

(async () => {

G('B1 — conclusion must not leak between scenarios');
{
  const { w } = boot();
  await loadScenario(w, WITH_CONC, 'a.ttxf');
  t('first scenario shows its own conclusion', () =>
    ok(w.document.getElementById('round-finish').textContent.includes('BESPOKE DEBRIEF TEXT')));
  await loadScenario(w, TWO_STAGE, 'b.ttxf');
  t('second scenario does not inherit it', () =>
    ok(!w.document.getElementById('round-finish').textContent.includes('BESPOKE DEBRIEF')));
  t('...and falls back to the default debrief', () =>
    ok(w.document.getElementById('round-finish').textContent.includes('Finish the exercise by discussing')));
}

G('B2 — participant handshake, no state mutation on launch');
{
  const { w, posted } = boot();
  await loadScenario(w, TWO_STAGE, 'a.ttxf');
  posted.length = 0;
  w.launchPresentation();
  t('launching does not move the stage', () => eq(ev(w, 'ActiveStage'), 0));
  t('launching does not start the timer', () => eq(ev(w, 'firsttimer'), 0));
  t('launching alone broadcasts nothing', () => eq(posted.length, 0));
  ev(w, "bc.onmessage({data:{type:'ready'}})");
  t('a ready message replays the current stage', () => {
    const upd = posted.find(m => m.type === 'update');
    ok(upd, 'no update posted'); eq(upd.title, 'No Conclusion');
  });
  w.goToStage(2); posted.length = 0;
  ev(w, "bc.onmessage({data:{type:'ready'}})");
  t('ready replays whatever stage is live', () =>
    eq(posted.find(m => m.type === 'update').title, 'Stage Two'));
  t('launching from the finish stage does not walk back', () => {
    w.goToStage(ev(w, 'roundCounter') + 1);
    const at = ev(w, 'ActiveStage');
    w.launchPresentation();
    eq(ev(w, 'ActiveStage'), at);
  });
}

G('B3 — pause overlay is never stranded');
{
  const { w, posted } = boot();
  await loadScenario(w, TWO_STAGE, 'a.ttxf');
  const pauseEl = w.document.getElementById('pause');
  w.nextStage();
  ev(w, "toggleTimer()");
  t('pausing on a numbered stage shows the overlay', () => ok(!pauseEl.classList.contains('hidden-overlay')));
  w.goToStage(ev(w, 'roundCounter') + 1);
  t('overlay is hidden on the finish stage', () => ok(pauseEl.classList.contains('hidden-overlay')));
  posted.length = 0;
  w.goToStage(0);
  t('overlay is hidden on the intro stage', () => ok(pauseEl.classList.contains('hidden-overlay')));
  t('participant window told to hide its overlay too', () =>
    eq(posted.filter(m => m.type === 'pause').pop().switch, true));
  w.goToStage(1);
  t('returning to the paused stage restores the overlay', () => ok(!pauseEl.classList.contains('hidden-overlay')));
  t('...and the sidebar offers Resume', () =>
    ok(w.document.getElementById('timer').textContent.includes('Resume'),
       w.document.getElementById('timer').textContent.trim()));
  ev(w, "toggleTimer()");
  t('resuming clears it', () => ok(pauseEl.classList.contains('hidden-overlay')));
}

G('B4 — notes autosave without a blur');
{
  const { w } = boot();
  await loadScenario(w, TWO_STAGE, 'a.ttxf');
  w.nextStage();
  const ta = w.document.querySelector('#round1 textarea.description');
  ta.value = 'typed but never blurred';
  ta.dispatchEvent(new w.Event('input', { bubbles: true }));
  t('typing marks the session dirty', () =>
    eq(w.document.querySelector('#save-indicator span').textContent, 'Saving…'));
  await tick(1400);
  t('...and it reaches localStorage', () => {
    const raw = w.localStorage.getItem('ttxgym_autosave_' + ev(w, 'sessionKey'));
    ok(raw, 'nothing saved');
    eq(JSON.parse(raw).notes.stage_0, 'typed but never blurred');
  });
  t('the indicator confirms the save', () =>
    eq(w.document.querySelector('#save-indicator span').textContent, 'Saved'));
}

G('B5 — session keys');
{
  const { w } = boot();
  t('survives a non-Latin1 filename', () => ok(w.makeSessionKey('café-scénario.ttxf').length > 0));
  t('separates names sharing a long prefix', () =>
    ok(w.makeSessionKey('supply-chain-exercise-version-one.ttxf') !==
       w.makeSessionKey('supply-chain-exercise-version-two.ttxf')));
  t('is stable for the same name', () =>
    eq(w.makeSessionKey('byod1.ttxf'), w.makeSessionKey('byod1.ttxf')));
}

G('B6/B10/B11 — restore');
{
  const QUOTED = `! title: Quoted
! summary: S

@ Stage One
! content: Body
? Pick one
+ He said "yes"
+ No
`;
  const { w } = boot();
  await loadScenario(w, QUOTED, 'q.ttxf');
  w.restoreSession(JSON.stringify({
    notes: { stage_0: 'my notes' },
    answers: { question_0: 'He said "yes"' },   // legacy single-answer shape
    stageTime: [0, 42],
    activeStage: 1,
    timestamp: Date.now() - 120000,
  }));
  t('B6: an answer containing a quote is restored', () => eq(counts(w, 'question_0')[0], 1));
  t('B6: a pre-tally session upgrades cleanly', () => eq(counts(w, 'question_0'), [1, 0]));
  t('B6: notes survive alongside it', () =>
    eq(w.document.querySelector('textarea.description').value, 'my notes'));
  t('B6: stage timing is restored', () => ok(w.document.getElementById('time1').textContent.startsWith('00:42')));
  t('B11: lands back on the stage left off at', () => eq(ev(w, 'ActiveStage'), 1));
  t('B11: comes back paused, not silently counting', () => eq(ev(w, 'timer'), false));
  t('B11: shows a restore notice with an age', () => {
    const n = w.document.getElementById('restore-notice');
    ok(n.classList.contains('visible'), 'not visible');
    ok(n.textContent.includes('2 minutes ago'), n.textContent.trim());
  });
  t('B11: Discard clears the notice and the saved data', () => {
    w.discardRestoredSession();
    ok(!w.document.getElementById('restore-notice').classList.contains('visible'));
    eq(counts(w, 'question_0')[0], 0, 'answer survived the discard');
    eq(w.localStorage.getItem('ttxgym_autosave_' + ev(w, 'sessionKey')), null);
  });
}
{
  const QUIZ = `! title: Quiz
! summary: S

@ Stage One
! content: Body
? Which is correct
+ Wrong
++ Right
`;
  const { w } = boot();
  await loadScenario(w, QUIZ, 'z.ttxf');
  w.restoreSession(JSON.stringify({ responses: { question_0: [0, 1] }, activeStage: 1, timestamp: Date.now() }));
  t('B10: quiz feedback comes back', () =>
    ok(w.document.querySelector('.quiz-feedback').textContent.includes('Correct'),
       '"' + w.document.querySelector('.quiz-feedback').textContent + '"'));
  t('B10: the Clear button comes back', () =>
    ok(w.document.querySelector('.clear-answer-btn').classList.contains('visible')));
}

G('B7 — single-option rating question');
{
  const ONE = `! title: One
! summary: S

@ Stage One
! content: Body
? Only one option
+ Sole answer
`;
  const { w } = boot();
  await loadScenario(w, ONE, 'one.ttxf');
  w.nextStage();
  respond(w, 'question_0', 0);
  const score = w.updateProgress();
  t('scores 100 rather than NaN', () => eq(score.stages[0].confidence, 100));
  t('the summary carries no NaN', () => ok(!ev(w, 'progressDiv').innerHTML.includes('NaN')));
}

G('B8 — completion reflects the current answers');
{
  const { w } = boot();
  await loadScenario(w, TWO_STAGE, 'a.ttxf');
  w.updateProgress();
  t('an untouched exercise is not complete', () => eq(ev(w, 'exerciseComplete'), false));
  w.nextStage();
  respond(w, 'question_0', 1);
  t('one of two stages answered is not complete', () => eq(ev(w, 'exerciseComplete'), false));
  w.goToStage(ev(w, 'roundCounter') + 1);
  t('the finish marker is not ticked', () =>
    ok(!w.document.getElementById('marker' + (ev(w, 'roundCounter') + 1)).classList.contains('complete')));
  w.goToStage(2);
  respond(w, 'question_1', 1);
  t('answering every stage completes it', () => eq(ev(w, 'exerciseComplete'), true));
  unrespond(w, 'question_1', 1);
  t('un-answering clears it again (no latch)', () => eq(ev(w, 'exerciseComplete'), false));
}

G('B9 — junk files are rejected');
{
  const { w } = boot();
  await loadScenario(w, 'Just some notes.\nNothing structured here.\n', 'notes.txt');
  t('a file with no stages shows an error', () => {
    const el = w.document.getElementById('parse-error');
    ok(el.classList.contains('visible'), 'error not shown');
    ok(el.textContent.includes('No stages found'), el.textContent);
  });
  t('...and does not present an empty exercise', () =>
    ok(w.document.getElementById('scribe-inner').classList.contains('hide')));
  t('the error sits outside the hidden pane, so it is visible', () =>
    eq(w.document.getElementById('parse-error').parentElement.id, 'scribe'));
  t('the welcome screen keeps its Load button', () =>
    eq(w.document.getElementById('welcome-screen').style.display, ''));
}

G('B14 — Space activates role="button"');
{
  const { w } = boot();
  await loadScenario(w, TWO_STAGE, 'a.ttxf');
  const ev1 = new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  w.document.getElementById('marker2').dispatchEvent(ev1);
  t('Space moves to the stage', () => eq(ev(w, 'ActiveStage'), 2));
  t('Space does not also scroll the page', () => ok(ev1.defaultPrevented));
  const ev2 = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  w.document.getElementById('marker1').dispatchEvent(ev2);
  t('Enter still works', () => eq(ev(w, 'ActiveStage'), 1));
  const ev3 = new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  w.document.querySelector('#round1 .sc_title-bar').dispatchEvent(ev3);
  t('collapsible headers toggle once, not twice', () => {
    const h = w.document.querySelector('#round1 .sc_content-wrapper').style.height;
    eq(h, '0px', 'height after one Space press');
  });
}

G('light theme for the facilitator view');
{
  const { w, errors } = boot();
  await loadScenario(w, TWO_STAGE, 'a.ttxf');
  const root = w.document.documentElement;
  t('it starts dark, as it always has', () => eq(root.getAttribute('data-theme'), 'dark'));
  t('the control says what it will switch to', () =>
    eq(w.document.getElementById('theme-toggle-label').textContent, 'Light Theme'));
  w.toggleGymTheme();
  t('switching flips the whole view', () => eq(root.getAttribute('data-theme'), 'light'));
  t('and the label with it', () =>
    eq(w.document.getElementById('theme-toggle-label').textContent, 'Dark Theme'));
  t('the choice is remembered', () => eq(w.localStorage.getItem('ttxgym_theme'), 'light'));
  t('the exercise is untouched by it', () => {
    w.nextStage();                     // answers only take input on the live stage
    respond(w, 'question_0', 1);       // TWO_STAGE offers Low / High
    eq(counts(w, 'question_0')[1], 1);
    eq(errors, []);
  });
  w.toggleGymTheme();
  t('and it switches back', () => {
    eq(root.getAttribute('data-theme'), 'dark');
    eq(w.localStorage.getItem('ttxgym_theme'), 'dark');
  });
  t('the logo wordmark stays legible in light mode', () => {
    // The letterforms were painted white inline, which no stylesheet could reach —
    // invisible on a light sidebar. They take the logo's own blue there instead.
    const logo = w.document.getElementById('logo');
    const words = logo.querySelectorAll('.logo-word');
    eq(words.length, 6, 'the wordmark paths are not addressable');
    ok(!logo.innerHTML.includes('fill:#ffffff'), 'a white fill is still inlined');
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#logo \.logo-word \{ fill: #ffffff/.test(css), 'no dark-theme colour');
    // near-black on light — the same value the exported report uses for this logo
    ok(/:root\[data-theme="light"\] #logo \.logo-word \{ fill: #1a1f2e/.test(css), 'no light-theme colour');
    const report = fs.readFileSync(ROOT + '/gym/index.html', 'utf8');
    const header = report.slice(report.indexOf('const REPORT_HEADER'), report.indexOf('const REPORT_FOOTER'));
    ok(header.includes('fill:#1a1f2e'), 'the report uses a different colour for the same logo');
    // the brackets stay blue in both themes
    const brackets = [...logo.querySelectorAll('path')].filter(p => !p.classList.contains('logo-word'));
    const colours = [...new Set(brackets.map(p => (/fill:(#[0-9a-f]{6})/.exec(p.getAttribute('style')) || [])[1]))];
    eq(colours, ['#1a6ec0'], 'the brackets are not one colour');
  });
  t('nothing else in the facilitator view is painted white inline', () => {
    const html = fs.readFileSync(ROOT + '/gym/index.html', 'utf8');
    const page = html.slice(0, html.indexOf('const MEDIA_HYDRATE_JS'));
    const white = page.match(/<(?:svg|path)[^>]*fill(?:="|:\s*)(?:#fff|#ffffff|white)[^>]*>/gi) || [];
    eq(white.length, 0, 'inline white fills that would vanish on a light ground');
  });
  t('the participant window keeps its own theme', () => {
    // a laptop in a dim room and a projector in a lit one want opposite things
    const posted = ev(w, 'PRESENTATION_HTML');
    ok(/ttxgym_participant_theme/.test(posted), 'the participant window lost its own setting');
    ok(!/ttxgym_theme'/.test(posted), 'the participant window follows the facilitator theme');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
