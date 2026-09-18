# Exercise Builder — redesign

Design and progress log for the rebuilt builder. It was developed as
`builder.html` alongside the page it replaces, and took over `editor.html` at
step 8b.

Companion document: [BUILDER-UX-REVIEW.md](BUILDER-UX-REVIEW.md).

---

## The idea in one line

**Author one stage at a time, with what the room sees plainly separated from
what only you see, and the shape of the whole exercise always in view.**

## The organising principle: two audiences

The format draws a hard line through every stage, and the gym enforces it in a
single function:

| the room sees | facilitator only |
| --- | --- |
| title, `! content`, `# discussion`, visible questions, image | `# prompts`, `?-` questions, `! duration` |

The builder should draw the same line. The workspace splits a stage into **On
screen** and **Your notes**, styled as two different surfaces rather than one
list of differently-coloured labels. The room preview shows exactly the first
group, so "what will be in front of them" is never a guess.

This also makes `?-` worth using. A participant-hidden question is currently an
obscure toggle; here it visibly moves the question from one side to the other.

**What facilitator prompts are.** Guidance for the person running the exercise —
what to probe, what a good answer sounds like, what to watch for. A flat list,
rendered beneath the stage content in the facilitator view and never sent to the
participant window. They are not bound to answers. Some authors write them as
per-answer commentary (`1) Optimal — …`) and that is a fine style, but the
builder treats them as what they are: notes to self, in whatever order suits.

## Layout

Three zones, replacing one long scroll.

```
┌─ outline ────┬─ stage workspace ─────────────┬─ room ──────┐
│ Title        │  ▸ 3. Containment    10 mins  │             │
│ Author       │                               │  what the   │
│ Summary      │  ON SCREEN                    │  participants│
│              │   Content       [syntax bar]  │  will see    │
│ ── stages ── │   ┌────────────────────────┐  │             │
│ 1 Detection ▓│   └────────────────────────┘  │             │
│ 2 Triage   ▓▓│   Discussion         + add    │             │
│▸3 Containment│   Question + answers          │             │
│ 4 Eradicate ▓│                               │             │
│ 5 Recovery ▓ │  YOUR NOTES                   │             │
│ ── debrief ──│   Prompts            + add    │             │
│ Conclusion   │   Hidden questions            │             │
│ 48 / 60 mins │                               │             │
└──────────────┴───────────────────────────────┴─────────────┘
```

**Outline (left).** Metadata, the stages as a list, the debrief, and planned
versus declared time at the foot. Click to focus, drag to reorder. A bar per
stage shows its share of the running time, so pacing is visible while authoring.

**Workspace (centre).** One stage, split by audience. This is what removes the
~95-input scroll: the author sees the inputs for the stage they are on.

**Room (right).** The participant view, live and collapsible — the thing being
authored, not a tab to remember.

## Decisions taken

**One stage at a time, not all of them.** The single biggest cause of the
current builder feeling heavy is that it renders every input at once. Focus mode
costs a click to switch stage and buys orientation everywhere else.

**Split every stage by audience.** See above. This replaces an earlier plan
built on a misreading of what `# prompts` is; the split is the real structure
and is worth designing around.

**The outline is the navigation, and also the map.** It answers "how long is
this", "how many stages", "where am I" and "what is unfinished" in one place.

**Content areas are WYSIWYG.** Reversing an earlier decision, on evidence.

The worry was that editing rendered output would fight the round-trip guarantee.
So the risky half was built first and measured: a ~60-line DOM-to-TTXF converter,
run over every stage body in the shipped library.

| | |
| --- | --- |
| stage bodies round-tripped through HTML and back | 230 |
| render identically afterwards | 229 (99.6%) |
| byte-identical afterwards | 175 (76%) |

Of the 55 that differ, **45 differ only because soft line breaks inside a
paragraph get re-wrapped** — `markdown()` joins consecutive lines into one
paragraph, so "the author pressed Enter here" is not recoverable from the HTML.
Nine differ by whitespace alone and one by a stray leading space.

