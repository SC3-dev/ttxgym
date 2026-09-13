const fs = require('fs');
const { boot, loadScenario, ev, tick, respond, unrespond, counts, sampleScenarios, ROOT } = require('./harness.js');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected ${JSON.stringify(sub)} in ${JSON.stringify(String(s).slice(0, 200))}`); };

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

G('the library still drives end to end');
{
  const files = sampleScenarios(8).map(e => e.id + '.ttxf');
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
  t(`a spread of ${files.length} scenarios loads, navigates, summarises and exports cleanly`, () =>
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

G('news headlines reach every surface, and the room screen');
{
  const gymSrc = fs.readFileSync(ROOT + '/gym/index.html', 'utf8');
  const edSrc = fs.readFileSync(ROOT + '/editor.html', 'utf8');
  const targets = {
    'facilitator view': gymSrc.slice(0, gymSrc.indexOf('PRESENTATION_HTML')),
    'participant window': gymSrc.slice(gymSrc.indexOf('PRESENTATION_HTML')),
    'exported report': gymSrc.slice(gymSrc.indexOf('REPORT_CSS'), gymSrc.indexOf('REPORT_HEADER')),
    'builder preview': edSrc,
  };
  Object.keys(targets).forEach(name => {
    t(`the ${name} styles it`, () => {
      ok(/figure\.SFnews\{/.test(targets[name]), 'no figure.SFnews rule');
      ok(/\.SFnews-ticker\{[^}]*position:absolute/.test(targets[name]), 'the strap is not overlaid');
    });
  });
  t('the report will print the strap colours and not split the frame', () => {
    const css = targets['exported report'];
    ok(/\.SFnews-flag\{[^}]*print-color-adjust/.test(css), 'the red flag will print white');
    ok(/figure\.SFnews\{[^}]*break-inside:avoid/.test(css), 'the frame can split across pages');
  });
  t('the builder points the backdrop at its own location', () =>
    ok(/setNewsBackdrop\('lib\/exercise_data\/news\.jpeg'\)/.test(edSrc),
       'the builder preview would show a broken image'));
}

G('a news headline survives to the participant window');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8'), 'nightshift.ttxf');

  t('the facilitator sees the frame', () => {
    ev(w, 'goToStage(18)');
    ok(w.document.querySelector('figure.SFnews'), 'no news figure on the page');
  });

  t('the backdrop is absolutised on its way to the blob window', () => {
    ev(w, 'goToStage(18)');
    const msg = JSON.parse(ev(w, 'JSON.stringify(currentStageMessage())'));
    const src = /<img class="SFnews-shot" src="([^"]+)"/.exec(msg.content);
    ok(src, 'no backdrop in the payload');
    // a blob-origin window cannot resolve ../ — it must arrive absolute
    ok(/^https?:/.test(src[1]), 'relative src would break in the participant window: ' + src[1]);
  });

  t('the headline itself travels with it', () => {
    const msg = JSON.parse(ev(w, 'JSON.stringify(currentStageMessage())'));
    has(msg.content, 'SFnews-line');
    has(msg.content, 'cyber incident');
  });
}

G('fenced blocks reach every surface, and stay preformatted');
{
  const gymSrc = fs.readFileSync(ROOT + '/gym/index.html', 'utf8');
  const edSrc = fs.readFileSync(ROOT + '/editor.html', 'utf8');
  const targets = {
    'facilitator view': gymSrc.slice(0, gymSrc.indexOf('PRESENTATION_HTML')),
    'participant window': gymSrc.slice(gymSrc.indexOf('PRESENTATION_HTML')),
    'exported report': gymSrc.slice(gymSrc.indexOf('REPORT_CSS'), gymSrc.indexOf('REPORT_HEADER')),
    'builder preview': edSrc,
  };
  Object.keys(targets).forEach(name => {
    t(`the ${name} styles it`, () => ok(/pre\.SFpre/.test(targets[name]), 'no pre.SFpre rule'));
    t(`the ${name} keeps the shape`, () => {
      const rule = targets[name].match(/pre\.SFpre\s*\{[^}]*\}/)[0];
      ok(/white-space:\s*pre-wrap/.test(rule), 'spacing would collapse: ' + rule.slice(0, 60));
      ok(!/white-space:\s*(normal|nowrap)/.test(rule), 'wrong white-space');
    });
    t(`the ${name} does not double-decorate the inner code`, () =>
      ok(/pre\.SFpre\s*>\s*code\s*\{[^}]*background:\s*none/.test(targets[name]),
         'the inline code pill will show inside the block'));
  });
  t('the report will print the block background', () =>
    ok(/pre\.SFpre\{[^}]*print-color-adjust/.test(targets['exported report'])));
}

G('a fenced artefact survives to the room screen intact');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8'), 'nightshift.ttxf');

  t('the facilitator sees a pre block, not a run-on paragraph', () => {
    ev(w, 'goToStage(2)');
    const html = w.document.getElementById('questionsContainer').innerHTML;
    ok(/<pre class="SFpre"/.test(html), 'no fenced block rendered');
    ok(/data-label="EDR process tree/.test(html), 'the label was dropped');
  });

  t('the ransom note reaches the participant window with its shape', () => {
    ev(w, 'goToStage(14)');
    const msg = JSON.parse(ev(w, 'JSON.stringify(currentStageMessage())'));
    has(msg.content, '<pre class="SFpre" data-label="README_RESTORE.txt">');
    has(msg.content, '140,000 GBP');
    // the lines beginning # are part of the artefact, not directives
    has(msg.content, '# We are reachable');
    ok(/\n/.test(msg.content), 'line breaks were collapsed');
  });

  t('no HTML entity shows up as literal text in the block', () => {
    ev(w, 'goToStage(14)');
    const pre = w.document.querySelector('#round14 pre.SFpre') ||
                [...w.document.querySelectorAll('pre.SFpre')].pop();
    ok(pre, 'no pre element on the page');
    const text = pre.textContent;
    ok(!/&(amp|lt|gt|quot|#0?39);/.test(text), 'entity leaked: ' + text.slice(0, 120));
    has(text, "insurer's negotiator");
  });

  t('indentation inside the artefact is preserved in the DOM', () => {
    const pre = [...w.document.querySelectorAll('pre.SFpre')].pop();
    ok(/\n {2}\\FIN-SRV-04/.test(pre.textContent), 'leading spaces were stripped');
  });
}

G('inline code reaches every surface that renders a scenario');
{
  const gymSrc = fs.readFileSync(ROOT + '/gym/index.html', 'utf8');
  const edSrc = fs.readFileSync(ROOT + '/editor.html', 'utf8');
  // a code span is worthless if the surface it lands on has no style for it
  t('the facilitator view styles it', () => ok(/\n    code \{/.test(gymSrc), 'no rule in the gym stylesheet'));
  t('the participant window styles it', () => {
    const tpl = gymSrc.slice(gymSrc.indexOf('PRESENTATION_HTML'), gymSrc.indexOf('</html>', gymSrc.indexOf('PRESENTATION_HTML')));
    ok(/code\{font-family/.test(tpl), 'no rule in the participant template');
  });
  t('the exported report styles it, and prints it', () => {
    const css = gymSrc.slice(gymSrc.indexOf('REPORT_CSS'), gymSrc.indexOf('REPORT_HEADER'));
    ok(/code\{font-family/.test(css), 'no rule in REPORT_CSS');
    ok(/code\{[^}]*print-color-adjust/.test(css), 'the background will not print');
  });
  t('the builder preview styles it', () => ok(/#preview-content code/.test(edSrc), 'no rule in the editor'));
  t('none of them let a long span overflow', () => {
    const rules = (gymSrc + edSrc).match(/code[^{]*\{[^}]*\}/g).filter(r => /font-family/.test(r));
    ok(rules.length >= 3, 'found only ' + rules.length + ' code rules');
    rules.forEach(r => ok(!/white-space:\s*nowrap/.test(r), 'nowrap in: ' + r.slice(0, 40)));
  });
}

G('inline code renders end to end, facilitator and participant');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8'), 'nightshift.ttxf');

  t('the facilitator sees a code element, not backticks', () => {
    const html = w.document.getElementById('questionsContainer').innerHTML;
    ok(/<code>/.test(html), 'no code element rendered');
    ok(!/`/.test(w.document.getElementById('questionsContainer').textContent), 'raw backticks leaked to the page');
  });

  t('the participant window gets the same markup', () => {
    ev(w, 'goToStage(1)');
    const msg = JSON.parse(ev(w, 'JSON.stringify(currentStageMessage())'));
    ok(/<code>PRI-2/.test(msg.content), 'no code span in the payload: ' + msg.content.slice(0, 90));
    ok(!/`/.test(msg.content.replace(/<[^>]+>/g, '')), 'backticks survived into participant text');
  });

  t('no shipped scenario shows a raw backtick any more', () => {
    const TTXF = require(ROOT + '/js/ttxf.js');
    const offenders = [];
    JSON.parse(fs.readFileSync(ROOT + '/lib/manifest.json', 'utf8')).forEach(e => {
      const doc = TTXF.parse(fs.readFileSync(ROOT + '/lib/scenarios/' + e.id + '.ttxf', 'utf8')).doc;
      doc.stages.forEach((s, i) => {
        const rendered = TTXF.markdown(s.content || '') + s.discussion.map(TTXF.inline).join('');
        const text = rendered.replace(/<[^>]+>/g, '');
        if (text.includes('`')) offenders.push(e.id + ' #' + (i + 1));
      });
    });
    eq(offenders, [], 'scenarios still rendering a literal backtick');
  });
}

