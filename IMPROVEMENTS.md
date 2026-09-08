# TTX Gym — Fixes & Improvements

Tracking list from the codebase audit. Ordered roughly by payoff and risk.
Mark items `[x]` as they land.

---

## Phase A — Shipped content & trivial fixes

- [x] **A1. `hct1.ttxf` stage 4 has no content.** `! conten` typo at
  `lib/scenarios/hct1.ttxf:151` means "Stage 4: Increased targeting" ships with an
  empty body on both the facilitator card and the participant screen.
- [x] **A2. Report body font typo.** `REPORT_CSS` sets `font-family:"m",Arial`
  (`gym/index.html:1679`). Should be `Montserrat`, which is already imported and used
  by the headings.
- [x] **A3. Exported reports break on embedded images.** `processMarkdown` emits
  `<img class="SFmedia" onload="applySFmediaScale(this)">`, but `REPORT_CSS` has no
  `.SFmedia` rule and `REPORT_HEADER` ships no script. Every image throws
  `applySFmediaScale is not defined` and renders at full natural size with no
  `max-width`. Affects `cold_start` and `mptar`.
- [x] **A4. Dead weight is published live.** Removed `old/` (a full duplicate of the
  site), `test/`, `guide_old.html`, `gym/index_old.html`, `lib/scenarios/tlosd1.json`,
  and — once `old/` and `test/` went — the now-orphaned `css/` and `images/`
  directories, which nothing on the live site referenced. Also removed 13 orphaned
  `.png` cover images in `lib/images/` (4.1 MB) duplicating the `.jpg` files the
  site actually loads, and the render-blocking `Material+Icons` stylesheet that all
  five live pages requested but only the retired `old/` design ever used.

  _Left in place deliberately:_ 12 unreferenced files in `lib/exercise_data/`
  (`TTXGYM_Hacker_teal.png` and friends). Unlike the above these are not leftovers —
  they are a coherent icon set for scenario authors, and six of the same set are in
  use by `cold_start` and `mptar`. Your call whether to keep the rest.

- [x] **A5. No favicon, meta description, or Open Graph tags** on any page. A shared
  library link previews as nothing.

## Phase B — Gym player bugs

- [x] **B1. The conclusion leaks between scenarios.** `finish` is a module-level
  object; `gym/index.html:2163` overwrites `finish.content` and never restores the
  default. Load a scenario with a `! conclusion`, then one without — the second shows
  the first one's debrief.
- [x] **B2. Launching the participant window mutates exercise state.**
  `gym/index.html:3203` fakes a state push with
  `setTimeout(() => { nextStage(); previousStage(); }, 750)`. From the intro that
  starts the timer and marks stage 0 complete; from Finish it walks back a stage. The
  750 ms is also a race. Needs a real ready/state handshake.
- [x] **B3. The pause overlay can get stuck.** `toggleTimer` (`gym/index.html:2867`)
  is guarded to numbered stages. Pause on stage 2, click the Intro or Finish marker,
  and the overlay stays up with no way to dismiss it.
- [x] **B4. Notes are only autosaved on blur.** The sole listener is `change`
  (`gym/index.html:1955`), which for a textarea fires on blur. Close the tab while
  still typing and the notes are gone.
- [x] **B5. Editor preview never autosaves and the indicator lies.** The
  `localStorage` preview path (`gym/index.html:1959`) never sets `sessionKey`, so
  `scheduleSave` no-ops while the indicator has already switched to "Saving…".
  `fileName` is undefined there too, so the sidebar reads `undefined`.
- [x] **B6. Session restore aborts silently on a quoted answer.**
  `gym/index.html:2028` builds a selector from raw answer text; any `"` throws and the
  bare `catch {}` swallows it, losing *all* answers and notes with no message.
- [x] **B7. Division by zero on a single-option rating question.**
  `gym/index.html:3024` divides by `options.length - 1` → `NaN%` in the summary and
  report.
- [x] **B8. `exerciseComplete` latches true.** `completion` is only updated inside the
  `answeredQuestions > 0` branch (`gym/index.html:2985`, `:3070`) and never resets, so
  the Finish marker shows complete on an exercise where nothing was answered.
- [x] **B9. Garbage files load "successfully".** The guard at `gym/index.html:2145`
  checks `!fileContent.stages`, but the parser always returns `{stages: []}`. A random
  `.txt` yields an empty exercise with no error.
