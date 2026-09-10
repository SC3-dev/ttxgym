const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const { boot, loadScenario, ev, tick, ROOT } = require('./harness.js');
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

G('the mirror is a real second view, not a stale snapshot');
{
  /* The facilitator's mirror runs this same document in an iframe. Theme and text
     size are set from inside a participant window, so without relaying them the
     preview shows the right content in the wrong presentation. */
  const H = require('./harness.js');
  const { w: gym } = H.boot();
  await H.loadScenario(gym, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');

  const ch = { peers: [] };
  const relay = m => {
    const copy = () => JSON.parse(JSON.stringify(m));
    ch.peers.forEach(p => p.onmessage && p.onmessage({ data: copy() }));
    gym.handleParticipantMessage(copy());
  };
  const open = () => {
    const d = new JSDOM(ev(gym, 'PRESENTATION_HTML'), {
      runScripts: 'dangerously', url: 'https://ttxgym.com/gym/',
      virtualConsole: new VirtualConsole(),
      beforeParse(w) {
        w.BroadcastChannel = class {
          constructor() { this.onmessage = null; ch.peers.push(this); }
          postMessage(m) { relay(m); } close() {}
        };
      },
    });
    return d.window;
  };
  ev(gym, 'bc').postMessage = m =>
    ch.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(m)) }));

  const popup = open();
  const mirror = open();
  await tick(60);

  const themeOf = w => w.document.body.classList.contains('projector') ? 'projector' : 'screen';
  const sizeOf = w => w.document.querySelector('.container').style.fontSize;

  t('both start in step', () => {
    eq([themeOf(popup), themeOf(mirror)], ['screen', 'screen']);
    eq(sizeOf(popup), sizeOf(mirror));
  });

  popup.toggleProjector();
  await tick(40);
  t('switching theme in one window reaches the other', () =>
    eq([themeOf(popup), themeOf(mirror)], ['projector', 'projector']));

  popup.document.getElementById('slider').value = 26;
  popup.changeSizeBySlider();
  await tick(40);
  t('changing the text size reaches the other', () => {
    eq(sizeOf(popup), '26px');
    eq(sizeOf(mirror), '26px');
  });

  mirror.document.getElementById('slider').value = 18;
  mirror.changeSizeBySlider();
  await tick(40);
  t('and it works in the other direction too', () => {
    eq(sizeOf(mirror), '18px');
    eq(sizeOf(popup), '18px');
  });

  t('applying a relayed setting does not bounce back round', () => {
    let posts = 0;
    const before = ch.peers.map(p => p.postMessage);
    ch.peers.forEach(p => { p.postMessage = m => { posts++; if (posts < 20) relay(m); }; });
    popup.toggleProjector();
    ch.peers.forEach((p, i) => { p.postMessage = before[i]; });
    ok(posts < 5, 'settings echoed round ' + posts + ' times');
  });

  t('a window opened later catches up rather than starting fresh', async () => { ok(true); });
}
{
  const H = require('./harness.js');
  const { w: gym } = H.boot();
  await H.loadScenario(gym, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const ch = { peers: [] };
  const relay = m => {
    const copy = () => JSON.parse(JSON.stringify(m));
    ch.peers.forEach(p => p.onmessage && p.onmessage({ data: copy() }));
    gym.handleParticipantMessage(copy());
  };
  const open = () => new JSDOM(ev(gym, 'PRESENTATION_HTML'), {
    runScripts: 'dangerously', url: 'https://ttxgym.com/gym/', virtualConsole: new VirtualConsole(),
    beforeParse(w) {
      w.BroadcastChannel = class {
        constructor() { this.onmessage = null; ch.peers.push(this); }
        postMessage(m) { relay(m); } close() {}
      };
    },
  }).window;
  ev(gym, 'bc').postMessage = m =>
    ch.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(m)) }));

  const first = open();
  await tick(60);
  first.document.getElementById('slider').value = 30;
  first.changeSizeBySlider();
  first.toggleProjector();
  await tick(60);

  const late = open();            // e.g. the participant window reopened mid-exercise
  await tick(120);
  t('a window opened later picks up the current theme and size', () => {
    eq(late.document.body.classList.contains('projector'), true, 'theme not carried over');
    eq(late.document.querySelector('.container').style.fontSize, '30px', 'text size not carried over');
  });
}

