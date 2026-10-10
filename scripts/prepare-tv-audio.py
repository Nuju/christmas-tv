#!/usr/bin/env python3
"""Regenerate the conservative MP3 playback version of each Christmas track.

Run from any directory with Python 3 and FFmpeg already installed:
    python3 scripts/prepare-tv-audio.py

The original assets/*.mp3 files are read without modification. Outputs replace
only the three MP3 files in assets/tv/. These files contain the player gain, so the
media element must use volume=1 when playing these versions. Re-encoding is a
compatibility option; successful playback still depends on the TV browser.
Wish Background uses 80 kbps so its full 19-minute recording
fits the publishing transport. This trades some fidelity for smaller files;
the original full-quality MP3 remains available in assets/.
"""

from pathlib import Path
import shutil
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "assets" / "tv"
TRACKS = (
    # Name, baked-in gain, constant MP3 bitrate.
    ("wish-background", "0.35", "80k"),
    ("deck-the-halls-a", "0.5", "160k"),
    ("it-came-upon-a-midnight-clear", "0.75", "160k"),
)


def main():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg is required. Install it before running this script.")

    # Check all inputs before replacing any generated file.
    for name, _gain, _mp3_rate in TRACKS:
        source = REPO_ROOT / "assets" / (name + ".mp3")
        if not source.is_file():
            raise SystemExit("Missing original audio: " + str(source))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, gain, mp3_rate in TRACKS:
        source = REPO_ROOT / "assets" / (name + ".mp3")
        common = [
            ffmpeg,
            "-nostdin", "-y", "-hide_banner", "-loglevel", "warning",
            "-i", str(source),
            "-map", "0:a:0", "-vn", "-sn", "-dn",
            "-map_metadata", "-1", "-map_chapters", "-1",
            "-af", "volume=" + gain,
            "-ar", "48000", "-ac", "2",
        ]
        codec_options = [
            "-c:a", "libmp3lame", "-b:a", mp3_rate,
            "-id3v2_version", "0", "-write_id3v1", "0",
            "-write_xing", "1",
        ]
        destination = OUTPUT_DIR / (name + ".mp3")
        # Keep an interrupted conversion from replacing a usable output.
        temporary = OUTPUT_DIR / (name + ".partial.mp3")
        try:
            subprocess.run(common + codec_options + [str(temporary)], check=True)
            temporary.replace(destination)
        finally:
            if temporary.exists():
                temporary.unlink()
        print(str(destination.relative_to(REPO_ROOT)), destination.stat().st_size,
              "bytes", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (OSError, subprocess.CalledProcessError) as error:
        print("Audio generation failed: " + str(error), file=sys.stderr)
        sys.exit(1)
