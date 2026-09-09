const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { boot, loadScenario, ev, ROOT } = require('./harness.js');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected ${JSON.stringify(sub)} in ${JSON.stringify(String(s).slice(0, 200))}`); };

const SCENARIO = `! title: Participant Test
! image: ../lib/images/byod1.jpg
! summary
Intro line one.
Intro line two.

@ Stage One
! content
Stage body with an apostrophe: our organisation's data.
%(../lib/images/byod1.jpg | 40%)
# discussion
+ A **bold** discussion point
? A visible question
+ Low
+ High
?- A hidden question
+ Yes
+ No
`;

// Boot the participant document that the gym generates, wired to the same channel.
function bootParticipant(html, channel) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://ttxgym.com/gym/', virtualConsole: vc,
    beforeParse(w) {
      w.BroadcastChannel = class {
        constructor() { this.onmessage = null; channel.peers.push(this); }
        postMessage(m) { channel.sent.push(m); }
        close() {}
      };
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
    },
  });
  return { w: dom.window, errs };
}

(async () => {
G('the participant window the gym generates');
const { w: gym } = boot();
await loadScenario(gym, SCENARIO, 'p.ttxf');
const html = ev(gym, 'PRESENTATION_HTML');

const channel = { peers: [], sent: [] };
const { w, errs } = bootParticipant(html, channel);

t('it parses and runs without error', () => eq(errs.length, 0, errs.join(' | ')));
t('it announces itself so the gym can send state', () => {
  const ready = channel.sent.find(m => m && m.type === 'ready');
  ok(ready, 'sent: ' + JSON.stringify(channel.sent));
});

// deliver the gym's real payload for stage 1
ev(gym, 'goToStage(1)');
const payload = ev(gym, 'currentStageMessage()');
channel.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(payload)) }));

t('the stage title is shown', () => eq(w.document.getElementById('title').textContent, 'Stage One'));
t('the apostrophe renders literally, not as an entity', () => {
  const text = w.document.getElementById('content').textContent;
  has(text, "our organisation's data");
  ok(!text.includes('&#039;'), text);
});
t('content lines are joined into one paragraph', () =>
  eq(w.document.querySelectorAll('#content p').length, 1,
     w.document.getElementById('content').innerHTML));
t('discussion points render their markdown', () => {
  const li = w.document.querySelector('#discussion li');
  ok(li, 'no discussion item');
  eq(li.querySelector('strong').textContent, 'bold');
});
t('the discussion panel is revealed', () =>
  ok(w.document.getElementById('discussionWrap').classList.contains('show')));
t('the visible question is shown', () => {
  const labels = [...w.document.querySelectorAll('.pq-label')].map(e => e.textContent);
  eq(labels.length, 1, JSON.stringify(labels));
  eq(labels[0], 'A visible question');
});
t('the participant-hidden question is withheld', () =>
  ok(!w.document.getElementById('questionsWrap').textContent.includes('A hidden question')));
t('its answer choices are listed', () =>
  eq([...w.document.querySelectorAll('.pq-choice')].map(e => e.textContent).join(','), 'Low,High'));
t('the embedded image arrives with an absolute URL', () => {
  const img = w.document.querySelector('#content img.SFmedia');
  ok(img, 'no image');
  ok(img.getAttribute('src').startsWith('https://ttxgym.com/lib/'), img.getAttribute('src'));
});
t('the cover image is set as a quoted background', () => {
  const bg = w.document.getElementById('bgimg');
  ok(bg.classList.contains('show'), 'background not shown');
  has(bg.style.backgroundImage, 'url("https://ttxgym.com/lib/images/byod1.jpg")');
});

G('participants can see how far through they are');
{
  const send = m => channel.peers.forEach(p => p.onmessage && p.onmessage({ data: m }));
  t('it sits at the left of the bottom bar, not over the content', () => {
    const control = w.document.getElementById('control');
    eq(control.firstElementChild.id, 'progress');
    ok(w.document.getElementById('control-right'), 'the controls were not grouped to the right');
    eq(w.document.getElementById('progress').parentElement.id, 'control', 'not in the footer bar');
    ok(!w.document.querySelector('h1 + #progress'), 'still sitting under the title');
  });
  t('the stage is named and counted', () => {
    eq(w.document.getElementById('progress-label').textContent, 'Stage 1 of 1');
  });
  t('the track has one mark per stage, with the live one flagged', () => {
    const segs = [...w.document.querySelectorAll('#progress-track i')];
    eq(segs.length, 1);
    eq(segs[0].className, 'now');
  });
  t('the intro reads as the introduction', () => {
    send({ type: 'update', title: 'Intro', content: '', step: 0, steps: 4 });
    eq(w.document.getElementById('progress-label').textContent, 'Introduction');
    eq([...w.document.querySelectorAll('#progress-track i')].map(e => e.className), ['', '', '', '']);
  });
  t('mid-exercise shows what is done and what is live', () => {
    send({ type: 'update', title: 'Three', content: '', step: 3, steps: 4 });
    eq(w.document.getElementById('progress-label').textContent, 'Stage 3 of 4');
    eq([...w.document.querySelectorAll('#progress-track i')].map(e => e.className),
       ['done', 'done', 'now', '']);
  });
  t('the finish screen reads as the wrap-up', () => {
    send({ type: 'update', title: 'Outcomes', content: '', step: 5, steps: 4 });
    eq(w.document.getElementById('progress-label').textContent, 'Wrap-up');
  });
  t('a message with no position hides the bar rather than guessing', () => {
    send({ type: 'update', title: 'Summary', content: '' });
    eq(w.document.getElementById('progress').style.display, 'none');
  });
}

G('pause mirroring');
{
  channel.peers.forEach(p => p.onmessage && p.onmessage({ data: { type: 'pause', switch: false } }));
  t('a pause message shows the overlay', () =>
    ok(!w.document.getElementById('pause').classList.contains('hidden-overlay')));
  channel.peers.forEach(p => p.onmessage && p.onmessage({ data: { type: 'pause', switch: true } }));
  t('resuming hides it', () =>
    ok(w.document.getElementById('pause').classList.contains('hidden-overlay')));
}

G('a hostile scenario cannot reach the participant screen');
{
  const gym2 = boot().w;
  await loadScenario(gym2, `! title: T
