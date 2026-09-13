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

G('every shipped scenario, exhaustively');
{
  const fsx = require('fs');
  const path = require('path');
  const dir = path.resolve(__dirname, '..', 'lib/scenarios');
  const manifest = JSON.parse(fsx.readFileSync(path.resolve(__dirname, '..', 'lib/manifest.json'), 'utf8'));
  const files = fsx.readdirSync(dir).filter(f => f.endsWith('.ttxf'));

  t(`all ${files.length} parse with no errors`, () => {
    const bad = [];
    files.forEach(f => {
      const { errors } = T.parse(fsx.readFileSync(path.join(dir, f), 'utf8'));
      const real = errors.filter(e => e.severity === 'error');
      if (real.length) bad.push(f + ': ' + real[0].message);
    });
    eq(bad, []);
  });

  t('all round-trip through serialize unchanged', () => {
    const bad = [];
    files.forEach(f => {
      const a = T.parse(fsx.readFileSync(path.join(dir, f), 'utf8'));
      if (JSON.stringify(T.parse(T.serialize(a.doc)).doc) !== JSON.stringify(a.doc)) bad.push(f);
    });
    eq(bad, []);
  });

  t('every manifest entry has a scenario file behind it', () => {
    const missing = manifest.filter(e => !fsx.existsSync(path.join(dir, e.id + '.ttxf')));
    eq(missing.map(e => e.id), []);
  });

  t('every scenario file is listed in the manifest', () => {
    const ids = new Set(manifest.map(e => e.id));
    eq(files.filter(f => !ids.has(f.replace('.ttxf', ''))), []);
  });

  t('every entry has the fields the library needs', () => {
    const bad = manifest.filter(e =>
      !e.id || !e.title || !e.author || !e.level || !e.duration || !e.summary ||
      !Array.isArray(e.categories) || !e.categories.length);
    eq(bad.map(e => e.id || e.title), []);
  });

  t('ids are unique', () => {
    const ids = manifest.map(e => e.id);
    eq(ids.filter((v, i) => ids.indexOf(v) !== i), []);
  });

  t('stage headings carry no numbering prefix', () => {
    // the card already shows a "Stage N" badge, so repeating it in the heading was
    // just noise
    const prefix = /^\s*(?:stage|inject|phase|step|part|round|section)\s*\d*\s*[:.)-]\s*/i;
    const bad = [];
    files.forEach(f => {
      const { doc } = T.parse(fsx.readFileSync(path.join(dir, f), 'utf8'));
      doc.stages.forEach(st => { if (prefix.test(st.stage)) bad.push(f + ': ' + st.stage); });
    });
    eq(bad.slice(0, 5), []);
  });

  t('no stage heading was emptied by that', () => {
    const bad = [];
    files.forEach(f => {
      const { doc } = T.parse(fsx.readFileSync(path.join(dir, f), 'utf8'));
      doc.stages.forEach((st, i) => { if (!st.stage.trim()) bad.push(`${f} stage ${i + 1}`); });
    });
    eq(bad, []);
  });

  t('technical titles stop at the first arrow, and stay distinct', () => {
    const technical = manifest.filter(e => e.level === 'Technical');
    ok(technical.length > 0, 'no technical scenarios');
    technical.forEach(e => ok(!/→|->/.test(e.title), e.id + ' still reads: ' + e.title));
    const titles = technical.map(e => e.title);
    eq(titles.filter((v, i) => titles.indexOf(v) !== i), [], 'titles collided once shortened');
  });

  t('every technical scenario belongs to a series, in order', () => {
    const technical = manifest.filter(e => e.level === 'Technical');
    const loose = technical.filter(e => !e.series || typeof e.order !== 'number');
    eq(loose.map(e => e.id), [], 'technical scenarios with no place in a series');
    // each series numbers from 0 with no gaps or repeats
    const bySeries = {};
    technical.forEach(e => { (bySeries[e.series] = bySeries[e.series] || []).push(e.order); });
    Object.entries(bySeries).forEach(([name, orders]) => {
      eq(orders.slice().sort((a, b) => a - b), orders.map((_, i) => i), name + ' is not a clean sequence');
    });
  });

  t('cover art referenced by an entry exists', () => {
    const missing = manifest.filter(e => e.image &&
      !fsx.existsSync(path.resolve(__dirname, '..', 'lib/images', e.image + '.jpg')));
    eq(missing.map(e => e.id), []);
  });
}


