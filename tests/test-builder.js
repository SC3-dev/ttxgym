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
      w.eval(fs.readFileSync(path.join(ROOT, 'js/participant-view.js'), 'utf8'));
      if (width) Object.defineProperty(w, 'innerWidth', { value: width, configurable: true });
      w.URL.createObjectURL = () => 'blob:stub';
      w.URL.revokeObjectURL = () => {};
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
  t('and shows the outline and the workspace', () => {
    ok(w.document.getElementById('b-outline'), 'no outline');
    ok(w.document.getElementById('b-work'), 'no workspace');
  });

  t('the participant view floats over the workspace rather than taking a column', () => {
    ok(!w.document.getElementById('b-room'), 'the room column is back');
    const cols = /#b-wrap\s*\{[^}]*grid-template-columns:\s*([^;]+);/
      .exec(fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8'));
    ok(cols, 'no layout to check');
    eq(cols[1].trim().split(/\s+(?![^(]*\))/).length, 2, 'the layout still reserves a column for it');
    const panel = w.document.getElementById('b-mirror');
    ok(panel, 'no participant view');
    ok(panel.classList.contains('hide'), 'it is open before anyone asks for it');
    ok(w.document.getElementById('b-room-btn'), 'no control to open it');
  });
  t('an empty builder offers a way in rather than a blank page', () => {
    const work = w.document.getElementById('b-work-inner');
    has(work.textContent, 'Pick a shape');
    ok(work.querySelector('[onclick^="applyShape"]'), 'no shape to start from');
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


G('the room view is the real participant window');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8'));
  w.bFocus(1);                       // a visible quiz plus a hidden confidence poll
  const payload = () => w.roomPayload();

  t('it uses the participant document the gym uses, not a copy', () => {
    const src = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
    has(src, 'PRESENTATION_HTML');
    has(src, 'js/participant-view.js');
    ok(!/b-room-card/.test(src), 'a second, smaller participant view is still in the builder');
  });

  t('and the same shared file the gym loads', () => {
    const gym = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    has(gym, 'js/participant-view.js');
    ok(!/const PRESENTATION_HTML = `/.test(gym), 'the gym still carries its own copy');
  });

  t('the payload carries exactly the fields the gym sends', () => {
    const gymSrc = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    const fn = gymSrc.slice(gymSrc.indexOf('function currentStageMessage'),
                            gymSrc.indexOf('function broadcastCurrentStage'));
    const expected = ['type', 'title', 'content', 'discussion', 'questions', 'image'];
    expected.forEach(k => ok(new RegExp(k + ':').test(fn), 'the gym no longer sends ' + k));
    expected.forEach(k => ok(k in payload(), 'the builder does not send ' + k));
  });

  t('visible questions travel', () => {
    const p = payload();
    eq(p.questions.length, 1);
    has(p.questions[0].question, 'immediate action');
  });

  t('a ?- question does not', () => {
    const hidden = JSON.parse(w.eval('JSON.stringify(doc.stages[1].questions.filter(q => q.participantHidden).map(q => q.question))'));
    ok(hidden.length, 'fixture has no hidden question');
    const sent = JSON.stringify(payload());
    hidden.forEach(q => ok(!sent.includes(q.slice(0, 30)), 'a private question reached the room'));
  });

  t('and neither do facilitator prompts', () => {
    const prompts = JSON.parse(w.eval('JSON.stringify(doc.stages[1].prompts)'));
    ok(prompts.length, 'fixture has no prompts');
    const sent = JSON.stringify(payload());
    prompts.forEach(x => ok(!sent.includes(x.slice(0, 25)), 'a prompt reached the room'));
  });

  t('moving a question across the divide takes it off the room screen', () => {
    const before = payload().questions.length;
    w.bMoveQuestion(0);
    eq(payload().questions.length, before - 1);
    w.bMoveQuestion(0);
  });

  t('media is made absolute, because a blob window can resolve nothing', () => {
    w.eval('doc.stages[1].content = "%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)";');
    const src = /<img[^>]*src="([^"]+)"/.exec(payload().content);
    ok(src, 'no image in the payload');
    ok(/^https?:/.test(src[1]), 'a relative path would break in the participant window: ' + src[1]);
  });

  t('nothing is sent while the view is closed', () => {
    let posted = 0;
    w.document.getElementById('b-mirror-frame').contentWindow = { postMessage: () => { posted++; } };
    w.sendRoom();
    eq(posted, 0, 'it posted to a panel nobody is looking at');
  });

  t('it stays on this page — no second browser window to lose', () => {
    const src = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
    const mirror = src.slice(src.indexOf('const MIRROR_DEFAULT_W'), src.indexOf('function problems()'));
    ok(!/window\.open\(/.test(mirror), 'it still pops the participant view out');
    has(mirror, 'b-mirror-frame');
  });
}

G('the participant view is a panel you can place');
{
  const { w } = boot(null, 1400);
  const panel = () => w.document.getElementById('b-mirror');
  const width = () => parseInt(panel().style.getPropertyValue('--mirror-w'), 10);

  t('the button opens and closes it', () => {
    w.bToggleRoom();
    ok(!panel().classList.contains('hide'), 'it did not open');
    has(w.document.getElementById('b-room-btn').textContent, 'Hide');
    w.bToggleRoom();
    ok(panel().classList.contains('hide'), 'it did not close');
    w.bToggleRoom();
  });

  t('it shows the real participant document, not a rebuild of it', () => {
    ok(w.document.getElementById('b-mirror-frame').src, 'the frame is empty');
    ok(typeof w.PRESENTATION_HTML === 'string', 'the shared document did not load');
  });

  t('the document is scaled to whatever width the panel is given', () => {
    w.mirrorSetWidth(640, false);
    eq(width(), 640);
    eq(panel().style.getPropertyValue('--mirror-scale'), '0.5000', 'a 1280-wide screen at 640 is half size');
  });

  t('it cannot be shrunk to nothing or grown past the window', () => {
    w.mirrorSetWidth(20, false);
    eq(width(), 240, 'it went below a usable size');
    w.mirrorSetWidth(99999, false);
    ok(width() <= 1400 - 60, 'it grew wider than the page');
  });

  t('arrow keys resize it, for anyone not using a mouse', () => {
    w.mirrorSetWidth(400, false);
    const grip = w.document.getElementById('b-mirror-grip');
    const key = k => {
      const ev = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      grip.dispatchEvent(ev);
    };
    key('ArrowLeft');
    eq(width(), 416, 'left did not widen it');
    key('ArrowRight');
    eq(width(), 400, 'right did not narrow it');
  });

  t('collapsing leaves the header, so it can be brought back', () => {
    w.mirrorCollapse();
    ok(panel().classList.contains('collapsed'), 'it did not collapse');
    ok(w.document.getElementById('b-mirror-head').offsetParent !== null ||
       !panel().classList.contains('hide'), 'the header went with it');
    w.mirrorCollapse();
    ok(!panel().classList.contains('collapsed'), 'it did not come back');
  });

  t('dragging moves it, and it cannot be dragged off the page', () => {
    const head = w.document.getElementById('b-mirror-head');
    const down = new w.MouseEvent('mousedown', { clientX: 500, clientY: 500, bubbles: true });
    head.dispatchEvent(down);
    w.dispatchEvent(new w.MouseEvent('pointermove', { clientX: -5000, clientY: -5000, bubbles: true }));
    w.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true }));
    ok(parseInt(panel().style.right, 10) <= 1400 - width(), 'it left the page to the left');
    ok(parseInt(panel().style.bottom, 10) >= 0, 'it left the page downward');
  });

  t('size and place are remembered between sessions', () => {
    w.mirrorSetWidth(520, true);
    const saved = JSON.parse(w.localStorage.getItem('ttxgym_builder_mirror'));
    eq(saved.w, 520);
  });

  t('reset puts it back in the corner at a sane size', () => {
    w.mirrorReset();
    eq(width(), 400);
    eq(panel().style.right, '20px');
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

G('problems point at the stage, not at a line number');
{
  const { w } = boot();
  const panel = () => w.document.getElementById('b-problems');
  w.load('! title: X\n\n@ One\n! content\nFine.\n\n@ Two\n! content\n\n@ Three\n! content\nAlso fine.\n');

  t('the status chip counts what is actually wrong', () => {
    w.eval('status()');
    const el = w.document.getElementById('b-status');
    eq(el.className, 'bad');
    has(el.textContent, 'problem');
  });

  t('each problem names the stage it is in', () => {
    const list = JSON.parse(w.eval('JSON.stringify(problems())'));
    const bad = list.filter(p => p.severity === 'error');
    eq(bad.length, 1);
    eq(bad[0].stage, 1, 'the empty stage is the second one');
    has(bad[0].message, 'empty screen');
  });

  t('clicking one goes there', () => {
    w.eval('toggleProblems()');
    ok(!panel().classList.contains('hide'), 'the list did not open');
    const row = panel().querySelector('.b-problem.err');
    ok(row, 'no error listed');
    has(row.textContent, 'Stage 2');
    row.click();
    eq(w.eval('focus'), 1, 'it did not focus the stage with the problem');
    ok(panel().classList.contains('hide'), 'the list stayed open');
  });

  t('and the stage is marked in the outline', () => {
    const rows = w.document.querySelectorAll('#b-stage-list .b-stage-row');
    ok(rows[1].querySelector('.flag'), 'the bad stage is unmarked');
    ok(!rows[0].querySelector('.flag'), 'a good stage is marked');
  });

  t('a clean scenario says so rather than counting nothing', () => {
    w.load('! title: X\n\n@ One\n! content\nFine.\n');
    w.eval('status()');
    const el = w.document.getElementById('b-status');
    eq(el.className, 'good');
    eq(el.textContent, 'ready');
  });

  t('warnings are separated from errors — they do not read as breakage', () => {
    w.load('@ One\n! content\nNo title on this one.\n');   // missing title is a warning
    w.eval('status()');
    const el = w.document.getElementById('b-status');
    eq(el.className, '', 'a warning was reported as a problem');
    has(el.textContent, 'check');
  });
}

G('the image picker');
{
  const { w } = boot();
  const gallery = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/exercise_data/gallery.json'), 'utf8'));
  w.eval('galleryData = ' + JSON.stringify(gallery) + ';');
  w.load('! title: X\n\n@ One\n! content\nBefore.\n');
  const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');

  t('the Image button opens the picker rather than dropping a canned icon', () => {
    const src = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
    ok(!/insertBlock\(editable, '%\(\.\.\/lib/.test(src), 'it still inserts a fixed image');
    has(src, "openGallery(editable)");
  });

  t('it opens on a category that has something in it', () => {
    w.openGallery(editable());
    ok(!w.document.getElementById('b-gallery').classList.contains('hide'), 'it did not open');
    eq(w.eval('galleryTab'), 'icons');
    const tabs = w.document.querySelectorAll('#b-gal-tabs button');
    eq(tabs.length, gallery.categories.length);
    eq(tabs[0].getAttribute('aria-selected'), 'true');
  });

  t('an empty category says how to fill it instead of showing nothing', () => {
    w.galleryPick('diagrams');
    has(w.document.getElementById('b-gal-grid').textContent, 'lib/exercise_data/diagrams/');
    w.galleryPick('icons');
  });

  t('thumbnails load from where this page can see them', () => {
    const img = w.document.querySelector('.b-gal-item img');
    ok(img, 'no thumbnails');
    ok(img.getAttribute('src').startsWith('lib/exercise_data/'), img.getAttribute('src'));
    ok(!/%2F/.test(img.getAttribute('src')), 'the path separators were encoded away');
  });

  t('picking one writes the path the gym will read, not the one shown here', () => {
    w.insertGalleryImage('icons/TTXGYM_Warning_red.png');
    const content = w.eval('doc.stages[0].content');
    has(content, '%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)');
  });

  t('but the picture in the editor still loads, which is how this was missed before', () => {
    const img = editable().querySelector('img.SFmedia');
    ok(img, 'no image in the editor');
    eq(img.getAttribute('src'), 'lib/exercise_data/icons/TTXGYM_Warning_red.png');
    eq(img.getAttribute('data-src'), '../lib/exercise_data/icons/TTXGYM_Warning_red.png');
  });

  t('and typing on does not rewrite the path to the one the editor used', () => {
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'), '../lib/exercise_data/');
  });

  t('the chosen size is carried through', () => {
    w.document.getElementById('b-gal-scale').value = '25%';
    w.openGallery(editable());
    w.insertGalleryImage('icons/TTXGYM_Warning_red.png');
    has(w.eval('doc.stages[0].content'), '| 25%)');
  });

  t('a pasted URL is inserted as it stands', () => {
    w.openGallery(editable());
    w.document.getElementById('b-gal-url').value = 'https://example.org/a.png';
    w.insertGalleryURL();
    has(w.eval('doc.stages[0].content'), '%(https://example.org/a.png');
    ok(w.document.getElementById('b-gallery').classList.contains('hide'), 'the picker stayed open');
  });

  t('an absolute URL is left alone on display too', () => {
    const img = Array.from(editable().querySelectorAll('img.SFmedia'))
      .find(i => /example\.org/.test(i.getAttribute('src')));
    ok(img, 'the pasted image is not in the editor');
    ok(!img.getAttribute('data-src'), 'an absolute URL was rewritten');
  });
}

G('media survives a full round trip through the editor');
{
  const { w } = boot();
  const authored = '! title: X\n\n@ One\n! content\nBefore.\n\n%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)\n';
  t('an existing scenario keeps its authored paths', () => {
    w.load(authored);
    const editable = w.document.querySelector('.b-rich[data-field="content"] .b-editable');
    w.richInput(editable);                       // as if the author typed one character
    has(w.eval('toTTXF()'), '%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)');
  });
}

G('opening a file');
{
  const { w } = boot();
  const good = fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8');

  t('a file with nothing the format recognises is refused, not loaded', () => {
    w.load('! title: Work in progress\n\n@ One\n! content\nMine.\n');
    w.importText('just some notes I had lying about', 'notes.txt');
    eq(w.eval('doc.title'), 'Work in progress', 'it threw away the author’s work');
    eq(w.document.getElementById('b-status').className, 'bad');
    has(w.document.getElementById('b-status').textContent, 'notes.txt');
  });

  t('replacing real work asks first', () => {
    let asked = 0;
    w.confirm = () => { asked++; return false; };
    w.importText(good, 'cold_start.ttxf');
    eq(asked, 1, 'it replaced the scenario without asking');
    eq(w.eval('doc.title'), 'Work in progress', 'it loaded anyway');
    w.confirm = () => true;
    w.importText(good, 'cold_start.ttxf');
    ok(w.eval('doc.stages.length') > 1, 'it did not load after being told yes');
  });

  t('a scenario with problems opens the list rather than hiding them', () => {
    w.confirm = () => true;
    w.importText('! title: Half done\n\n@ One\n! content\n\n@ Two\n! content\nFine.\n', 'half.ttxf');
    ok(w.eval('problemsOpen'), 'the problems stayed hidden');
    ok(w.document.querySelector('#b-problems .b-problem.err'), 'nothing was listed');
  });

  t('a file dropped anywhere on the page is opened', () => {
    const files = [{ name: 'dropped.ttxf', size: 10 }];
    let opened = null;
    w.openFile = f => { opened = f; };
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: files };
    w.dispatchEvent(ev);
    ok(opened, 'the drop was ignored');
    eq(opened.name, 'dropped.ttxf');
  });

  t('and dragging one over the page says where it can go', () => {
    const veil = w.document.getElementById('b-drop');
    const ev = new w.Event('dragenter', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'] };
    w.dispatchEvent(ev);
    ok(!veil.classList.contains('hide'), 'no drop target was shown');
    w.dispatchEvent(new w.Event('dragleave', { bubbles: true }));
    ok(veil.classList.contains('hide'), 'the drop target stayed up');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
