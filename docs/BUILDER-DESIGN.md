# Exercise Builder — redesign

Design and progress log for the rebuilt builder. Lives at `builder.html`
alongside the existing `editor.html` until it is ready to replace it.

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
| 6. Room preview, pacing, scaffolding | done |
| 7. Import, validation, gallery, syntax bar | |
| 8. Parity tests against the existing builder, then swap | |

## Progress log

**Steps 1–2 — documents.** Review and design written.

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

**Step 3 — the shell.** `builder.html` exists alongside `editor.html`, with its
own test suite (`tests/test-builder.js`, 26 tests) wired into `npm test`.

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

**Step 6 — room view, pacing, shapes.**

*Room view.* A miniature of the participant window, built from the same fields
the gym puts in its payload — title, content, discussion, questions not marked
`?-`. Moving a question across the divide visibly removes it from the room view,
which is the split proving itself. Under the card it says what is being withheld
("Held back from this screen: 4 facilitator prompts, 1 private question, timing")
— saying what the room will *not* see turns out to be as useful as showing what
it will.

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