That is a small, well-understood loss, and it has a clean mitigation: **keep each
stage's original source and only re-serialise the ones actually edited.** An
author who edits stage 3 gets a one-stage diff; the other stages keep their bytes
untouched. File churn then reflects real edits rather than the act of opening a
file.

The format's smallness is what makes this tractable — ten node types, not a
general HTML editor: paragraph, bold, italic, code, bullet, numbered,
blockquote, fenced block, image, news frame.

**A source toggle stays.** Every content area can be flipped to raw `.ttxf`
text. It is the escape hatch when the visual editor does something unexpected,
the answer for authors who prefer typing, and the thing that makes shipping the
WYSIWYG safe rather than a bet.

**Blocks are widgets, not markup.** An image, a news frame and a fenced artefact
are atomic non-editable nodes in the editable region, each with its own edit
affordance. The author never sees `%news(…)` unless they ask for the source.

**Paste is sanitised to the ten constructs.** `TTXF.sanitizeHTML` already exists
for exactly this shape of problem; pasting from a browser or a document must not
smuggle in markup the format cannot express.

**Structured content becomes structured.** Questions, answers, discussion points
and prompts are objects with their own controls, not lines the author formats by
hand.

**Round-trip fidelity is non-negotiable.** Everything goes through `TTXF.parse` /
`TTXF.serialize`. A scenario opened and saved unchanged must produce the same
document, and the existing test asserting that across all 39 shipped scenarios
covers the new builder too.

## Carried over from the existing builder

Live validation from the shared parser, draft autosave with a `beforeunload`
guard, drag-and-drop import with errors surfaced before committing, answer
presets, the syntax insert bar, and the image gallery picker.

## Deliberately new

- **Start from a shape.** 23 of the technical scenarios follow detection →
  containment → eradication → recovery → lessons. A new scenario offers that
  skeleton, or a blank one.
- **Pacing as a budget.** Declared length versus the sum of stage durations,
  shown continuously, with the per-stage share visible in the outline.
- **Decision quality hints.** The content review found the same faults across
  the library: implausible distractors, a correct answer identifiable by being
  the longest, a question that the inject does not set up. Where those are
  cheaply detectable, say so at the point of authoring.

## Plan

| step | state |
| --- | --- |
| 1. UX review | done |
| 2. This design | done |
| 3. Shell: layout, outline, stage workspace, round-trip, autosave | done |
| 4. WYSIWYG content areas, with a source toggle | done |
| 5. Questions, answers and the audience split | done |
| 6. Participant view, pacing, scaffolding | done |
| 7. Import, validation, gallery, syntax bar | done |
| 8a. Parity tests against the existing builder | done |
| 8b. Swap `editor.html` for the rebuild | done |

## Progress log

**Steps 1–2 — documents.** Review and design written.

**After the swap — matching the gym, and a control that lost text.**

*One line means one field.* Discussion points and facilitator prompts were
textareas, and the format writes each as `+ text` on a single line. A newline
typed into one was serialised straight into the file as a line with no directive
above it — the parser dropped it with a warning and **everything after the break
was gone**. They are text inputs now, which cannot hold a newline, and anything
arriving with one has it flattened to a space.

*Colour, measured.* The two palettes turn out to be identical — 24 shared tokens,
none differing — but the builder disagreed with the gym in three concrete ways.

The rail was `--mid` at 232px; the gym's controller is `--surface` at 280px. Same
rail, different page: it is now the same colour, and both take their width from
one `--sidebar-width`.

Sharing that token immediately broke the page, in a way worth recording. A
`var()` that resolves to nothing does not fall back to the property's initial
value — it makes the **whole declaration** invalid. `--sidebar-width` had just
been added to `style.css`, a file browsers had been caching for months, so the
first load after the change had `grid-template-columns: var(--sidebar-width)
minmax(0, 1fr)` collapse to no columns at all: one implicit column, and the rail
across the entire screen.

