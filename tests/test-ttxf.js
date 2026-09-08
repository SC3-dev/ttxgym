const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body></body>');
global.window = dom.window; global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser; global.NodeFilter = dom.window.NodeFilter;
const T = require(require('path').resolve(__dirname, '..', 'js/ttxf.js'));

let pass = 0, fail = 0;
const G = n => console.log('\n' + n);
const t = (n, f) => { try { f(); console.log('  ok   ' + n); pass++; } catch (e) { console.log('  FAIL ' + n + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''}\n         expected: ${JSON.stringify(b)}\n         actual:   ${JSON.stringify(a)}`); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const has = (s, sub) => { if (!String(s).includes(sub)) throw new Error(`expected to contain ${JSON.stringify(sub)}, got ${JSON.stringify(s)}`); };
const hasnt = (s, sub) => { if (String(s).includes(sub)) throw new Error(`expected NOT to contain ${JSON.stringify(sub)}, got ${JSON.stringify(s)}`); };

G('C2 — the model holds raw text; nothing is escaped at parse time');
{
  const { doc } = T.parse(`! title: Bob's "Big" Exercise & Friends

@ Stage: our organisation's systems
! content: Body
? We protect our organisation's data
+ No
+ Yes
`);
  t('title keeps its apostrophes and ampersand', () => eq(doc.title, `Bob's "Big" Exercise & Friends`));
  t('stage name is raw', () => eq(doc.stages[0].stage, `Stage: our organisation's systems`));
  t('question text is raw', () => eq(doc.stages[0].questions[0].question, `We protect our organisation's data`));
  t('escaping happens at render instead', () => eq(T.escapeHTML(doc.title), 'Bob&#039;s &quot;Big&quot; Exercise &amp; Friends'));
}

G('C4 — consecutive lines join into one paragraph, as documented');
{
  const html = T.markdown('One sentence.\nSecond sentence.\n\nNew paragraph.');
  t('two adjacent lines become one paragraph', () => eq(html, '<p>One sentence. Second sentence.</p><p>New paragraph.</p>'));
  t('no empty <p></p> spacers are emitted', () => hasnt(html, '<p></p>'));
  t('multiple blank lines collapse to one break', () =>
    eq(T.markdown('A\n\n\n\nB'), '<p>A</p><p>B</p>'));
}

G('markdown — lists, quotes, inline');
{
  t('bullets', () => eq(T.markdown('- one\n- two'), '<ul><li>one</li><li>two</li></ul>'));
  t('numbers', () => eq(T.markdown('1. one\n2. two'), '<ol><li>one</li><li>two</li></ol>'));
  t('a paragraph then a list', () =>
    eq(T.markdown('Intro line\n- a\n- b'), '<p>Intro line</p><ul><li>a</li><li>b</li></ul>'));
  t('a list then a paragraph', () =>
    eq(T.markdown('- a\nTrailing line'), '<ul><li>a</li></ul><p>Trailing line</p>'));
  t('bullets and numbers do not merge', () =>
    eq(T.markdown('- a\n1. b'), '<ul><li>a</li></ul><ol><li>b</li></ol>'));
  t('blockquote', () => eq(T.markdown('~ Quoted'), '<blockquote>Quoted</blockquote>'));
  t('bold and italic', () => eq(T.markdown('**b** and *i*'), '<p><strong>b</strong> and <em>i</em></p>'));
  t('html in content is escaped, not rendered', () =>
    eq(T.markdown('<img src=x onerror=alert(1)>'), '<p>&lt;img src=x onerror=alert(1)&gt;</p>'));
}

G('C3 — one image implementation, no inline handlers');
{
  const html = T.markdown('%(https://x/i.png | 50%)');
  t('emits a .SFmedia image with data-scale', () => {
    has(html, 'class="SFmedia"'); has(html, 'src="https://x/i.png"'); has(html, 'data-scale="50%"');
  });
  t('carries no inline onload attribute', () => hasnt(html, 'onload'));
  t('a URL with a comma survives', () =>
    has(T.markdown('%(https://cdn.example.com/img?a=1,b=2 | 60%)'), 'src="https://cdn.example.com/img?a=1,b=2"'));
  t('an unscaled image needs no data-scale', () => hasnt(T.markdown('%(https://x/i.png)'), 'data-scale'));
  t('percentage scaling uses the natural width', () => {
    const d = new JSDOM('<img class="SFmedia" data-scale="50%">');
    const img = d.window.document.querySelector('img');
    Object.defineProperty(img, 'naturalWidth', { value: 400 });
    Object.defineProperty(img, 'complete', { value: true });
    T.hydrateMedia(d.window.document);
    eq(img.style.width, '200px');
  });
  t('a unit value is applied literally', () => {
    const d = new JSDOM('<img class="SFmedia" data-scale="120px">');
    const img = d.window.document.querySelector('img');
    Object.defineProperty(img, 'complete', { value: true });
    T.hydrateMedia(d.window.document);
    eq(img.style.width, '120px');
  });
}

G('C5 — directive lines inside content can be escaped');
{
  const { doc } = T.parse(`! title: T

@ Stage
! content
Normal line.
\\# This is a heading, not a list directive
\\+ And this is a plus, not an item
Still content.
`);
  t('the escaped lines stay in the content', () => {
    has(doc.stages[0].content, '# This is a heading');
    has(doc.stages[0].content, '+ And this is a plus');
  });
  t('they do not become directives', () => {
    eq(doc.stages[0].discussion.length, 0);
    eq(doc.stages[0].prompts.length, 0);
  });
  t('the backslash is not rendered', () => hasnt(T.markdown(doc.stages[0].content), '\\'));
  t('serialize re-escapes them so the round-trip is stable', () => {
    const again = T.parse(T.serialize(doc)).doc;
    eq(again.stages[0].content, doc.stages[0].content);
  });
  t('an unescaped directive still ends the block (unchanged behaviour)', () => {
    const { doc: d } = T.parse('! title: T\n\n@ S\n! content\nLine one\n# discussion\n+ item\n');
    eq(d.stages[0].content, 'Line one');
    eq(d.stages[0].discussion[0], 'item');
  });
}

G('C6 — diagnostics');
{
  const cases = [
    ['! conten\nbody\n', 'Unknown key', 'the typo that blanked a shipped stage'],
    ['! title: T\n\n@ S\n! content: c\n? Q with no answers\n', 'has no answers', 'question with no answers'],
    ['! title: T\n\n@ S\n! content: c\n? Q\n+ only one\n', 'only one answer', 'unscoreable question'],
    ['! title: T\n\n@ S\n', 'has no "! content"', 'stage with no content'],
    ['! title: T\n', 'No stages found', 'no stages at all'],
    ['@ S\n! content: c\n', 'No "! title:"', 'missing title'],
    ['! title: T\n\n@ S\n! content: c\n# nonsense\n+ x\n', 'Unknown list', 'unknown list name'],
    ['! title: T\n\n@ S\n! content: c\n+ orphan\n', 'has no question or', 'orphan list item'],
    ['! title: T\n\n@ S\n! content: c\n++ orphan\n', 'has no question above it', 'orphan correct answer'],
    ['! title: T\n\n@ S\n! content: c\n? Q\n++ a\n++ b\n', 'more than one answer correct', 'two correct answers'],
    ['! title: T\n\n@ S\n! content: c\n? Q\n++ same\n+ same\n', 'duplicated', 'ambiguous correct answer'],
    ['! title: T\n\n@ S\n! content: c\nstray text\n', 'not part of any directive', 'stray line'],
  ];
  cases.forEach(([src, needle, label]) => {
    t('reports ' + label, () => {
      const { errors } = T.parse(src);
      ok(errors.some(e => e.message.includes(needle)),
         'got: ' + errors.map(e => e.message).join(' | '));
    });
  });
  t('every diagnostic carries a line number', () => {
    const { errors } = T.parse('! title: T\n\n@ S\n! content: c\n? Q\n+ one\n');
    ok(errors.every(e => typeof e.line === 'number' && e.line > 0));
  });
  t('over-long values are reported, not silently cut', () => {
    const { errors } = T.parse('! title: T\n! summary\n' + 'x'.repeat(11000) + '\n\n@ S\n! content: c\n');
    ok(errors.some(e => e.message.includes('cut short')));
  });
  t('a clean file produces no diagnostics', () =>
    eq(T.parse('! title: T\n! summary: S\n\n@ S1\n! content: C\n? Q\n+ a\n+ b\n').errors.length, 0));
}

G('C7 — sanitizer for third-party HTML');
{
  t('strips script tags', () => hasnt(T.sanitizeHTML('<p>ok</p><script>alert(1)</script>'), 'alert'));
  t('strips event handlers', () => hasnt(T.sanitizeHTML('<img src="x" onerror="alert(1)">'), 'onerror'));
  t('strips javascript: urls', () => hasnt(T.sanitizeHTML('<a href="javascript:alert(1)">x</a>'), 'javascript:'));
  t('keeps ordinary formatting', () => eq(T.sanitizeHTML('<p>a <b>b</b> <i>c</i></p>'), '<p>a <b>b</b> <i>c</i></p>'));
  t('keeps http links and hardens them', () => {
    const out = T.sanitizeHTML('<a href="https://ncsc.gov.uk">x</a>');
    has(out, 'href="https://ncsc.gov.uk"'); has(out, 'rel="noopener noreferrer"');
  });
  t('unwraps unknown tags but keeps their text', () => has(T.sanitizeHTML('<marquee>hello</marquee>'), 'hello'));
}

G('serialize');
{
  const src = `! title: T
! author: A
! summary
Line one.
Line two.

@ Stage One
! content
Body line.

# discussion
+ d1
# prompts
+ p1
? Rating question
+ Low
+ High
?- Hidden quiz
+ Wrong
++ Right
`;
  const a = T.parse(src);
  t('parses without diagnostics', () => eq(a.errors.length, 0, JSON.stringify(a.errors)));
  t('round-trips', () => eq(JSON.stringify(T.parse(T.serialize(a.doc)).doc), JSON.stringify(a.doc)));
  t('preserves the participant-hidden flag', () => eq(a.doc.stages[0].questions[1].participantHidden, true));
  t('records the correct answer by index, not text', () => eq(a.doc.stages[0].questions[1].quizIndex, 1));
  t('a rating question has no correct answer', () => eq(a.doc.stages[0].questions[0].quizIndex, -1));
  t('serialised output re-emits ++ for the correct answer', () => has(T.serialize(a.doc), '++ Right'));
}

G('D2 — duplicate answer text no longer confuses the correct answer');
{
  const { doc } = T.parse('! title: T\n\n@ S\n! content: c\n? Q\n+ Yes\n++ Yes\n');
  t('the index identifies which "Yes" is correct', () => eq(doc.stages[0].questions[0].quizIndex, 1));
  t('serialising marks exactly one of them', () => {
    const out = T.serialize(doc);
    eq((out.match(/^\+\+ /gm) || []).length, 1);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