- [x] **B10. Quiz feedback is not restored** with a restored session — the
  correct/incorrect marks vanish on reload.
- [x] **B11. Stage position is not persisted.** Restoring drops you back at the intro
  with the timers restored, and the restore happens silently with no way to decline.
- [x] **B12. Library modal ignores the Back button.** `openModal` pushes history state
  (`library.html:873`) with no `popstate` handler. A failed `manifest.json` fetch only
  reaches `console.error`, leaving a permanently empty gallery.
- [x] **B13. `100vh` with `html{overflow:hidden}`** cuts the stage-navigation footer off
  on mobile Safari. Wants `100dvh`.
- [x] **B14. `role="button"` handlers respond to Enter but not Space**, and Space
  doesn't `preventDefault`, so it scrolls the page.

_Phase B is covered by 55 regression tests (46 gym + 9 library) driving the real
pages under jsdom. Two extra bugs surfaced while fixing these and were fixed with
them: `btoa()` threw on any non-Latin1 filename (reported to the user as a bogus
"parse error"), and `#parse-error` lived inside the pane that stays hidden until a
scenario loads, so a failed **first** load displayed nothing at all._

## Phase C — The `.ttxf` format

- [x] **C1. Three parsers that disagree.** The gym (`gym/index.html:3227`), the editor
  (`editor.html:1888`), and a third in `old/`. They already differ — the gym's
  multiline-flush list omits `++ `, and the gym escapes scalars while the editor
  doesn't. Extract one `js/ttxf.js` used by both.
- [x] **C2. Double-escaped apostrophes render literally.** The parser escapes question
  and stage text (`gym/index.html:3272`, `:3280`) and the renderer writes it with
  `textContent`. Five shipped questions currently display `organisation&#039;s`. The
  same string goes through `innerHTML` in the summary (`:3018-3030`), so it renders
  correctly there — one string, two appearances.
- [x] **C3. `processMarkdown` is duplicated and the copies disagree.** `%(url | 50%)`
  means 50% of the image's *natural* width in the gym and 50% of the *container* in
  the editor, so the builder preview doesn't match what facilitators see. Discussion
  points are raw HTML in the gym and escaped in the editor preview.
- [x] **C4. The guide documents behaviour the code doesn't have.** `guide.html`
  claims "Lines without a blank line between them are joined into one paragraph";
  `processMarkdown` wraps every non-blank line in its own `<p>`.
- [x] **C5. Content directives are unescapable.** Any content line starting with
  `# `, `+ `, `? `, `@ `, or `! ` terminates a multiline block and gets misparsed — a
  Markdown heading inside stage content silently corrupts the file.
- [x] **C6. The parser has no error reporting.** `PARSE_ERRORS` is declared and never
  used; unknown `! key` names are accepted silently (this is what hid A1); `MAX_ML`
  truncates content over 10,000 chars mid-block with no warning.
- [x] **C7. Scenario files can run arbitrary JavaScript.** Content, discussion points,
  and prompts all reach `innerHTML` unescaped. The whole model is "download and share
  `.ttxf` files", so this needs a sanitiser or a documented trust boundary.

## Phase D — Editor

- [x] **D1. No autosave and no `beforeunload` guard.** A refresh loses all work.
- [x] **D2. Quiz answers are stored by text, not index** (`editor.html:1594`).
  Duplicate answer strings mark both correct, and an empty correct answer can never
  be marked.
- [x] **D3. No validation.** Nothing warns about a stage with no content, a question
  with fewer than two answers, or an empty title.

## Phase E — Portability

- [x] **E1. Every library scenario hardcodes `https://ttxgym.com/…` for images**, so
  the tool can't run from a local copy or offline — pointed, for `cold_start`, a
  scenario about surviving a sustained loss of critical IT.

---

## Verification

`npm test` — 188 tests across six suites. They load the real pages into jsdom and
drive them the way a user would (choosing a file through the file input, clicking
stage markers, pressing keys), rather than testing extracted copies of the code.
See `tests/README.md`.

```
ttxf.js module        55 passed, 0 failed
gym player            46 passed, 0 failed
format integration    29 passed, 0 failed
scenario builder      29 passed, 0 failed
exercise library      13 passed, 0 failed
participant window    16 passed, 0 failed
TOTAL: 188 passed, 0 failed
```