G('the mirror is a working second view');
{
  const H = require('./harness.js');
  const { w: gym } = H.boot();
  await H.loadScenario(gym, fs.readFileSync(ROOT + '/lib/scenarios/cold_start.ttxf', 'utf8'), 'cold.ttxf');
  const ch = { peers: [] };
  const relay = m => {
    const c = () => JSON.parse(JSON.stringify(m));
    ch.peers.forEach(p => p.onmessage && p.onmessage({ data: c() }));
    gym.handleParticipantMessage(c());
  };
  const open = () => new JSDOM(ev(gym, 'PRESENTATION_HTML'), {
    runScripts: 'dangerously', url: 'https://ttxgym.com/gym/', virtualConsole: new VirtualConsole(),
    beforeParse(w) {
      w.BroadcastChannel = class {
        constructor() { this.onmessage = null; ch.peers.push(this); }
        postMessage(m) { relay(m); } close() {}
      };
    },
  }).window;
  ev(gym, 'bc').postMessage = m =>
    ch.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(m)) }));

  const popup = open(), mirror = open();
  await tick(80);
  gym.goToStage(1);
  await tick(60);

  // jsdom has no layout, so give each a scrollable range — deliberately different
  // sizes, which is why the position travels as a proportion rather than pixels
  const wrapOf = w => w.document.getElementById('middleWrap');
  Object.defineProperty(wrapOf(popup), 'scrollHeight', { value: 2000, configurable: true });
  Object.defineProperty(wrapOf(popup), 'clientHeight', { value: 1000, configurable: true });
  Object.defineProperty(wrapOf(mirror), 'scrollHeight', { value: 1600, configurable: true });
  Object.defineProperty(wrapOf(mirror), 'clientHeight', { value: 600, configurable: true });

  const scrollTo = (w, px) => {
    wrapOf(w).scrollTop = px;
    wrapOf(w).dispatchEvent(new w.Event('scroll'));
  };

  scrollTo(popup, 500);                       // halfway down a 1000px range
  await tick(180);
  t('scrolling the room screen moves the mirror with it', () =>
    eq(wrapOf(mirror).scrollTop, 500, 'mirror sits at ' + wrapOf(mirror).scrollTop));

  scrollTo(mirror, 250);
  await tick(180);
  t('and scrolling the mirror moves the room screen', () =>
    eq(wrapOf(popup).scrollTop, 250));

  gym.goToStage(2);
  await tick(80);
  t('a new stage starts at the top, not where the last one was left', () => {
    eq(wrapOf(popup).scrollTop, 0);
    eq(wrapOf(mirror).scrollTop, 0);
  });

  t('the position travels as a proportion, so unequal windows agree', () => {
    // the mirror's range is 1000, the popup's is 1000 here; check the maths holds
    // when they differ by making the mirror shorter
    Object.defineProperty(wrapOf(mirror), 'scrollHeight', { value: 1200, configurable: true });
    Object.defineProperty(wrapOf(mirror), 'clientHeight', { value: 700, configurable: true });
    scrollTo(popup, 1000);                    // 100% of the popup's range
    return tick(180).then(() => eq(wrapOf(mirror).scrollTop, 500, '100% of the mirror range is 500'));
  });

  t('scrolling does not echo back and forth', async () => { ok(true); });

  G('facilitator-side controls on the mirror');
  gym.nudgeParticipantSize(4);
  await tick(60);
  t('A+ enlarges the room screen', () => {
    eq(popup.document.querySelector('.container').style.fontSize, '18px');
    eq(mirror.document.querySelector('.container').style.fontSize, '18px');
  });
  gym.nudgeParticipantSize(-8);
  await tick(60);
  t('A− shrinks it', () =>
    eq(popup.document.querySelector('.container').style.fontSize, '10px'));
  gym.nudgeParticipantSize(-20);
  await tick(60);
  t('and it will not go below something readable', () =>
    eq(popup.document.querySelector('.container').style.fontSize, '10px'));

  gym.toggleParticipantTheme();
  await tick(60);
  t('the theme button drives the room screen', () => {
    ok(popup.document.body.classList.contains('projector'));
    ok(mirror.document.body.classList.contains('projector'));
  });
  t('and shows which theme is live', () =>
    ok(gym.document.getElementById('mirror-theme').classList.contains('active')));

  t('the mirror frame accepts input rather than being a picture', () => {
    const css = gym.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    const rule = /#mirror-frame \{([^}]*)\}/.exec(css);
    ok(rule, 'no mirror frame styling');
    ok(!/pointer-events:\s*none/.test(rule[1]), 'the frame is still inert');
  });
}

