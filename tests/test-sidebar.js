/* The sidebar's grouping and its resting state. It had grown to fifteen flat items
   across three sections that did not match how any of them are used. */
const fs = require('fs');
const { boot, loadScenario, ev, ROOT } = require('./harness.js');
let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''}\n         expected ${JSON.stringify(b)}\n         got      ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };

const shown = (w, sel) => [...w.document.querySelectorAll(sel)]
  .filter(el => !el.classList.contains('hide') && !el.closest('.menu-section.hide'))
  .filter(el => !(el.closest('#more-items') && !w.document.getElementById('section-more').classList.contains('open')));

const links = (w) => shown(w, '#sidebar-scroll .link').map(el => el.textContent.trim().replace(/\s+/g, ' '));
const headings = (w) => shown(w, '#sidebar-scroll .menu-heading').map(el => el.textContent.trim());

(async () => {

G('at rest, before anything is loaded');
{
  const { w } = boot();
  t('offers only the two ways in', () => eq(links(w), ['Load Scenario', 'Open Session']));
  t('and does not show controls for a scenario that is not there', () => {
    ['Export Report', 'Save Session', 'Blank Screen', 'Reset Scenario'].forEach(label =>
      ok(!links(w).includes(label), label + ' is offered with nothing loaded'));
  });
  t('"More" starts collapsed', () =>
    ok(!w.document.getElementById('section-more').classList.contains('open')));
}

G('with a scenario loaded');
{
  const { w } = boot();
  await loadScenario(w, fs.readFileSync(ROOT + '/lib/scenarios/byod1.ttxf', 'utf8'), 'byod1.ttxf');

  t('groups follow the shape of a session, with the readout last', () =>
    eq(headings(w), ['Scenario', 'Present', 'Wrap Up', 'More', 'Timing']));

  t('each control sits in the group where it is needed', () => {
    const inSection = id => [...w.document.querySelectorAll(`#${id} .link`)]
      .map(el => el.textContent.trim().replace(/\s+/g, ' '));
    // Pause is something you do to the room, so it lives with the other things
    // you do to the room — not with the clock, which you only ever read.
    eq(inSection('section-present').slice(0, 3), ['Participant Window', 'Blank Screen', 'Send Inject']);
    ok(w.document.querySelector('#section-present #timer'), 'the pause control is not in Present');
    eq(inSection('section-wrapup'), ['Present Summary', 'Export Report', 'Save Session', 'Compare With Previous Run']);
    eq(inSection('more-items'), ['Light Theme', 'Facilitator Pack', 'Toggle Fullscreen',
                                 'Download Scenario File', 'Clear All Answers', 'Reset Scenario']);
  });

  t('the visible list stays short', () => {
    const n = links(w).length;
    ok(n <= 11, `${n} controls on show: ${links(w).join(', ')}`);
  });

  t('destructive controls are behind the disclosure, not next to Save Session', () => {
    ['Reset Scenario', 'Clear All Answers'].forEach(label => {
      ok(!links(w).includes(label), label + ' is on show by default');
      const el = [...w.document.querySelectorAll('#more-items .link')].find(e => e.textContent.includes(label));
      ok(el, label + ' is missing from More');
      ok(el.classList.contains('destructive'), label + ' is not marked destructive');
    });
  });

  t('"More" opens and closes', () => {
    const section = w.document.getElementById('section-more');
    const btn = w.document.getElementById('more-toggle');
    w.toggleMoreMenu();
    ok(section.classList.contains('open'));
    eq(btn.getAttribute('aria-expanded'), 'true');
    ok(links(w).includes('Reset Scenario'));
    w.toggleMoreMenu();
    ok(!section.classList.contains('open'));
    eq(btn.getAttribute('aria-expanded'), 'false');
  });

  t('the timing readout sits at the foot of the sidebar', () => {
    const sections = [...w.document.querySelectorAll('#sidebar-scroll .menu-section')];
    eq(sections[sections.length - 1].id, 'section-timing');
    const section = w.document.getElementById('section-timing');
    ok(!section.classList.contains('hide'), 'timing section hidden');
    eq(section.querySelectorAll('#times .data-row').length, ev(w, 'roundCounter'));
    ok(section.querySelector('#time-total'), 'no total row');
  });

  t('the readout contains nothing clickable', () => {
    const section = w.document.getElementById('section-timing');
    eq(section.querySelectorAll('.link, button, [role="button"]').length, 0);
  });

  t('the running stage is marked in the readout', () => {
    w.goToStage(2);
    const live = [...w.document.querySelectorAll('#times .data-row.live')];
    eq(live.length, 1);
    eq(live[0].dataset.stage, '2');
    w.goToStage(0);
    eq(w.document.querySelectorAll('#times .data-row.live').length, 0,
       'a stage is still marked live on the intro screen');
  });

  t('nothing is left orphaned outside a section', () => {
    const loose = [...w.document.querySelectorAll('#sidebar-scroll .link')]
      .filter(el => !el.closest('.menu-section'));
    eq(loose.map(e => e.textContent.trim()), []);
  });

  t('every control still does something', () => {
    [...w.document.querySelectorAll('#sidebar-scroll .link')].forEach(el => {
      ok(el.getAttribute('onclick') || el.onclick, `"${el.textContent.trim()}" has no action`);
    });
  });

  t('every control is reachable by keyboard', () => {
    [...w.document.querySelectorAll('#sidebar-scroll .link')].forEach(el => {
      eq(el.getAttribute('tabindex'), '0', `"${el.textContent.trim()}" is not focusable`);
      eq(el.getAttribute('role'), 'button', `"${el.textContent.trim()}" has no button role`);
    });
  });

  t('ids are unique across the sidebar', () => {
    const nav = w.document.getElementById('sidebar-scroll');
    const ids = [...nav.querySelectorAll('[id]')].map(e => e.id);
    eq(ids.filter((v, i) => ids.indexOf(v) !== i), []);
  });
}

G('the sidebar markup is well formed');
{
  // Regrouping means moving blocks of markup, which is exactly how a container
  // ends up closed early and half the sections escape it.
  const html = fs.readFileSync(ROOT + '/gym/index.html', 'utf8');
  const nav = html.slice(html.indexOf('<nav id="controller"'), html.indexOf('</nav>') + 6);
  t('every div in the sidebar is closed exactly once', () => {
    const opens = (nav.match(/<(div|nav)\b/g) || []).length;
    const closes = (nav.match(/<\/(div|nav)>/g) || []).length;
    eq(opens, closes, `${opens} opened, ${closes} closed`);
  });
  const { w } = boot();
  t('all five sections are inside the scrolling column', () => {
    const kids = [...w.document.getElementById('sidebar-scroll').children].map(e => e.id || e.className);
    eq(kids, ['logo-area', 'menu-section', 'section-present', 'section-wrapup', 'section-more', 'section-timing']);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