Two fixes, and a third for next time. The declaration carries a fallback, so the
layout cannot depend on another file having arrived; the stylesheet is requested
with a version, as `js/ttxf.js` already was after the same class of fault; and a
test now collects every structural property on the page that depends on a token
defined elsewhere with no fallback, and fails on any of them. Colour is allowed
to go missing — an unresolved colour just inherits. Layout is not.

`--text-label` existed only in the gym, which added it because `--text-muted`
renders small uppercase labels at about 2.4:1. Measured across this palette,
`--text-muted` is **2.30–2.47:1 on all four grounds — failing AA everywhere** —
and the builder was using it in twenty places, mostly for exactly that kind of
label. The token is now in `style.css` for the whole site, the builder uses it,
and a test computes the ratios rather than trusting the number.

Section labels were 10px/0.08em against the gym's 0.68rem/0.1em. They match.

*"Scenario Builder"* became *"Exercise Builder"*, which is what the navigation on
every page calls it.

*The Source view* had a floor of `9em` at 12px monospace — about half the height
of the editor it replaces — so opening it shrank the field to a slot. It now
shares the floor of the field it stands in for, carries a `rows` fallback for
when the stylesheet has not arrived, and grows to fit its content: a long
artefact scrolling inside a short box is worse than the WYSIWYG someone opened
Source to get away from.

**After the swap — an accessibility pass, and things you could not see how to use.**

*Accessibility.* Audited rather than eyeballed: a script walked the built page
with the picker, the problems list and the participant view all open, and found
**23 faults**. The page had **no headings at all**, so there was nothing to
navigate by; two controls had no accessible name; eighteen fields were labelled
only by placeholder, which vanishes the moment anyone types; and the two main
landmarks were unnamed. Opening the picker also left the focus behind it, so a
keyboard user tabbed on through the page underneath.

All fixed — one `h1`, `h2`s for the rail and the two zones, real labels
throughout, named landmarks, the writing surfaces exposed as multiline text
boxes, the status chip as a live region, and focus moved into the picker and
handed back on close with Tab held inside it. The audit is now ten tests in the
suite rather than a script I ran once, so the next control added without a name
fails the build. Colour contrast is *not* covered — that needs measuring in a
browser.

*The opening and the debrief* were two buttons labelled with an ellipsis, sitting
outside the list of stages although they are screens the room reads. They are now
rows at the top and bottom of the running order, each showing its first line or
saying it is empty. They are visibly not stages: no number, no clock, not
draggable.

*Blocks you could not see how to remove.* A picture, an artefact and a news frame
are not text, so backspace does not obviously apply. Selecting one now brings up
its controls — a remove button on the corner of all three, and the size grip and
percentage only on a picture, which is the only one with a size. Delete works too,
but never while the caret is in text.

*Room to write.* A stage's content had the same floor as a one-line field. It now
has a page-like minimum, and the on-screen zone a floor of its own, so a short
stage does not sit in a sliver at the top of an empty page.

*"Run it"* became *"Preview in TTX Gym"*, which says where it goes.

**After the swap — an artefact you can write.**

The label on a fenced block is drawn with `::before` from `data-label`, which
nobody can type into: renaming an artefact meant deleting the block and inserting
another. The editor now puts a real `.SFpre-label` element inside the block and
suppresses the CSS one, and `TTXF.htmlToSource` reads that element in preference
to the attribute — the same shape as the `data-src` change, extending what the
module will *accept* without changing what `markdown()` *emits*, so the gym, the
report and the participant window are untouched.

The body came with it, because a labelled block you still cannot write in is
half a feature. That needed one real repair: a caret inside a `<pre>` leaves
markup rather than a newline — a `<br>` in some engines, a `<div>` in others —
and `textContent` renders both as nothing, so every line break an author typed
would have vanished. Both are read as newlines now, and both are tested.

Enter is blocked in the label and in a news headline, which are one line each,
and left alone in an artefact body, which is made of lines. The only block left
with nothing to type into is a picture, which is why it is also the only one
still `user-select: all`.

**After the swap — a lost stylesheet, and a block that was not one.**

