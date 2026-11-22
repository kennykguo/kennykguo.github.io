/* Recalculate only galleries whose media or packing rules changed. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { computeLayout, computeRows } = require('./rollout-layout.cjs');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'docs/_data/rollouts.yml');
const output = path.join(root, 'docs/_data/rollout_layouts.json');
const projects = JSON.parse(execFileSync('ruby', ['-ryaml', '-rdate', '-rjson', '-e',
  'puts JSON.generate(YAML.load_file(ARGV[0], permitted_classes: [Date]))', source], { encoding: 'utf8' }));
const previous = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : {};
const algorithm = fs.readFileSync(path.join(__dirname, 'rollout-layout.cjs'), 'utf8');
const profiles = { desktop: 2 / 3, compact: 0.42 };
const next = {};
let calculated = 0;
let reused = 0;

for (const project of projects) {
  const entries = [
    ...(project.videos || []).map(item => ({ ...item, kind: 'video' })),
    ...(project.images || []).map(item => ({ ...item, kind: 'image' })),
    ...(project.video ? [{ src: project.video, kind: 'video', priority: project.video_priority,
      width: project.video_width, height: project.video_height }] : []),
  ];
  if (!project.media_rows) entries.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  if (!entries.length) continue;
  const media = entries.map(item => {
    if (!(item.width > 0 && item.height > 0)) throw new Error(`Add source width/height for ${item.src}`);
    if (!fs.existsSync(path.join(root, 'docs', item.src))) throw new Error(`Missing media ${item.src}`);
    return { src: item.src, kind: item.kind, priority: item.priority || 1,
      aspect: item.layout_ratio || item.width / item.height,
      ...(item.full_width ? { fullWidth: true } : {}) };
  });
  const signature = crypto.createHash('sha256').update(algorithm + JSON.stringify({ media, profiles, rows: project.media_rows })).digest('hex');
  if (previous[project.title]?.signature === signature) {
    next[project.title] = previous[project.title];
    reused += 1;
    continue;
  }
  const planFor = limit => project.media_rows ? computeRows(media, project.media_rows) : computeLayout(media, limit);
  next[project.title] = { signature, count: media.length,
    desktop: planFor(profiles.desktop), compact: planFor(profiles.compact) };
  calculated += 1;
}

const serialized = JSON.stringify(next, (_, value) => typeof value === 'number'
  ? Math.round(value * 1e6) / 1e6 : value, 2) + '\n';
if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== serialized) fs.writeFileSync(output, serialized);
console.log(`Rollouts: calculated ${calculated}, reused ${reused} cached galleries.`);
