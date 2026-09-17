/* The rebuilt builder (builder.html). Runs alongside the existing one until
   it replaces it — see docs/BUILDER-DESIGN.md. */
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

function boot(draft, width) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));
  const store = draft ? { ttxgym_builder_draft: draft } : {};
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8'), {
    runScripts: 'dangerously', url: 'https://ttxgym.com/builder.html', virtualConsole: vc,
    beforeParse(w) {
      w.eval(fs.readFileSync(path.join(ROOT, 'js/ttxf.js'), 'utf8'));
      if (width) Object.defineProperty(w, 'innerWidth', { value: width, configurable: true });
      Object.defineProperty(w, 'localStorage', { value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }, _store: store,
      }, configurable: true });
    },
  });
  return { w: dom.window, errs, store };
}

(async () => {

G('it loads');
{
  const { w, errs } = boot();
  t('with no script errors', () => eq(errs, []));
  t('and shows the three zones of the layout', () => {
    ok(w.document.getElementById('b-outline'), 'no outline');
    ok(w.document.getElementById('b-work'), 'no workspace');
    ok(w.document.getElementById('b-room'), 'no room panel');
  });
  t('an empty builder offers a way in rather than a blank page', () => {
    const empty = w.document.querySelector('#b-work-inner .b-empty');
    ok(empty, 'no empty state');
    has(empty.textContent, 'shape');
  });
  t('it uses its own draft key, so the two builders cannot collide', () => {
    const src = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
    has(src, 'ttxgym_builder_draft');
    ok(!src.includes('ttxgym_editor_draft'), 'it would share the old builder’s draft');
  });
}

G('the file is the source of truth');
{
  const { w } = boot();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/manifest.json'), 'utf8'));

  t('every shipped scenario survives a load and save unchanged', () => {
    const broken = [];
    manifest.forEach(e => {
      const src = fs.readFileSync(path.join(ROOT, 'lib/scenarios', e.id + '.ttxf'), 'utf8');
      w.load(src);
      const before = JSON.stringify(T.parse(src).doc);
      const after = JSON.stringify(T.parse(w.toTTXF()).doc);
      if (before !== after) broken.push(e.id);
    });
    eq(broken, [], 'scenarios the builder would alter just by opening them');
  });

  t('including the parts it cannot yet edit', () => {
    // questions are step 5; loading and saving must not drop them meanwhile
    const src = fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8');
    w.load(src);
    const out = T.parse(w.toTTXF()).doc;
    const orig = T.parse(src).doc;
    eq(out.stages.map(s => s.questions.length), orig.stages.map(s => s.questions.length));
    eq(out.stages[1].questions[0].answers, orig.stages[1].questions[0].answers);
  });
}

G('the outline is the map');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8'));

  t('one row per stage', () =>
    eq(w.document.querySelectorAll('.b-stage-row').length, T.parse(
      fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8')).doc.stages.length));

  t('it shows planned time for the whole exercise', () => {
    has(w.document.getElementById('b-foot-time').textContent, 'planned');
    has(w.document.getElementById('b-foot-count').textContent, 'stages');
  });

  t('a stage with no title still reads as something', () => {
    w.eval('doc.stages[0].stage = ""; renderOutline();');
    has(w.document.querySelector('.b-stage-row').textContent, 'Untitled');
  });

  t('clicking a row focuses that stage, and only that stage is rendered', () => {
    w.bFocus(4);
    eq(w.eval('focus'), 4);
    const titles = [...w.document.querySelectorAll('.b-stage-title')];
    eq(titles.length, 1, 'more than one stage is on screen at once');
    has(w.document.querySelector('.b-stage-meta').textContent, 'Stage 5 of');
  });
}

G('a stage is split by audience');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/te-rootkit.ttxf'), 'utf8'));

  t('the room’s half and the facilitator’s half are separate sections', () => {
    const zones = [...w.document.querySelectorAll('.b-zone')];
    eq(zones.length, 2);
    ok(zones[0].classList.contains('screen'), 'first zone is not the participant side');
    ok(zones[1].classList.contains('notes'), 'second zone is not the facilitator side');
  });

  t('content and discussion sit on the room’s side', () => {
    const screen = w.document.querySelector('.b-zone.screen').textContent;
    has(screen, 'Content');
    has(screen, 'Discussion');
  });

  t('prompts sit on the facilitator’s side, labelled as private', () => {
    const notes = w.document.querySelector('.b-zone.notes');
    has(notes.textContent, 'Facilitator prompts');
    has(w.document.querySelector('.b-zone.notes .b-zone-head').textContent, 'never shown to participants');
  });

  t('the split matches what the gym actually sends to the room', () => {
    // the participant payload carries content, discussion and questions — not prompts
    const gym = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    const fn = gym.slice(gym.indexOf('function currentStageMessage'), gym.indexOf('function broadcastCurrentStage'));
    ok(/content:/.test(fn) && /discussion:/.test(fn), 'expected content and discussion in the payload');
    ok(!/prompts/.test(fn), 'prompts reach participants — the builder’s split would be wrong');
  });
}

G('content is edited as rendered output, not markup');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/te-rootkit.ttxf'), 'utf8'));
  const editable = () => w.document.querySelector('.b-editable');

  t('the content area shows the rendered thing', () => {
    ok(editable(), 'no editable region');
    ok(/<p>/.test(editable().innerHTML), 'content is not rendered');
    ok(!/%\(|```/.test(editable().textContent), 'raw markup is visible to the author');
  });

  t('and converts back to exactly the source it came from', () => {
    const back = w.TTXF.htmlToSource(editable());
    eq(back.trim(), w.eval('doc.stages[0].content').trim());
  });

  t('blocks are atomic — a caret cannot land inside one', () => {
    w.eval("doc.stages[0].content = '```log\\nline\\n```'; renderWork();");
    const pre = editable().querySelector('pre.SFpre');
    ok(pre, 'no artefact block rendered');
    eq(pre.getAttribute('contenteditable'), 'false');
  });

  t('opening a scenario and touching nothing changes nothing', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8');
    w.load(src);
    const before = w.toTTXF();
    w.bFocusMeta('summary'); w.bFocusMeta('conclusion');
    for (let i = 0; i < w.eval('doc.stages.length'); i++) w.bFocus(i);
    eq(w.toTTXF(), before, 'merely opening a scenario re-wrote it');
  });

  t('a source toggle is always available', () => {
    w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/te-rootkit.ttxf'), 'utf8'));
    const btn = w.document.querySelector('.b-src-toggle');
    ok(btn, 'no source toggle');
    w.richToggleSource(btn);
    const ta = w.document.querySelector('.b-source');
    ok(!ta.hidden, 'source did not open');
    eq(ta.value.trim(), w.eval('doc.stages[0].content').trim());
    w.richToggleSource(btn);
    ok(!editable().hidden, 'did not return to the rendered view');
  });

  t('editing the source writes through to the model', () => {
    const btn = w.document.querySelector('.b-src-toggle');
    w.richToggleSource(btn);
    const ta = w.document.querySelector('.b-source');
    ta.value = 'Rewritten in source mode.';
    w.richSourceInput(ta);
    eq(w.eval('doc.stages[0].content'), 'Rewritten in source mode.');
  });

  t('summary and conclusion get the same editor, in the workspace', () => {
    w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8'));
    w.bFocusMeta('summary');
    ok(w.document.querySelector('.b-editable'), 'summary has no rich editor');
    ok(w.document.querySelector('.b-src-toggle'), 'summary has no source toggle');
  });
}

G('the editor never silently loses what was typed');
{
  // The reported failure: a cached js/ttxf.js without htmlToSource meant every
  // keystroke threw, the model stayed empty, and opening Source showed nothing —
  // which read as the editor erasing the content.
  t('a stale module keeps the text on screen and says something is wrong', () => {
    const { w } = boot();
    delete w.TTXF.htmlToSource;
    w.bAddStage();
    const ed = w.document.querySelector('.b-editable');
    ed.innerHTML = 'Typed content that must not vanish.';
    ed.dispatchEvent(new w.Event('input', { bubbles: true }));
    has(ed.textContent, 'must not vanish');
    eq(w.document.getElementById('b-status').className, 'bad');
  });

  t('and a toggle to source and back does not wipe it', () => {
    const { w } = boot();
    delete w.TTXF.htmlToSource;
    w.bAddStage();
    const ed = w.document.querySelector('.b-editable');
    ed.innerHTML = 'Still here.';
    ed.dispatchEvent(new w.Event('input', { bubbles: true }));
    const btn = w.document.querySelector('.b-src-toggle');
    btn.click(); btn.click();
    has(w.document.querySelector('.b-editable').textContent, 'Still here');
  });

  t('the source view reads the live editor, not a model that may lag', () => {
    const { w } = boot();
    w.bAddStage();
    const ed = w.document.querySelector('.b-editable');
    ed.innerHTML = '<p>Edited in the DOM.</p>';        // no input event fired
    w.document.querySelector('.b-src-toggle').click();
    has(w.document.querySelector('.b-source').value, 'Edited in the DOM');
  });

  t('returning from source writes what is in the box', () => {
    const { w } = boot();
    w.bAddStage();
    const btn = w.document.querySelector('.b-src-toggle');
    btn.click();
    const ta = w.document.querySelector('.b-source');
    ta.value = 'Written as source.';
    btn.click();
    eq(w.eval('doc.stages[0].content'), 'Written as source.');
    has(w.document.querySelector('.b-editable').textContent, 'Written as source');
  });

  t('the module is requested with a version, so a cache cannot serve a stale one', () => {
    const src = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
    ok(/js\/ttxf\.js\?v=/.test(src), 'builder.html loads the module uncached-busted');
  });
}

G('the DOM converts back to source');
{
  const { JSDOM: J } = require('jsdom');
  const win = new J('<body></body>').window;
  const from = html => { const d = win.document.createElement('div'); d.innerHTML = html; return T.htmlToSource(d); };

  t('every construct survives the trip', () => {
    eq(from('<p>plain</p>'), 'plain');
    eq(from('<p><strong>b</strong> and <em>i</em> and <code>c</code></p>'), '**b** and *i* and `c`');
    eq(from('<blockquote>quoted</blockquote>'), '~quoted');
    eq(from('<ul><li>one</li><li>two</li></ul>'), '- one\n- two');
    eq(from('<ol><li>one</li><li>two</li></ol>'), '1. one\n2. two');
    eq(from('<pre class="SFpre" data-label="log"><code>a\nb</code></pre>'), '```log\na\nb\n```');
    eq(from('<img class="SFmedia" src="x.png" data-scale="60%">'), '%(x.png | 60%)');
  });

  t('a news frame comes back as %news()', () => {
    const html = T.markdown('%news(Systems offline | Live at Six)');
    eq(from(html), '%news(Systems offline | Live at Six)');
    eq(from(T.markdown('%news(Systems offline)')), '%news(Systems offline)');
  });

  t('a line that would read as a directive is escaped on the way back', () => {
    eq(from('<p># not a heading</p>'), '\\# not a heading');
    eq(from('<p>+ not an answer</p>'), '\\+ not an answer');
  });

  t('it round-trips every stage body in the library without changing what renders', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/manifest.json'), 'utf8'));
    const bad = [];
    let n = 0;
    manifest.forEach(e => {
      T.parse(fs.readFileSync(path.join(ROOT, 'lib/scenarios', e.id + '.ttxf'), 'utf8')).doc.stages.forEach((s, i) => {
        if (!s.content) return;
        n++;
        const a = T.markdown(s.content).replace(/\s+/g, ' ').trim();
        const b = T.markdown(from(T.markdown(s.content))).replace(/\s+/g, ' ').trim();
        if (a !== b) bad.push(e.id + ' #' + (i + 1));
      });
    });
    ok(n > 200, 'only checked ' + n + ' bodies');
    eq(bad, [], 'stage bodies a visual edit would alter');
  });
}

G('editing');
{
  const { w } = boot();
  w.bAddStage();

  t('adding a stage focuses it', () => {
    eq(w.eval('doc.stages.length'), 1);
    eq(w.eval('focus'), 0);
  });

  t('typing a title reaches the model and the outline', () => {
    w.bStage('stage', 'Containment');
    has(w.document.querySelector('.b-stage-row').textContent, 'Containment');
  });

  t('discussion points and prompts can be added and removed', () => {
    w.bAddItem('discussion'); w.bAddItem('prompts');
    w.bItem('discussion', 0, 'What do you know?');
    w.bItem('prompts', 0, 'Probe for assumptions.');
    eq(w.eval('doc.stages[0].discussion'), ['What do you know?']);
    eq(w.eval('doc.stages[0].prompts'), ['Probe for assumptions.']);
    w.bRemoveItem('prompts', 0);
    eq(w.eval('doc.stages[0].prompts'), []);
  });

  t('what is typed comes back out as valid ttxf', () => {
    w.bStage('content', 'The team must decide how far to isolate.');
    const out = w.toTTXF();
    const { doc: d, errors } = T.parse(out);
    eq(errors.filter(e => e.severity === 'error'), []);
    eq(d.stages[0].stage, 'Containment');
    eq(d.stages[0].discussion, ['What do you know?']);
  });

  t('deleting a stage keeps the focus somewhere real', () => {
    w.bAddStage(); w.bAddStage();
    w.bRemoveStage(2);
    ok(w.eval('focus') < w.eval('doc.stages.length'), 'focus points past the end');
  });
}

G('questions sit with their audience');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8'));
  w.bFocus(1);                       // a visible quiz plus a hidden confidence poll
  const screen = () => w.document.querySelector('.b-zone.screen');
  const notes = () => w.document.querySelector('.b-zone.notes');

  t('a visible question is on the room’s side', () => eq(screen().querySelectorAll('.b-q').length, 1));
  t('a ?- question is on the facilitator’s side', () => eq(notes().querySelectorAll('.b-q').length, 1));

  t('which matches what the gym would actually send', () => {
    const stage = w.eval('JSON.stringify(doc.stages[1].questions.map(q => !!q.participantHidden))');
    eq(JSON.parse(stage), [false, true]);
  });

  t('a scored question is labelled as one, and its answer marked', () => {
    ok(screen().querySelector('.b-q-kind.scored'), 'no scored badge');
    eq(screen().querySelectorAll('.b-ans.correct').length, 1);
  });

  t('moving a question across the divide is what sets ?-', () => {
    const before = w.eval('doc.stages[1].questions[0].participantHidden');
    w.bMoveQuestion(0);
    eq(w.eval('doc.stages[1].questions[0].participantHidden'), !before);
    eq(notes().querySelectorAll('.b-q').length, 2, 'it did not move zone');
    has(w.toTTXF(), '?- ');
    w.bMoveQuestion(0);
  });

  t('marking an answer correct turns a poll into a scored question', () => {
    w.bAddQuestion(false);
    const i = w.eval('doc.stages[1].questions.length') - 1;
    w.bAnswer(i, 0, 'Isolate the host'); w.bAnswer(i, 1, 'Wait and see');
    eq(w.eval(`doc.stages[1].questions[${i}].quizIndex`), -1);
    w.bMarkAnswer(i, 0);
    eq(w.eval(`doc.stages[1].questions[${i}].quizIndex`), 0);
    has(w.toTTXF(), '++ Isolate the host');
  });

  t('clicking the marked answer again clears it', () => {
    const i = w.eval('doc.stages[1].questions.length') - 1;
    w.bMarkAnswer(i, 0);
    eq(w.eval(`doc.stages[1].questions[${i}].quizIndex`), -1);
  });

  t('deleting an answer moves the correct index with it', () => {
    const i = w.eval('doc.stages[1].questions.length') - 1;
    w.bAddAnswer(i); w.bAnswer(i, 2, 'Third');
    w.bMarkAnswer(i, 2);
    w.bRemoveAnswer(i, 0);                       // removing an earlier answer
    eq(w.eval(`doc.stages[1].questions[${i}].quizIndex`), 1, 'the correct answer drifted');
    w.bMarkAnswer(i, 1);
    w.bRemoveAnswer(i, 1);                       // removing the correct one
    eq(w.eval(`doc.stages[1].questions[${i}].quizIndex`), -1, 'a deleted answer is still marked correct');
    w.bRemoveQuestion(i);
  });

  t('a preset fills the answers and leaves it a poll', () => {
    w.bAddQuestion(true);
    const i = w.eval('doc.stages[1].questions.length') - 1;
    w.bPreset(i, 'confidence5');
    eq(w.eval(`doc.stages[1].questions[${i}].answers.length`), 5);
    eq(w.eval(`doc.stages[1].questions[${i}].quizIndex`), -1, 'a rating scale should have no right answer');
    w.bRemoveQuestion(i);
  });

  t('everything still serialises to valid ttxf', () => {
    const { errors } = T.parse(w.toTTXF());
    eq(errors.filter(e => e.severity === 'error'), []);
  });
}

G('starting from a shape');
{
  const { w } = boot();

  t('New offers shapes rather than building one unasked', () => {
    w.bNewFromShape();
    const offers = [...w.document.querySelectorAll('.b-zone-body .b-add strong')].map(b => b.textContent);
    ok(offers.length >= 3, 'only ' + offers.length + ' shapes offered');
    ok(offers.some(o => /lifecycle/i.test(o)), 'no incident lifecycle shape');
    eq(w.eval('doc.stages.length'), 0, 'it built a scenario without being asked');
  });

  t('choosing one names the stages after the arc the library follows', () => {
    w.applyShape('lifecycle');
    const names = JSON.parse(w.eval('JSON.stringify(doc.stages.map(s => s.stage))'));
    ok(names.length >= 5, 'too few stages');
    has(names.join(' '), 'Detection');
    has(names.join(' '), 'Containment');
    has(names.join(' '), 'Recovery');
  });

  t('and writes none of the content', () =>
    eq(w.eval('doc.stages.every(s => !s.content && !s.discussion.length && !s.questions.length)'), true));

  t('a blank start is still available', () => {
    w.applyShape('blank');
    eq(w.eval('doc.stages.length'), 1);
    eq(w.eval('doc.stages[0].stage'), '');
  });
}


G('the room view shows only what the room gets');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8'));
  w.bToggleRoom();
  w.bFocus(1);                       // a visible quiz plus a hidden confidence poll
  const room = () => w.document.getElementById('b-room');

  t('it shows the stage as the participants would see it', () => {
    has(room().querySelector('h4').textContent, 'DETECTION');
    ok(room().querySelector('p'), 'no content rendered');
  });

  t('visible questions appear', () => ok(room().querySelectorAll('.b-room-q').length >= 1));

  t('a ?- question does not', () => {
    const hidden = JSON.parse(w.eval('JSON.stringify(doc.stages[1].questions.filter(q => q.participantHidden).map(q => q.question))'));
    ok(hidden.length, 'fixture has no hidden question to check');
    hidden.forEach(q => ok(!room().textContent.includes(q.slice(0, 30)), 'a private question reached the room view'));
  });

  t('and neither do facilitator prompts', () => {
    const prompts = JSON.parse(w.eval('JSON.stringify(doc.stages[1].prompts)'));
    ok(prompts.length, 'fixture has no prompts to check');
    prompts.forEach(p => ok(!room().textContent.includes(p.slice(0, 25)), 'a prompt reached the room view'));
  });

  t('it says what is being held back', () => {
    const note = room().querySelector('.b-room-note').textContent;
    has(note, 'Held back');
    has(note, 'prompt');
  });

  t('moving a question across the divide takes it off the room view', () => {
    const before = room().querySelectorAll('.b-room-q').length;
    w.bMoveQuestion(0);
    eq(room().querySelectorAll('.b-room-q').length, before - 1);
    w.bMoveQuestion(0);
  });

  t('images resolve from the builder, not one level above the site', () => {
    w.eval('doc.stages[1].content = "%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)"; renderRoom();');
    const img = room().querySelector('img');
    ok(img, 'no image in the room view');
    eq(img.getAttribute('src'), 'lib/exercise_data/icons/TTXGYM_Warning_red.png');
  });
}

G('pacing is visible while authoring');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/te-rootkit.ttxf'), 'utf8'));

  t('a scenario already weighted to its content says nothing', () =>
    eq(JSON.parse(w.eval('JSON.stringify(pacing())')), []));

  t('a stage far out of step with what is in it is flagged', () => {
    w.eval('doc.stages[0].duration = "45 mins"; renderOutline();');
    const flags = JSON.parse(w.eval('JSON.stringify(pacing())'));
    ok(flags.some(f => f.i === 0 && f.how === 'long'), 'an obviously over-long stage was not flagged');
    ok(w.document.querySelector('.b-stage-row .warn'), 'the outline shows no warning');
  });

  t('it stays quiet until enough of the exercise is timed to compare against', () => {
    const { w: w2 } = boot();
    w2.bAddStage(); w2.bStage('duration', '90 mins');
    eq(JSON.parse(w2.eval('JSON.stringify(pacing())')), [], 'guessed from a single stage');
  });
}

G('the room view can be resized');
{
  const { w } = boot(null, 1600);
  w.bToggleRoom();
  const wrap = () => w.document.getElementById('b-wrap');
  const split = () => w.document.getElementById('b-split');
  const width = () => parseInt(wrap().style.getPropertyValue('--room-w'), 10);

  t('there is a separator, and it is reachable from the keyboard', () => {
    ok(split(), 'no separator');
    eq(split().getAttribute('role'), 'separator');
    eq(split().getAttribute('tabindex'), '0');
    has(split().getAttribute('aria-label').toLowerCase(), 'resize');
  });

  t('dragging it follows the pointer', () => {
    const down = new w.Event('pointerdown', { bubbles: true });
    down.pointerId = 1; down.clientX = 1180;
    split().dispatchEvent(down);
    ok(wrap().classList.contains('dragging'), 'drag did not start');
    const move = new w.Event('pointermove', { bubbles: true });
    move.clientX = 1000;
    w.dispatchEvent(move);
    eq(width(), 600, 'panel did not follow the pointer');
  });

  t('releasing ends the drag and clears the drag cursor', () => {
    w.dispatchEvent(new w.Event('pointerup', { bubbles: true }));
    ok(!wrap().classList.contains('dragging'));
    ok(!w.document.body.classList.contains('b-dragging'), 'the page is left in a drag state');
  });

  t('the width is remembered', () => {
    eq(w.localStorage.getItem('ttxgym_builder_room_w'), '600');
    const { w: again } = boot(null, 1600);
    eq(parseInt(again.document.getElementById('b-wrap').style.getPropertyValue('--room-w'), 10), 420,
       'a fresh session should start at the default');
  });

  t('arrow keys move it too', () => {
    const before = width();
    const k = new w.Event('keydown', { bubbles: true });
    k.key = 'ArrowLeft'; k.preventDefault = () => {};
    split().dispatchEvent(k);
    ok(width() > before, 'ArrowLeft did not widen the room view');
  });

  t('double-clicking resets it', () => {
    split().dispatchEvent(new w.Event('dblclick', { bubbles: true }));
    eq(width(), 420);
  });

  t('it cannot be dragged past either end', () => {
    w.splitSet(10);
    ok(width() >= 260, 'the room view can be squeezed to nothing: ' + width());
    w.splitSet(99999);
    ok(width() <= 1600 - 250 - 6 - 380, 'the workspace can be squeezed out of use: ' + width());
  });

  t('the drag survives a browser without pointer capture', () => {
    // setPointerCapture is absent in some engines; it is an enhancement, not a requirement
    const src = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
    has(src, 'handle.setPointerCapture &&');
    ok(/window\.addEventListener\('pointermove'/.test(src),
       'the drag relies on capture rather than window listeners');
  });
}

G('drafts');
{
  const draft = JSON.stringify({ title: 'Recovered', author: '', summary: '', conclusion: '',
                                 stages: [{ stage: 'One', content: 'x', duration: '', discussion: [], prompts: [], questions: [] }] });
  const { w } = boot(draft);
  t('a draft is restored on load', () => {
    eq(w.document.getElementById('b-title').value, 'Recovered');
    eq(w.document.querySelectorAll('.b-stage-row').length, 1);
  });
  t('and editing writes a new one', () => {
    w.bMeta('title', 'Changed');
    w.eval('save()');
    has(w.localStorage.getItem('ttxgym_builder_draft'), 'Changed');
  });
  t('a corrupt draft does not stop the builder loading', () => {
    const { w: w2, errs } = boot('{not json');
    eq(errs, []);
    ok(w2.document.getElementById('b-outline'), 'the builder failed to start');
  });
}

G('validation');
{
  const { w } = boot();
  t('a valid scenario reports ready', () => {
    w.load('! title: X\n\n@ One\n! content\nSomething.\n\n? Q\n+ a\n+ b\n');
    w.eval('status()');
    eq(w.document.getElementById('b-status').className, 'good');
  });
  t('a problem is surfaced without leaving the page', () => {
    w.eval("doc.stages.push({stage:'', content:'', duration:'', discussion:[], prompts:[], questions:[{question:'Q', answers:[], quizIndex:-1, participantHidden:false}]}); status();");
    eq(w.document.getElementById('b-status').className, 'bad');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
