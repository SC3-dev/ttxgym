/* The Exercise Builder (editor.html), rebuilt from the ground up in 2026 —
   see docs/BUILDER-UX-REVIEW.md for why and docs/BUILDER-DESIGN.md for what. */
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
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8'), {
    runScripts: 'dangerously', url: 'https://ttxgym.com/editor.html', virtualConsole: vc,
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
      .exec(fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8'));
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
  t('it saves under its own key, and only reads the old one to adopt it', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    has(src, 'ttxgym_builder_draft');
    // the old key survives in exactly one place: the one-time migration
    const mentions = src.split('ttxgym_editor_draft').length - 1;
    eq(mentions, 1, 'the retired draft key is referenced more than the migration needs');
    has(src, 'OLD_DRAFT_KEY');
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
    eq(w.document.querySelectorAll('.b-stage-row[data-i]').length, T.parse(
      fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8')).doc.stages.length));

  t('it shows planned time for the whole exercise', () => {
    has(w.document.getElementById('b-foot-time').textContent, 'planned');
    has(w.document.getElementById('b-foot-count').textContent, 'stages');
  });

  t('a stage with no title still reads as something', () => {
    w.eval('doc.stages[0].stage = ""; renderOutline();');
    has(w.document.querySelector('.b-stage-row[data-i]').textContent, 'Untitled');
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
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    ok(/js\/ttxf\.js\?v=/.test(src), 'editor.html loads the module uncache-busted');
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
    has(w.document.querySelector('.b-stage-row[data-i]').textContent, 'Containment');
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
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
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
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
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
    ok(w.document.querySelector('.b-stage-row[data-i] .warn'), 'the outline shows no warning');
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
    eq(w.document.querySelectorAll('.b-stage-row[data-i]').length, 1);
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
    const rows = w.document.querySelectorAll('#b-stage-list .b-stage-row[data-i]');
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
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
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

G('the editor styles everything the renderer can emit');
{
  const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
  const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));

  // Render one document containing every construct, then look at what came out —
  // so a construct added to js/ttxf.js later is covered without editing this list.
  const sample = [
    'Plain prose with **bold**, *italic* and `code`.',
    '~A quoted scenario update',
    '- a bullet',
    '1. a numbered item',
    '%(../lib/exercise_data/x.png | 50%)',
    '%news(A headline)',
    '```log\nan artefact\n```',
  ].join('\n\n');
  const html = T.markdown(sample);

  t('the sample exercises every construct', () => {
    ['<strong>', '<em>', '<code>', '<blockquote>', '<ul>', '<ol>', '<li>',
     'SFmedia', 'SFnews', 'SFpre'].forEach(bit => has(html, bit));
  });

  t('each one has a rule where the author is looking at it', () => {
    const needed = {
      blockquote: /\.b-editable blockquote/,
      SFmedia: /\.b-editable [^{]*img\.SFmedia|img\.SFmedia/,
      SFnews: /figure\.SFnews/,
      SFpre: /pre\.SFpre/,
      code: /\.b-editable code/,
      ul: /\.b-editable ul/,
      li: /\.b-editable li/,
      strong: /\.b-editable strong/,
    };
    const unstyled = Object.keys(needed).filter(k => !needed[k].test(style));
    eq(unstyled, [], 'renderer output with no styling in the editor');
  });

  t('and a quote really does arrive in the editor as a blockquote', () => {
    const { w } = boot();
    w.load('! title: T\n\n@ One\n! content\n~Scenario update\n');
    const bq = w.document.querySelector('.b-editable blockquote');
    ok(bq, 'no blockquote rendered into the editor');
    eq(bq.textContent.trim(), 'Scenario update');
  });

  t('prose cells in the guide table are not flex containers', () => {
    // a flex cell turns every inline <code> into its own column
    const guide = fs.readFileSync(path.join(ROOT, 'guide.html'), 'utf8');
    const rule = /\.syntax-row>div \{[^}]*\}/.exec(guide);
    ok(rule, 'no .syntax-row>div rule');
    ok(!/display:\s*flex/.test(rule[0]), 'cells are flex again: ' + rule[0].replace(/\s+/g, ' '));
  });
}

G('the exercise adds up to something the author can see');
{
  const { w } = boot();
  t('an empty builder counts nothing', () => {
    eq(w.document.getElementById('b-foot-count').textContent, '0 stages');
  });
  t('stages, and the planned length, are reported', () => {
    w.load('! title: T\n\n@ A\n! duration: 20 mins\n! content: c\n\n@ B\n! duration: 40 mins\n! content: c\n');
    has(w.document.getElementById('b-foot-count').textContent, '2 stages');
    has(w.document.getElementById('b-foot-time').textContent, '1h 00m planned');
  });
  t('a short exercise reads in minutes', () => {
    w.load('! title: T\n\n@ A\n! duration: 25 mins\n! content: c\n');
    has(w.document.getElementById('b-foot-time').textContent, '25 min planned');
  });
  t('an untimed one says so rather than showing a zero', () => {
    w.load('! title: T\n\n@ A\n! content: c\n');
    eq(w.document.getElementById('b-foot-time').textContent, 'untimed');
  });
  t('a duration is editable and round-trips', () => {
    w.eval("bStage('duration', '25 mins');");
    has(w.eval('toTTXF()'), '! duration: 25 mins');
  });
  t('and one the parser cannot read is reported as a problem', () => {
    w.eval("bStage('duration', 'whenever'); status();");
    const listed = JSON.parse(w.eval('JSON.stringify(problems())'));
    ok(listed.some(p => /duration/.test(p.message)), 'an unreadable duration passed silently');
  });
}

G('the formatting bar reads as a toolbar');
{
  const { w } = boot();
  w.load('! title: T\n\n@ One\n! content\nSomething.\n');
  const bar = () => w.document.querySelector('.b-rich[data-field="content"] .b-rich-bar');

  t('it says what it is, and every control says what it does', () => {
    eq(bar().getAttribute('role'), 'toolbar');
    const btns = Array.from(bar().querySelectorAll('button'));
    ok(btns.length >= 10, 'only ' + btns.length + ' controls');
    const unlabelled = btns.filter(b => !b.getAttribute('aria-label') && !b.textContent.trim());
    eq(unlabelled.length, 0, 'a control with no name');
  });

  t('marks and blocks are shaped differently, rather than sharing one size', () => {
    const marks = bar().querySelectorAll('button.ico');
    const blocks = bar().querySelectorAll('button.lbl');
    ok(marks.length >= 6, 'the single-glyph controls are not square');
    ok(blocks.length >= 3, 'the word controls are not labelled');
    Array.from(marks).forEach(b => ok(b.getAttribute('data-cmd'), 'a mark with no command'));
  });

  t('each shape has a rule of its own in the stylesheet', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    ok(/\.b-rich-bar button\.ico\s*\{/.test(style), 'no rule for the square controls');
    ok(/\.b-rich-bar button\.lbl\s*\{/.test(style), 'no rule for the labelled controls');
    ok(/data-cmd="bold"\]\s*\{[^}]*font-weight/.test(style), 'the bold control is not bold');
    ok(/align-items:\s*center/.test(style.slice(style.indexOf('.b-rich-bar {'))), 'the row does not line up');
  });

  t('Source opens at the height of the field it replaces, not a slot', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    const floor = sel => {
      const m = new RegExp(sel + ' \\{[^}]*min-height:\\s*([\\d.]+)rem').exec(style);
      return m ? Number(m[1]) : null;
    };
    const source = floor('\\.b-source');
    const editor = floor('\\.b-rich\\[data-field="content"\\] \\.b-editable');
    ok(source, 'the source view has no floor of its own');
    ok(source >= editor, 'Source is ' + source + 'rem against the editor\u2019s ' + editor + 'rem');
    ok(/<textarea class="b-source"[^>]*rows="(\d+)"/.test(src), 'it falls back to two rows with no CSS');
    ok(Number(/<textarea class="b-source"[^>]*rows="(\d+)"/.exec(src)[1]) >= 10, 'the row fallback is tiny');
  });

  t('and grows to whatever is in it rather than scrolling in a small box', () => {
    const rich = w.document.querySelector('.b-rich[data-field="content"]');
    const ta = rich.querySelector('.b-source');
    Object.defineProperty(ta, 'scrollHeight', { value: 900, configurable: true });
    w.richToggleSource(rich.querySelector('.b-src-toggle'));
    eq(ta.style.height, '900px', 'the source box ignored its content');
    w.richToggleSource(rich.querySelector('.b-src-toggle'));
  });

  t('Source is a toggle, and says which way it is set', () => {
    const btn = bar().querySelector('.b-src-toggle');
    eq(btn.getAttribute('aria-pressed'), 'false');
    w.richToggleSource(btn);
    eq(btn.getAttribute('aria-pressed'), 'true');
    w.richToggleSource(btn);
    eq(btn.getAttribute('aria-pressed'), 'false');
  });
}

/* jsdom loads no pixels, so a picture has to be told how big it is. */
function withSize(img, px) {
  Object.defineProperty(img, 'naturalWidth', { value: px, configurable: true });
  Object.defineProperty(img, 'complete', { value: true, configurable: true });
  return img;
}

G('a picture can be resized where it sits');
{
  const { w } = boot();
  w.load('! title: T\n\n@ One\n! content\nBefore.\n\n%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 50%)\n');
  const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');
  const img = () => editable().querySelector('img.SFmedia');
  const sizer = () => w.document.getElementById('b-tools');

  t('the size the author chose is the size shown, which it never used to be', () => {
    const i = withSize(img(), 400);
    w.sizeMedia(i);
    eq(i.style.width, '200px', 'half of 400 is not being shown');
  });

  t('clicking one selects it and brings up the handle', () => {
    const i = withSize(img(), 400);
    i.click();
    ok(!sizer().classList.contains('hide'), 'no resize handle appeared');
    ok(i.classList.contains('b-picked'), 'the picture is not marked as selected');
    has(sizer().querySelector('.read').textContent, '50%');
  });

  t('and dragging the handle changes the file, not just the view', () => {
    const i = withSize(img(), 400);
    w.setMediaScale(i, 25, true);
    eq(i.getAttribute('data-scale'), '25%');
    eq(i.style.width, '100px');
    has(w.eval('doc.stages[0].content'), '| 25%)');
  });

  t('the authored path is untouched by a resize', () => {
    has(w.eval('doc.stages[0].content'), '%(../lib/exercise_data/icons/TTXGYM_Warning_red.png');
  });

  t('it cannot be dragged to nothing, or past its own resolution', () => {
    const i = withSize(img(), 400);
    w.setMediaScale(i, -50, true);
    eq(i.getAttribute('data-scale'), '5%');
    w.setMediaScale(i, 5000, true);
    eq(i.getAttribute('data-scale'), '100%');
  });

  t('the percentage badge puts it back to full size', () => {
    const i = withSize(img(), 400);
    w.setMediaScale(i, 30, true);
    sizer().querySelector('.read').click();
    eq(i.getAttribute('data-scale'), '100%');
  });

  t('arrow keys resize it, but not while someone is typing', () => {
    const i = withSize(img(), 400);
    i.click();
    w.setMediaScale(i, 50, true);
    const key = k => w.document.dispatchEvent(
      new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    key('ArrowRight');
    eq(i.getAttribute('data-scale'), '52%');
    key('ArrowLeft');
    eq(i.getAttribute('data-scale'), '50%');

    editable().focus();
    Object.defineProperty(w.document, 'activeElement', { value: editable(), configurable: true });
    key('ArrowRight');
    eq(i.getAttribute('data-scale'), '50%', 'an arrow key in the text resized the picture');
  });

  t('and the selection lets go when the workspace is rebuilt under it', () => {
    w.renderWork();
    ok(sizer().classList.contains('hide'), 'the handle is floating over nothing');
  });
}

G('a news headline is typed into, not re-inserted');
{
  const { w } = boot();
  w.load('! title: T\n\n@ One\n! content\n%news(Council systems offline)\n');
  const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');
  const figure = () => editable().querySelector('figure.SFnews');

  t('the frame stays locked but its words do not', () => {
    eq(figure().getAttribute('contenteditable'), 'false');
    eq(figure().querySelector('.SFnews-line').getAttribute('contenteditable'), 'true');
    eq(figure().querySelector('.SFnews-flag').getAttribute('contenteditable'), 'true');
  });

  t('nothing with words in it is an atomic selection, which would block typing', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    const atomic = (style.match(/[^}]*\{[^}]*user-select:\s*all[^}]*\}/g) || []).join(' ');
    ok(atomic, 'nothing is atomic any more — a picture should still be');
    ['figure.SFnews', 'pre.SFpre'].forEach(sel =>
      ok(!atomic.includes(sel), sel + ' is still select-all, so its text cannot be typed into'));
  });

  t('editing the headline rewrites the directive', () => {
    figure().querySelector('.SFnews-line').textContent = 'Third day of outage at the council';
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'), '%news(Third day of outage at the council)');
  });

  t('editing the flag comes through too', () => {
    figure().querySelector('.SFnews-flag').textContent = 'Live';
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'), '| Live)');
  });

  t('and the default flag is still left out of the file', () => {
    figure().querySelector('.SFnews-flag').textContent = 'Breaking News';
    w.richInput(editable());
    const content = w.eval('doc.stages[0].content');
    has(content, '%news(Third day of outage at the council)');
    ok(!/\|/.test(content), 'the default flag was written out: ' + content);
  });

  t('Enter does not break the strap open', () => {
    const line = figure().querySelector('.SFnews-line');
    const ev = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    line.dispatchEvent(ev);
    ok(ev.defaultPrevented, 'Enter was allowed to put a line break in the headline');
  });

  t('a headline typed away to nothing still round-trips', () => {
    figure().querySelector('.SFnews-line').textContent = '';
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'), '%news(');
  });
}