*The buttons were never styled.* The `.btn` family was defined inside the builder
this page replaced, and went with it. Nine buttons — the whole top bar, the draft
banner, the picker's footer — had been rendering as raw browser defaults since
the swap. Nothing failed, because nothing was checking that a class in the markup
means anything in the stylesheet. There is now a test that collects every
button class the page uses and fails on any with no rule behind it, which is the
general form of the mistake rather than this instance of it.

With them defined at this page's own scale, the top bar could be given a shape:
the page's name, the status as a dot and a word, then making (New, Import) held
quiet, a rule, and sending (participant view, run, download) with one primary
action. The draft banner became an accent-edged strip with its own quiet dismiss,
rather than two identical buttons and a cross.

*Inserting a block.* An artefact, a news frame and a picture are blocks:
`TTXF.htmlToSource` walks the editable's top-level children and only recognises
them there. `execCommand('insertHTML')` at a caret nested the block inside
whatever paragraph the caret was in, where the converter read it as a paragraph
— so an artefact inserted mid-sentence came back as flat prose, fences and all,
and the file lost the block entirely. Inserting into an empty field worked, which
is why it survived this long.

The paragraph is now split at the caret and the block placed between the halves
as a sibling, with the caret left after it. Dropping one onto an existing block
puts it after rather than inside; with no caret at all it goes to the end. Nine
tests cover the positions, because the failure was silent and destructive.

**After the swap — width, and a preview that keeps up.**

The workspace ran at 760px, which suited a column of form fields and not a stage
that now holds rendered prose, images and news frames. It is 1040px, with the
outline trimmed slightly to pay for it.

*The refresh.* Every mutation already called `sendRoom()` — that was measured
path by path, not assumed — but two things could still lose an update, and both
show up as a stale preview rather than as an error.

A message posted before the document inside the iframe exists goes nowhere, and
nothing retried it; the `ready` handshake covered the first mount and nothing
else. Sends are now held until the document answers, and the newest one is
flushed then, with the iframe's `load` as a floor in case `ready` never arrives.

And a burst of keystrokes posted a full participant re-render per character.
Sends are coalesced into the next frame, so what lands is one refresh carrying
the latest state rather than ten carrying nine stale ones.

`renderWork()` now sends as well, so the guarantee does not rest on every future
caller remembering. The test for it enumerates twelve ways of changing an
exercise and fails on any that does not reach the room, which is the shape the
promise actually has.

**After the swap — sizing, headlines, and the bar.**

*Sizing.* `%(url | 60%)` is a percentage of the picture's own width, applied by
the gym at render time. The editor ignored it outright: an author set a
quarter-size image and saw it full width, which is not a preview of anything. It
is now applied the same way, and the picture is draggable — click to select,
drag the corner, arrow keys for anyone without a mouse, and the percentage badge
resets to full size. The furniture floats over the picture rather than wrapping
it: a wrapper would nest the `img`, and `TTXF.htmlToSource` reads top-level
children, so the image would disappear from the file on the next keystroke.

The editor column is far narrower than a 1280px participant screen, so a large
picture is still bounded by `max-width` on the way to being displayed. The number
is exact and the file is exact; the rendering is as exact as a narrow column
allows, which is what the participant view is for.

*Headlines.* The news frame was locked whole, so changing a headline meant
deleting the block and inserting a new one. The frame stays locked — it is a
composed object — but the headline and its flag are opened up, which is all
`htmlToSource` reads out of it anyway, so editing them round-trips with no new
code. Enter moves the caret out rather than putting a line break inside a span
the converter reads as plain text.

*The bar.* It mixed single glyphs with words at one 10px monospace size, which
left the glyphs illegible and the words cramped. Marks and blocks now have one
shared height and two shapes — square for a mark, labelled for a block — and the
bold control is bold, the italic italic, the code control monospace. Source is a
real toggle carrying `aria-pressed`.

**Step 8b — the swap.** `builder.html` is now `editor.html`; the page it
replaces is gone. The URL does not change, so every link into the builder — the
site nav on four pages, the library's Customise button, the canonical and
og:url — keeps working untouched.

