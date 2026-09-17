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
| `test-editor.js` | `editor.html`: the outline, the WYSIWYG fields, questions and the audience split, the participant view, problems, drafts, the image picker |
| `test-handoff.js` | The ways in and out of the builder: `?load=` from the library, the handoff to the gym, downloads, and a round trip of every shipped scenario |
| `test-lib.js` | `library.html`: the gallery, filtering, history, and a hostile manifest |
| `test-participant.js` | The participant window, shared by the gym and the builder (`js/participant-view.js`) |
| `test-f.js` | Features across pages |
| `test-flow.js` | Page-to-page journeys: library → builder → gym |
| `test-sidebar.js` | The gym's sidebar |
| `test-standalone.js` | `gym/standalone.html` and the offline build |

`harness.js` boots a page under jsdom with the small set of stubs it needs
(`BroadcastChannel`, `localStorage`, `URL.createObjectURL`).

`editor.html` was rebuilt from the ground up in 2026; the suite that tested the
page it replaced is retired, and the suite that compared the two across all 39
shipped scenarios is preserved at commit `5007bbc`, the last commit where both
pages existed.

Note that top-level `let`/`const` in a classic script are script-scoped rather
than properties of `window`, so the harness reads and writes that state through
`ev(w, 'expression')`, which evaluates in the page's own global scope.