G('the participant view keeps up with the editing');
{
  const { w } = boot();
  w.load('! title: T\n\n@ One\n! content\nFirst.\n\n# discussion\n- talk\n\n? Q\n+ a\n+ b\n\n@ Two\n! content\nSecond.\n');
  w.bToggleRoom();

  const posted = [];
  const frame = w.document.getElementById('b-mirror-frame');
  Object.defineProperty(frame, 'contentWindow',
    { value: { postMessage: m => posted.push(m) }, configurable: true });
  const settle = () => new Promise(r => setTimeout(r, 30));
  const ready = () => w.dispatchEvent(new w.MessageEvent('message', { data: { type: 'ready' } }));

  t('nothing is thrown at a document that has not loaded yet', async () => {
    w.bStage('stage', 'Typed before the frame existed');
    await settle();
    eq(posted.length, 0, 'a message went to a window with no listener');
  });

  t('and the newest state lands the moment it says it is ready', async () => {
    ready();
    await settle();
    eq(posted.length, 1);
    eq(posted[0].title, 'Typed before the frame existed');
  });

  t('a burst of keystrokes is one refresh, carrying the last of them', async () => {
    posted.length = 0;
    for (let i = 0; i < 10; i++) w.bStage('stage', 'draft ' + i);
    await settle();
    eq(posted.length, 1, 'it re-rendered the room once per keypress');
    eq(posted[0].title, 'draft 9', 'the refresh was stale');
  });

  t('selecting a stage shows that stage', async () => {
    posted.length = 0;
    w.bFocus(1);
    await settle();
    eq(posted.length, 1);
    eq(posted[0].title, 'Two');
    has(posted[0].content, 'Second.');
  });

  /* The guarantee is "every change", so it is checked as every change rather
     than as a list of the ones someone remembered to wire up. */
  t('every way of changing the exercise reaches the room', async () => {
    w.bFocus(0);
    const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');
    const changes = {
      'stage title': () => w.bStage('stage', 'Renamed'),
      'planned time': () => w.bStage('duration', '15 mins'),
      'exercise title': () => w.bMeta('title', 'A new name'),
      'typing content': () => { editable().querySelector('p').textContent = 'Rewritten'; w.richInput(editable()); },
      'a discussion point': () => w.bItem('discussion', 0, 'Something else'),
      'a question': () => w.bQuestion(0, 'Changed?'),
      'an answer': () => w.bAnswer(0, 0, 'Another'),
      'adding an answer': () => w.bAddAnswer(0),
      'taking a question private': () => w.bMoveQuestion(0),
      'adding a stage': () => w.bAddStage(),
      'moving a stage': () => w.bMoveStage(1, -1),
      'the summary screen': () => w.bFocusMeta('summary'),
    };
    const silent = [];
    for (const name of Object.keys(changes)) {
      posted.length = 0;
      changes[name]();
      await settle();
      if (!posted.length) silent.push(name);
    }
    eq(silent, [], 'these changed the exercise without refreshing the room');
  });

  t('and closing it stops the traffic', async () => {
    posted.length = 0;
    w.bToggleRoom();
    w.bStage('stage', 'Edited with the view closed');
    await settle();
    eq(posted.length, 0, 'it is still posting to a panel nobody is looking at');
  });
}