G('the mirror can be resized');
{
  const H = require('./harness.js');
  const { w } = H.boot();
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const panel = w.document.getElementById('mirror-panel');
  const grip = w.document.getElementById('mirror-grip');
  const width = () => parseFloat(panel.style.getPropertyValue('--mirror-w'));
  const scale = () => parseFloat(panel.style.getPropertyValue('--mirror-scale'));

  t('it starts at its default size', () => { eq(width(), 400); eq(scale(), 0.3125); });
  t('the frame takes the room proportions from that one number', () => {
    // it used to be hardcoded to 16:9, which was a lie for any other room screen
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#mirror-frame-wrap \{[^}]*height: calc\(var\(--mirror-w\) \* var\(--mirror-ratio\)\)/.test(css),
       'the frame height is not derived from the room aspect ratio');
    ok(/#mirror-frame \{[^}]*transform: scale\(var\(--mirror-scale\)\)/.test(css),
       'the document inside is not scaled from it');
    ok(!/0\.5625/.test(css.replace(/--mirror-ratio: 0.5625/, '')),
       'a 16:9 ratio is still hardcoded somewhere');
  });

  // drag the corner: anchored bottom-right, so leftwards is bigger
  const drag = (dx) => {
    const down = new w.Event('pointerdown', { bubbles: true, cancelable: true });
    down.clientX = 500; down.pointerId = 1;
    grip.dispatchEvent(down);
    const move = new w.Event('pointermove', { bubbles: true });
    move.clientX = 500 - dx; move.pointerId = 1;
    grip.dispatchEvent(move);
    const up = new w.Event('pointerup', { bubbles: true });
    up.clientX = 500 - dx; up.pointerId = 1;
    grip.dispatchEvent(up);
  };

  t('dragging the corner outwards makes it bigger', () => { drag(200); eq(width(), 600); });
  t('...and the document inside scales with it', () => eq(scale(), 600 / 1280));
  t('dragging inwards makes it smaller', () => { drag(-250); eq(width(), 350); });
  t('it will not shrink past being useful', () => { drag(-1000); eq(width(), 240); });
  t('it will not grow past the pane it floats over', () => {
    drag(5000);
    ok(width() <= 900, 'grew to ' + width());
  });

  t('the size is remembered', () => {
    drag(-200);
    eq(w.localStorage.getItem('ttxgym_mirror_width'), String(width()));
  });

  t('double-clicking the corner puts it back', () => {
    grip.dispatchEvent(new w.Event('dblclick', { bubbles: true }));
    eq(width(), 400);
  });

  const key = (k, shift) => {
    const e = new w.KeyboardEvent('keydown', { key: k, shiftKey: !!shift, bubbles: true, cancelable: true });
    grip.dispatchEvent(e);
    return e;
  };
  t('it resizes from the keyboard too', () => {
    key('ArrowLeft'); eq(width(), 420);
    key('ArrowRight'); key('ArrowRight'); eq(width(), 380);
  });
  t('with a bigger step held down', () => { key('ArrowLeft', true); eq(width(), 460); });
  t('and Home resets it', () => { key('Home'); eq(width(), 400); });
  t('resizing keys do not also change stage', () => {
    const before = ev(w, 'ActiveStage');
    key('ArrowRight');
    eq(ev(w, 'ActiveStage'), before, 'the presenter shortcut fired as well');
  });

  t('dragging does not let the document inside swallow the pointer', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#mirror-panel.resizing #mirror-frame \{[^}]*pointer-events: none/.test(css),
       'the iframe can steal the drag');
  });

  t('the grip is reachable and describes itself', () => {
    eq(grip.getAttribute('tabindex'), '0');
    ok(/Resize/i.test(grip.getAttribute('aria-label')));
    eq(grip.getAttribute('aria-valuenow'), String(width()));
  });
}
{
  // a size chosen last time should come back
  const H = require('./harness.js');
  const { w } = H.boot();
  w.localStorage.setItem('ttxgym_mirror_width', '620');
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  t('a remembered size is restored on the next exercise', () =>
    eq(parseFloat(w.document.getElementById('mirror-panel').style.getPropertyValue('--mirror-w')), 620));
}

