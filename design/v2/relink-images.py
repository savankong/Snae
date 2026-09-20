#!/usr/bin/env python3
"""Repoint the artboards' image references after re-uploading images/ elsewhere.

The .dc.html files reference uploaded assets as /_blob/<id>. Those ids belong to
the artifact they were uploaded to, so a new canvas in another account needs its
own. Upload images/*.jpg to the new artifact, then map filename -> new id here.

    python3 relink-images.py new-ids.json

new-ids.json: {"sofia.jpg": "<new id>", "nadia.jpg": "<new id>", ...}
Any file left out of the map is reported and left untouched.
"""
import json, pathlib, sys

CURRENT = {
    "sofia.jpg":    "c3b0689ce87a88b5b4e9f2cb00566a6e",
    "nadia.jpg":    "fe6d1a91cf8bf9f7eb8bfe4a90b8e356",
    "elise.jpg":    "b1468257210190824811a2164769b179",
    "margot.jpg":   "dfebae2faf1758e31cc81eb00e3144c9",
    "priya.jpg":    "9314739eb7a673db41f55b940f6091f1",
    "yuki.jpg":     "291a775acda9a1e9cfbe353d5803d09b",
    "camille.jpg":  "f2df592bd5d4570b21dd76488f5ce2b5",
    "rosa.jpg":     "8e024e71c5bbfa23a7d5db2e9b7572e9",
    "ines.jpg":     "68d409aaecab3d7cd4a1ad684d5c11b3",
    "sofia-g1.jpg": "9e44c70beed162218cd4165660c7cb4a",
    "sofia-g2.jpg": "742fe3d53907f08b1971c5b63892002c",
    "sofia-p1.jpg": "466cf21ccc2fa31a92b1fe10279ce07c",
    "sofia-p2.jpg": "77d267e00273034430529288293710c2",
    "sofia-p3.jpg": "f9458c2db1e699ede0cd7da4a79649ab",
}

def main(argv):
    if len(argv) != 2:
        print(__doc__); return 1
    new = json.load(open(argv[1]))
    missing = [f for f in CURRENT if f not in new]
    if missing:
        print("no new id given for: " + ", ".join(sorted(missing)))
    here = pathlib.Path(__file__).parent
    total = 0
    for path in sorted(here.glob("*.dc.html")):
        text = original = path.read_text(encoding="utf8")
        for filename, old in CURRENT.items():
            if filename in new:
                text = text.replace("/_blob/" + old, "/_blob/" + new[filename])
        if text != original:
            path.write_text(text, encoding="utf8")
            swapped = sum(original.count("/_blob/" + CURRENT[f]) for f in new if f in CURRENT)
            total += swapped
            print(f"  {path.name}: {swapped} reference(s) repointed")
    print(f"done — {total} reference(s) updated")
    # any id left over that we do not recognise
    known = set(CURRENT.values()) | set(new.values())
    for path in here.glob("*.dc.html"):
        import re
        for found in set(re.findall(r"/_blob/([0-9a-f]{32})", path.read_text(encoding="utf8"))):
            if found not in known:
                print(f"  warning: {path.name} references unknown asset {found}")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
