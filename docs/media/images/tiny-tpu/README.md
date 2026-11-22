# Tiny TPU gallery assets

## Current gallery selection

The gallery displays only these three original SVGs:

- `article-tpu.svg`: full TPU architecture.
- `article-xor-mlp.svg`: the XOR neural network.
- `article-or-xor.svg`: the OR/XOR decision-boundary graph.

Original SVGs preserve their embedded Excalidraw fonts directly in the browser.
The composite images, digit previews, and demo videos are no longer displayed.
The assets and provenance below are retained as source material.

Sources:

- Project: https://github.com/tiny-tpu-v2/tiny-tpu
- Visual writeup: https://www.tinytpu.com/
- `sources.json` records the repository commit, original asset URLs, source
  file paths, and checksums for downloaded assets.

The gallery includes the repository architecture image, both repository demo
videos, and all 28 images exposed by the writeup. Slideshow images preserve the
initial state shown by the source page; the full interactive sequences remain
available in the linked writeup.

The three preview contact sheets include all 204 PNG previews present in the
repository: 40 synthetic handwritten benchmark samples, 4 bitmask previews,
and 160 dataset previews. Samples are resized with nearest-neighbor sampling
and arranged without added captions or labels.

Video poster images are extracted at two seconds from their respective source
videos. The MP4 files are kept in `docs/media/videos/tiny-tpu/` and load only
when the visitor plays them.

## Previous composite gallery images

The previous gallery used six composite images instead of 32 separate image elements.
The repository PNG overview duplicates the article SVG overview, so only the
SVG version appears in the composites. All 31 distinct source images remain:

- `architecture.webp`: five architecture and processing-unit diagrams.
- `matrix-scheduling.webp`: seven matrix preparation, clock, and pipeline diagrams.
- `systolic-dataflow.webp`: four computation and switching diagrams in a 2×2 grid.
- `training.webp`: seven XOR, activation, forward-pass, and gradient diagrams.
- `memory-and-control.webp`: five buffer, cache, waveform, and instruction diagrams.
- `digit-previews.webp`: all 204 preview samples in a single 17×12 array.

Original assets remain here as sources. The composites add no titles, labels,
borders, or shadows. The source demo videos remain available as files.

Regenerate the composites from the repository root with
`python tools/build_tiny_tpu_composites.py` (Pillow, `rsvg-convert`, `fc-match`,
and `woff2_decompress` required).

The renderer extracts the Excalifont and Comic Shanns font subsets embedded in
the source SVGs into a temporary directory. A private Fontconfig configuration
makes those fonts available during conversion; no system fonts are installed
or changed. The script checks font availability before rendering. Composites
use lossless WebP to preserve fine lettering and diagram lines.
