# Tests

The site itself is static and has no build step or runtime dependencies. These
tests load the real pages into [jsdom](https://github.com/jsdom/jsdom) and drive
them the way a user would — selecting a file through the file input, clicking
stage markers, pressing keys — rather than testing extracted copies of the code.

```
npm install     # jsdom, dev-only
npm test
```

| Suite | Covers |
| --- | --- |
| `test-ttxf.js` | `js/ttxf.js` in isolation: parsing, serialising, markdown, diagnostics, the sanitiser |
| `test-b.js` | `gym/index.html`: loading, navigation, the timer and pause overlay, autosave and restore, scoring |
| `test-c.js` | The format end to end in the gym, against all 14 shipped scenarios |
| `test-editor.js` | `editor.html`: import/export round-trips, the visual preview, drafts, validation |
| `test-lib.js` | `library.html`: the gallery, filtering, history, and a hostile manifest |
| `test-participant.js` | The participant window the gym generates at runtime |

`harness.js` boots a page under jsdom with the small set of stubs it needs
(`BroadcastChannel`, `localStorage`, `URL.createObjectURL`).

Note that top-level `let`/`const` in a classic script are script-scoped rather
than properties of `window`, so the harness reads and writes that state through
`ev(w, 'expression')`, which evaluates in the page's own global scope.
