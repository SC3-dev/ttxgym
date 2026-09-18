# Scenes — provenance

Every file here is **original work**, drawn for TTX Gym by `tools/build-scenes.js`.
**No licence attaches to them and no credit is owed.** Use, change and
redistribute them freely.

## Why they are drawn

These subjects — a server hall, an ambulance, a high street, a treatment works —
are what a cyber exercise gets set in, and photographs of them are almost all
licensed CC BY or CC BY-SA on the free-media sites. That means an obligation that
follows every copy of every scenario anyone downloads, and lands on facilitators
who never agreed to it.

Generated imagery does not remove that problem so much as exchange it: the
training-data question is unsettled, outputs can reproduce protected material,
and provider terms vary and change. Drawing them removes it outright, because
there is no third party in the file.

## What they are and are not

They are deliberately schematic. A tabletop needs a picture that says *this is a
hospital* in the two seconds before anyone starts reading the stage text, and a
flat illustration does that at least as well as a photograph of a hospital nobody
in the room recognises. They are not photoreal and are not trying to be.

They share one dusk palette so a gallery of them looks like a set, they are SVG
so they stay sharp on a projector, and they weigh a few kilobytes each.

## Changing one

Edit `tools/build-scenes.js` and re-run it, or open the `.svg` in a text editor.
Then run `node tools/build-gallery.js`.
