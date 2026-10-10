#!/usr/bin/env python3
"""Regenerate the two conservative playback variants for each Christmas track.

Run from any directory with Python 3 and FFmpeg already installed:
    python3 scripts/prepare-tv-audio.py

The original assets/*.mp3 files are read without modification. Outputs replace
only the six files in assets/tv/. Both formats contain the player gain, so the
media element must use volume=1 when playing these versions. Re-encoding is a
compatibility option; successful playback still depends on the TV browser.
Wish Background uses 80 kbps in both formats so its full 19-minute recording
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
    # Name, baked-in gain, AAC bitrate, constant MP3 bitrate.
    ("wish-background", "0.35", "80k", "80k"),
    ("deck-the-halls-a", "0.5", "128k", "160k"),
    ("it-came-upon-a-midnight-clear", "0.75", "128k", "160k"),
)


def main():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg is required. Install it before running this script.")

    # Check all inputs before replacing any generated file.
    for name, _gain, _aac_rate, _mp3_rate in TRACKS:
        source = REPO_ROOT / "assets" / (name + ".mp3")
        if not source.is_file():
            raise SystemExit("Missing original audio: " + str(source))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, gain, aac_rate, mp3_rate in TRACKS:
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
        formats = (
            ("m4a", [
                "-c:a", "aac", "-profile:a", "aac_low", "-b:a", aac_rate,
                "-movflags", "+faststart",
            ]),
            ("mp3", [
                "-c:a", "libmp3lame", "-b:a", mp3_rate,
                "-id3v2_version", "0", "-write_id3v1", "0",
                "-write_xing", "1",
            ]),
        )
        for extension, codec_options in formats:
            destination = OUTPUT_DIR / (name + "." + extension)
            # Keep an interrupted conversion from replacing a usable output.
            temporary = OUTPUT_DIR / (name + ".partial." + extension)
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
