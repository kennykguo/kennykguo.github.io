"""Combine the original Tiny TPU gallery visuals without adding labels or frames.

Requires Pillow, rsvg-convert, fc-match, and woff2_decompress.
Run from any directory. Fonts are extracted into a temporary private directory.
"""
from pathlib import Path
from contextlib import contextmanager
from html import escape
import base64
import hashlib
import io
import math
import os
import re
import subprocess
import tempfile
from PIL import Image, ImageChops, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'docs/media/images/tiny-tpu'
WIDTH = 1800
GAP = 16

# The PNG overview duplicates article-tpu.svg, so use only the SVG version.
GROUPS = {
    'architecture': [
        ['article-tpu.svg', 'article-mainslideshow-clk1.svg'],
        ['article-PE.svg', 'article-sys-array-standalone.svg', 'article-vpu.svg'],
    ],
    'matrix-scheduling': [
        ['article-rotate.svg', 'article-transpose.svg', 'article-stagger-x.svg', 'article-stagger-w.svg'],
        ['article-clock-cycle.svg', 'article-pipelining.svg'],
        ['article-longchain.svg'],
    ],
    'systolic-dataflow': [
        ['article-slideshow_1-1.svg', 'article-slideshow_2-1.svg'],
        ['article-slideshow_3-3.svg', 'article-slideshow_switch_accept-1.svg'],
    ],
    'training': [
        ['article-xor-mlp.svg', 'article-or-xor.svg', 'article-leaky-relu-derivative.svg'],
        ['article-forward-pass.svg'],
        ['article-slideshow_4-1.svg', 'article-slideshow_weight_grad-1.svg', 'article-slideshow_bias_grad-1.svg'],
    ],
    'memory-and-control': [
        ['article-ub-diagram.svg', 'article-h-cache.svg'],
        ['article-ub-waveform.svg', 'article-final-waveform.png'],
        ['article-isa.svg'],
    ],
}


@contextmanager
def excalidraw_fonts():
    """Expose SVG-embedded fonts to Pango without installing system fonts.

    librsvg ignores SVG @font-face data URLs. Fontconfig can read those same
    fonts, including glyph subsets, from a private font directory after WOFF2
    decompression. This keeps the exported glyph spacing and handwriting.
    """
    with tempfile.TemporaryDirectory(prefix='tiny-tpu-fonts-') as directory:
        root = Path(directory)
        fonts = root / 'fonts'
        fonts.mkdir()
        for path in ASSETS.glob('article-*.svg'):
            for data in re.findall(r'data:font/woff2;base64,([A-Za-z0-9+/=]+)', path.read_text()):
                content = base64.b64decode(data)
                font_path = fonts / (hashlib.sha256(content).hexdigest() + '.woff2')
                if not font_path.exists():
                    font_path.write_bytes(content)
                    subprocess.run(['woff2_decompress', str(font_path)], check=True,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        config = root / 'fonts.conf'
        config.write_text(
            '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">'
            '<fontconfig><dir>' + escape(str(fonts)) + '</dir>'
            '<cachedir>' + escape(str(root / 'cache')) + '</cachedir>'
            '<include ignore_missing="yes">/etc/fonts/fonts.conf</include></fontconfig>'
        )
        environment = {**os.environ, 'FONTCONFIG_FILE': str(config)}
        for family in ['Excalifont', 'Comic Shanns Regular']:
            match = subprocess.check_output(
                ['fc-match', '-f', '%{family}', family], env=environment, text=True
            )
            if family not in match:
                raise RuntimeError(f'Embedded font unavailable: {family} (matched {match})')
        yield environment


def load(name, environment):
    path = ASSETS / name
    if path.suffix == '.svg':
        # The exported CSS uses a shortened family name for this embedded font.
        source = path.read_text().replace('Comic Shanns', 'Comic Shanns Regular')
        data = subprocess.check_output([
            'rsvg-convert', '--width', '1800', '--keep-aspect-ratio'
        ], input=source.encode(), env=environment)
        image = Image.open(io.BytesIO(data)).convert('RGBA')
    else:
        image = Image.open(path).convert('RGBA')
    white = Image.new('RGBA', image.size, 'white')
    white.alpha_composite(image)
    image = white.convert('RGB')
    # Trim empty paper, leaving the original artwork and its lettering intact.
    bounds = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).getbbox()
    if bounds:
        left, top, right, bottom = bounds
        image = image.crop((max(0, left - 8), max(0, top - 8),
                            min(image.width, right + 8), min(image.height, bottom + 8)))
    return image


def compose(rows, output, environment):
    rendered = []
    for names in rows:
        images = [load(name, environment) for name in names]
        cell_width = (WIDTH - GAP * (len(images) - 1)) // len(images)
        # Short, wide diagrams keep short rows; taller diagrams get room to read.
        height = min(660, max(150, max(round(im.height * cell_width / im.width) for im in images)))
        row = Image.new('RGB', (WIDTH, height), 'white')
        for index, image in enumerate(images):
            fitted = ImageOps.contain(image, (cell_width, height), Image.Resampling.LANCZOS)
            row.paste(fitted, (index * (cell_width + GAP), 0))
        rendered.append(row)
    board = Image.new('RGB', (WIDTH, sum(im.height for im in rendered) + GAP * (len(rendered) - 1)), 'white')
    top = 0
    for row in rendered:
        board.paste(row, (0, top))
        top += row.height + GAP
    board.save(ASSETS / output, 'WEBP', lossless=True, method=6)
    return board.size


def combine_digits():
    samples = []
    for name, count in [('synthetic-handdrawn-previews.png', 40), ('bitmask-previews.png', 4), ('dataset-previews.png', 160)]:
        with Image.open(ASSETS / name) as sheet:
            columns = sheet.width // 100
            for index in range(count):
                x, y = index % columns * 100, index // columns * 100
                samples.append(sheet.crop((x, y, x + 100, y + 100)).convert('RGB'))
    columns = 17
    board = Image.new('RGB', (columns * 100, math.ceil(len(samples) / columns) * 100), 'white')
    for index, image in enumerate(samples):
        board.paste(image, (index % columns * 100, index // columns * 100))
    board.save(ASSETS / 'digit-previews.webp', 'WEBP', lossless=True, method=6)
    return len(samples), board.size


if __name__ == '__main__':
    with excalidraw_fonts() as environment:
        for group, rows in GROUPS.items():
            print(group, compose(rows, group + '.webp', environment))
    print('digit-previews', combine_digits())