G('the workspace has room to work in');
{
  const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
  const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));

  /* A var() that resolves to nothing makes its whole declaration invalid, so a
     token that lives in another file can take the layout down with it: the grid
     collapses to one column and the rail spans the page. It happened. */
  t('the layout cannot be collapsed by a stylesheet that has not arrived', () => {
    // anchored to the start of a declaration, so "border-right" is not read as "right"
    const structural = (style.match(
      /[{;\n]\s*(?:grid[a-z-]*|width|height|min-width|min-height|max-width|max-height|flex|inset|top|left|right|bottom|transform)\s*:\s*[^;{}]*var\([^;{}]*\)[^;{}]*;/g) || []);
    const local = new Set((style.match(/--[\w-]+\s*:/g) || []).map(d => d.replace(/\s*:$/, '')));
    const naked = structural.filter(d => {
      const tokens = (d.match(/var\(\s*(--[\w-]+)\s*\)/g) || []).map(t => /(--[\w-]+)/.exec(t)[1]);
      return tokens.some(t => !local.has(t));          // no fallback, and not defined on this page
    });
    eq(naked, [], 'a structural property depends on another file with no fallback');
  });

  t('and the stylesheet it needs is asked for by version', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    const link = /<link rel="stylesheet" href="(style\.css[^"]*)"/.exec(src);
    ok(link, 'the page does not load the site stylesheet');
    has(link[1], '?v=');
    const site = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    ['--sidebar-width', '--text-label'].forEach(t =>
      has(site, t + ':'));
  });

  t('a stage is given the width of a page, not of a column of form fields', () => {
    const m = /#b-work-inner \{[^}]*max-width:\s*(\d+)px/.exec(style);
    ok(m, 'no width set on the workspace');
    ok(Number(m[1]) >= 1000, 'the workspace is only ' + m[1] + 'px wide');
  });

  t('and the outline is the gym\u2019s rail, not a second opinion about rails', () => {
    ok(/#b-wrap \{[^}]*grid-template-columns:\s*var\(--sidebar-width[,)]/.test(style),
       'the outline sets its own width instead of sharing the site\u2019s');
    const site = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    const gym = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
    const widthOf = css => (/--sidebar-width:\s*([^;]+);/.exec(css) || [])[1];
    eq(widthOf(site), widthOf(gym), 'the two rails are different widths');
    ok(/#b-outline \{[^}]*background:\s*var\(--surface\)/.test(style),
       'the rail is a different shade from the gym\u2019s, which uses --surface');
    ok(/#controller \{[^}]*background:\s*var\(--surface\)/.test(gym),
       'the gym\u2019s rail changed shade; this one should follow');
  });
}