G('inline code');
{
  t('backticks become a code span', () =>
    eq(T.inline('run `svc_upd.exe` now'), 'run <code>svc_upd.exe</code> now'));

  t('a code span is immune to the other inline rules', () => {
    // a glob or a UNC path would otherwise be eaten by the emphasis rules
    eq(T.inline('glob `*.tmp` here'), 'glob <code>*.tmp</code> here');
    eq(T.inline('`**literal**`'), '<code>**literal**</code>');
    eq(T.inline('`C:\\**\\temp`'), '<code>C:\\**\\temp</code>');
  });

  t('emphasis still works around and inside a span', () => {
    eq(T.inline('**bold `x` bold**'), '<strong>bold <code>x</code> bold</strong>');
    eq(T.inline('*a* `b` *c*'), '<em>a</em> <code>b</code> <em>c</em>');
  });

  t('content inside a span is still escaped', () =>
    eq(T.inline('`<script>alert(1)</script>`'),
       '<code>&lt;script&gt;alert(1)&lt;/script&gt;</code>'));

  t('an unpaired backtick is left alone', () => {
    eq(T.inline('unclosed ` backtick'), 'unclosed ` backtick');
    eq(T.inline('a ` b ` c ` d'), 'a <code> b </code> c ` d');
  });

  t('a backtick cannot span a line break', () =>
    ok(!/<code>/.test(T.inline('open `here\nand close` there'))));

  t('the placeholder cannot be forged by the author', () => {
    // a literal NUL in the source must not be able to address the span table
    const out = T.inline('\u00000\u0000 and `real`');
    eq(out, '0 and <code>real</code>');
  });

  t('code spans survive block markdown', () => {
    has(T.markdown('a `b` c'), '<p>a <code>b</code> c</p>');
    has(T.markdown('- item `x`'), '<li>item <code>x</code></li>');
    has(T.markdown('~a `b`'), '<blockquote>a <code>b</code></blockquote>');
  });

  t('the sanitiser keeps code, so rendered output is not stripped', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '..', 'js/ttxf.js'), 'utf8');
    has(src.match(/ALLOWED_TAGS = \[[\s\S]*?\]/)[0], "'CODE'");
  });

  t('a stylesheet for it is exported for host pages', () => {
    ok(typeof T.CODE_CSS === 'string' && /code\{/.test(T.CODE_CSS));
    ok(!/nowrap/.test(T.CODE_CSS), 'a long span would overflow its container');
  });
}

G('fenced preformatted blocks');
{
  const fence = ls => T.parse('@ S\n! content\n' + ls.join('\n')).doc.stages[0].content;

  t('a log line is never read as a directive inside a fence', () => {
    const r = T.parse(['@ S', '! content', '```', '+ not an answer', '# not a list',
      '? not a question', '! not a key', '@ not a stage', '// not a comment', '```',
      '? A real question', '+ one', '+ two'].join('\n'));
    eq(r.errors.filter(e => e.severity === 'error'), [], 'errors: ' + JSON.stringify(r.errors));
    const st = r.doc.stages[0];
    has(st.content, '+ not an answer');
    has(st.content, '// not a comment');
    has(st.content, '@ not a stage');
    eq(st.questions.length, 1, 'the fence swallowed or leaked a question');
    eq(st.questions[0].answers, ['one', 'two']);
  });

  t('a stage after a closed fence still parses', () => {
    const doc = T.parse(['@ One', '! content', '```', '@ fake', '```', '@ Two', '! content', 'x'].join('\n')).doc;
    eq(doc.stages.map(s => s.stage), ['One', 'Two']);
  });

  t('an unclosed fence is reported', () => {
    const r = T.parse(['@ S', '! content', '```', 'log line', '', '? Q', '+ a', '+ b'].join('\n'));
    ok(r.errors.some(e => /never closed/.test(e.message)), 'no diagnostic: ' + JSON.stringify(r.errors));
  });

  t('it renders as pre > code with the shape intact', () => {
    const html = T.markdown('```\na  b\n   c\n```');
    has(html, '<pre class="SFpre"><code>');
    has(html, 'a  b\n   c');
  });

  t('no inline or block rule reaches inside it', () => {
    const html = T.markdown('```\n**bold** `code` - item 1. num ~quote\n```');
    ok(!/<strong>|<code>.*<code>|<li>|<blockquote>/.test(html.replace('<code>', '')), html);
    has(html, '**bold** `code` - item 1. num ~quote');
  });

  t('the content is escaped', () =>
    has(T.markdown('```\n<script>x</script> & <b>\n```'),
        '&lt;script&gt;x&lt;/script&gt; &amp; &lt;b&gt;'));

  t('an optional label rides on the element', () => {
    has(T.markdown('```SIEM export\nx\n```'), '<pre class="SFpre" data-label="SIEM export">');
    has(T.markdown('```\nx\n```'), '<pre class="SFpre"><code>');
  });

  t('a label is escaped too', () =>
    has(T.markdown('```a"b<c\nx\n```'), 'data-label="a&quot;b&lt;c"'));

  t('an unterminated fence still renders rather than vanishing', () =>
    has(T.markdown('```\nstranded'), '<pre class="SFpre"><code>stranded</code></pre>'));

  t('blank lines inside are kept, not collapsed into paragraphs', () => {
    const html = T.markdown('```\na\n\nb\n```');
    has(html, 'a\n\nb');
    ok(!/<p>/.test(html), 'a paragraph was opened inside the block');
  });

  t('prose either side is unaffected', () => {
    const html = T.markdown('before\n\n```\nx\n```\n\nafter');
    has(html, '<p>before</p>');
    has(html, '<p>after</p>');
  });

  t('the sanitiser keeps the label attribute', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '..', 'js/ttxf.js'), 'utf8');
    has(src.match(/ALLOWED_ATTRS = \[[^\]]+\]/)[0], "'data-label'");
  });

  t('a stylesheet for it is exported', () => {
    has(T.CODE_CSS, 'pre.SFpre{');
    has(T.CODE_CSS, 'pre.SFpre>code{background:none');
  });
}

