Styling Guide: Layered Home Layout and Pages

Overview
- The homepage uses stacked "layers". Each layer is a row in a simple grid.
- A layer can be 1x1 (single block) or 1x2 (two blocks).
- Blocks contain either text or image content.
- Every layer is a row (1x2 grid) unless explicitly a 1x1 layer.
- Always consult this AGENT.md before changing layout, styles, or markup.

Terminology
- Section: a group of consecutive layers that make up one topic area (Intro, Hacker Fab, Meraki, Symposium, Origami, Entropy, Contact).
- Spacer: a 1x1 layer used as a visual break between sections.

Layer Formats
1x1
- Structure: one block spanning the full row.
- Usage: contact, single callout, or long text.
- Layout: centered within the page width.

1x2
- Structure: two blocks side-by-side in one row.
- Usage: text + image, image + text, or text + text.
- Alternation: adjacent layers flip sides to create rhythm.
- Each block is a 1x1 block within the 1x2 layer. A layer never uses extra wrapper divs.

Block Types
Text Block
- Contains a heading and one or more lines of copy.
- Links are explicit and readable (full URLs when requested).
- Text is left-aligned within the block while the block itself spans the column width.
- Text blocks can be centered vertically/horizontally for callouts via the centered text style.

Text Layer (1x2 text)
- Structure: two text blocks side by side.
- Markup: `section.home-layer.text-layer` with two `div.layer-text` blocks (no wrapper divs).
- Uses the standard text block styles (heading + body copy); no special typography.
- On narrow screens the blocks stack, left block first.

Image Block
- Contains a single image or a small image grid.
- Images are sized consistently and kept within the block.
- Use a consistent aspect ratio for visual harmony.
- If a layer needs two images, use two image blocks (one per column).
- No rounded corners for images in layered blocks.
- Images use object-fit cover to maintain a consistent crop.

Spacer Layer
- Structure: one block spanning the full row.
- Usage: visual break between sections.
- Markup: `section.home-layer.spacer-layer` with a `div.spacer-block`.
- Styling: `.spacer-block` uses `height: clamp(3rem, 6vw, 7rem)` and full width.

Alternation Rule
- Layer 1: text left, image right.
- Layer 2: image left, text right.
- Continue alternating for each layer.

Alignment Rules
- Each layer is a true 1x2 grid with two adjacent 1x1 blocks.
- The center gap is consistent across layers; no layer collapses into a single column except on small screens.
- Image-only rows still use two blocks (one image per block).

Homepage Layers (Current)
- Intro layer: text + profile photo at the top.
- Intro text layer: 1x2 text layer directly under the intro, before the first spacer.
- Scroll cue layer: 1x1 `section.home-layer.scroll-cue-layer` under the intro text layer. A subtle drifting down-arrow (inline SVG, pure CSS) that links to `#hacker-fab`; holds still for reduced motion.
- Hacker Fab layers: centered text block with a single image, followed by a 1x2 image layer.
- Meraki layers: centered text block with a single image, followed by three 1x2 image layers.
- Origami layers: text + single image, followed by a 1x2 image layer.
- Entropy layers: centered text block with a single image, followed by a 1x2 image layer.
- Contact layer: 1x1 full-width block at the bottom.
- Spacer layers: 1x1 visual breaks between sections.

Homepage Markup Patterns
- Container: `.home-stack` wraps the full layered layout.
- Layer: `section.home-layer` is one row in the grid.
- Side ordering: use `.layer-left` and `.layer-right` to control text/image order.
- Text block: `.layer-text` (use `.center-text` for centered callouts).
- Image block: `.layer-media` (or `.image-block` for the right-side image in image-only rows).
- Image-only row: use two image blocks (left image in `.layer-media`, right image in `.layer-text.image-block`).
- Contact layer: `section.home-layer.contact-layer` is a 1x1 full-width row.

Homepage Layout Rules
- Columns are equal width within each 1x2 layer.
- Global body layout uses centered padding and full width to keep layers centered.
- All layered text should span its column width and remain left-aligned (except centered callouts).

Special Text Alignments
- Centered text blocks can be used for headline-style callouts.
- Example: the Hacker Fab block uses a centered text block (horizontal + vertical).

Responsiveness
- On narrow screens, stacks become single-column.
- Text should appear above its paired image when stacked.

List Pages (profound, writing, principles)
- Paths: `/profound/`, `/writing/`, `/principles/` (sources in `docs/<name>/index.html`).
- Markup: `div.reads-shell` > `ul.thought-list` > `li.thought-item` > `article.thought-entry` with an `a.thought-link` (or a plain `span.thought-link` when the entry isn't a link) and an optional `p.thought-source`.
- Each page is linked from the nav in `docs/_includes/header.html`.

Origami Side Page
- Path: `/origami/` (source `docs/origami/index.md`).
- Uses `site.baseurl` for image paths.
- Gallery layout is a 2x2 grid with the third image spanning two rows.
- Gallery modal uses `docs/scripts/gallery-modal.js` (origami gallery is included).

Text Halos
- Text blocks, the hero sketch (transparent PNG), page titles, the nav and the profound/writing lists sit on a soft halo that blurs and lightens the diffusion background behind them.
- Implemented as a feathered `::before` (backdrop blur + paper tint, masked to fade out at the edges); no extra markup.
- Tune per element with `--halo-out` (how far it extends) and `--halo-feather` (fade width). New text or transparent-image containers should be added to the halo selector list in `docs/style.scss`.

Footer
- Footer markup has been removed from the layouts for this site.
