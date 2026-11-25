# Rollouts

Project gallery at `/rollouts/`. Projects with videos appear first. Each group
is ordered newest first. Entries show the project heading, explanation, media,
and links.

## Files

- `../_data/rollouts.yml`: authored project content and media priorities.
- `../_data/rollout_layouts.json`: generated desktop and compact layouts.
- `../_includes/rollouts/card.html`: project markup.
- `../_includes/rollouts/media-style.html`: applies saved media coordinates.
- `../css/_rollouts.scss`: responsive sizing and typography.
- `../../tools/rollout-layout.cjs`: pure packing algorithm.
- `../../tools/build-rollout-layouts.cjs`: generator with a cache per media set.

## Add or edit media

```yaml
- title: Project name
  start_date: 2026-11-21
  description: A short explanation, with optional [inline references](https://example.com).
  images:
    - src: /media/images/project-name/photo.jpg
      width: 1600
      height: 1000
      priority: 2
      alt: A description of the image
  links:
    - label: GitHub
      url: https://github.com/kennykguo/project-name
```

`width` and `height` describe the source file. Larger priority numbers mean more
important media; the default is `1`. Videos use the same fields under `videos`,
plus an optional `poster`. A single `video` field is also supported with
`video_width`, `video_height`, and `video_priority` at the project level.

For a fixed arrangement, `media_rows: [3, 1]` puts the first three media items
in one row and the fourth underneath. Explicit rows preserve source order and
fill the content width. Their height grows naturally to keep the images readable.
`compact_media_rows` can supply a separate fixed arrangement below 60em; Shady
uses two rows of eight on desktop and four rows of four on compact screens.

Use Markdown in descriptions. References belong inline; links to your own work
(GitHub, papers, Twitter posts, demos) belong in `links`.

After adding, removing, or changing media, run from the repository root:

```sh
node tools/build-rollout-layouts.cjs
```

The generator only recalculates media sets whose dimensions, priorities, or
packing rules changed. Keep the generated JSON with the source changes. The
page uses the saved coordinates directly and performs no packing on page load,
image load, or browser resize.

## Layout rules

1. Preserve source proportions. Show the full image or video; never crop or
   stretch it. Give equal-priority items equal displayed area, including videos.
2. Treat priorities as a gentle ordering: each priority tier adds 20% to the
   base area weight. Three tiers therefore use weights 1.4, 1.2, and 1.0.
   This keeps supporting diagrams readable and avoids enormous size differences.
3. For three or more items, try media orders and row breaks. Each candidate
   uses a single scale for all items, keeping the priority weights intact.
   Score candidates by useful image area, width coverage, compactness, and a
   descending staircase outline. A rectangular or symmetrical outer edge is
   unnecessary.
4. Save desktop and compact plans once. Both have small gutters and trim empty
   space at the right and bottom of their actual media bounds. One or two items
   retain a maximum width of 40% of the content column and align left.
   A single composite artwork can opt into the full column with `full_width: true`.
5. CSS scales the saved plan to the available content width with a height ceiling
   of `40vw` (40% of the full browser width). The ceiling is a budget, not forced
   empty space. Links follow the visible bottom edge with a 1rem gap.
6. Resizing scales the saved plan or switches to the saved compact plan. It
   never runs the packing algorithm, changes relative image areas, or restarts
   a video.

The candidate search is exhaustive for up to six items, and bounded to 720
orders for larger galleries. Split galleries larger than nine items.

### Image-captioning examples

Each example is one lossless WebP containing the original caption, full photo, and decoded
caption. Regenerate them with `python3 tools/build-caption-examples.py`.
Use the composite's actual dimensions (1200 × 2100) in `rollouts.yml`, without a
`layout_ratio` override. The gallery uses `object-fit: contain` to show the entire
image, including both captions, at every screen width. `media_layout: intrinsic-row`
keeps the three composites in a row with their natural heights instead of
positioning them inside fixed-height tiles.
The generator writes each file atomically so the live server cannot copy a
partially written image.

## Preview

```sh
node tools/build-rollout-layouts.cjs
cd docs
bundle install
bundle exec jekyll serve --livereload
```

Open `http://localhost:4000/rollouts/`. Re-run the generator when media changes.
Restart Jekyll after changing `_config.yml`. Stop the server with Ctrl+C.