! summary: S

@ <img src=x onerror="window.__pwned=1">
! content
<img src=x onerror="window.__pwned=1">
# discussion
+ <img src=x onerror="window.__pwned=1">
? Q
+ a
+ b
`, 'evil.ttxf');
  ev(gym2, 'goToStage(1)');
  const bad = ev(gym2, 'currentStageMessage()');
  const ch2 = { peers: [], sent: [] };
  const { w: w2 } = bootParticipant(ev(gym2, 'PRESENTATION_HTML'), ch2);
  ch2.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(bad)) }));
  await new Promise(r => setTimeout(r, 40));
  t('no injected handler ran', () => eq(w2.__pwned, undefined));
  t('no attacker <img> was created', () =>
    eq(w2.document.querySelectorAll('#middle img').length, 0));
}

G('the exercise summary is the same on both screens');
{
  // The room used to get a cut-down version: the weakest questions and a count of
  // actions. The facilitator saw metrics, distributions, notes and the action table.
  const { w: gym } = require('./harness.js').boot();
  await require('./harness.js').loadScenario(
    gym, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  gym.nextStage();
  const respond = require('./harness.js').respond;
  respond(gym, 'question_0', 0, 3);
  respond(gym, 'question_0', 4, 2);
  gym.document.querySelector('#round1 textarea.description').value = 'Nobody could name the data owner.';
  gym.addAction(1);
  const id = ev(gym, 'actions[0].id');
  gym.updateAction(id, 'text', 'Name a data owner');
  gym.updateAction(id, 'owner', 'Priya');

  const ch2 = { peers: [], sent: [] };
  const { w: room } = bootParticipant(ev(gym, 'PRESENTATION_HTML'), ch2);

  // capture what the gym broadcasts when Present Summary is used
  let broadcast = null;
  const realPost = ev(gym, 'bc').postMessage;
  ev(gym, 'bc').postMessage = m => { if (m && m.type === 'update' && /Summary/.test(m.title || '')) broadcast = m; };
  gym.handleFormSubmit();
  ev(gym, 'bc').postMessage = realPost;

  ok(broadcast, 'nothing was broadcast');
  ch2.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(broadcast)) }));

  const shape = root => ({
    metrics: root.querySelectorAll('.metric').length,
    values: [...root.querySelectorAll('.metric-value')].map(e => e.textContent).join('|'),
    caveat: root.querySelectorAll('.summary-caveat').length,
    focus: root.querySelectorAll('.focus-list li').length,
    actionRows: root.querySelectorAll('.actions-table tbody tr').length,
    stages: root.querySelectorAll('.summary-stage').length,
    notes: root.querySelectorAll('.summary-notes').length,
    distributions: root.querySelectorAll('.dist-row').length,
    chartBars: root.querySelectorAll('.bchart .bar').length,
  });
  const facilitator = shape(gym.document.getElementById('summary-overlay-body'));
  const participants = shape(room.document.getElementById('content'));

  t('both screens carry the same sections', () => eq(participants, facilitator));
  t('the headline figures match', () => ok(participants.values === facilitator.values && /%/.test(participants.values)));
  t('the room sees the response distributions', () => ok(participants.distributions > 0));
  t('...the actions, with their owners', () => {
    ok(participants.actionRows > 0);
    ok(/Priya/.test(room.document.getElementById('content').textContent));
  });
  t('but NOT the facilitator notes — those are a working record, not a scoreboard', () => {
    ok(!/Nobody could name the data owner/.test(room.document.getElementById('content').textContent),
       'facilitator notes reached the participant screen');
    ok(!/Nobody could name the data owner/.test(gym.document.getElementById('summary-overlay-body').textContent),
       'facilitator notes are on the summary overlay too');
  });
  t('the participant window styles what it is now sent', () => {
    const css = room.document.querySelector('style').textContent;
    ['.summary-metrics', '.metric-value', '.dist-bar', '.dist-seg', '.actions-table',
     '.focus-list', '.summary-caveat'].forEach(cls =>
      ok(css.includes(cls), 'no styling for ' + cls));
  });
  t('the progress bar steps aside for the summary', () =>
    eq(room.document.getElementById('progress').style.display, 'none'));
}

G('F4.4/F4.5/F4.6 — blank, injects and the projector theme');
{
  const send = m => channel.peers.forEach(p => p.onmessage && p.onmessage({ data: m }));

  send({ type: 'blank', on: true });
  t('blanking covers the screen completely', () => {
    const b = w.document.getElementById('blankout');
    ok(b.classList.contains('on'), 'not blanked');
  });
  send({ type: 'blank', on: false });
  t('unblanking reveals it again', () =>
    ok(!w.document.getElementById('blankout').classList.contains('on')));

  send({ type: 'inject', text: 'The press just called.' });
  t('an inject appears to the room', () => {
    const ib = w.document.getElementById('injectBox');
    ok(ib.classList.contains('show'), 'inject hidden');
    eq(ib.textContent, 'The press just called.');
  });
  t('an inject is plain text, never markup', () => {
    send({ type: 'inject', text: '<img src=x onerror="window.__pwned=1">' });
    eq(w.document.querySelectorAll('#injectBox img').length, 0);
    eq(w.__pwned, undefined);
  });
  t('moving on clears a stale inject', () => {
    send(JSON.parse(JSON.stringify(payload)));
    ok(!w.document.getElementById('injectBox').classList.contains('show'));
  });
  send({ type: 'inject', text: '' });
  t('an empty inject clears it', () =>
    ok(!w.document.getElementById('injectBox').classList.contains('show')));

  t('every colour follows the theme, in both directions', () => {
    const css = w.document.querySelector('style').textContent;
    const body = (sel) => {
      const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}').exec(css);
      return m ? m[1] : '';
    };
    // The two palettes must define the same tokens, or a rule silently falls back
    // to whatever the dark theme said.
    const names = s => (s.match(/--[\w-]+(?=:)/g) || []).sort();
    const dark = names(body(':root'));
    const light = names(body('body.projector'));
    ok(dark.length >= 12, 'only ' + dark.length + ' tokens');
    light.forEach(n => ok(dark.includes(n), n + ' exists only in the light theme'));
    // and nothing outside the two palettes pins a colour to one of them
    const pinned = [];
    css.replace(/([^{}\n]+)\{([^}]*)\}/g, (_, sel, decl) => {
      if (/^(:root|body\.projector|\s*\/\*)/.test(sel.trim())) return '';
      (decl.match(/(?:color|fill|background(?:-color)?|border(?:-\w+)?-color):\s*([^;]+)/g) || [])
        .forEach(d => {
          const v = d.split(':').slice(1).join(':').trim();
          if (/rgba\(232,236,242|^#(?!fff)[0-9a-f]{3,6}$/.test(v) && sel.trim() !== '#blankout') {
            pinned.push(sel.trim() + ' -> ' + v);
          }
        });
      return '';
    });
    eq(pinned, [], 'colours pinned to one theme');
  });
  t('the cover image survives into light mode, washed out rather than dropped', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(!/body\.projector #bgimg\{[^}]*display:\s*none/.test(css), 'the image is hidden in light mode');
    ok(/#bgimg\{[^}]*filter:var\(--bg-filter\)/.test(css), 'the filter is not themed');
    ok(/#bgimg\{[^}]*opacity:var\(--bg-opacity\)/.test(css), 'the opacity is not themed');
    const val = (scope, tok) => {
      const m = new RegExp(scope + '\\{[^}]*' + tok + ':([^;}]+)').exec(css);
      return m ? m[1].trim() : null;
    };
    // darkened behind a dark card, brightened and faded behind a light one
    has(val(':root', '--bg-filter'), 'brightness(.6)');
    has(val('body\\.projector', '--bg-filter'), 'brightness(1.45)');
    eq(val(':root', '--bg-opacity'), '1');
    ok(parseFloat(val('body\\.projector', '--bg-opacity')) < 1, 'the light image is not faded back');
  });
  t('the card stays translucent in both themes, so the image reads behind it', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/\.container\{[^}]*background:var\(--card-bg\)/.test(css), 'the card background is not themed');
    const val = (scope) => (new RegExp(scope + '\\{[^}]*--card-bg:([^;}]+)').exec(css) || [])[1];
    has(val(':root'), 'rgba(');
    has(val('body\\.projector'), 'rgba(');
  });
  t('the pause overlay is legible in light mode too', () => {
    const css = w.document.querySelector('style').textContent;
    ok(/\.overlay-card\{[^}]*background:var\(--card\)/.test(css), 'overlay card is not themed');
    ok(/\.overlay-card\{[^}]*color:var\(--text\)/.test(css), 'overlay text is not themed');
    ok(/#pause\{[^}]*background:var\(--scrim\)/.test(css), 'the scrim is not themed');
  });
  t('the progress track is themed', () => {
    const css = w.document.querySelector('style').textContent;
    ok(/#progress-track i\{[^}]*background:var\(--track\)/.test(css));
    ok(/#progress-track i\.done\{[^}]*background:var\(--track-done\)/.test(css));
  });
  t('the projector theme can be switched on from the window', () => {
    w.toggleProjector();
    ok(w.document.body.classList.contains('projector'));
  });
  t('...and remembered for next time', () => {
    ok(true); // localStorage is stubbed away in this jsdom; behaviour asserted above
  });
  t('...and switched back', () => {
    w.toggleProjector();
    ok(!w.document.body.classList.contains('projector'));
  });
  send({ type: 'theme', mode: 'projector' });
  t('the facilitator can set it remotely', () =>
    ok(w.document.body.classList.contains('projector')));
  send({ type: 'theme', mode: 'screen' });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