G('a block dropped into a sentence becomes a block');
{
  const { w } = boot();
  const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');
  const kinds = () => Array.from(editable().childNodes).map(n => n.nodeName).join(' ');
  const caretAt = (node, offset) => {
    const r = w.document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    const sel = w.document.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };
  const fresh = () => {
    w.load('! title: T\n\n@ One\n! content\nThe alert fired at midnight.\n');
    return editable();
  };

  t('an artefact lands beside the paragraph, not inside it', () => {
    const ed = fresh();
    caretAt(ed.querySelector('p').firstChild, 9);          // after "The alert"
    w.insertBlock(ed, '```SIEM export\n02:13:47  EDR  unsigned binary executed\n```');
    w.richInput(ed);
    eq(kinds(), 'P PRE P', 'the block was nested or flattened');
  });

  t('and it is still an artefact in the file — the fences survive', () => {
    const content = w.eval('doc.stages[0].content');
    has(content, '```SIEM export');
    has(content, '02:13:47  EDR  unsigned binary executed');
    has(content, '\n```');
  });

  t('the sentence is split around it, and the join is not left with a stray space', () => {
    const content = w.eval('doc.stages[0].content');
    has(content, 'The alert\n\n```');
    has(content, '```\n\nfired at midnight.');
  });

  t('a news frame behaves the same way', () => {
    const ed = fresh();
    caretAt(ed.querySelector('p').firstChild, 9);
    w.insertBlock(ed, '%news(Council systems offline)');
    w.richInput(ed);
    eq(kinds(), 'P FIGURE P');
    has(w.eval('doc.stages[0].content'), '%news(Council systems offline)');
  });

  t('so does a picture', () => {
    const ed = fresh();
    caretAt(ed.querySelector('p').firstChild, 9);
    w.insertBlock(ed, '%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)');
    w.richInput(ed);
    has(w.eval('doc.stages[0].content'), '%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 60%)');
    ok(editable().querySelector('img.SFmedia'), 'no picture in the editor');
  });

  t('inserting at the very start does not leave an empty line above it', () => {
    const ed = fresh();
    caretAt(ed.querySelector('p').firstChild, 0);
    w.insertBlock(ed, '```log\nx\n```');
    w.richInput(ed);
    eq(kinds(), 'PRE P');
    ok(!/^\s*\n/.test(w.eval('doc.stages[0].content')), 'the content starts with a blank line');
  });

  t('with no caret in the field it goes to the end rather than nowhere', () => {
    const ed = fresh();
    w.document.getSelection().removeAllRanges();
    w.insertBlock(ed, '```log\nx\n```');
    w.richInput(ed);
    eq(kinds(), 'P PRE P');
    has(w.eval('doc.stages[0].content'), 'The alert fired at midnight.\n\n```log');
  });

  t('and a block dropped on a block sits after it, never inside it', () => {
    const ed = fresh();
    w.document.getSelection().removeAllRanges();
    w.insertBlock(ed, '```first\na\n```');
    const pre = ed.querySelector('pre.SFpre');
    caretAt(pre, 0);
    w.insertBlock(ed, '```second\nb\n```');
    w.richInput(ed);
    eq(ed.querySelectorAll('pre.SFpre').length, 2, 'one artefact swallowed the other');
    eq(ed.querySelectorAll('pre.SFpre pre').length, 0, 'an artefact is nested inside another');
    const content = w.eval('doc.stages[0].content');
    ok(content.indexOf('```first') < content.indexOf('```second'), 'they came out in the wrong order');
  });

  t('the caret is left after the block, ready to keep typing', () => {
    const ed = fresh();
    caretAt(ed.querySelector('p').firstChild, 9);
    w.insertBlock(ed, '```log\nx\n```');
    const sel = w.document.getSelection();
    ok(sel.rangeCount, 'the caret was lost');
    let n = sel.getRangeAt(0).startContainer;
    while (n && n.parentNode !== ed) n = n.parentNode;
    const kids = Array.from(ed.childNodes);
    ok(kids.indexOf(n) > kids.findIndex(k => k.nodeName === 'PRE'), 'the caret is before the block');
  });
}

