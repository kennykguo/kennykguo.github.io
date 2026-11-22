"""Build the three gallery examples with complete, readable model captions."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "docs/media/images/image-captioning"
FONT = "/usr/share/fonts/noto/NotoSans-Regular.ttf"
EXAMPLES = [
    ("tennis", "tennis-photo.png",
     "a young man standing on top of a tennis court holding a racquet",
     "a man in a white shirt swinging a tennis racket"),
    ("skateboarding", "skate-trick-photo.png",
     "two skateboarders trying to film a skateboard trick",
     "a skateboarder doing a trick on a concrete sidewalk"),
    ("surfing", "surfing-photo.png",
     "a man riding a surfboard across a wave in an ocean",
     "a man in a wet suit is surfing on a wave"),
]


def centered(draw, text, y, font):
    lines = []
    line = ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) > 1080:
            lines.append(line)
            line = word
        else:
            line = trial
    lines.append(line)
    for line in lines:
        draw.text((600, y), line, fill="#111111", anchor="mt", font=font)
        y += 104
    return y


if __name__ == "__main__":
    label_font = ImageFont.truetype(FONT, 64)
    caption_font = ImageFont.truetype(FONT, 82)
    for name, photo, original, decoded in EXAMPLES:
        canvas = Image.new("RGB", (1200, 2100), "white")
        draw = ImageDraw.Draw(canvas)
        centered(draw, "original caption", 26, label_font)
        assert centered(draw, original, 130, caption_font) < 460
        with Image.open(FOLDER / photo) as source:
            image = ImageOps.contain(source.convert("RGB"), (1100, 1100), Image.Resampling.LANCZOS)
            canvas.paste(image, ((1200 - image.width) // 2, 460 + (1100 - image.height) // 2))
        centered(draw, "decoded caption", 1600, label_font)
        assert centered(draw, decoded, 1710, caption_font) < 2100
        output = FOLDER / f"{name}-caption-example.webp"
        temporary = output.with_name(f".{output.name}.tmp")
        canvas.save(temporary, format="WEBP", lossless=True, method=6)
        temporary.replace(output)