The old page's public identity was carried across whole: title, description,
canonical, Open Graph and Twitter cards. The rebuild's `noindex` went with the
prototype it belonged to.

The test suites moved with the pages. `tests/test-editor.js` tested a page that
no longer exists and was retired; `test-builder.js` took its name. Two of its
groups were worth keeping and were ported rather than dropped: the one that
renders every construct the format can emit and fails if any of them has no rule
in the stylesheet the author is looking at, and the one that checks the guide's
table cells are not flex containers. Stage counts, planned length and unreadable
durations were re-covered against the new outline foot.

Anyone with unfinished work open on the day of the swap would have arrived at an
empty page with their scenario still sitting in the browser under the old key and
no way to reach it. That draft is adopted once — the old format is an envelope
around nearly the same model, with an id on every stage — saved under the new key,
and the old key released. Rubbish under it is ignored rather than crashing the
page.

`test-parity.js` could not survive the swap — it compared two builders, and there
is now one. It is `test-handoff.js`: the corpus round-trip against the shipped
files, plus the ways in and out. The two-builder comparison is preserved at
commit `5007bbc`, the last commit where both pages existed.

**Step 8a — parity, and the gaps it found.**

`tests/test-parity.js` pushed all 39 shipped scenarios through *both* builders and
compares what comes out — not the bytes, which the two format differently, but the
exercise the gym would run. **All 39 agree**, and both agree with the file they
were given, so nothing is lost by switching.

Comparing features rather than output turned up five things the rebuild did not
have. Four were real:

- **No site navigation.** The new page had no header at all — a page you could
  not leave.
- **No `?load=`.** The library's Customise button would have 404'd into an empty
  builder on the day of the swap. It now wins over a stored draft, but only once
  the fetch has actually landed, so a bad link leaves the draft alone.
- **No way to run it.** The gym reads a scenario out of `localStorage.preview`
  and clears the key; the builder never wrote it.
- **No scenario cover image.** `! image:` was carried through load and save but
  had no control, so it could only be set by hand in Source. It now uses the same
  picker as everything else.

The fifth, stage reordering, the old builder did with up/down buttons. Those are
here — but the outline rows are draggable too, which is the natural gesture for a
list that is also the map. Duplicating a stage deep-copies its questions; a
shared array would have two stages editing the same answers, which nobody would
find until the exercise was running.

Two smaller repairs came with it. The old builder subtracted a 56px nav from the
viewport while the nav is 80px tall, so the workspace always ran a little past the
bottom of the window; `body` is already a flex column, so the new layout takes
what is left instead of guessing. And a restored draft now says where it came
from, with a way to start again — arriving to find someone else's half-finished
scenario and no explanation was the old page's least defensible moment.

**Step 7 — import, problems, the picker.**

*Problems.* The old builder reported faults against line numbers in a file the
author never sees, which is information you cannot act on without first finding
the place it describes. Problems are now attributed to a stage — the model is
serialised to be checked, every `@ ` line marks where a stage begins, and that
turns a parser line number back into a stage — listed under the status chip, and
clicking one goes there. A stage carrying an error is flagged in the outline.

Errors and warnings are also separated in the chip: three genuine faults read
`3 problems` in red, a missing title reads `1 to check` in grey. A builder that
cries breakage over a missing author line teaches people to ignore it.

*Import.* A `.ttxf` can arrive through the button or by being dropped anywhere on
the page — guessing where to aim is exactly the friction this rebuild exists to
remove. Either way it is parsed before it is accepted. A file with no `@ ` stages
is refused by name rather than silently replacing an hour's work with an empty
scenario; replacing real work asks first; and a file that parses with complaints
opens the problems list, so they are met now rather than in front of a room.

*The picker.* The Image button opened with a hard-coded warning icon in it. It
now opens the categorised gallery — tabs, thumbnails, a size, and a field for a
URL — and lands a real image in the WYSIWYG field.

