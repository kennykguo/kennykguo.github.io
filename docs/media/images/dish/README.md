# Dish gallery images

- `terminal.gif`: animated rendering of actual output captured from the Dish
  binary in a Linux pseudo-terminal, rendered as plain monospace text on black.
- `terminal.png`: still frame of the same session.

The source capture script and original recordings live in the Dish repository:
`/home/kennykguo/dish/scripts/capture_demo.py` and `docs/demo/`.

To rebuild, run `make demo` from that repository after installing
`requirements-demo.txt`. Copy the two image files from `docs/demo/` here.
The script uses Pillow to render the real PTY output; it does not simulate
commands or use QEMU. `session.txt` and `session.cast` preserve the captured output.

The older `terminal-input.png`, `lexer.png`, and `processes.png` files are source
code crops and are no longer selected by the gallery.