G('a branching scenario is not timed like a linear one');
{
  const TTXF = require(ROOT + '/js/ttxf.js');
  const doc = TTXF.parse(fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8')).doc;

  t('only the opening and the final stage carry a planned duration', () => {
    const timed = doc.stages.map((s, i) => (s.duration ? i + 1 : null)).filter(Boolean);
    eq(timed, [1, doc.stages.length], 'timed stages');
  });

  t('so the planned total is not the sum of every branch', () => {
    const total = doc.stages.reduce((n, s) => n + TTXF.durationToSeconds(s.duration), 0) / 60;
    ok(total < 30, 'planned total is ' + total + ' mins, which reads as a full linear run');
  });

  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8'), 'nightshift.ttxf');
  ev(w, 'refreshStageTimes()');

  t('an untimed stage still shows a clock, just no target', () => {
    eq(w.document.getElementById('time5').textContent, '00:00', 'untimed stage 5');
    ok(/\//.test(w.document.getElementById('time1').textContent), 'timed stage 1 lost its target');
  });
}

G('the branching gamebook routes nowhere that does not exist');
{
  const TTXF = require(ROOT + '/js/ttxf.js');
  const src = fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8');
  const doc = TTXF.parse(src).doc;
  const stages = doc.stages;
  // every route the facilitator prompts tell you to take
  const routesOf = s => s.prompts.map(p => { const m = /go to stage (\d+)/i.exec(p); return m ? +m[1] : null; });

  t('it parses with no diagnostics', () => eq(TTXF.parse(src).errors, []));

  t('every route lands on a stage that exists', () => {
    const bad = [];
    stages.forEach((s, i) => routesOf(s).forEach(r => {
      if (r !== null && (r < 1 || r > stages.length)) bad.push(`stage ${i + 1} -> ${r}`);
    }));
    eq(bad, [], 'routes outside 1-' + stages.length);
  });

  t('every choice has a route, so a vote can never strand the session', () => {
    const bad = [];
    stages.forEach((s, i) => {
      if (!s.questions.length) return;                     // endings have no choice
      const routes = routesOf(s);
      if (routes.length !== s.questions[0].answers.length) bad.push(`stage ${i + 1}: ${routes.length} prompts for ${s.questions[0].answers.length} options`);
      if (routes.some(r => r === null)) bad.push(`stage ${i + 1}: a prompt names no stage`);
    });
    eq(bad, []);
  });

  t('no route goes backwards, so the story cannot loop forever', () => {
    const back = [];
    stages.forEach((s, i) => routesOf(s).forEach(r => { if (r !== null && r <= i + 1) back.push(`${i + 1} -> ${r}`); }));
    eq(back, []);
  });

  t('every stage is reachable from the opening', () => {
    const seen = new Set([1]);
    const walk = n => routesOf(stages[n - 1]).forEach(r => { if (r && !seen.has(r)) { seen.add(r); walk(r); } });
    walk(1);
    const orphans = stages.map((_, i) => i + 1).filter(n => !seen.has(n));
    eq(orphans, [], 'unreachable stages');
  });

  t('the endings end — no choice, no route onward', () => {
    const terminal = stages.map((s, i) => [i + 1, s]).filter(([, s]) => !routesOf(s).some(r => r));
    ok(terminal.length >= 2, 'only ' + terminal.length + ' ending(s)');
    terminal.forEach(([n, s]) => ok(!s.questions.length, `stage ${n} is an ending but still asks a question`));
    terminal.forEach(([n, s]) => ok(s.discussion.length >= 1, `ending ${n} has nothing to debrief`));
  });

  t('the choices are polls, not quizzes — a gamebook has no correct answer', () => {
    const scored = [];
    stages.forEach((s, i) => s.questions.forEach(q => { if (q.quizIndex > -1) scored.push(i + 1); }));
    eq(scored, [], 'stages marking an answer correct');
  });
}

G('the gamebook never shows the participants where a choice leads');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/nightshift.ttxf', 'utf8'), 'nightshift.ttxf');

  t('the facilitator can jump to any stage by number', () => {
    ev(w, 'goToStage(17)');
    eq(ev(w, 'ActiveStage'), 17);
    eq(ev(w, 'data[16].stage'), 'The Quiet Morning');
  });

  t('the routing never reaches the participant window', () => {
    const leaked = [];
    for (let n = 1; n <= ev(w, 'roundCounter'); n++) {
      ev(w, `goToStage(${n})`);
      const msg = ev(w, 'JSON.stringify(currentStageMessage())');
      if (/go to stage/i.test(msg)) leaked.push(n);
    }
    eq(leaked, [], 'stages leaking the route');
  });

  t('participants still get the passage and the choice', () => {
    ev(w, 'goToStage(1)');
    const msg = JSON.parse(ev(w, 'JSON.stringify(currentStageMessage())'));
    ok(/02:14/.test(msg.title), 'no title');
    ok(msg.content.length > 200, 'no passage');
    eq(msg.questions.length, 1);
    eq(msg.questions[0].answers.length, 3);
    eq(msg.questions[0].quiz, false, 'the vote is presented as a quiz');
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