jsdom is a dev dependency only; the site itself still ships no JavaScript
dependencies and needs no build step.

## Also fixed along the way

Found while fixing the items above, all covered by tests:

- **`parseFloat('120px') === 120`**, so `%(url | 200px)` — an absolute size the
  guide documents — was silently applied as *200 percent* of the image's natural
  width. Only a bare number or an explicit `%` scales now.
- **`btoa()` throws on any non-Latin1 filename**, and the caller's `try/catch`
  reported that to the user as a bogus "Error parsing scenario file". Session keys
  are now hashed, which also fixes collisions between long names sharing a prefix
  (the old key was a 20-character base64 prefix).
- **`#parse-error` lived inside `#scribe-inner`**, which stays hidden until a
  scenario loads — so a failed *first* load displayed nothing at all. It is now a
  direct child of `<main>`.
- **`Material+Icons` was loaded render-blocking on all five live pages** and is
  only used by the retired `old/` design. Removed.
- **The participant window's background image was set with an unquoted `url()`**,
  which breaks on any path containing spaces or parentheses, and there was no
  branch to *clear* a background once set.
- **The library search matched raw HTML**, so a query of "p" or "b" matched every
  scenario through its summary markup rather than its words.
- **The editor's export filename** came from `title.replace(/\s+/g,'-')`, which
  left quotes, slashes and colons in the filename.
- **A stray ``` fence at the end of `tlosd1.ttxf`** — leftover from a markdown
  paste. Silently ignored before; the new parser reported it.
- **`exportScenario()` produced an empty file after a builder preview**, because
  the preview path never set `rawFileData`.

## Behaviour changes worth knowing about

Two fixes change what existing scenarios look like on screen:

1. **C4** makes consecutive content lines join into one paragraph, which is what
   the guide has always documented. Previously every line became its own `<p>`.
   The shipped scenarios are written one sentence per line with blank lines
   between paragraphs, so they now read as intended prose — but every scenario
   will look different from before. This is the one change worth eyeballing.
2. **C2** means five shipped questions stop displaying `organisation&#039;s` and
   start displaying `organisation's`.

Changing the autosave key format also orphans any in-flight saved session from
before this work. Nothing is lost that was not already only in a browser.

---

# Phase F — Features

From the facilitator's-eye review. Scenario variables were considered and dropped:
they push scenario authoring towards templating for a benefit that "Customise in
Builder" delivers through a path people already understand.

## F1 — The session artifact

- [x] **F1.1 `.ttxs` session file.** The tool has a documented format for input and
  nothing for output: results live in an HTML report you cannot reopen and in
  `localStorage` you cannot see, move or share. A self-contained session file
  (scenario source + responses + notes + actions + timings + meta) unblocks resume,
  handover to a co-facilitator, and comparison between runs. Needs no backend.
- [x] **F1.2 Import a session** to resume it, on any machine.
- [x] **F1.3 Compare against a previous run.** The finish screen tells people to run
  the exercise again to see how things have changed, and offers no way to see it.

## F2 — Capturing the room

- [x] **F2.1 Response tallies.** Every confidence rating is currently one radio
  button pressed by one person on behalf of a room. The interesting signal in a
  tabletop is *disagreement* — the CISO and the sysadmin answering differently — and
  a single answer averages it away before it is recorded. Record counts per option;
  one click still means one response, so the fast path is unchanged.
- [x] **F2.2 Actions, owners and due dates.** The output of a tabletop is an action
  plan. The tool produces a score and free text. The default conclusion even asks
  people to allocate recommendations to named colleagues, with nowhere to type it.
- [x] **F2.3 Session details** — date, facilitator, attendees, objectives, scope — so
  the report is a record rather than a printout.

## F3 — Honest scoring

- [x] **F3.1 Stop blending confidence with quiz accuracy.** A 5-point self-assessment
  and a right/wrong knowledge question are averaged into one "Indicative Score",
  which is a category error and invites teams to optimise the number rather than
  surface weakness.
- [x] **F3.2 Lead the report with the lowest-confidence areas** instead of a headline
  percentage, and show the distribution of responses rather than a point estimate.

## F4 — Running the room

- [x] **F4.1 Per-stage target durations** (`! duration:`), with the timer going amber
  then red. The clock currently counts up into a void.
- [x] **F4.2 Presenter-remote navigation.** Facilitators drive these from the front of
  the room with a clicker sending PageUp/PageDown. The gym has no keyboard navigation.
