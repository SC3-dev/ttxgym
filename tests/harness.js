const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = require('path').resolve(__dirname, '..');

function boot() {
  const html = fs.readFileSync(path.join(ROOT, 'gym/index.html'), 'utf8');
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const posted = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://ttxgym.com/gym/',
    virtualConsole: vc,
    beforeParse(w) {
      // jsdom does not fetch <script src>, so evaluate the shared module in-window
      w.eval(fs.readFileSync(path.join(ROOT, 'js/ttxf.js'), 'utf8'));
      w.BroadcastChannel = class {
        constructor(name) { this.name = name; this.onmessage = null; }
        postMessage(m) { posted.push(m); }
        close() {}
      };
      const store = {};
      Object.defineProperty(w, 'localStorage', { value: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
        _store: store,
      }, configurable: true });
      w.confirm = () => true;
      w.URL.createObjectURL = () => 'blob:stub';
      w.URL.revokeObjectURL = () => {};
      w.HTMLElement.prototype.scrollTo = function () {};
      w.HTMLAnchorElement.prototype.click = function () { (w.__downloads ||= []).push({ name: this.download, href: this.href }); };
    },
  });
  return { dom, w: dom.window, posted, errors };
}

// Top-level `let`/`const` in a classic script are script-scoped, not window
// properties — reach them through global eval.
const ev = (w, expr) => w.eval(expr);

// Drive the real file-input path, exactly as a user would.
function loadScenario(w, text, name) {
  const input = w.document.getElementById('fileInput');
  const file = new w.File([text], name || 'test.ttxf', { type: 'text/plain' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new w.Event('change'));
  return new Promise(r => setTimeout(r, 80)); // FileReader + the 50ms restore hop
}

const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

/* ---- response helpers ------------------------------------------------------
   Responses are tallies now: each option is a button and each click records one
   response. These wrap that so tests read as intent, not as DOM poking. */

// Record `times` responses against option `index` of a question.
function respond(w, qname, index, times = 1) {
  const btn = w.document.querySelector(`.question[data-qname="${qname}"] .choice[data-index="${index}"]`);
  if (!btn) throw new Error(`no option ${index} for ${qname}`);
  for (let i = 0; i < times; i++) btn.click();
  return btn;
}

// Take one response back off an option.
function unrespond(w, qname, index) {
  const minus = w.document.querySelector(`.question[data-qname="${qname}"] .choice[data-index="${index}"] .choice-minus`);
  if (!minus) throw new Error(`no minus control for ${qname}/${index}`);
  minus.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
}

const counts = (w, qname) => ev(w, `responses[${JSON.stringify(qname)}]`);
const questionNames = (w) => Object.keys(ev(w, 'qMeta'));

module.exports = { boot, loadScenario, ev, tick, respond, unrespond, counts, questionNames, ROOT };