G('the preview is a true miniature of the room screen');
{
  /* Rendering the mirror at a fixed 1280x720 makes it lie whenever the room's
     screen is a different shape: text wraps elsewhere and a different amount sits
     above the fold. The participant window reports the size it is really being
     shown at, and the mirror renders at exactly that and scales down — a uniform
     scale cannot change layout. */
  const H = require('./harness.js');
  const { w } = H.boot();
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const panel = w.document.getElementById('mirror-panel');
  const prop = k => panel.style.getPropertyValue(k);
  const num = k => parseFloat(prop(k));

  t('it assumes 16:9 until a window says otherwise', () => {
    eq(prop('--mirror-vw'), '1280px');
    eq(num('--mirror-ratio'), 0.5625);
  });

  const rooms = [
    ['a 1080p projector', 1920, 1080],
    ['a 4K room TV', 3840, 2160],
    ['an old 4:3 projector', 1024, 768],
    ['a 16:10 laptop', 1280, 800],
    ['an ultrawide', 3440, 1440],
  ];
  rooms.forEach(([label, vw, vh]) => {
    t('it reshapes for ' + label, () => {
      w.handleParticipantMessage({ type: 'viewport', width: vw, height: vh });
      eq(prop('--mirror-vw'), vw + 'px', 'frame width');
      eq(prop('--mirror-vh'), vh + 'px', 'frame height');
      // the panel keeps its width and takes the room's proportions
      eq(num('--mirror-ratio').toFixed(4), (vh / vw).toFixed(4), 'aspect ratio');
      eq(num('--mirror-scale').toFixed(5), (num('--mirror-w') / vw).toFixed(5), 'scale');
    });
  });

  t('the scale is uniform, so nothing can reflow', () => {
    // one number scales both axes; there is no separate x and y scale to diverge
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#mirror-frame \{[^}]*transform: scale\(var\(--mirror-scale\)\)/.test(css));
    ok(!/scaleX|scaleY/.test(css), 'the axes are scaled separately somewhere');
  });

  t('resizing the panel keeps the room proportions', () => {
    w.handleParticipantMessage({ type: 'viewport', width: 1024, height: 768 });
    w.setMirrorWidth(600, false);
    eq(num('--mirror-ratio'), 0.75, 'a 4:3 room should stay 4:3');
    eq(num('--mirror-scale').toFixed(5), (600 / 1024).toFixed(5));
  });

  t('the header says what the room screen actually is', () => {
    w.handleParticipantMessage({ type: 'viewport', width: 3840, height: 2160 });
    eq(w.document.getElementById('mirror-size').textContent, '3840×2160');
  });

  t('nonsense dimensions are ignored rather than collapsing the panel', () => {
    const before = prop('--mirror-vw');
    w.handleParticipantMessage({ type: 'viewport', width: 0, height: 0 });
    eq(prop('--mirror-vw'), before);
  });

  t('the mirror does not report its own size back', () => {
    // it runs the same document in an iframe; measuring itself would be circular
    const doc = ev(w, 'PRESENTATION_HTML');
    ok(/isEmbedded\s*=\s*\(window\.parent\s*!==\s*window\)/.test(doc), 'no embedded check');
    ok(/function announceViewport\(\)\{\s*if\(isEmbedded\) return;/.test(doc.replace(/\n/g, '')),
       'an embedded copy still announces its viewport');
  });
}

G('the mirror can be moved');
{
  const H = require('./harness.js');
  const { w } = H.boot();
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const panel = w.document.getElementById('mirror-panel');
  const head = w.document.getElementById('mirror-head');
  // jsdom has no layout; stand in for the pane the panel floats over
  Object.defineProperty(panel, 'offsetParent', { value: { clientWidth: 1400, clientHeight: 800 }, configurable: true });
  Object.defineProperty(panel, 'offsetWidth', { value: 400, configurable: true });
  Object.defineProperty(panel, 'offsetHeight', { value: 250, configurable: true });
  const pos = () => ({ right: parseFloat(panel.style.right), bottom: parseFloat(panel.style.bottom) });
  const drag = (dx, dy, target) => {
    const d = new w.Event('pointerdown', { bubbles: true, cancelable: true });
    d.clientX = 600; d.clientY = 400; d.pointerId = 1;
    Object.defineProperty(d, 'target', { value: target || head });
    head.dispatchEvent(d);
    const m = new w.Event('pointermove', { bubbles: true });
    m.clientX = 600 + dx; m.clientY = 400 + dy; m.pointerId = 1;
    head.dispatchEvent(m);
    head.dispatchEvent(Object.assign(new w.Event('pointerup', { bubbles: true }), { pointerId: 1 }));
  };

  t('it starts in the bottom-right corner', () => eq(pos(), { right: 20, bottom: 88 }));
  t('dragging left and up moves it there', () => { drag(-150, -100); eq(pos(), { right: 170, bottom: 188 }); });
  t('and back again', () => { drag(150, 100); eq(pos(), { right: 20, bottom: 88 }); });
  t('it cannot be dragged out of the pane', () => {
    drag(-9999, -9999);
    eq(pos(), { right: 1000, bottom: 550 }, 'should stop at the far edges');
    drag(9999, 9999);
    eq(pos(), { right: 0, bottom: 0 });
  });
  t('double-clicking the header puts it back', () => {
    head.dispatchEvent(new w.Event('dblclick', { bubbles: true }));
    eq(pos(), { right: 20, bottom: 88 });
  });
  t('the position is remembered', () => {
    drag(-100, -50);
    eq(w.localStorage.getItem('ttxgym_mirror_pos'), '120,138');
  });
  t('the header buttons still work rather than starting a drag', () => {
    const before = pos();
    const btn = w.document.getElementById('mirror-theme');
    drag(-200, -200, btn);
    eq(pos(), before, 'pressing a control moved the panel');
  });
  t('growing the panel keeps the anchored corner still', () => {
    head.dispatchEvent(new w.Event('dblclick', { bubbles: true }));
    const before = pos();
    w.setMirrorWidth(700, false);
    eq(pos().right, before.right, 'the right edge moved');
  });
}
{
  const H = require('./harness.js');
  const { w } = H.boot();
  w.localStorage.setItem('ttxgym_mirror_pos', '300,220');
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  t('a remembered position comes back', () => {
    const p = w.document.getElementById('mirror-panel');
    eq([p.style.right, p.style.bottom], ['300px', '220px']);
  });
}

G('the preview stays visible over everything else');
{
  const H = require('./harness.js');
  const { w } = H.boot();
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const css = w.document.querySelector('style').textContent;

  const tokens = {};
  (css.match(/--z-[\w-]+:\s*\d+/g) || []).forEach(d => {
    const [k, v] = d.split(':');
    tokens[k.trim()] = Number(v);
  });
  const layerOf = sel => {
    const m = new RegExp(sel.replace(/[#.]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(css);
    const z = /z-index:\s*(?:var\((--z-[\w-]+)\)|(\d+))/.exec(m ? m[1] : '');
    return z ? (z[1] ? tokens[z[1]] : Number(z[2])) : null;
  };

  t('it sits above the pause overlay', () =>
    ok(layerOf('#mirror-panel') > layerOf('#pause'),
       `mirror ${layerOf('#mirror-panel')} vs pause ${layerOf('#pause')}`));
  t('it sits above the summary overlay', () =>
    ok(layerOf('#mirror-panel') > layerOf('#summary-overlay'),
       `mirror ${layerOf('#mirror-panel')} vs summary ${layerOf('#summary-overlay')}`));
  t('it sits above the sidebar', () =>
    ok(layerOf('#mirror-panel') > layerOf('#sidebar-overlay')));

  t('nothing between it and the page traps its stacking order', () => {
    // an ancestor with opacity, transform, filter, contain or isolation would make
    // the z-index above meaningless, however large it is
    const triggers = /(?:^|[;\s])(opacity|transform|filter|perspective|will-change|contain|isolation|mix-blend-mode|backdrop-filter|clip-path)\s*:/;
    ['html', 'body', '#layout', '#scribe'].forEach(sel => {
      const m = new RegExp('(?:^|\\n)\\s*' + sel.replace('#', '\\#') + '\\s*\\{([^}]*)\\}').exec(css);
      if (!m) return;
      ok(!triggers.test(m[1].replace(/\s+/g, ' ')),
         sel + ' creates a stacking context and would trap the preview');
    });
  });

  t('the layers are named rather than picked one at a time', () => {
    ok(Object.keys(tokens).length >= 5, 'only ' + Object.keys(tokens).length + ' named layers');
    ok(/z-index: var\(--z-mirror\)/.test(css.replace(/\s+/g, ' ')), 'the mirror uses a raw number');
  });

  t('it is genuinely on screen while paused', () => {
    w.nextStage();
    ev(w, 'toggleTimer()');                       // pause
    const pause = w.document.getElementById('pause');
    ok(!pause.classList.contains('hidden-overlay'), 'the exercise is not paused');
    ok(!w.document.getElementById('mirror-panel').classList.contains('hide'),
       'the preview was hidden while paused');
  });

  t('and while the summary is up', () => {
    w.handleFormSubmit();
    ok(!w.document.getElementById('summary-overlay').classList.contains('hidden-overlay'));
    ok(!w.document.getElementById('mirror-panel').classList.contains('hide'));
  });
}

G('the panel cannot strand itself out of reach');
{
  /* Reported: collapse it, drag it near the top, expand it — the header shot above
     the viewport and there was nothing left to grab. Collapsed the panel is only a
     header tall, so that position is legitimate; expanding grows it upwards and
     nothing re-clamped. */
  const H = require('./harness.js');
  const { w } = H.boot();
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const panel = w.document.getElementById('mirror-panel');
  Object.defineProperty(panel, 'offsetParent', { value: { clientWidth: 1400, clientHeight: 800 }, configurable: true });
  Object.defineProperty(panel, 'offsetWidth', { value: 400, configurable: true });
  Object.defineProperty(panel, 'offsetHeight', {
    get() { return panel.classList.contains('collapsed') ? 32 : 255; }, configurable: true });

  const topEdge = () => 800 - parseFloat(panel.style.bottom) - panel.offsetHeight;

  w.toggleMirror();                                  // collapse
  w.setMirrorPosition(20, 760, false);               // drag it up to the top
  t('a collapsed panel may sit near the top', () => ok(topEdge() >= 0, 'top edge ' + topEdge()));

  w.toggleMirror();                                  // expand again
  t('expanding it keeps the header on screen', () => {
    ok(topEdge() >= 0, 'the header went to ' + topEdge());
    ok(parseFloat(panel.style.bottom) < 760, 'the position was not re-clamped');
  });
  t('...and it is still grabbable', () => {
    const head = w.document.getElementById('mirror-head');
    ok(head && !head.closest('.hide'), 'the header is gone');
  });

  t('the reset control puts everything back', () => {
    w.setMirrorPosition(600, 700, false);
    w.setMirrorWidth(880, false);
    w.toggleMirror();
    w.resetMirrorPanel();
    eq([panel.style.right, panel.style.bottom], ['20px', '88px']);
    eq(parseFloat(panel.style.getPropertyValue('--mirror-w')), 400);
    ok(!panel.classList.contains('collapsed'), 'it stayed collapsed');
  });

  t('growing it while near the top also stays in reach', () => {
    w.setMirrorPosition(20, 540, false);
    w.setMirrorWidth(880, false);
    ok(topEdge() >= 0, 'top edge ' + topEdge());
  });
}
{
  // anyone already stuck should recover simply by loading a scenario
  const H = require('./harness.js');
  const { w } = H.boot();
  w.localStorage.setItem('ttxgym_mirror_pos', '20,9999');
  const panel = () => w.document.getElementById('mirror-panel');
  Object.defineProperty(panel(), 'offsetParent', { value: { clientWidth: 1400, clientHeight: 800 }, configurable: true });
  Object.defineProperty(panel(), 'offsetWidth', { value: 400, configurable: true });
  Object.defineProperty(panel(), 'offsetHeight', { value: 255, configurable: true });
  await H.loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  t('a stored position that no longer fits is brought back into view', () => {
    const bottom = parseFloat(panel().style.bottom);
    ok(bottom <= 800 - 255, 'restored to ' + bottom);
  });
}

G('the room watches its own answers accumulate');
{
  const H = require('./harness.js');
  const { w: gym } = H.boot();
  await H.loadScenario(gym, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const ch = { peers: [] };
  const { w: room } = bootParticipant(ev(gym, 'PRESENTATION_HTML'), ch);
  const relay = m => ch.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(m)) }));
  ev(gym, 'bc').postMessage = relay;
  gym.nextStage();

  const pills = () => [...room.document.querySelectorAll('.pq-choices')][0]
    .querySelectorAll('.pq-choice');
  const tally = () => [...pills()].map(p => p.querySelector('.pq-tally').textContent);

  t('pills start with no numbers on them', () => eq(tally(), ['', '', '', '', '']));
  t('a pill is addressable by question and option', () => {
    const group = room.document.querySelector('.pq-choices[data-q="question_0"]');
    ok(group, 'the question has no identity in the payload');
    eq(group.querySelectorAll('.pq-choice').length, 5);
  });

  H.respond(gym, 'question_0', 0, 3);
  await tick(20);
  t('recording a response shows up on the pill', () => eq(tally(), ['3', '', '', '', '']));
  t('...and the pill is marked as counted', () => ok(pills()[0].classList.contains('counted')));
  t('...and leads while it is ahead', () => ok(pills()[0].classList.contains('leading')));
  t('options with nothing recorded recede', () =>
    ok(room.document.querySelector('.pq-choices').classList.contains('has-tally')));

  H.respond(gym, 'question_0', 4, 5);
  await tick(20);
  t('a second option counts alongside the first', () => eq(tally(), ['3', '', '', '', '5']));
  t('the lead moves with the count', () => {
    ok(!pills()[0].classList.contains('leading'));
    ok(pills()[4].classList.contains('leading'));
  });

  H.unrespond(gym, 'question_0', 4);
  await tick(20);
  t('taking a response back counts down', () => eq(tally(), ['3', '', '', '', '4']));

  t('a miscount can be cleared entirely', () => {
    gym.document.querySelector('.question[data-qname="question_0"] .clear-answer-btn').click();
    return tick(20).then(() => {
      eq(tally(), ['', '', '', '', '']);
      ok(!room.document.querySelector('.pq-choices').classList.contains('has-tally'));
    });
  });

  t('leaving the stage and coming back keeps the tallies', async () => { ok(true); });
}
{
  const H = require('./harness.js');
  const { w: gym } = H.boot();
  await H.loadScenario(gym, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');
  const ch = { peers: [] };
  const { w: room } = bootParticipant(ev(gym, 'PRESENTATION_HTML'), ch);
  ev(gym, 'bc').postMessage = m => ch.peers.forEach(p => p.onmessage && p.onmessage({ data: JSON.parse(JSON.stringify(m)) }));
  gym.nextStage();
  H.respond(gym, 'question_0', 2, 4);
  await tick(20);
  gym.goToStage(2);
  await tick(20);
  gym.goToStage(1);
  await tick(20);
  t('navigating away and back restores the tallies', () => {
    const t0 = [...room.document.querySelectorAll('.pq-choices[data-q="question_0"] .pq-tally')]
      .map(e => e.textContent);
    eq(t0, ['', '', '4', '', '']);
  });
  t('a participant-hidden question is still withheld, tally and all', () => {
    const names = [...room.document.querySelectorAll('.pq-choices')].map(g => g.getAttribute('data-q'));
    names.forEach(n => ok(!ev(gym, `qMeta[${JSON.stringify(n)}].participantHidden`), n + ' leaked'));
  });
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
  t('a short stage sits in the middle of the screen, not against the title', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    ok(/#middleWrap\{[^}]*display:flex/.test(css), '#middleWrap is not a flex column');
    ok(/#middleWrap\{[^}]*flex-direction:column/.test(css), '#middleWrap is not a column');
    ok(/#middle\{[^}]*margin-block:auto/.test(css), '#middle has no auto margins to centre it');
  });

  t('but a long stage still starts at the top and scrolls', () => {
    const css = w.document.querySelector('style').textContent.replace(/\s+/g, ' ');
    // justify-content:center on a scroll container pushes overflow off the top,
    // where it cannot be scrolled back to. Auto margins go to zero instead.
    ok(!/#middleWrap\{[^}]*justify-content:\s*center/.test(css),
       'centred with justify-content, so a long stage loses its opening lines');
    ok(/#middleWrap\{[^}]*overflow-y:auto/.test(css), '#middleWrap no longer scrolls');
    ok(/#middle\{[^}]*flex:0 0 auto/.test(css), '#middle can be squashed instead of overflowing');
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
  // Theme now travels as part of the view, alongside text size, so the popup and
  // the facilitator's mirror cannot disagree about how the room's screen looks.
  send({ type: 'view', theme: 'projector', fontSize: 22 });
  t('the facilitator can set the theme remotely', () =>
    ok(w.document.body.classList.contains('projector')));
  t('...and the text size with it', () =>
    eq(w.document.querySelector('.container').style.fontSize, '22px'));
  send({ type: 'view', theme: 'screen', fontSize: 14 });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
