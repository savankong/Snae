#!/usr/bin/env bash
# Re-download and re-crop the placeholder portraits.
#
# Only needed if the .jpg files are missing from this directory (they are
# binary and may not have survived a text-only transfer). Reproduces exactly
# the set documented in CREDITS.md.
#
# These images are PLACEHOLDERS AND MUST NOT SHIP -- see ../README.md.
#
# Requires: curl, python3 with Pillow (pip install Pillow)
set -euo pipefail
cd "$(dirname "$0")"

U="?auto=format&fit=crop&crop=faces&w=760&h=950&q=72"
declare -A UNSPLASH=(
  [sofia]=1524504388940-b1c1722653e1  [nadia]=1534528741775-53994a69daeb
  [elise]=1519699047748-de8e457a634e  [margot]=1509967419530-da38b4704bc6
  [priya]=1531123897727-8f129e1688ce  [yuki]=1544005313-94ddf0286df2
  [camille]=1438761681033-6461ffad8d80 [ines]=1529626455594-4ff0802cfb7e
)
for name in "${!UNSPLASH[@]}"; do
  echo "  fetching $name"
  curl -fsS --max-time 30 -o "_raw_$name.jpg" "https://images.unsplash.com/photo-${UNSPLASH[$name]}$U"
done
echo "  fetching rosa"
curl -fsS --max-time 30 -o "_raw_rosa.jpg" \
  "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=760&h=950"

python3 - <<'PY'
from PIL import Image, ImageEnhance
import glob, os
for raw in glob.glob('_raw_*.jpg'):
    name = os.path.basename(raw)[5:]
    Image.open(raw).convert('RGB').save(name, 'JPEG', quality=74, optimize=True)

# Sofia derivatives: gallery tiles and "Lately" post images, same shoot
s = Image.open('_raw_sofia.jpg').convert('RGB')
def crop(box, size, bright=1.0):
    c = s.crop(box).resize(size, Image.LANCZOS)
    return ImageEnhance.Brightness(c).enhance(bright) if bright != 1.0 else c
crop((90, 60, 690, 660),   (440, 440), 1.06).save('sofia-g1.jpg', 'JPEG', quality=74, optimize=True)
crop((0, 300, 600, 900),   (440, 440), 0.94).save('sofia-g2.jpg', 'JPEG', quality=74, optimize=True)
crop((40, 120, 720, 560),  (560, 362), 1.04).save('sofia-p1.jpg', 'JPEG', quality=74, optimize=True)
crop((120, 330, 700, 705), (560, 362), 0.92).save('sofia-p2.jpg', 'JPEG', quality=74, optimize=True)
crop((160, 40, 640, 350),  (560, 362), 1.10).save('sofia-p3.jpg', 'JPEG', quality=74, optimize=True)
PY

rm -f _raw_*.jpg
echo "done - 14 images in $(pwd)"
