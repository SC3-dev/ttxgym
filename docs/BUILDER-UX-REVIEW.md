# Exercise Builder — UX review

A ground-up review of `editor.html` ahead of rebuilding it. Written after a long
period working inside the format, the library and the gym, so the findings below
are grounded in defects that actually occurred rather than in principle.

## What the builder is for

An author produces a `.ttxf` file: some metadata, then a series of stages. Each
stage carries narrative content, a planned duration, discussion points,
facilitator prompts, and questions with answers.

Measured across the 39 shipped scenarios, the median scenario needs:

| | per scenario |
| --- | --- |
| Stages | 5.9 |
| Discussion points | 14.3 |
| Facilitator prompts | 19.3 |
| Questions | 7.9 |
| Answers | 30.4 |
| **Distinct text inputs to fill** | **~95** |

Ninety-five inputs is the job. Everything below follows from how badly the
current design serves a job that size.

## The current shape

Two panels. On the left, one scrolling column: five metadata fields, then a
flat list of stage cards. On the right, a preview with two tabs (rendered and
raw) and a validation strip.

```
editor-scroll                 preview-panel
  title                         [rendered | raw]
  author                        validation
  summary                       preview
  conclusion
  image
  ─ stages ─
  stage card 1 …
  stage card 9
  + Add Stage
```

1,378 lines of CSS, 1,112 of script, 248 of markup. 72 functions. Ten globals.

---

## Finding 1 — The builder does not distinguish what the room sees from what
## only the facilitator sees

This distinction is the most important structural fact about a tabletop
exercise, and the format encodes it precisely:

| the room sees | facilitator only |
| --- | --- |
| stage title | `# prompts` |
| `! content` | `?-` participant-hidden questions |
| `# discussion` | `! duration` |
| questions without `?-` | |
| the scenario image | |

Confirmed against `currentStageMessage()` in the gym, which is the single place
that decides what crosses to the participant window: it sends title, content,
discussion, visible questions and the image, and nothing else.

The builder renders all of it interleaved in one column, distinguished only by
a coloured sigil on each label. An author cannot readily answer the question
they most need to answer — *what will actually be on the screen in front of the
room?* — without running the exercise.

Two consequences follow. Authors under-use `?-`, because the difference it makes
is invisible while writing. And facilitator prompts get written as though they
were participant-facing, or vice versa, because nothing in the interface
reinforces which audience is being addressed.

**Correction.** An earlier draft of this review claimed facilitator prompts were
positionally bound to answers — prompt 1 explaining answer 1 — and built the
whole redesign on repairing that. That was wrong. `# prompts` is a flat list of
guidance for the person running the exercise, rendered by the gym as a plain
list beneath the stage content, with no association to answers at all. The
mistake came from generalising a convention in the SC3 technical scenarios,
which happen to write prompts as `1) Optimal — …` matching answer order. That is
one author group's style, not a property of the format, and the redesign must
not harden it into one.

## Finding 2 — No sense of the whole, and no way to move around

Ninety-five inputs in one scrolling column, with no outline, no stage list, and
no way to jump from stage 2 to stage 7. `cold_start` has nine stages; reviewing
it means scrolling past everything in between.

There is a one-line summary (`5 stages · 8 questions · 45 mins planned`) above
the stage list, and that is the only view of the scenario as a whole.

The gym solved this exact problem for the facilitator — numbered stage markers
that jump — and the builder never borrowed it.

## Finding 3 — The preview is a passive mirror, not a workspace

The right-hand panel renders the scenario, and that is all it does. You cannot
click a stage in the preview to edit it, and the editing column does not follow
the preview. For a document whose entire purpose is to be read aloud from a
screen, the closest thing to "what the room will see" is inert.

Two bugs found this week are symptoms of how little anyone trusts it: images
never resolved in the preview at all, and the conclusion was never rendered.
Both went unnoticed for a long time, which tells you how much it was used.

## Finding 4 — The format's surface has outgrown the interface

The format now documents 27 constructs. Three were added in the last week alone
(inline code, fenced artefact blocks, news headlines). Two patches have already
been applied to cope:

- a syntax insert bar, because the only route to the reference was a nav link
  away from the page;
- an image gallery picker, because 19 shipped images were invisible and the
  path convention is easy to get wrong.

Both are improvements, and both are sticking plasters over the same problem:
**the author is writing markup in a textarea and the interface is trying to
compensate.** A ground-up design should decide deliberately how much of the
format is typed and how much is constructed.

## Finding 5 — Timing is a text field, not a budget

Duration is a free-text input per stage (`10 mins`, `1h 30m`, a bare number).
The relationship between stage durations and the exercise's declared length —
the thing that actually matters when planning a session — appears only as a
total in the summary line.

The content review had to build a weighting model to fix pacing across the whole
library because nothing in the authoring flow ever surfaced that a stage with
six discussion points had the same clock as one with one.

## Finding 6 — Every scenario starts from nothing

The library has an obvious common shape: detection → containment → eradication
→ recovery → lessons, with a debrief at the end. Twenty-three technical
scenarios follow it almost exactly. The builder offers "+ Add Stage" and an
empty card.

Answer presets exist for the answer row, which is the right instinct applied at
the smallest possible scope.

## Finding 7 — Questions are the richest object and the least supported

A question carries text, a participant-hidden flag, an ordered answer list, a
correct answer, and prompts that live elsewhere. It is rendered as a card inside
a card inside a scrolling column, and the correct answer is set by clicking a
control on one of the answers.

Nothing surfaces what the content review found to matter most: whether the
distractors are plausible, whether the correct answer is identifiable by length,
and whether the room is being asked a question that the inject actually sets up.

---

## What to keep

The rebuild should not discard:

- **Live validation** from the shared parser — diagnostics reach the author as
  they type, and that is genuinely good.
- **Draft autosave** with a `beforeunload` guard.
- **Import by drag-and-drop**, with parse errors surfaced before committing.
- **Answer presets** (confidence, agreement, maturity, frequency, yes/no).
- **The gallery picker and syntax bar**, in some form — the problems they solve
  are real even if the framing changes.
- **Round-trip fidelity** through `TTXF.serialize`, which the tests protect.

## Priorities for the redesign

1. Make the participant/facilitator split legible while authoring — the room's
   view and the facilitator's notes should look like two different things.
2. Give the author a map of the scenario and a way to move around it.
3. Make the preview the thing you work in, or at least a thing you trust.
4. Decide deliberately what is typed and what is constructed.
5. Make pacing visible while authoring, not after.
6. Start authors from a shape, not a blank card.
