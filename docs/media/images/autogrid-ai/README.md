# Microgrid gallery visuals

The gallery includes a system diagram, the existing dashboard screenshot, and
original embedded PNG outputs from
`mesa-del-sol-ppo/ppo.ipynb`, copied byte for byte:

- `power-sources.png`: cell 128, output 3 (zero indexed), choice 1.
- `load-distribution.png`: cell 128, output 5 (zero indexed), choice 2.

The notebook was read from `/home/kennykguo/autogrid-ai/`. No plots were rerun,
redrawn, cropped, or recolored.

`microgrid-system.excalidraw` is the editable redraw of the handwritten system
sketch at `/home/kennykguo/autogrid-ai/images/1302899401480941.jpg`.
`microgrid-system.svg` and `microgrid-system.png` use matching geometry. The
redraw keeps the source/converter branches, switchboard, island-mode breaker,
PCC, grid, loads, and controller signals. Voltage/frequency monitoring is shown
as feedback to the controller. The electrical revision notes below the original
sketch are omitted. The battery power path is bidirectional.

`dashboard.png` is the previously selected dashboard screenshot, retained as-is.
Dashboard values are interface content, not evaluation results.

Other original notebook figures and the selection contact sheet are in
`/home/kennykguo/.codex/visualizations/2026/11/22/01a20170-0bdf-76a1-8f5d-0c4c83becf38/ppo-notebook-originals/`.

Previous assets (`control-loop.*`, `training.png`, `options.png`)
are retained but are not selected for the gallery.

The gallery now uses `microgrid-system-export.png`, copied unchanged from the
user-provided `Downloads/Untitled-microgrid-02-15-2236.png` Excalidraw export.
The earlier diagram source and renders remain available separately.