G('the chrome is actually styled');
{
  const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
  const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));

  /* The .btn family was defined inside the builder this page replaced and went
     with it, leaving nine buttons rendering as raw browser defaults. Nothing
     failed, because nothing was checking that a class in the markup means
     anything in the stylesheet. */
  t('every class this page puts on a button has a rule behind it', () => {
    const used = new Set();
    (src.match(/class="([^"]*)"/g) || []).forEach(m => {
      m.slice(7, -1).split(/\s+/).filter(Boolean).forEach(c => used.add(c));
    });
    const wanted = Array.from(used).filter(c => /^btn/.test(c) || /^b-(name|notice|status)/.test(c));
    ok(wanted.length >= 5, 'found only ' + wanted.join(', '));
    const missing = wanted.filter(c => !new RegExp('[.#]' + c.replace(/[-]/g, '\\-') + '[\\s,:.{\\[]').test(style));
    eq(missing, [], 'classes used in the markup with no rule in the stylesheet');
  });

  t('the top bar separates what you make from where you send it', () => {
    const { w } = boot();
    const top = w.document.getElementById('b-top');
    ok(top.querySelector('.b-name'), 'the page does not name itself');
    ok(top.querySelector('.rule'), 'the actions are not grouped');
    ok(top.querySelector('.btn-primary'), 'nothing is the main action');
    const quiet = top.querySelectorAll('.btn-quiet');
    ok(quiet.length >= 2, 'New and Import are competing with Download for attention');
  });

  t('the draft banner is a banner, with its own dismiss', () => {
    const { w } = boot(JSON.stringify({
      title: 'Half done',
      stages: [{ stage: 'S', content: 'c', duration: '', discussion: [], prompts: [], questions: [] }],
    }));
    const notice = w.document.getElementById('b-notice');
    ok(!notice.classList.contains('hide'), 'the banner did not appear');
    ok(notice.querySelector('.btn-ghost'), 'no way to start again');
    const x = notice.querySelector('.btn-dismiss');
    ok(x, 'no way to dismiss it');
    ok(x.getAttribute('aria-label'), 'the dismiss control has no name');
    x.click();
    ok(notice.classList.contains('hide'), 'it could not be dismissed');
  });
}