That surfaced a genuine trap. Scenario media is authored relative to `gym/`, and
the builder sits one level up at the site root; served from a domain root the
difference is invisible, because `..` past the root is clamped, so it breaks only
from `file://` or a project subpath. The old builder rewrote the path on the way
into its preview, which it could afford because its preview was read-only. Here
the rendered output *is* the document, so a rewritten path would be written back
to the file. The authored path is kept in `data-src`, which `TTXF.htmlToSource`
now prefers over `src` — the displayed path and the written path can differ
without either being wrong. Tested in both suites.

*The syntax bar* was already standing from step 4. One repair it needed:
`insertBlock` called `document.execCommand` with no fallback, so on an engine
without it the button would do nothing at all. It now appends the block instead.
execCommand stays the first choice only because it is the one route to the
browser's own undo.

**The participant view, rebuilt twice.** It began as a miniature card the builder
drew itself from the payload fields. That was a second renderer to keep in step
with the first, and it could agree with the model while disagreeing with the
room. It now embeds `PRESENTATION_HTML` — the participant document itself, the
one the gym serves — in an iframe, so there is nothing left to drift.

Making that possible meant lifting the document out of `gym/index.html` into
`js/participant-view.js`, shared by both pages and inlined by the standalone
build. The gym shrank by 455 lines and gained nothing it did not have.

The first attempt at embedding opened a real browser window, which was the wrong
reading of the ask: the gym's own picture-in-picture is the thing to copy. It is
now a floating panel — draggable by its header, resizable from the corner grip
(arrow keys too, since a grip is useless without a mouse), collapsible to its
header, and clamped back into view after every change so it cannot be stranded
off-screen with its own handle out of reach. Size and position persist.

The panel chrome is written fresh rather than extracted. The gym's mirror is tied
to eight functions of its own — theme relay, viewport state, `sendToParticipants`
— and unpicking a well-tested production feature to share ~150 lines of drag
maths was a bad trade. The part where fidelity actually matters, the document, is
shared.

A payload detail survives both rewrites: scenario media is written relative to
`gym/`, the builder sits one level up, and a blob-origin iframe can resolve
neither. Every `img` src is made absolute before it crosses.

**A bug found in use, and what it changed.** The Source toggle appeared to erase
content. The trigger was a cached `js/ttxf.js` without the new `htmlToSource`,
so every keystroke threw, the model stayed empty, and opening Source showed
nothing. The deeper fault was the code's: it could overwrite an author's work
with an empty string and say nothing. Now a failed conversion keeps the text and
reports it, the Source view reads the live DOM rather than a model that may lag,
returning from Source refuses to replace visible content with nothing, and the
module is requested with a version so a stale cache cannot serve a page its own
code depends on. Five tests simulate the broken module and assert the editor
degrades rather than destroys.

**Correction, before any code.** The first draft of both documents claimed
facilitator prompts were positionally bound to answers, and made repairing that
the centrepiece of the redesign. That was wrong: `# prompts` is a flat list of
guidance for the person running the exercise, with no link to answers. The
belief came from generalising the `1) Optimal — …` convention in the SC3
technical scenarios. Both documents were rewritten around the split that does
exist — participant-facing versus facilitator-only — which is a better
organising idea and is enforced by the gym in one function.

No repo test encoded the wrong assumption; the checker that did was a scratch
tool used during the scenario content review and is not part of the project.

**Step 3 — the shell.** `builder.html` was built alongside `editor.html`, with its
own test suite (`tests/test-builder.js`, 26 tests) wired into `npm test`. Both
names were retired at the swap in step 8b.

Standing up: the three-zone layout; the outline as map and navigation, with a
per-stage share-of-time bar and a planned total at its foot; the workspace
showing one stage split into **On screen** and **Your notes**; add, delete and
focus stages; discussion points and prompts; draft autosave under a key distinct
from the old builder's so the two cannot collide; import and export; and the
`New` shape offering the detection-to-lessons arc.

