# Stock photographs — provenance

11 photographs, **every one of them public domain or CC0**. Nothing here
carries an obligation: no credit is required, and none follows a scenario that
uses one.

That was not the original mix. Sixteen photographs under CC BY and CC BY-SA were
removed, because a licence that needs a credit follows every copy of every
scenario anyone downloads and lands the obligation on facilitators who never
agreed to it. What they covered — a data hall, an ambulance, a high street, a
production line — is now drawn instead, in [`../scenes/`](../scenes/CREDITS.md).

Attribution is recorded below anyway, because knowing where a picture came from
is worth having and costs nothing.

| File | Where | Year | Licence | Author | Source |
| --- | --- | --- | --- | --- | --- |
| `boardroom.jpg` | United States | 2016 | CC0 | Breather breather | [Commons](https://commons.wikimedia.org/wiki/File:Conference%20room%20table%20(Unsplash).jpg) |
| `CCTV-camera.jpg` | — | 2015 | CC0 | Raysonho @ Open Grid Scheduler / Grid Engine | [Commons](https://commons.wikimedia.org/wiki/File:CCTVBrickWall2.jpg) |
| `civic-building.jpg` | UK | 2011 | CC0 | PeterChingfordHistory99 | [Commons](https://commons.wikimedia.org/wiki/File:Chingford%20Old%20Town%20Hall%20Building,%20The%20Ridgeway,%20Chingford,%20London,%20UK.jpg) |
| `cyber-operations.jpg` | — | 2012 | Public domain | Unknown photographer | [Commons](https://commons.wikimedia.org/wiki/File:NSOC-2012.jpg) |
| `hospital-room.jpg` | United States | 2011 | Public domain | Official Navy Page from United States of America MC2 Todd Frantom/U.S. Marine Corps | [Commons](https://commons.wikimedia.org/wiki/File:Flickr%20-%20Official%20U.S.%20Navy%20Imagery%20-%20Fort%20Belvoir%20Community%20Hospital%20(15).jpg) |
| `laptop-desk.jpg` | Italy | 2017 | CC0 | Luca Bravo lucabravo | [Commons](https://commons.wikimedia.org/wiki/File:Desktop%20after%20work%20(Unsplash).jpg) |
| `meeting-room.jpg` | Canada | 2015 | CC0 | Breather breather | [Commons](https://commons.wikimedia.org/wiki/File:Chairs%20in%20a%20meeting%20room%20(Unsplash).jpg) |
| `network-cabling.jpg` | — | 2005 | Public domain | — | [Commons](https://commons.wikimedia.org/wiki/File:Cable%20closet%20bh.jpg) |
| `operations-centre.jpg` | — | 2009 | Public domain | Zonk43 | [Commons](https://commons.wikimedia.org/wiki/File:Altbach%20Power%20Plant%20Control%20Room.JPG) |
| `switchyard.jpg` | — | 2009 | Public domain | James Selesnick, U.S. Army | [Commons](https://commons.wikimedia.org/wiki/File:New%20electrical%20infrastructure,%20Iraq.JPG) |
| `warehouse.jpg` | — | 2010 | Public domain | Leo 'Jace' Anderson | [Commons](https://commons.wikimedia.org/wiki/File:FEMA%20-%2044999%20-%20Pallets%20of%20water%20in%20Iowa.jpg) |

## Age

Nothing here is older than 2008 except `network-cabling.jpg` (2005), marked
`timeless` in `credits.json` with a reason: a rack of patch cables looks the
same now as it did then. Anything else from before 2008 has to earn the same
exemption explicitly, which makes keeping it a decision rather than an oversight.

## Adding more

```
node tools/fetch-stock.js tools/stock-subjects.json ./candidates free
```

Downloads candidates for review rather than installing them, because the search
cannot tell a server room from a bicycle rack — both match "rack". Each candidate
is reported with the country and year read off its Commons categories and EXIF.
A subject may ask for `"uk": true` to sort British results first and
`"since": 2008` to leave out period pieces.

`free` is the only policy that should be used here. The tool also accepts
`attributed`, which admits CC BY and CC BY-SA; that is how the sixteen removed
photographs arrived, and the lesson was that a gallery is the wrong place for a
licence that travels.