G('an artefact is labelled and written in place');
{
  const { w } = boot();
  const SRC = '! title: T\n\n@ One\n! content\nBefore.\n\n```SIEM export\n02:13:47  EDR  unsigned binary executed\n02:14:02  EDR  persistence written\n```\n';
  const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');
  const pre = () => editable().querySelector('pre.SFpre');
  const label = () => pre().querySelector('.SFpre-label');
  const body = () => pre().querySelector('code');
  const fresh = () => { w.load(SRC); return editable(); };

  t('the label is a real element, not something drawn with CSS', () => {
    fresh();
    ok(label(), 'the label cannot be reached, only looked at');
    eq(label().textContent, 'SIEM export');
    eq(label().getAttribute('contenteditable'), 'true');
  });

  t('and the frame around it stays locked', () => {
    eq(pre().getAttribute('contenteditable'), 'false');
  });

  t('renaming it renames the fence', () => {
    label().textContent = 'Firewall log';
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'), '```Firewall log\n02:13:47');
  });

  t('the lines under it are untouched by that', () => {
    const content = w.eval('doc.stages[0].content');
    has(content, '02:13:47  EDR  unsigned binary executed\n02:14:02  EDR  persistence written');
    ok(!content.includes('Firewall log\nFirewall log'), 'the label leaked into the body');
  });

  t('clearing it leaves a bare fence rather than an empty label', () => {
    label().textContent = '';
    w.richInput(editable());
    const content = w.eval('doc.stages[0].content');
    has(content, '```\n02:13:47');
    ok(!/```\s+\n/.test(content), 'the fence carries whitespace where the label was');
  });

  t('Enter in the label moves on rather than splitting it', () => {
    const ev = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    label().dispatchEvent(ev);
    ok(ev.defaultPrevented, 'Enter was allowed to break the label in two');
  });

  /* The body is the other half of the same block. Editing it in place is only
     safe if a line break survives, and a caret in a <pre> leaves markup rather
     than a newline — <br> in some engines, <div> in others. */
  t('the lines themselves can be typed into', () => {
    fresh();
    eq(body().getAttribute('contenteditable'), 'true');
  });

  t('and a line break entered as a <br> survives the round trip', () => {
    body().innerHTML = '02:13:47  EDR  unsigned binary executed<br>02:15:10  EDR  beacon to 10.4.4.9';
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'),
        '```SIEM export\n02:13:47  EDR  unsigned binary executed\n02:15:10  EDR  beacon to 10.4.4.9\n```');
  });

  t('one entered as a <div> does too, because engines differ', () => {
    fresh();
    body().innerHTML = 'line one<div>line two</div><div>line three</div>';
    w.richInput(editable());
    has(w.eval('doc.stages[0].content'), '```SIEM export\nline one\nline two\nline three\n```');
  });

  t('Enter inside the body is left alone, because a log is made of lines', () => {
    const ev = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    body().dispatchEvent(ev);
    ok(!ev.defaultPrevented, 'Enter was blocked inside the artefact body');
  });

  t('an artefact nobody touches comes back byte for byte', () => {
    fresh();
    has(w.eval('toTTXF()'),
        '```SIEM export\n02:13:47  EDR  unsigned binary executed\n02:14:02  EDR  persistence written\n```');
  });

  t('the label element is never written into the file as content', () => {
    fresh();
    w.richInput(editable());
    const content = w.eval('doc.stages[0].content');
    ok(!content.includes('SFpre-label'), 'the markup leaked into the scenario');
    eq((content.match(/SIEM export/g) || []).length, 1, 'the label was written twice');
  });
}

G('the opening and the debrief are part of the running order');
{
  const { w } = boot();
  w.load('! title: T\n\n! summary\nWhat you are walking into.\n\n@ One\n! content\nc\n\n@ Two\n! content\nc\n\n! conclusion\nWhat we learned.\n');
  const rows = () => Array.from(w.document.querySelectorAll('#b-stage-list .b-stage-row'));

  t('they sit in the list, at the ends, rather than behind two buttons', () => {
    const all = rows();
    eq(all.length, 4, 'expected opening, two stages and the debrief');
    ok(all[0].classList.contains('b-bookend'), 'the opening is not first');
    ok(all[3].classList.contains('b-bookend'), 'the debrief is not last');
    has(all[0].textContent, 'Opening');
    has(all[3].textContent, 'Debrief');
  });

  t('and are marked as not being stages', () => {
    const all = rows();
    ok(!all[0].hasAttribute('data-i'), 'the opening is numbered like a stage');
    ok(!all[0].hasAttribute('draggable'), 'the opening can be dragged into the middle');
    ok(all[1].getAttribute('draggable') === 'true', 'a real stage is no longer draggable');
  });

  t('each shows whether it has anything in it', () => {
    has(rows()[0].textContent, 'What you are walking into');
    const { w: empty } = boot();
    empty.load('! title: T\n\n@ One\n! content\nc\n');
    has(empty.document.querySelectorAll('#b-stage-list .b-stage-row')[0].textContent, 'click to write it');
  });

  t('clicking one opens it for editing', () => {
    rows()[3].click();
    eq(w.eval('metaFocus'), 'conclusion');
    ok(w.document.querySelector('.b-rich[data-field="conclusion"]'), 'the debrief did not open');
    eq(rows()[3].getAttribute('aria-current'), 'true');
  });

  t('and selecting a stage releases them', () => {
    w.bFocus(0);
    eq(w.eval('metaFocus'), null);
    eq(rows()[0].getAttribute('aria-current'), 'false');
    eq(rows()[1].getAttribute('aria-current'), 'true');
  });
}

G('a block can be got rid of without guessing how');
{
  const { w } = boot();
  const editable = () => w.document.querySelector('.b-rich[data-field="content"] .b-editable');
  const tools = () => w.document.getElementById('b-tools');
  const load = src => { w.load('! title: T\n\n@ One\n! content\nBefore.\n\n' + src + '\n\nAfter.\n'); };

  t('selecting an artefact offers a way to remove it', () => {
    load('```SIEM export\na\n```');
    const pre = editable().querySelector('pre.SFpre');
    pre.click();
    ok(!tools().classList.contains('hide'), 'no controls appeared');
    ok(pre.classList.contains('b-picked'), 'the block is not marked as selected');
    const kill = tools().querySelector('.kill');
    ok(kill, 'no remove button');
    has(kill.getAttribute('aria-label'), 'artefact');
  });

  t('and pressing it takes the block out of the file', () => {
    tools().querySelector('.kill').click();
    const content = w.eval('doc.stages[0].content');
    ok(!content.includes('```'), 'the artefact is still there: ' + content);
    has(content, 'Before.');
    has(content, 'After.');
    ok(tools().classList.contains('hide'), 'the controls are floating over nothing');
  });

  t('a news frame the same', () => {
    load('%news(Council systems offline)');
    const fig = editable().querySelector('figure.SFnews');
    fig.click();
    has(tools().querySelector('.kill').getAttribute('aria-label'), 'news');
    tools().querySelector('.kill').click();
    ok(!w.eval('doc.stages[0].content').includes('%news('), 'the frame survived');
  });

  t('and a picture, which also keeps its size control', () => {
    load('%(../lib/exercise_data/icons/TTXGYM_Warning_red.png | 50%)');
    const img = editable().querySelector('img.SFmedia');
    Object.defineProperty(img, 'naturalWidth', { value: 400, configurable: true });
    Object.defineProperty(img, 'complete', { value: true, configurable: true });
    img.click();
    ok(!tools().classList.contains('no-size'), 'a picture lost its resize handle');
    has(tools().querySelector('.kill').getAttribute('aria-label'), 'picture');
    tools().querySelector('.kill').click();
    ok(!w.eval('doc.stages[0].content').includes('%('), 'the picture survived');
  });

  t('the size control is hidden for blocks that have no size', () => {
    load('```log\na\n```');
    editable().querySelector('pre.SFpre').click();
    ok(tools().classList.contains('no-size'), 'an artefact was offered a resize handle');
  });

  t('Delete removes a selected block, but never while someone is typing', () => {
    load('```log\na\n```');
    editable().querySelector('pre.SFpre').click();
    const press = () => {
      const ev = new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
      w.document.dispatchEvent(ev);
      return ev;
    };
    Object.defineProperty(w.document, 'activeElement', { value: editable(), configurable: true });
    press();
    has(w.eval('doc.stages[0].content'), '```log', 'a keystroke in the text deleted the block');
    Object.defineProperty(w.document, 'activeElement', { value: w.document.body, configurable: true });
    press();
    ok(!w.eval('doc.stages[0].content').includes('```log'), 'Delete did not remove the block');
  });
}

G('accessibility');
{
  const { w } = boot();
  w.load(fs.readFileSync(path.join(ROOT, 'lib/scenarios/cold_start.ttxf'), 'utf8'));
  w.bFocus(1);
  w.bToggleRoom();
  w.toggleProblems();
  const d = w.document;
  const nameOf = el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
    .replace(/\s+/g, ' ').trim();

  t('every control the page draws has a name', () => {
    const unnamed = Array.from(d.querySelectorAll('button, [role="button"], [role="slider"]'))
      .filter(b => !nameOf(b))
      .map(b => b.outerHTML.slice(0, 70));
    eq(unnamed, []);
  });

  t('every field has a real label, not just a placeholder', () => {
    const bare = Array.from(d.querySelectorAll('input, textarea, select'))
      .filter(f => !(f.id && d.querySelector('label[for="' + f.id + '"]')) && !f.closest('label') &&
                   !f.getAttribute('aria-label') && !f.getAttribute('aria-labelledby'))
      .map(f => f.outerHTML.slice(0, 70));
    eq(bare, [], 'a placeholder disappears the moment someone types into the field');
  });

  t('the page can be navigated by heading', () => {
    const hs = Array.from(d.querySelectorAll('h1, h2, h3')).map(h => h.tagName);
    ok(hs.length >= 4, 'only ' + hs.length + ' headings');
    eq(hs.filter(h => h === 'H1').length, 1, 'there should be exactly one H1');
  });

  t('and by landmark, with each one saying which it is', () => {
    const marks = Array.from(d.querySelectorAll('nav, main, aside'));
    ok(marks.length >= 3, 'only ' + marks.length + ' landmarks');
    const nameless = marks.filter(m => !m.getAttribute('aria-label')).map(m => m.tagName);
    eq(nameless, [], 'a landmark with no name is no use for navigating');
  });

  t('the writing surfaces announce themselves as text boxes', () => {
    Array.from(d.querySelectorAll('.b-editable')).forEach(e => {
      eq(e.getAttribute('role'), 'textbox');
      ok(e.getAttribute('aria-label'), 'an editable with no name');
    });
  });

  t('what is wrong is announced, not only shown', () => {
    const status = d.getElementById('b-status');
    ok(status.getAttribute('aria-live'), 'the status changes silently');
    eq(status.getAttribute('aria-controls'), 'b-problems');
    ok(status.hasAttribute('aria-expanded'), 'the disclosure state is not exposed');
  });

  t('opening the picker takes the focus with it, and gives it back', () => {
    const before = d.getElementById('b-title');
    before.focus();
    w.eval('galleryData = { categories: [], images: [] };');
    w.openGallery(d.querySelector('.b-editable'));
    ok(d.getElementById('b-gallery').contains(d.activeElement), 'focus was left behind the dialog');
    w.cancelGallery();
    eq(d.activeElement, before, 'focus was not given back');
  });

  t('and Tab cannot wander out of it while it is open', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    has(src, "ev.key !== 'Tab'");
    has(src, 'shiftKey && document.activeElement === first');
  });

  t('no image is left without alt text', () => {
    const bare = Array.from(d.querySelectorAll('img')).filter(i => i.getAttribute('alt') === null);
    eq(bare.length, 0);
  });

  t('the participant view frame is named for anyone who lands in it', () => {
    ok(d.getElementById('b-mirror-frame').getAttribute('title'));
  });

  /* Measured rather than eyeballed. --text-muted is about 2.4:1 on every ground
     in this palette — the gym added --text-label for exactly this reason, and
     the builder drew its labels with the failing one until it was checked. */
  t('no text is drawn in a colour that cannot be read on its own background', () => {
    const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = ch => 0.2126 * lin(ch[0]) + 0.7152 * lin(ch[1]) + 0.0722 * lin(ch[2]);
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
    const ratio = (a, b) => { const x = lum(a), y = lum(b); const [hi, lo] = x > y ? [x, y] : [y, x]; return (hi + 0.05) / (lo + 0.05); };

    const site = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    const tok = n => (new RegExp('--' + n + ':\\s*([^;]+);').exec(site) || [])[1].trim();
    const alphaOf = v => { const m = /rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/.exec(v); return m ? Number(m[1]) : 1; };
    const white = hex('#e8ecf2');
    const grounds = ['back', 'mid', 'surface', 'surface-raised'].map(n => hex(tok(n)));

    const style = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    ok(!/color:\s*var\(--text-muted\)/.test(style),
       'the builder still draws text in --text-muted, which fails on every ground');

    const label = alphaOf(tok('text-label'));
    grounds.forEach((g, i) => {
      const r = ratio(over(white, label, g), g);
      ok(r >= 4.5, '--text-label is only ' + r.toFixed(2) + ':1 on ground ' + i);
    });
  });
}

G('the way out is named after where it goes');
{
  const { w } = boot();
  t('the gym button says so', () => {
    const btn = Array.from(w.document.querySelectorAll('#b-top .btn'))
      .find(b => /bRunInGym/.test(b.getAttribute('onclick') || ''));
    ok(btn, 'no control to run the exercise');
    eq(btn.textContent.trim(), 'Preview in TTX Gym');
  });
  t('and a stage gets room to write in', () => {
    const src = fs.readFileSync(path.join(ROOT, 'editor.html'), 'utf8');
    const style = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
    const m = /\.b-rich\[data-field="content"\] \.b-editable \{[^}]*min-height:\s*([\d.]+)rem/.exec(style);
    ok(m, 'the content field has no floor');
    ok(Number(m[1]) >= 10, 'the content field is only ' + m[1] + 'rem tall');
    ok(/#b-work-inner > \.b-zone\.screen \{[^}]*min-height/.test(style), 'a short stage still collapses');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