The property that matters most is already locked down: **all 39 shipped
scenarios load and save semantically unchanged**, including questions, which the
workspace cannot yet edit. An author can open a scenario in the new builder
today, change the prose, and save without losing anything.

One test earns its place by checking the audience split against the gym rather
than against itself — it reads `currentStageMessage()` and fails if prompts ever
start reaching the participant window, which would make the whole On screen /
Your notes division a lie.

**Step 6 — participant view, pacing, shapes.**

*Participant view.* The payload the gym would send — title, content, discussion,
questions not marked `?-` — rendered by the participant document itself. Moving a
question across the divide visibly removes it from that screen, which is the
split proving itself. (First built as a card the builder drew; see *The
participant view, rebuilt twice* above.)

*Pacing.* The content-weight model the scenario review had to build to repair the
library, brought forward into authoring: a discussion point is worth about two
and a half minutes, a question about one, prose about 45 seconds per hundred
words. A stage well out of step with what is in it is marked in the outline.
Deliberately quiet — it needs at least three timed stages before it will say
anything, and only speaks when a stage is beyond 1.8× or under 0.55× its share.
`te-rootkit`, already content-weighted, produces no warnings; setting one of its
stages to 45 minutes produces three.

*Shapes.* New offers four arcs — incident lifecycle, supplier, short decision,
blank — with the stage names the library actually uses. It offers rather than
imposes, and writes none of the content.

**Step 5 — questions.** A question is rendered on whichever side of the stage
its audience is on, and **moving it across the divide is how `?-` gets set**. The
flag stops being an obscure checkbox and becomes the visible act of taking a
question off the participants' screen — which was the whole argument for
organising the workspace this way.

Answers are rows with a mark-as-correct control; marking one turns a poll into a
scored question and the badge changes to say so. Clicking the marked answer
again clears it, because a rating scale should have no right answer — which is
also why applying a preset resets the correct index rather than leaving it
pointing at whatever position it held before.

The fiddly part is that the correct answer is stored as an *index*, so deleting
an earlier answer has to move it, and deleting the marked one has to clear it.
Both are tested; getting that wrong would silently re-point the correct answer
at someone else's option.

**Step 4 — WYSIWYG content areas.** The author edits rendered output; the DOM
converts straight back to `.ttxf` on every keystroke through
`TTXF.htmlToSource`, added to the shared module so format knowledge stays in one
place. Measured over the library: **230 stage bodies, 100% rendering identically
after a visual round trip** (the prototype's one outlier was a whitespace bug in
the converter, now fixed), 76% byte-identical.

The remaining 24% is the known soft-line-break re-wrap, and the mitigation
turned out to need no machinery: content is only written back when an `input`
event fires, so a stage nobody types into is never re-serialised. A test asserts
that opening every stage, the summary and the conclusion of a nine-stage
scenario and touching nothing produces a byte-identical file.

Also standing up:

- **A source toggle on every content area**, showing the raw `.ttxf` and writing
  through to the model — the escape hatch, and the answer for authors who prefer
  typing.
- **Blocks are atomic.** Images, news frames and artefact blocks are marked
  `contenteditable="false"`, so a caret cannot land inside one and quietly break
  the markup it converts back to.
- **Paste is laundered through the format.** Pasted HTML goes through
  `sanitizeHTML` → `htmlToSource` → `markdown`, so what lands is by construction
  something `.ttxf` can express. Pasting from a browser or Word cannot smuggle in
  markup the format has no way to represent.
- **Summary and conclusion moved out of the rail** into the workspace, on the
  grounds that they are prose like a stage is prose and deserve the same tools.

**WYSIWYG, reconsidered.** The design originally kept content as a textarea on
the grounds that a visual editor would be a large project and would fight
round-tripping. Challenged on it, the risky half was prototyped and measured
before deciding: 230 stage bodies converted to HTML and back, 99.6% rendering
identically and 76% byte-identical, with the only substantive loss being
re-wrapped soft line breaks. That is good enough to build on, so the decision is
reversed — content areas are WYSIWYG, with a source toggle and per-stage
re-serialisation to keep diffs honest.
