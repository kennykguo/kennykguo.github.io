# Diffusion gallery visuals

Extracted from saved image outputs in the local `kennykguo/diffuse` notebooks.
No models were rerun and no samples were generated or retouched for the gallery.
The cropped previews have their plot labels and whitespace removed, with image
tiles arranged with a four-pixel gap. The full sampling grid is an unmodified
notebook output, including its original stage numbers.

- `generated-samples.png`: `diffusion_6.ipynb`, code cell index 61 (zero based),
  final sampling frame for all ten samples, kept in notebook order.
- `denoising.png`: same saved output, sample rows 0, 1, 3, and 8, at saved frame
  indices 0, 4, 8, 12, 16, and 21 (zero based).
- `generated-digits.png`: `diffusion_4.ipynb`, code cell index 55 (zero based),
  all twenty final generated digits, kept in notebook order.
- `sampling-steps.png`: `diffusion_6.ipynb`, code cell index 61 (zero based),
  the first sample (airplane) at all 22 saved frames, indexed 0 through 21.
  An alternative full-sequence strip.
- `sampling-grid.png`: the complete, unmodified PNG output from
  `diffusion_6.ipynb`, code cell index 61 (zero based), showing all ten samples
  across all 22 saved frames (steps 0 through 21).

The gallery shows `sampling-grid.png` beneath the three previews at their
combined width.

These are saved plot pixels, not exported model tensors. Preview crops are resized to
128-pixel square tiles with nearest-neighbor interpolation.
