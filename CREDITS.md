# Credits

## Music

All three recordings are by Kevin MacLeod (incompetech.com).

Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/

License information: https://incompetech.com/music/royalty-free/licenses/

Attribution guidance: https://incompetech.com/music/royalty-free/faq.html

### Wish Background

Kevin MacLeod (incompetech.com)

Track: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100391

Original MP3: https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wish%20Background.mp3

Local file: `assets/wish-background.mp3`

Duration listed by the author: 19 minutes 34 seconds. Accessed 2026-10-06.

### Deck the Halls A

Kevin MacLeod (incompetech.com)

Track: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100263

Original MP3: https://incompetech.com/music/royalty-free/mp3-royaltyfree/Deck%20the%20Halls%20A.mp3

Local file: `assets/deck-the-halls-a.mp3`

Duration listed by the author: 4 minutes 7 seconds. Solo piano arrangement.
Accessed 2026-10-09.

### It Came Upon a Midnight Clear

Kevin MacLeod (incompetech.com)

Track: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100191

Original MP3: https://incompetech.com/music/royalty-free/mp3-royaltyfree/It%20Came%20Upon%20a%20Midnight%20Clear.mp3

Local file: `assets/it-came-upon-a-midnight-clear.mp3`

Duration listed by the author: 4 minutes 26 seconds. Piano, violin and English horn.
Accessed 2026-10-09.

### Playback

The original MP3 recordings listed above remain included without edits as source
files. The player uses compatibility versions in `assets/tv/`, produced with
`scripts/prepare-tv-audio.py`. These versions have been re-encoded and their
playback levels have been reduced; the music, arrangement and duration have not
been intentionally changed.

Each track has a constant-bitrate MP3 version using 48 kHz stereo, without the
original embedded artwork or legacy metadata. The bitrate targets are 80 kbps
for the long Wish Background recording and 160 kbps for the two shorter
recordings. The smaller Wish version trades some audio fidelity for lower
download size; the full-quality original
remains available in `assets/wish-background.mp3`.

AAC playback files and the format switch were removed after the user reported
audible noise from AAC on their television on 2026-10-10. The player now uses
MP3 only; existing MP3 files are unchanged. This does not establish whether
MP3 is free from audible noise on the user's television.

The playback gains are applied inside the MP3 versions: 35% for Wish
Background, 50% for Deck the Halls A, and 75% for It Came Upon a Midnight Clear.
The audio element uses volume 1 to avoid applying the reduction twice and to
keep these levels on TVs that ignore the element's volume property. The selected
track repeats. Its title, author, source link, CC BY 4.0 link and notice of the
re-encoding/volume adjustments remain visible when the controls fade out.

Track metadata source: https://incompetech.com/music/royalty-free/pieces.json

## Illustration

Background made with the built-in OpenAI image generation tool for this page.
Prompt summary: a warm ivory gouache Christmas card with evergreen branches,
red ribbons, a decorated tree and two cuddling rabbits, with an empty center
for the names. The source image is used without edits.

## Font

Delius — Natalia Raices and Igino Marini.
Bundled unmodified under the SIL Open Font License 1.1.
The full copyright notice and license are in assets/fonts/OFL.txt.

Source: https://github.com/google/fonts/tree/main/ofl/delius
