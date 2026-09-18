/* =============================================================================
   ttxf.js — the one implementation of the .ttxf scenario format.

   Loaded as a plain script (no build step, works from file:// and GitHub Pages)
   and used by the gym player, the scenario builder, and anything else that needs
   to read or write a scenario. Before this existed there were three separate
   parsers that had already drifted apart from one another.

   Exposes a single global: TTXF.

     TTXF.parse(text)        -> { doc, errors }   raw model + diagnostics
     TTXF.serialize(doc)     -> text              round-trips parse()
     TTXF.markdown(text)     -> html              block markdown
     TTXF.inline(text)       -> html              inline markdown only
     TTXF.escapeHTML(str)    -> str
     TTXF.sanitizeHTML(html) -> html              allowlist, for third-party HTML
     TTXF.hydrateMedia(root)                      applies %(url | scale) sizing
     TTXF.MEDIA_CSS                               styling for .SFmedia
     TTXF.MEDIA_HYDRATE_JS                        that sizing, for standalone documents
     TTXF.CODE_CSS                                styling for `inline code` and ``` blocks
     TTXF.setNewsBackdrop(url)                    where %news() finds its backdrop
     TTXF.htmlToSource(el)                        rendered DOM back to .ttxf

   The model holds RAW author text throughout. Nothing is escaped or rendered at
   parse time — that is the caller's job at the point of display. Parsing used to
   escape as it went, which double-escaped every apostrophe that then reached a
   textContent sink, and made the editor's round-trip lossy.
   ============================================================================= */