- [x] **F4.3 A live mirror of the participant view** in the dashboard, so you can see
  what the room sees without alt-tabbing.
- [x] **F4.4 Blank the participant screen** for breaks and side conversations.
- [x] **F4.5 Ad-hoc injects** — push a free-text event to the participant screen
  ("the press just called") without editing the scenario.
- [x] **F4.6 A light, high-contrast projector theme** for the participant window. The
  dark theme is lovely on a laptop and washes out in a lit room.
- [x] **F4.7 Warn before closing a live exercise.** The builder now warns; the gym
  does not, despite holding a running session.

## F5 — Getting started

- [x] **F5.1 Run a demo exercise** from the welcome screen. You currently land on the
  gym and are asked to load a file you do not have.
- [x] **F5.2 "Customise in Builder"** from the library, so tailoring a scenario to
  your organisation is one click rather than download-then-import.

---

## Phase F verification

`npm test` — 275 tests. The new `test-f.js` suite covers the features above by
driving the real pages: clicking option buttons to build a tally, pressing
PageDown, exporting a session and resuming it in a fresh window.

```
ttxf.js module        55 passed, 0 failed
gym player            47 passed, 0 failed
format integration    29 passed, 0 failed
scenario builder      37 passed, 0 failed
exercise library      14 passed, 0 failed
participant window    26 passed, 0 failed
features              67 passed, 0 failed
TOTAL: 275 passed, 0 failed
```

## Phase F notes

- **The shipped library now has stage durations.** Each scenario's declared total
  from `manifest.json` was split evenly across its stages, holding back about 15%
  for the intro and debrief, rounded to the nearest 5 minutes. That is a sensible
  default rather than considered pacing — the numbers are worth tuning per stage by
  someone who knows the material.
- **Sessions saved before this work still load.** The old shape stored one answer
  per question keyed by its text; that is migrated to a tally of one on read.
- **`! duration:`** is optional. A scenario without it shows a plain count-up clock
  exactly as before.
- **The report is restructured**: session details, then actions, then the
  lowest-confidence questions, then stage-by-stage with response distributions.
  The scenario summary moved to the end — it is context, not a finding.

---

## Fix — the builder's preview into the gym

**Reported:** loading a scenario from the library with *Customise*, then *Preview in
TTX GYM*, showed "Error decoding preview data."

**Cause:** a temporal dead zone. The gym loaded a preview from `localStorage` in the
middle of script evaluation, at roughly line 2795. That reached
`buildSessionMetaPanel()`, which reads the `META_FIELDS` constant declared at line
4589 — still in its TDZ, so it threw a `ReferenceError`, which the surrounding
`catch` reported as a decoding problem.

Nothing about the library, the *Customise* link or the builder was wrong; they
handed over exactly the right file. Only the preview entry point was affected,
because `?q=` loads inside a `fetch().then()` and so runs after the script has
finished evaluating. The Phase F work introduced it: `META_FIELDS` was the first
late-declared `const` reachable from `populateScenario()`.

**Fix:** page startup no longer runs mid-script. The preview and `?q=` paths moved
into `startFromLocation()`, called at the very bottom of the script once every
declaration exists. That retires the whole class of ordering bug — the same trap
caught `onTimedStage` earlier in this work. The `catch` also logs the real error
and reports it, rather than replacing it with a guess.

**Covered by** `tests/test-flow.js`: the full library → builder → gym chain for all
14 scenarios, plus a check that the three ways into the gym (`?q=`, a builder
preview, and the demo button) all leave the page in the same working state.

---

## Session details and actions — follow-up

- **Removed "Objectives and scope".** The scenario summary on the intro card already
  states what the exercise covers, so the field asked people to write it twice.
- **The date defaults to today**, computed in local time (`toISOString()` rolls back
  a day for anyone east of UTC). A resumed session keeps the date it was run on
  rather than being stamped with today's.
- **The calendar glyph is visible on a dark field.** `color-scheme: dark` on the
  inputs makes the browser draw native controls for a dark surface, with a
  `::-webkit-calendar-picker-indicator` filter as a fallback.
- **Margins line up.** `.session-meta` and `.actions-area` were missing the
  `0 1rem` horizontal inset that `.sc_content`, `.talk`, `.prompt` and `.notes-area`
  all use, so both ran full-bleed to the card edges. All six now match, the field
  grid is capped at `46rem` on wide screens, and the date field no longer stretches
  to half the card.
