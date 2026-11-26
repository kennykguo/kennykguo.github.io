# Orbiting surface materials

Sixteen silent eight-second MP4 loops compiled from Shady fragment programs and
rendered on the teapot with object-space coordinates and mesh-normal lighting.
The camera completes a full azimuth orbit with gently varying elevation.

The rollout shows two rows of eight on desktop, four rows of four below 60em,
with autoplay, muted, loop, playsinline, and first-frame JPEG posters.
The selected materials vary palette, structure, and surface response: broad
gradients, pearl sheen, copper patina, lava veins, cobalt marbling, mineral
bands, geometric panels, enamel droplets, foil, velvet, and brushed metal.

Sources and the rebuild tool live in https://github.com/kennykguo/shady under
`examples/turntable/` and `tools/build_turntables.py`. Run the tool there, copy
the numbered MP4/JPEG files and manifest here, then run
`node tools/build-rollout-layouts.cjs` from this repository root.
`manifest.json` records dimensions, timing, compiler hashes, and source hashes.

The compiler and standard renderer were not changed. The isolated capture
vertex shader is reference-compiled; every fragment shader is Shady-compiled.