(function (global) {
  'use strict';

  /* --- constants ---------------------------------------------------------- */

  // Keys the format recognises. Anything else is reported rather than silently
  // accepted — an unnoticed `! conten` typo left a whole shipped stage blank.
  var GLOBAL_KEYS = ['title', 'author', 'image', 'summary', 'conclusion'];
  var STAGE_KEYS = ['content', 'duration'];
  var MAX_BLOCK = 10000; // characters per multi-line value
  var FENCE = /^```/;   // opens and closes a preformatted block inside a value
  var NEWS = /^%news\(([^)]*)\)$/i;   // a headline, rendered as a news broadcast

  /* The backdrop is a real <img>, not a CSS background, so the host page's
     absolutize() can resolve it — that is what carries it into the participant
     window, which runs from a blob URL and cannot resolve a relative path.
     Authored relative to gym/, matching how scenario media is written. */
  var newsBackdrop = '../lib/exercise_data/news.jpeg';
  function setNewsBackdrop(url) { newsBackdrop = String(url == null ? '' : url); }

  var MEDIA_CSS =
    '.SFmedia{display:block;margin:1em auto;max-width:min(100%,32em);height:auto;' +
    'border-radius:6px;object-fit:contain}';

  /* Inline code, in terms a host page can override. currentColor and a
     transparent-ish ground mean this reads correctly in either theme without
     knowing which one is active. */
  var CODE_CSS =
    'code{font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);' +
    'font-size:.88em;padding:.1em .35em;border-radius:4px;' +
    'background:color-mix(in srgb,currentColor 10%,transparent);' +
    'border:1px solid color-mix(in srgb,currentColor 18%,transparent);' +
    'white-space:pre-wrap;overflow-wrap:break-word}' +
    'pre.SFpre{font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);' +
    'font-size:.82em;line-height:1.55;margin:.9em 0;padding:.7em .85em;border-radius:6px;' +
    'background:color-mix(in srgb,currentColor 7%,transparent);' +
    'border:1px solid color-mix(in srgb,currentColor 15%,transparent);' +
    'white-space:pre-wrap;overflow-wrap:break-word;tab-size:4}' +
    'pre.SFpre>code{background:none;border:0;padding:0;font-size:inherit;white-space:inherit}' +
    'pre.SFpre[data-label]::before{content:attr(data-label);display:block;font-size:.78em;' +
    'font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-bottom:.5em}';

  /* The report and the participant window are standalone documents that cannot
     load this module, so the media-sizing logic is inlined into both. One copy,
     here, matching applyMediaScale() below. */
  var MEDIA_HYDRATE_JS = `
function applySFmediaScale(img){
  var spec=(img.getAttribute('data-scale')||'').trim(); if(!spec) return;
  if(/^\\d+(\\.\\d+)?\\s*%?$/.test(spec)){
    if(!img.naturalWidth) return;
    var px=Math.round(img.naturalWidth*(parseFloat(spec)/100));
    img.style.width=px+'px'; img.style.maxWidth=px+'px';
  } else { img.style.width=spec; img.style.maxWidth=spec; }
  img.style.maxHeight='none';
}
function hydrateMedia(root){
  var imgs=(root||document).querySelectorAll('img.SFmedia[data-scale]');
  for(var i=0;i<imgs.length;i++){(function(img){
    if(img.complete) applySFmediaScale(img);
    else img.addEventListener('load',function(){applySFmediaScale(img);});
  })(imgs[i]);}
}
document.addEventListener('DOMContentLoaded',function(){hydrateMedia(document);});
`;

  /* --- escaping ----------------------------------------------------------- */

  function escapeHTML(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* --- parsing ------------------------------------------------------------ */

  var DIRECTIVES = ['! ', '# ', '?- ', '? ', '@ ', '++ ', '+ '];

  function startsDirective(t) {
    for (var i = 0; i < DIRECTIVES.length; i++) {
      if (t.indexOf(DIRECTIVES[i]) === 0) return true;
    }
    return false;
  }

  function emptyDoc() {
    return { title: '', author: '', image: '', summary: '', conclusion: '', stages: [] };
  }

  function emptyStage(name) {
    return { stage: name, content: '', duration: '', discussion: [], prompts: [], questions: [] };
  }

  // `! duration: 10` / `10 mins` / `1h 30m` -> seconds, or 0 if unparseable.
  function durationToSeconds(spec) {
    spec = String(spec == null ? '' : spec).trim().toLowerCase();
    if (!spec) return 0;
    var total = 0, matched = false, m;
    var re = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|seconds)?/g;
    while ((m = re.exec(spec))) {
      if (!m[0].trim()) continue;
      matched = true;
      var n = parseFloat(m[1]);
      var unit = m[2] || 'm';
      if (unit.charAt(0) === 'h') total += n * 3600;
      else if (unit.charAt(0) === 's') total += n;
      else total += n * 60;
    }
    return matched ? Math.round(total) : 0;
  }

  /**
   * Parse .ttxf source into the canonical model.
   * Returns { doc, errors }. Errors never stop the parse — they describe what was
   * ignored or looked wrong, so the caller can show the author something useful.
   */
  function parse(text) {
    var doc = emptyDoc();
    var errors = [];
    var lines = String(text == null ? '' : text).split(/\r?\n/);

    var stage = null;          // current stage, or null while in the header
    var question = null;       // current question
    var arrayKey = null;       // current `# key` list
    var blockKey = null;       // current multi-line `! key`
    var blockLines = [];
    var blockStart = 0;
    var blockTruncated = false;
    var inFence = false;       // inside a ``` block, nothing is a directive
    var fenceStart = 0;

    function err(line, message, severity) {
      errors.push({ line: line, message: message, severity: severity || 'warning' });
    }

    function target() { return stage || doc; }

    function keyIsKnown(key) {
      return stage ? STAGE_KEYS.indexOf(key) !== -1 : GLOBAL_KEYS.indexOf(key) !== -1;
    }

    function checkKey(key, lineNo) {
      if (keyIsKnown(key)) return true;
      err(lineNo, 'Unknown key "! ' + key + '"' +
        (stage ? ' inside a stage. Stages recognise: ' + STAGE_KEYS.join(', ') + '.'
               : '. The header recognises: ' + GLOBAL_KEYS.join(', ') + '.') +
        ' The value has been ignored.', 'error');
      return false;
    }

    function pushBlockLine(raw) {
      if (blockLines.join('\n').length + raw.length <= MAX_BLOCK) blockLines.push(raw);
      else blockTruncated = true;
    }

    function closeBlock() {
      if (blockKey === null) return;
      if (inFence) {
        err(fenceStart, 'A ``` block opened here was never closed; it ran to the end of "! ' +
          blockKey + '".', 'error');
        inFence = false;
      }
      var value = blockLines.join('\n').replace(/^\n+|\s+$/g, '');
      if (checkKey(blockKey, blockStart)) target()[blockKey] = value;
      if (blockTruncated) {
        err(blockStart, 'The value of "! ' + blockKey + '" is longer than ' + MAX_BLOCK +
          ' characters and was cut short.', 'error');
      }
      blockKey = null; blockLines = []; blockTruncated = false;
    }

    function closeQuestion() {
      if (!question) return;
      if (question.answers.length === 0) {
        err(question.line, 'Question "' + trim(question.question, 40) +
          '" has no answers. Add at least two "+ " lines beneath it.', 'error');
      } else if (question.answers.length === 1) {
        err(question.line, 'Question "' + trim(question.question, 40) +
          '" has only one answer, so it cannot be scored. Add at least one more.');
      }
      if (question.quizIndex !== -1 && question.answers.length &&
          countMatches(question.answers, question.answers[question.quizIndex]) > 1) {
        err(question.line, 'Question "' + trim(question.question, 40) +
          '" marks a correct answer whose text is duplicated, so the right option is ambiguous.');
      }
      question = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      var lineNo = i + 1;
      var t = raw.trim();

      /* A fenced block is verbatim: a log line may legitimately begin with //,
         +, # or ? and must not be read as a comment or a directive. Fences are
         only meaningful inside a multi-line value, which is the only place
         arbitrary text can live. */
      if (blockKey !== null && (inFence || FENCE.test(t))) {
        if (inFence && FENCE.test(t)) inFence = false;
        else if (!inFence) { inFence = true; fenceStart = lineNo; }
        pushBlockLine(raw);
        continue;
      }

      if (t.indexOf('//') === 0) continue;

      // Inside a multi-line value, a leading backslash escapes a line that would
      // otherwise read as a directive (a Markdown heading, say). Without this
      // there was no way to begin a content line with #, +, ?, @ or !.
      var escaped = blockKey !== null && t.indexOf('\\') === 0;
      if (escaped) raw = raw.replace(/\\/, '');

      if (blockKey !== null && !escaped && startsDirective(t)) closeBlock();

      if (!escaped && t.indexOf('! ') === 0) {
        closeQuestion();
        var rest = t.slice(2);
        var colon = rest.indexOf(':');
        if (colon > -1) {
          var key = rest.slice(0, colon).trim();
          var value = rest.slice(colon + 1).trim();
          if (checkKey(key, lineNo)) target()[key] = value;
        } else {
          blockKey = rest.trim();
          blockLines = [];
          blockStart = lineNo;
          blockTruncated = false;
        }
        arrayKey = null;

      } else if (!escaped && t.indexOf('@ ') === 0) {
        closeBlock(); closeQuestion();
        var name = t.slice(2).trim();
        if (!name) err(lineNo, 'Stage declared with no name.');
        stage = emptyStage(name);
        stage.line = lineNo;
        doc.stages.push(stage);
        arrayKey = null;

      } else if (!escaped && t.indexOf('# ') === 0) {
        closeQuestion();
        arrayKey = t.slice(2).trim();
        if (!stage) {
          err(lineNo, 'List "# ' + arrayKey + '" appears before any stage, so it has nowhere to go.');
          arrayKey = null;
        } else if (arrayKey !== 'discussion' && arrayKey !== 'prompts') {
          err(lineNo, 'Unknown list "# ' + arrayKey + '". Stages support: discussion, prompts.', 'error');
          arrayKey = null;
        }

      } else if (!escaped && (t.indexOf('?- ') === 0 || t.indexOf('? ') === 0)) {
        closeQuestion();
        var hidden = t.indexOf('?- ') === 0;
        var qText = t.slice(hidden ? 3 : 2).trim();
        if (!qText) err(lineNo, 'Question declared with no text.');
        question = {
          question: qText, answers: [], quizIndex: -1,
          participantHidden: hidden, line: lineNo,
        };
        if (!stage) {
          err(lineNo, 'Question "' + trim(qText, 40) + '" appears before any stage and was ignored.', 'error');
          question = null;
        } else {
          stage.questions.push(question);
        }
        arrayKey = null;

      } else if (!escaped && t.indexOf('++ ') === 0) {
        if (!question) {
          err(lineNo, 'Correct answer "' + trim(t.slice(3), 40) + '" has no question above it.', 'error');
        } else {
          if (question.quizIndex !== -1) {
            err(lineNo, 'Question "' + trim(question.question, 40) +
              '" marks more than one answer correct; the last one wins.');
          }
          question.answers.push(t.slice(3).trim());
          question.quizIndex = question.answers.length - 1;
        }

      } else if (!escaped && t.indexOf('+ ') === 0) {
        var item = t.slice(2).trim();
        if (question) question.answers.push(item);
        else if (arrayKey && stage) stage[arrayKey].push(item);
        else err(lineNo, 'List item "' + trim(item, 40) +
          '" has no question or "# " list above it and was ignored.', 'error');

      } else if (blockKey !== null) {
        pushBlockLine(raw);

      } else if (t !== '') {
        err(lineNo, 'Line "' + trim(t, 40) + '" is not part of any directive and was ignored.');
      }
    }

    closeBlock();
    closeQuestion();

    // whole-document checks
    if (!doc.title) errors.unshift({ line: 1, message: 'No "! title:" — the exercise will be shown as untitled.', severity: 'warning' });
    if (doc.stages.length === 0) {
      errors.unshift({ line: 1, message: 'No stages found. A scenario needs at least one line beginning "@ ".', severity: 'error' });
    }
    doc.stages.forEach(function (s) {
      if (!s.content) err(s.line, 'Stage "' + trim(s.stage, 40) + '" has no "! content", so participants will see an empty screen.', 'error');
      if (s.duration && !durationToSeconds(s.duration)) {
        err(s.line, 'Stage "' + trim(s.stage, 40) + '" has a duration of "' + s.duration +
          '" that could not be read. Try "10 mins" or "1h 30m".');
      }
    });

    // line numbers are parse bookkeeping; diagnostics carry them, the model does not
    doc.stages.forEach(function (s) {
      delete s.line;
      s.questions.forEach(function (q) { delete q.line; });
    });
    return { doc: doc, errors: errors };
  }

  function trim(str, n) {
    str = String(str || '');
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function countMatches(arr, value) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] === value) n++;
    return n;
  }

  /* --- serialising -------------------------------------------------------- */

  function serialize(doc) {
    var lines = [];

    // A multi-line value is terminated by a blank line; blank() then adds the
    // separator before a stage only if one is not already there, so output stays
    // byte-stable across repeated parse/serialize cycles.
    function blank() {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
    }

    function scalarOrBlock(key, value) {
      value = (value == null ? '' : String(value));
      if (!value.trim()) return;
      if (value.indexOf('\n') === -1) lines.push('! ' + key + ': ' + value.trim());
      else { lines.push('! ' + key); lines.push(escapeBlock(value)); lines.push(''); }
    }

    scalarOrBlock('title', doc.title);
    scalarOrBlock('author', doc.author);
    scalarOrBlock('image', doc.image);
    scalarOrBlock('summary', doc.summary);
    scalarOrBlock('conclusion', doc.conclusion);

    (doc.stages || []).forEach(function (s) {
      blank();
      lines.push('@ ' + (s.stage || 'Untitled Stage'));
      scalarOrBlock('content', s.content);
      if (nonEmpty(s.duration)) lines.push('! duration: ' + String(s.duration).trim());

      var discussion = (s.discussion || []).filter(nonEmpty);
      if (discussion.length) {
        lines.push('# discussion');
        discussion.forEach(function (d) { lines.push('+ ' + d.trim()); });
      }
      var prompts = (s.prompts || []).filter(nonEmpty);
      if (prompts.length) {
        lines.push('# prompts');
        prompts.forEach(function (p) { lines.push('+ ' + p.trim()); });
      }

      (s.questions || []).forEach(function (q) {
        var answers = (q.answers || []).filter(nonEmpty);
        if (!nonEmpty(q.question) && !answers.length) return;
        lines.push((q.participantHidden ? '?- ' : '? ') + (q.question || 'Question').trim());
        // quizIndex points into the unfiltered answers array
        var correct = (q.quizIndex != null && q.quizIndex > -1) ? (q.answers || [])[q.quizIndex] : null;
        var marked = false;
        answers.forEach(function (a) {
          var isCorrect = !marked && correct != null && a === correct;
          if (isCorrect) marked = true;
          lines.push((isCorrect ? '++ ' : '+ ') + a.trim());
        });
      });
    });

    return lines.join('\n') + '\n';
  }

  function nonEmpty(v) { return String(v == null ? '' : v).trim() !== ''; }

  // Any content line that would otherwise read as a directive gets a leading
  // backslash, so serialize(parse(x)) is stable.
  function escapeBlock(value) {
    /* Inside a ``` fence the parser does not interpret directives, so escaping
       there would write a literal backslash into the artefact. Mirrors the fence
       handling in parse() so a file survives a round trip byte for byte. */
    var fenced = false;
    return String(value).split('\n').map(function (line) {
      if (FENCE.test(line.trim())) { fenced = !fenced; return line; }
      if (fenced) return line;
      return (startsDirective(line.trim()) || line.trim().indexOf('\\') === 0) ? '\\' + line : line;
    }).join('\n');
  }

  /* --- markdown ----------------------------------------------------------- */

  // Inline: bold, italic, and %(url | scale) images. The source is escaped first,
  // so scenario files cannot inject markup.
  function inline(str) {
    var s = escapeHTML(str).replace(/\u0000/g, '');
    /* Code spans come out first and go back in last, so the rest of the inline
       rules cannot reach inside them. Without this, a path like C:\*\*\temp
       turns into <strong> and a glob like *.tmp loses its asterisk — which is
       exactly the text a technical scenario needs to reproduce verbatim. */
    var spans = [];
    s = s.replace(/`([^`\n]+)`/g, function (_, body) {
      spans.push(body);
      return '\u0000' + (spans.length - 1) + '\u0000';
    });
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    s = s.replace(/%\(([^|)]+?)(?:\|\s*([^)]+?))?\)/g, function (_, src, scale) {
      var attr = scale ? ' data-scale="' + escapeHTML(scale.trim()) + '"' : '';
      return '<img class="SFmedia" src="' + src.trim() + '" alt=""' + attr + '>';
    });
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return '<code>' + spans[Number(i)] + '</code>';
    });
    return s;
  }

  var BULLET = /^\s*-\s+/;
  var NUMBERED = /^\s*\d+\.\s+/;

  /**
   * Block markdown. Consecutive lines join into one paragraph and a blank line
   * starts a new one — which is what the guide has always documented, though the
   * old implementation wrapped every single line in its own <p>.
   */
  function markdown(text) {
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var para = [], bullets = [], numbers = [];

    function flushPara() {
      if (!para.length) return;
      out.push('<p>' + para.join(' ') + '</p>');
      para = [];
    }
    function flushLists() {
      if (bullets.length) { out.push('<ul>' + bullets.map(li).join('') + '</ul>'); bullets = []; }
      if (numbers.length) { out.push('<ol>' + numbers.map(li).join('') + '</ol>'); numbers = []; }
    }
    function li(item) { return '<li>' + item + '</li>'; }
    function flushAll() { flushPara(); flushLists(); }

    var fence = null;          // collected lines of the open ``` block
    var fenceLabel = '';

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      /* A fenced block is reproduced exactly: no paragraph joining, no inline
         rules, no list detection. This is what a log excerpt, an email header or
         a ransom note needs — the shape of the text is the evidence. */
      if (FENCE.test(line.trim())) {
        if (fence === null) {
          flushAll();
          fence = [];
          fenceLabel = line.trim().replace(FENCE, '').trim();
        } else {
          var attr = fenceLabel ? ' data-label="' + escapeHTML(fenceLabel) + '"' : '';
          out.push('<pre class="SFpre"' + attr + '><code>' +
            escapeHTML(fence.join('\n')) + '</code></pre>');
          fence = null;
          fenceLabel = '';
        }
        continue;
      }
      if (fence !== null) { fence.push(line); continue; }

      /* A headline on its own line becomes a still from a news broadcast. Handled
         as a block rather than inline so it is never wrapped in a <p>. */
      var news = NEWS.exec(line.trim());
      if (news) {
        flushAll();
        var parts = news[1].split('|');
        var headline = parts[0].trim();
        var flag = (parts[1] || 'Breaking News').trim();
        out.push(
          '<figure class="SFnews" aria-label="News broadcast: ' + escapeHTML(headline) + '">' +
          '<img class="SFnews-shot" src="' + escapeHTML(newsBackdrop) + '" alt="">' +
          '<figcaption class="SFnews-ticker">' +
          '<span class="SFnews-flag">' + escapeHTML(flag) + '</span>' +
          '<span class="SFnews-line">' + escapeHTML(headline) + '</span>' +
          '</figcaption></figure>');
        continue;
      }

      if (line.trim() === '') { flushAll(); continue; }

      // a leading backslash is the directive escape; it is not part of the text
      if (line.trim().indexOf('\\') === 0) line = line.replace(/\\/, '');

      if (BULLET.test(line)) {
        flushPara();
        if (numbers.length) flushLists();
        bullets.push(inline(line.replace(BULLET, '')));
      } else if (NUMBERED.test(line)) {
        flushPara();
        if (bullets.length) flushLists();
        numbers.push(inline(line.replace(NUMBERED, '')));
      } else if (/^~/.test(line.trim())) {
        flushAll();
        out.push('<blockquote>' + inline(line.trim().slice(1).trim()) + '</blockquote>');
      } else {
        flushLists();
        para.push(inline(line));
      }
    }
    if (fence !== null) {
      var attrOpen = fenceLabel ? ' data-label="' + escapeHTML(fenceLabel) + '"' : '';
      out.push('<pre class="SFpre"' + attrOpen + '><code>' +
        escapeHTML(fence.join('\n')) + '</code></pre>');
    }
    flushAll();
    return out.join('');
  }

  /* --- DOM back to source -------------------------------------------------- */

  /* The inverse of markdown(), for an editable region: take the rendered DOM an
     author has been working in and produce .ttxf again. Ten node types, which is
     what makes a visual editor tractable for this format at all.

     Not perfectly lossless in one respect, and deliberately so: markdown() joins
     consecutive lines into one paragraph, so a soft line break inside a paragraph
     cannot be recovered from the HTML and comes back re-wrapped. Callers that
     care should keep the original source for anything the author did not touch. */

  var BLOCK_DIRECTIVE = /^(!|@|#|\?|\+|\/\/|~|```|\\|-\s|\d+\.\s)/;

  /* data-src wins over src. An editor that renders media in place may have to
     load a picture from a different path than the one it writes to the file —
     scenario media is authored relative to gym/ — and the authored path is the
     one that belongs in the source. */
  /* The body of a fenced block, as lines.

     markdown() renders the label through CSS, which cannot be typed into, so an
     editor may put a real .SFpre-label element inside the block instead — that
     element is the label, and never part of the body.

     A caret inside a <pre> also produces markup rather than newlines: pressing
     Enter leaves a <br> in some engines and a <div> in others, and textContent
     renders both as nothing. Both mean a line break here. */
  function preLines(pre, labelEl) {
    var clone = pre.cloneNode(true);
    var label = labelEl ? clone.querySelector('.SFpre-label') : null;
    if (label && label.parentNode) label.parentNode.removeChild(label);

    var doc = pre.ownerDocument;
    var brs = clone.querySelectorAll('br');
    for (var i = 0; i < brs.length; i++) brs[i].parentNode.replaceChild(doc.createTextNode('\n'), brs[i]);
    var blocks = clone.querySelectorAll('div, p');
    for (var j = 0; j < blocks.length; j++) {
      if (blocks[j].previousSibling) blocks[j].parentNode.insertBefore(doc.createTextNode('\n'), blocks[j]);
    }
    return clone.textContent.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  }

  function mediaSource(el) {
    var scale = el.getAttribute('data-scale');
    var url = el.getAttribute('data-src') || el.getAttribute('src') || '';
    return '%(' + url + (scale ? ' | ' + scale : '') + ')';
  }

  function inlineSource(node) {
    var out = '';
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) { out += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      var tag = n.tagName.toLowerCase();
      if (tag === 'br') out += '\n';
      else if (tag === 'strong' || tag === 'b') out += '**' + inlineSource(n) + '**';
      else if (tag === 'em' || tag === 'i') out += '*' + inlineSource(n) + '*';
      else if (tag === 'code') out += '`' + n.textContent + '`';
      else if (tag === 'img' && n.className.indexOf('SFmedia') > -1) out += mediaSource(n);
      else out += inlineSource(n);
    }
    return out;
  }

  function htmlToSource(root) {
    if (!root) return '';
    var out = [];
    function line(text) {
      // a content line that would otherwise read as a directive needs its escape back
      out.push(BLOCK_DIRECTIVE.test(text.trim()) ? '\\' + text : text);
    }
    function gap() { if (out.length && out[out.length - 1] !== '') out.push(''); }

    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) { if (n.nodeValue.trim()) { line(n.nodeValue.trim()); gap(); } continue; }
      if (n.nodeType !== 1) continue;
      var tag = n.tagName.toLowerCase();
      var cls = typeof n.className === 'string' ? n.className : '';

      if (tag === 'pre') {
        var labelEl = n.querySelector('.SFpre-label');
        out.push('```' + (labelEl ? labelEl.textContent.trim() : (n.getAttribute('data-label') || '')));
        preLines(n, labelEl).forEach(function (l) { out.push(l); });
        out.push('```'); gap();
      } else if (tag === 'figure' && cls.indexOf('SFnews') > -1) {
        var head = n.querySelector('.SFnews-line');
        var flag = n.querySelector('.SFnews-flag');
        var f = flag ? flag.textContent.trim() : '';
        out.push('%news(' + (head ? head.textContent.trim() : '') +
                 (f && f.toLowerCase() !== 'breaking news' ? ' | ' + f : '') + ')');
        gap();
      } else if (tag === 'blockquote') {
        out.push('~' + inlineSource(n).trim()); gap();
      } else if (tag === 'ul' || tag === 'ol') {
        var items = n.children, ordered = tag === 'ol';
        for (var j = 0; j < items.length; j++) {
          if (items[j].tagName.toLowerCase() !== 'li') continue;
          out.push((ordered ? (j + 1) + '. ' : '- ') + inlineSource(items[j]).trim());
        }
        gap();
      } else if (tag === 'img' && cls.indexOf('SFmedia') > -1) {
        out.push(mediaSource(n)); gap();
      } else if (tag === 'hr') {
        gap();
      } else {
        // p, div, headings, anything else: one paragraph of inline content
        var text = inlineSource(n);
        if (!text.trim()) continue;
        text.split('\n').forEach(function (l) { line(l); });
        gap();
      }
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\s+$/g, '');
  }

  /* --- media sizing ------------------------------------------------------- */

  // %(url | 50%) means 50% of the image's own natural width; anything with a unit
  // (200px, 20em) is applied literally. Called once per container after its HTML
  // is inserted, rather than through an inline onload attribute.
  function applyMediaScale(img) {
    var spec = (img.getAttribute('data-scale') || '').trim();
    if (!spec) return;
    // Only a bare number or an explicit percentage scales against the natural
    // width. Testing with parseFloat() alone read "200px" as 200 percent, so the
    // absolute sizes the guide documents never actually worked.
    if (/^\d+(\.\d+)?\s*%?$/.test(spec)) {
      if (!img.naturalWidth) return; // not decoded yet; the load handler will retry
      var px = Math.round(img.naturalWidth * (parseFloat(spec) / 100));
      img.style.width = px + 'px';
      img.style.maxWidth = px + 'px';
    } else {
      img.style.width = spec;
      img.style.maxWidth = spec;
    }
    img.style.maxHeight = 'none';
  }

  function hydrateMedia(root) {
    var scope = root || document;
    var imgs = scope.querySelectorAll ? scope.querySelectorAll('img.SFmedia[data-scale]') : [];
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.complete) applyMediaScale(img);
        else img.addEventListener('load', function () { applyMediaScale(img); }, { once: true });
      })(imgs[i]);
    }
  }

  /* --- sanitising --------------------------------------------------------- */

  // For HTML that did not come from markdown() — the library manifest's summary
  // field, say. Allowlist of tags and attributes; everything else is dropped.
  var ALLOWED_TAGS = ['A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H3', 'H4',
    'HR', 'I', 'IMG', 'LI', 'OL', 'P', 'PRE', 'SMALL', 'SPAN', 'STRONG', 'SUB',
    'SUP', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'U', 'UL'];
  var ALLOWED_ATTRS = ['href', 'src', 'alt', 'title', 'class', 'width', 'height', 'data-scale', 'data-label'];
  var SAFE_URL = /^(https?:|mailto:|\/|\.\/|\.\.\/|#|data:image\/)/i;

  function sanitizeHTML(html) {
    if (typeof document === 'undefined') return '';
    var doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    var doomed = [];
    var el;
    while ((el = walker.nextNode())) {
      if (ALLOWED_TAGS.indexOf(el.tagName) === -1) { doomed.push(el); continue; }
      for (var i = el.attributes.length - 1; i >= 0; i--) {
        var attr = el.attributes[i];
        var name = attr.name.toLowerCase();
        if (ALLOWED_ATTRS.indexOf(name) === -1) { el.removeAttribute(attr.name); continue; }
        if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === 'A') { el.setAttribute('rel', 'noopener noreferrer'); }
    }
    // unwrap disallowed elements, keeping their text
    doomed.forEach(function (node) {
      if (!node.parentNode) return;
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') { node.remove(); return; }
      while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
      node.remove();
    });
    return doc.body.innerHTML;
  }

  /* --- export ------------------------------------------------------------- */

  global.TTXF = {
    parse: parse,
    serialize: serialize,
    markdown: markdown,
    inline: inline,
    escapeHTML: escapeHTML,
    durationToSeconds: durationToSeconds,
    sanitizeHTML: sanitizeHTML,
    hydrateMedia: hydrateMedia,
    applyMediaScale: applyMediaScale,
    GLOBAL_KEYS: GLOBAL_KEYS,
    STAGE_KEYS: STAGE_KEYS,
    htmlToSource: htmlToSource,
    MEDIA_CSS: MEDIA_CSS,
    MEDIA_HYDRATE_JS: MEDIA_HYDRATE_JS,
    setNewsBackdrop: setNewsBackdrop,
    CODE_CSS: CODE_CSS,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.TTXF;

})(typeof window !== 'undefined' ? window : globalThis);