- **Reordered the intro card** to content → facilitator tips → session details, so
  the explanation comes before the fields it explains.
- **Actions rest as a single quiet link.** A stage with no actions shows only
  "+ Record an action" beneath the notes box; the labelled panel appears once there
  is something in it. Same structure, roughly a third of the resting furniture.

---

## Sidebar

It had reached fifteen flat controls in three groups that did not describe how any
of them are used. "Scenario" in particular was a catch-all holding four different
jobs at once — two ways to start, three ways to export, one analysis tool, and two
destructive actions sitting immediately below *Save Session*.

Regrouped around the shape of a session rather than by object type:

| Group | Holds | Why |
| --- | --- | --- |
| **Scenario** | Load Scenario, Open Session | The two ways in. All that shows before anything is loaded. |
| **Present** | Participant Window, Blank Screen, Send Inject, Pause/Resume | Everything that changes what the room sees. |
| **Wrap Up** | Present Summary, Export Report, Save Session, Compare With Previous Run | Getting the results out. |
| **More** | Toggle Fullscreen, Download Scenario File, Clear All Answers, Reset Scenario | Collapsed. Rare or destructive. |
| **Timing** | Stage clocks, Total | Last. A readout, not a group of controls. |

- **Three controls at rest**, eleven with a scenario loaded, down from fifteen flat.
- **Reset and Clear moved behind the disclosure** and are styled as destructive —
  muted, red on hover. They previously sat one row below *Save Session*, which is a
  misclick you cannot undo.
- **Dropped "Stage Duration"** — a non-clickable label styled as a link, made
  redundant by the *Timing* heading it now sits under.
- **"Launch" became "Participant Window"**, which says what it opens.
- Separators moved to sit *between* sections rather than above every heading, and
  icons sit at 65% opacity until hovered, so the labels lead.

Covered by `tests/test-sidebar.js`, which pins the grouping, the resting state, the
collapsed disclosure, and that every control still has an action, a keyboard role
and a unique id.

### Controls versus readouts

Pausing is something you *do* to the room, so it moved in with the other things you
do to the room. The stage clocks are something you *read*, so they moved to the foot
of the sidebar and stopped pretending to be a menu: no hover state, no pointer
cursor, tabular figures, and a dot marking whichever stage is actually running. The
list caps at `12rem` and scrolls, so a nine-stage scenario cannot push everything
else off screen.

This also removed "Stage Duration", a heading-shaped item that was never clickable.

`tests/test-sidebar.js` now also checks that the sidebar markup is balanced and that
all five sections are inside the scrolling column — moving blocks of markup around is
exactly how a container ends up closed early with half the sections escaping it,
which is what happened on the first attempt at this.

---

# Phase G — Authoring, choosing, and orientation

## Builder

- [x] **G1. Answer presets.** 133 of the 140 questions in the shipped library used
  the same five-point confidence scale, and there were only 9 distinct answer sets
  across all of them — somebody typed those five options 133 times. New questions
  now start with that scale already filled in, and an **Answers** dropdown swaps it
  for agreement, maturity, frequency or yes/no, or clears it to write your own.
  Imported questions keep whatever they came with.
- [x] **G2. Duplicate stage.** A nine-stage exercise is usually nine variations on
  one structure. Copies content, duration, discussion, prompts and questions, with
  fresh ids so the copy is genuinely independent.
- [x] **G3. "9 stages · 31 questions · 1h 30m planned"** above the stage list. An
  author previously had no way to tell whether they had written a 45-minute exercise
  or a three-hour one.
- [x] **G4. Import asks before replacing.** `confirmImport()` silently discarded
  whatever was in the builder, which sat oddly next to the draft-recovery work.

## Library

- [x] **G5. "What's inside".** The modal gave title, author, level, duration, tags
  and prose, but not the one thing that decides whether a scenario fits your
  session: what actually happens in it. Now lists every stage title with its
  planned duration, plus counts of stages, questions and quiz questions.
- [x] **G6. Search reaches the stages.** It matched only the title and the blurb, so
  searching "phishing" missed scenarios whose stages are entirely about phishing.
- [x] **G7. Clear filters**, shown only when something is filtering.