G('%news() headlines');
{
  const one = str => { const d = new JSDOM('<body>' + T.markdown(str) + '</body>'); return d.window.document; };

  t('a headline on its own line becomes a news figure', () => {
    const f = one('%news(Council systems offline)').querySelector('figure.SFnews');
    ok(f, 'no figure rendered');
    eq(f.querySelector('.SFnews-line').textContent, 'Council systems offline');
  });

  t('it is a block, never nested inside a paragraph', () => {
    const html = T.markdown('before\n\n%news(X)\n\nafter');
    ok(!/<p>[^<]*<figure/.test(html), 'the figure was wrapped in a paragraph');
    has(html, '<p>before</p>');
    has(html, '<p>after</p>');
  });

  t('the flag defaults, and can be set', () => {
    eq(one('%news(X)').querySelector('.SFnews-flag').textContent, 'Breaking News');
    eq(one('%news(X | Live at Six)').querySelector('.SFnews-flag').textContent, 'Live at Six');
  });

  t('the backdrop is a real img, so host pages can absolutise it', () => {
    const img = one('%news(X)').querySelector('img.SFnews-shot');
    ok(img, 'no img — a CSS background would never reach the participant window');
    ok(/news\.jpe?g$/.test(img.getAttribute('src')), img.getAttribute('src'));
  });

  t('the backdrop path is configurable per page', () => {
    T.setNewsBackdrop('lib/exercise_data/news.jpeg');
    eq(one('%news(X)').querySelector('img').getAttribute('src'), 'lib/exercise_data/news.jpeg');
    T.setNewsBackdrop('../lib/exercise_data/news.jpeg');
  });

  t('headline and flag are escaped', () => {
    const doc = one('%news(<script>x</script> "q" | <b>f</b>)');
    eq(doc.querySelectorAll('script, b').length, 0, 'markup was injected');
    has(doc.querySelector('.SFnews-line').textContent, '<script>');
  });

  t('it is announced to assistive technology', () => {
    const f = one('%news(Council systems offline)').querySelector('figure');
    has(f.getAttribute('aria-label'), 'Council systems offline');
    eq(f.querySelector('img').getAttribute('alt'), '', 'the backdrop should be decorative');
  });

  t('only a whole line counts, so prose is untouched', () => {
    has(T.markdown('text %news(inline) more'), '<p>text %news(inline) more</p>');
  });

  t('an empty headline still renders rather than breaking the stage', () =>
    ok(one('%news()').querySelector('figure.SFnews')));

  t('the backdrop file exists where the default points', () => {
    const path = require('path');
    ok(require('fs').existsSync(path.resolve(__dirname, '..', 'lib/exercise_data/news.jpeg')));
  });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
