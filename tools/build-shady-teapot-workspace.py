"""Render real Shady surface shaders into a seamless 8-row, 16-column workspace.

The compiler and ordinary renderer are never modified. An isolated vertex shader
passes object coordinates and normals through Shady's existing varying inputs.
Every material is compiled by Shady, assembled, validated, and rendered in Vulkan.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import time

import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageDraw
from shady_teapot_materials import write_materials

SITE = Path(__file__).resolve().parents[1]
DEST = SITE / 'docs/media/images/shady'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(*args, cwd=None, timeout=120):
    result = subprocess.run([str(a) for a in args], cwd=cwd, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed: {result.stderr[-1800:]}')
    return result.stdout


def vertex_source(root):
    source = (root / 'tools/mesh.vert').read_text()
    source = source.replace('vec3 eye = vec3(0.0, 0.0, 6.3);',
                            'vec3 eye = vec3(0.0, 0.8, 7.4);')
    source = source.replace('vec4 viewPos = view * vec4(inPosition, 1.0);', '''
    float angle = -0.28;
    mat3 turn = mat3(cos(angle), 0.0, -sin(angle),
                     0.0, 1.0, 0.0,
                     sin(angle), 0.0, cos(angle));
    vec3 centered = turn * (inPosition - vec3(0.217, 1.575, 0.0));
    vec4 viewPos = view * vec4(centered, 1.0);''')
    source = source.replace('outColor = inColor;',
                            'outColor = vec4(normalize(turn * inNormal) * 0.5 + 0.5, 1.0);')
    source = source.replace('outTexCoord = vec4(0.0, 0.0, 0.0, 1.0);', '''
    outTexCoord = vec4((inPosition.x - 0.217) / 2.4,
                       (inPosition.y - 1.575) / 1.4,
                       inPosition.z / 2.0, 1.0);''')
    return source


def material_source(source, capability):
    # Existing generated materials use this 2D coordinate window. Map it onto
    # the actual surface instead of displaying a disconnected scene in the mesh.
    if capability:
        px = '420.0 + 230.0 * (gl_TexCoord[0] + 0.22 * gl_TexCoord[2])'
        py = '165.0 + 140.0 * gl_TexCoord[1]'
    else:
        px = '400.0 + 220.0 * (gl_TexCoord[0] + 0.22 * gl_TexCoord[2])'
        py = '300.0 + 160.0 * gl_TexCoord[1]'
    body = source[source.index('{') + 1:source.rfind('}')]
    body = body.replace('gl_FragCoord[0]', 'atlas_px').replace('gl_FragCoord[1]', 'atlas_py')
    body = body.replace('gl_FragColor', 'atlas_output')
    prefix = f'''{{
    vec4 atlas_output = vec4(0.0, 0.0, 0.0, 1.0);
    float atlas_px = {px};
    float atlas_py = {py};
    float atlas_nx = gl_Color[0] * 2.0 - 1.0;
    float atlas_ny = gl_Color[1] * 2.0 - 1.0;
    float atlas_nz = gl_Color[2] * 2.0 - 1.0;
    float atlas_inv = 0.0;
    float atlas_diffuse = 0.0;
    float atlas_specular = 0.0;
    float atlas_light = 0.0;
'''
    footer = '''
    atlas_inv = rsq(atlas_nx * atlas_nx + atlas_ny * atlas_ny + atlas_nz * atlas_nz + 0.000001);
    atlas_nx = atlas_nx * atlas_inv;
    atlas_ny = atlas_ny * atlas_inv;
    atlas_nz = atlas_nz * atlas_inv;
    atlas_diffuse = atlas_nx * -0.42 + atlas_ny * 0.68 + atlas_nz * 0.60;
    if (atlas_diffuse < 0.0) atlas_diffuse = 0.0;
    atlas_specular = atlas_nx * -0.22 + atlas_ny * 0.38 + atlas_nz * 0.90;
    if (atlas_specular < 0.0) atlas_specular = 0.0;
    atlas_specular = atlas_specular * atlas_specular;
    atlas_specular = atlas_specular * atlas_specular;
    atlas_specular = atlas_specular * atlas_specular;
    atlas_specular = atlas_specular * atlas_specular;
    atlas_specular = atlas_specular * 0.22;
    atlas_light = 0.32 + 0.68 * atlas_diffuse;
    gl_FragColor = vec4(atlas_output[0] * atlas_light + atlas_specular + 0.018,
                        atlas_output[1] * atlas_light + atlas_specular + 0.018,
                        atlas_output[2] * atlas_light + atlas_specular + 0.018, 1.0);
}
'''
    return prefix + body + footer


def catalog(root):
    rows = []
    for source in sorted((root / 'tests/shaders').glob('*.frag')):
        if source.name[:2] in {'01', '02'}:
            continue  # keep plain white for masking, not two near-identical atlas entries
        rows.append(dict(id='basic-' + source.stem, family='Basic / ' + source.stem.split('_', 1)[1],
                         level='simple-medium', source=str(source.relative_to(root)), capability=False))
    report_file = root / 'build/capabilities/report.json'
    catalog_file = root / 'build/capabilities/catalog.json'
    report = json.loads((report_file if report_file.exists() else catalog_file).read_text())
    records = report['results'] if isinstance(report, dict) else report
    for row in records:
        if row['family'] == 'Ray-marched scenes':
            continue
        rows.append(dict(id='cap-' + Path(row['shader']).stem, family=row['family'],
                         level='simple-medium' if row['complexity'] == 'Medium' else 'complex',
                         source='build/capabilities/sources/' + row['shader'], capability=True))
    for source in sorted((root / 'build/stress/sources').glob('0[1-5]_*.frag')):
        rows.append(dict(id='stress-' + source.stem, family='Stress / ' + source.stem.split('_', 1)[1],
                         level='complex', source=str(source.relative_to(root)), capability=False))
    rows.extend(write_materials(root))
    return rows


def render_one(row, root, work, signature):
    row = dict(row)
    source = root / row['source']
    adapted = material_source(source.read_text(), row['capability'])
    frag = work / 'sources' / (row['id'] + '.frag')
    asm = work / 'spirv' / (row['id'] + '.spvasm')
    binary = asm.with_suffix('.spv')
    png = work / 'renders' / (row['id'] + '.png')
    record = work / 'records' / (row['id'] + '.json')
    key = hashlib.sha256((signature + adapted).encode()).hexdigest()
    if record.exists() and png.exists():
        old = json.loads(record.read_text())
        if old.get('signature') == key:
            return old
    frag.write_text(adapted)
    run(root / 'build/shady', frag, '-o', asm, cwd=root)
    run('spirv-as', '--target-env', 'vulkan1.0', asm, '-o', binary)
    run('spirv-val', '--target-env', 'vulkan1.0', binary)
    log = run(root / 'build/render', binary, root / 'tests/assets/teapot.obj', png, cwd=work)
    row.update(signature=key, source_sha256=digest(source), adapted_sha256=digest(frag),
               render_sha256=digest(png), spirv_sha256=digest(binary),
               instructions=sum(bool(line.strip()) and not line.startswith(';') for line in asm.read_text().splitlines()),
               device=next((line.strip() for line in log.splitlines() if 'using device:' in line), ''))
    record.write_text(json.dumps(row, indent=2) + '\n')
    return row


def mask_render(root, work):
    frag = work / 'mask.frag'
    frag.write_text('{ gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }\n')
    run(root / 'build/shady', frag, '-o', work / 'mask.spvasm', cwd=root)
    run('spirv-as', '--target-env', 'vulkan1.0', work / 'mask.spvasm', '-o', work / 'mask.spv')
    run(root / 'build/render', work / 'mask.spv', root / 'tests/assets/teapot.obj', work / 'mask.png', cwd=work)
    image = Image.open(work / 'mask.png').convert('RGB')
    bg = image.getpixel((0, 0))
    mask = ImageChops.difference(image, Image.new('RGB', image.size, bg)).convert('L').point(lambda x: 255 if x > 40 else 0)
    return mask, mask.getbbox(), bg


def descriptor(path, mask, bbox):
    image = Image.open(path).convert('RGB').crop(bbox).resize((48, 32), Image.Resampling.LANCZOS)
    array = np.asarray(image, dtype=np.float32) / 255.0
    # Preserve color, large structures, and fine-pattern differences.
    return np.concatenate([array.flatten(), np.diff(array, axis=0).flatten() * 0.6])


def choose(rows, work, mask, bbox, count):
    colorful = []
    monochrome = []
    for row in rows:
        image = np.asarray(Image.open(work / 'renders' / (row['id'] + '.png')).convert('RGB'), dtype=np.float32)
        pixels = image[np.asarray(mask) > 0]
        row['mean_surface_chroma'] = float(np.mean(np.max(pixels,axis=1)-np.min(pixels,axis=1)))
        (colorful if row['mean_surface_chroma'] > 9.0 else monochrome).append(row)
    if len(colorful) + min(3,len(monochrome)) >= count:
        rows = colorful + sorted(monochrome,key=lambda r:r['instructions'])[:3]
    desc = {r['id']: descriptor(work / 'renders' / (r['id'] + '.png'), mask, bbox) for r in rows}
    indices = {row['id']: i for i, row in enumerate(rows)}
    vectors = np.stack([desc[row['id']] for row in rows])
    norms = np.sum(vectors * vectors, axis=1)
    distances = (norms[:, None] + norms[None, :] - 2 * vectors @ vectors.T) / vectors.shape[1]
    picked = []
    pool = list(rows)
    # Favor structurally different materials; don't select a palette duplicate
    # merely to fill the sheet. All final candidates still have unique source.
    while len(picked) < count:
        if not picked:
            row = min(pool, key=lambda r: r['instructions'])
        else:
            def novelty(row):
                distance = min(float(distances[indices[row['id']], indices[other['id']]]) for other in picked)
                family_count = sum(other['family'] == row['family'] for other in picked)
                return distance / (1 + family_count * 0.08)
            row = max(pool, key=novelty)
        picked.append(row)
        pool.remove(row)
    # Increase complexity in four 16-teapot bands, mixing families inside a band.
    picked.sort(key=lambda r: r['instructions'])
    ordered = []
    for start in range(0, count, 16):
        band = picked[start:start + 16]
        previous = None
        while band:
            choices = [r for r in band if r['family'] != previous] or band
            row = min(choices, key=lambda r: r['instructions'])
            ordered.append(row); band.remove(row); previous = row['family']
    return ordered


def compose(rows, mask, bbox, bg, work):
    columns, lines = 16, 8
    cell_width = 384
    object_height = round(cell_width * (bbox[3] - bbox[1]) / (bbox[2] - bbox[0]))
    cell_height = object_height  # zero gutters and zero outer margins
    canvas = Image.new('RGB', (columns * cell_width, lines * cell_height), bg)
    matte = mask.crop(bbox).resize((cell_width, object_height), Image.Resampling.LANCZOS)
    shadow = Image.new('L', (cell_width, object_height), 0)
    ImageDraw.Draw(shadow).ellipse((cell_width * .17, object_height * .86,
                                   cell_width * .86, object_height * .99), fill=90)
    shadow = shadow.filter(ImageFilter.GaussianBlur(7))
    black = Image.new('RGB', shadow.size, (0, 0, 0))
    for index, row in enumerate(rows):
        x, y = index % columns * cell_width, index // columns * cell_height
        # One shared surface and consistent soft contact shadow, never tile frames.
        canvas.paste(black, (x, y), shadow)
        image = Image.open(work / 'renders' / (row['id'] + '.png')).convert('RGB').crop(bbox)
        image = image.resize((cell_width, object_height), Image.Resampling.LANCZOS)
        canvas.paste(image, (x, y), matte)
        row.update(row=index // columns + 1, column=index % columns + 1)
    DEST.mkdir(parents=True, exist_ok=True)
    canvas.save(DEST / 'teapot-workspace-8x16.png', optimize=True)
    canvas.save(DEST / 'teapot-workspace-8x16.webp', quality=94, method=6)
    canvas.resize((2048, round(canvas.height / 3)), Image.Resampling.LANCZOS).save(work / 'preview.png')
    return canvas.size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--shady-root', type=Path, default=Path.home() / 'shady')
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    root = args.shady_root.resolve()
    work = root / 'build/teapot-workspace'
    for sub in ['sources', 'spirv', 'renders', 'records', 'build']:
        (work / sub).mkdir(parents=True, exist_ok=True)
    vertex = vertex_source(root)
    (work / 'surface.vert').write_text(vertex)
    run('glslangValidator', '-V', work / 'surface.vert', '-o', work / 'build/mesh.vert.spv')
    before = {str(p.relative_to(root)): digest(p) for p in [root/'build/shady', root/'build/render', root/'src/scanner.l', root/'tools/render.cpp', root/'tools/mesh.vert', root/'tests/assets/teapot.obj', *sorted((root/'src').glob('*.[chy]'))]}
    signature = hashlib.sha256((json.dumps(before, sort_keys=True) + vertex).encode()).hexdigest()
    rows = catalog(root)
    if args.preview:
        wanted = {'basic-21_woven_checker', 'cap-012_gemstone_cells', 'cap-072_mandelbrot_coast'}
        rows = [r for r in rows if r['id'] in wanted]
    print(f'Rendering {len(rows)} surface materials; compiler and renderer remain unchanged.', flush=True)
    complete = []
    errors = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(render_one, row, root, work, signature): row for row in rows}
        for future in as_completed(futures):
            row = futures[future]
            try:
                complete.append(future.result())
            except Exception as exc:
                errors.append({'id': row['id'], 'error': str(exc)})
            if (len(complete) + len(errors)) % 8 == 0:
                print(f'{len(complete)} rendered; {len(errors)} failed.', flush=True)
    (work / 'errors.json').write_text(json.dumps(errors, indent=2) + '\n')
    if args.preview:
        for row in complete: print(work / 'renders' / (row['id'] + '.png'))
        if errors: raise RuntimeError(errors)
        return
    mask, bbox, bg = mask_render(root, work)
    complete.sort(key=lambda row: row['id'])
    unique = {}
    for row in complete:
        unique.setdefault(row['render_sha256'], row)
    complete = list(unique.values())
    easy = [r for r in complete if r['level'] == 'simple-medium']
    complex_rows = [r for r in complete if r['level'] == 'complex']
    if len(easy) < 64 or len(complex_rows) < 64:
        raise RuntimeError(f'Not enough valid unique renders: {len(easy)} simple/medium, {len(complex_rows)} complex; {errors}')
    chosen = choose(easy, work, mask, bbox, 64) + choose(complex_rows, work, mask, bbox, 64)
    assert len({r['source_sha256'] for r in chosen}) == 128
    assert len({r['render_sha256'] for r in chosen}) == 128
    assert not any('Ray-marched scenes' == r['family'] for r in chosen)
    size = compose(chosen, mask, bbox, bg, work)
    assert all(digest(root / name) == value for name, value in before.items())
    report = dict(rows=8, columns=16, width=size[0], height=size[1], gutters=0,
                  counts=dict(Counter(r['level'] for r in chosen)),
                  method='Shady-compiled materials, object-space coordinates, mesh-normal lighting, Vulkan teapot renders; alpha-composited onto one shared background.',
                  excluded='All ray-marched separate-scene examples, including 093.',
                  compiler_and_renderer_unchanged=True, binary_hashes=before,
                  selections=chosen, rejected=errors)
    (DEST / 'teapot-workspace-8x16.manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Wrote {size[0]} x {size[1]} workspace, with 64 simple/medium and 64 complex teapots.', flush=True)


if __name__ == '__main__':
    main()