Scenario bodies are fetched once in the background on load, which powers G5 and G6
from the same data.

## Gym

- [x] **G8. Participants can see where they are.** The participant screen showed the
  stage title and nothing about position. It now reads "Stage 3 of 9" with a marker
  per stage, in the left of the bottom bar — alongside the text-size and theme
  controls, where it never competes with the content or pushes it down the screen.
- [x] **G9. Facilitator pack.** Preparing meant clicking through every collapsible
  in turn. Under **More**, this lays the whole scenario out as one printable
  document — each stage with its duration, content, discussion points, prompts and
  questions, correct quiz answers marked, prompts labelled as not shown to
  participants.

## Content

- [x] **G10. One confidence scale, not two.** Twelve scenarios wrote
  `Not at all confident`; `harw1` and `hct1` wrote `1. Not at all confident` across
  all 29 of their questions, so participants in those two saw numbered options and
  nobody else did. Normalised — 133 questions now share one answer set.

  The numbered answers in `cold_start` were **kept**: the facilitator prompts above
  that question refer to "Answer 1"…"Answer 4", so the numbering is a
  cross-reference rather than decoration. An automated pass had stripped it; caught
  on review.

---

## Participant window — placement and the light theme

The progress indicator moved out from under the title into the left of the bottom
control bar, so the content keeps the full height of the card and the footer reads
as "where you are · how to adjust the view".

Chasing "make the colours work in light mode" turned up more than the progress bar.
The projector theme had been built as a patch — a handful of `body.projector`
overrides bolted onto a palette written for dark — so anything added afterwards was
dark-only by default until someone noticed. The audit found:

- **The pause overlay was unreadable in light mode.** `.overlay-card` kept its dark
  background while the body text colour flipped to near-black: dark text on a dark
  card. Nobody had paused the participant screen while in projector mode.
- Chart axis labels, section headings and the pause icon were all fixed light greys
  on what is now a white card.
- The text-size glyph had its fill written inline, so it followed neither theme.

Rather than add more overrides, both themes are now **the same 14 tokens** with
different values — `--muted`, `--icon`, `--heading`, `--card`, `--card-line`,
`--scrim`, `--track`, `--track-done` and so on. No rule below the two palettes names
a colour, so anything added from here follows both themes automatically.

The one deliberate exception is `#blankout`, which stays `#0b0e14` in both: blanking
is a screen-off state, not a page.

`tests/test-participant.js` now asserts the two palettes define the same token set
and that no rule outside them pins a colour to one theme — which is the check that
would have caught the pause overlay when it was written.

---

## "What's inside" — formatting

The block was appended to the modal with `margin-top` and no horizontal padding, so
it ran flush to the modal edges while every band above it was inset by `1.5rem`, and
the margin left dead space under the meta pills.

The modal body is a stack of bands that each carry their own `1.5rem` gutter and a
full-width rule as a separator. `#modal-inside` now follows that pattern —
`padding: 0.9rem 1.5rem 1rem` with a `border-top` — instead of inventing its own
spacing.

Also:

- **Moved it above the meta pills.** Level/author/duration read as a footer strip;
  the stage list is content and belongs with the summary it elaborates on. The
  pills now sit last with `margin-top: auto`, so they stay at the bottom of a short
  modal.
- **Stage rows align their durations** down the right-hand edge (`flex` with
  `space-between`) rather than trailing the title inline, so the timings read as a
  column.
- `#modal-summary` no longer has `flex: 1` — it was stretching to absorb slack that
  now belongs to the footer strip.

`tests/test-lib.js` asserts all five bands share one gutter, that the block sits
between the summary and the pills, and that it collapses completely when a scenario
body cannot be loaded.

### Test helper fix

Four suites defined `eq()` with `a !== b`, which silently never matches for arrays —
an assertion comparing two identical arrays would fail with "expected [...] got
[...]" printing the same thing twice. Normalised to a JSON comparison across all
nine suites; that is what was behind three confusing failures during this work.

---

## The cover image in light mode

The projector theme had been hiding the blurred cover image outright
(`body.projector #bgimg{display:none}`) because the dark-mode treatment —
`brightness(0.6)` — is exactly wrong behind a white card. Hiding it lost the sense
of place the image gives the room.

It now stays in both themes with the treatment inverted, as two more tokens:

| | dark | light |
| --- | --- | --- |
| `--bg-filter` | `blur(8px) brightness(.6)` | `blur(10px) brightness(1.45) saturate(.55)` |
| `--bg-opacity` | `1` | `.4` |

Darkened behind a dark card; brightened, desaturated and faded back behind a light
one. The card is translucent in both (`--card-bg` at 96%), so the image reads
faintly through it either way, and the light card's shadow was deepened a little to
lift it off the image now that there is one behind it.

While there, `--ground` replaced a hardcoded page background and the unused `--mid`
was removed. The participant window is now 16 tokens, all used, all overridden in
both themes.

---

# Phase H — Keeping the promises on the landing page

## H1 — The gym stopped working as a downloaded file

The landing page promised "all functionality in one single HTML file — download it
for local or offline use". Extracting `js/ttxf.js` in Phase C broke that: saving
`gym/index.html` alone gave `ReferenceError: TTXF is not defined`, and it failed
**silently** — the welcome screen rendered, you clicked "Try a demo exercise", and
nothing happened. A regression introduced by this work, against a stated property,
with no visible symptom.

`tools/build-standalone.js` inlines the module into `gym/standalone.html`
(`npm run build`), so the shared parser and the single-file promise can both exist.
A test rebuilds it in memory and fails if the committed file has fallen behind, and
another opens it from a `file://` URL with `fetch` rejecting to prove the whole tool
— demo, navigation, responses, scoring, facilitator pack, session export — works
with no network.

Linked from the landing page's *Portable* card and documented in the guide,
including the two honest caveats: embedded images still need the network, and some
browsers block storage on `file://` pages.

## H2 — localStorage throws on `file://`, and took the page with it

Found by actually opening the standalone build offline rather than reasoning about
it. Browsers refuse `localStorage` for opaque origins, and every call in the gym was
unguarded — the first one threw at startup.

All facilitator-side access now goes through a `store` helper that fails soft, and
when storage is unavailable the gym says so once and points at **Save Session**
rather than letting every autosave fail quietly. The save indicator no longer
claims "Saved" when nothing was saved.

**The first version of that helper was wrong.** The regex that rewrote
`localStorage.x(` to `store.x(` also rewrote the inside of `store` itself, so every
method called itself:

```js
get(key) { try { return store.get(key); } catch (e) { return null; } }
```

Infinitely recursive, and it *looked* fine — reads returned `null`, which is a
plausible answer. The test written for the blocked-storage path is what exposed it.

## H3 — "No data transferred" was not true

Every page, the participant window and every exported report pulled Montserrat from
`fonts.googleapis.com`, handing Google the visitor's IP and referrer, while the
landing page claimed no data left the host machine. For a security-tooling audience
that is a claim people check, and Google Fonts embedding has been found to breach
GDPR in German courts.

Montserrat is now self-hosted (`fonts/`, 218 KB, variable font covering 100–900 in
one file per subset). **The site now makes zero third-party requests**, asserted per
page in the tests. Generated documents point at the site's own stylesheet and fall
back to a system stack offline, and every `Montserrat` declaration now has a real
fallback so first paint and offline both look deliberate.

While there: the Material Icons stylesheet was still on four pages. Phase A used
`replace(..., 1)` without asserting the count, and there were two copies — so it
removed one and I reported the job done. Both are gone now, with the count asserted.

**And removing it broke every icon on the landing page.** The Phase A check that
declared Material Icons unused was `grep -rn "material-icons" . | head` — the `old/`
directory sorted first and filled the ten lines I looked at, so I never saw that
`index.html` uses `<span class="material-icons">` for all eleven of its about-stat
and feature-card icons. The conclusion was drawn from a truncated list and then
carried forward twice: once when I removed the first copy, again when I removed the
second and called it dead weight.

Fixed by converting those eleven to inline SVG, which is how every other page in the
site already draws icons — so the landing page is now consistent with the rest and
the last icon-font dependency is gone rather than restored. The CSS moved from
`font-size`/`color` to `width`/`height`/`fill`.

Guarded by three tests: no page references an icon font, every icon container holds
an `<svg>`, and the landing page still has its eleven.

## H4 — Two other claims corrected

- *Secure* now says "runs entirely in your browser, no third-party requests" rather
  than "no data transferred at any time".
- *Interactive* no longer implies participants interact. They watch a screen kept in
  step with the facilitator; they do not answer on their own devices. That remains
  the one feature that would need a backend.
