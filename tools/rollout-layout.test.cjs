const test = require('node:test');
const assert = require('node:assert/strict');
const { computeLayout, computeRows } = require('./rollout-layout.cjs');

const map = [1.6, 1.6, 1.6, 1.6, 1180 / 600]
  .map((aspect, i) => ({ src: `map-${i}`, aspect, priority: i < 4 ? 3 : 1 }));
const tiny = [
  { src: 'portrait-video', aspect: 1080 / 1920, priority: 4 },
  { src: 'landscape-video', aspect: 1340 / 1000, priority: 4 },
  { src: 'architecture', aspect: 2150.34 / 2912.99, priority: 2 },
  { src: 'xor', aspect: 1358.88 / 538.38, priority: 1 },
];
const furnace = [
  { src: 'furnace', aspect: 854 / 480, priority: 3 },
  { src: 'controller', aspect: 4 / 3, priority: 2 },
  { src: 'diagram', aspect: 1.15, priority: 1 },
];

function rectangles(plan) {
  return Object.fromEntries(Object.entries(plan.tiles).map(([src, tile]) => [src, {
    x: tile.left / 100 * plan.width, y: tile.top / 100 * plan.height,
    width: tile.width / 100 * plan.width, height: tile.height / 100 * plan.height,
  }]));
}

function area(rect) { return rect.width * rect.height; }

test('caption examples share the top row with the architecture underneath', () => {
  const media = [0, 1, 2].map(i => ({ src: `caption-${i}`, aspect: 1200 / 2100 }));
  media.push({ src: 'architecture', aspect: 3810 / 1500 });
  const plan = computeRows(media, [3, 1]);
  const rects = rectangles(plan);
  for (let i = 0; i < 3; i++) {
    const r = rects[`caption-${i}`];
    assert.equal(r.y, 0);
    assert.ok(r.y + r.height < rects.architecture.y);
    assert.ok(Math.abs(r.width / r.height - media[i].aspect) < 1e-9);
  }
  assert.equal(rects.architecture.x, 0);
  assert.equal(rects.architecture.width, plan.width);
  assert.ok(Math.abs(rects.architecture.width / rects.architecture.height - media[3].aspect) < 1e-9);
});

test('all media retain their proportions, stay in bounds, and never overlap', () => {
  for (const media of [map, tiny, furnace]) {
    for (const limit of [2 / 3, 0.42]) {
      const plan = computeLayout(media, limit);
      const rects = rectangles(plan);
      const entries = Object.entries(rects);
      media.forEach(item => {
        const r = rects[item.src];
        assert.ok(Math.abs(r.width / r.height - item.aspect) < 1e-9);
        assert.ok(r.x >= -1e-8 && r.y >= -1e-8);
        assert.ok(r.x + r.width <= plan.width + 1e-8);
        assert.ok(r.y + r.height <= plan.height + 1e-8);
      });
      entries.forEach(([_, a], i) => entries.slice(i + 1).forEach(([__, b]) => {
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        assert.ok(overlapX <= 0 || overlapY <= 0);
      }));
      assert.ok(Math.abs(Math.max(...entries.map(([_, r]) => r.y + r.height)) - plan.height) < 1e-8);
    }
  }
});

test('the four map renders are equal-sized and occupy the complete row width', () => {
  const plan = computeLayout(map);
  const rects = rectangles(plan);
  for (let i = 1; i < 4; i += 1) {
    assert.ok(Math.abs(area(rects[`map-${i}`]) / area(rects['map-0']) - 1) < 1e-9);
  }
  assert.ok(area(rects['map-4']) < area(rects['map-0']));
  assert.ok(plan.aspect >= 1.5, 'the whole plan fits the desktop height ceiling at full width');
  assert.ok(Math.abs(Math.max(...Object.values(rects).map(r => r.x + r.width)) - plan.width) < 1e-8);
});

test('Tiny TPU videos have equal area and XOR remains large enough to read', () => {
  const plan = computeLayout(tiny);
  const rects = rectangles(plan);
  assert.ok(Math.abs(area(rects['portrait-video']) / area(rects['landscape-video']) - 1) < 1e-9);
  assert.ok(rects.xor.width > plan.width * 0.3);
  assert.ok(rects.xor.width > rects.architecture.width);
  assert.ok(area(rects.xor) >= area(rects['portrait-video']) / 1.5);
});

test('priority does not create extreme differences between furnace images', () => {
  const rects = rectangles(computeLayout(furnace));
  assert.ok(area(rects.furnace) > area(rects.controller));
  assert.ok(area(rects.controller) > area(rects.diagram));
  assert.ok(area(rects.furnace) / area(rects.diagram) <= 1.401);
});

test('a single image is left aligned and 40% of the content width', () => {
  const plan = computeLayout([{ src: 'dish', aspect: 16 / 9, priority: 1 }]);
  assert.equal(plan.tiles.dish.left, 0);
  assert.equal(plan.tiles.dish.width, 40);
});

test('repeated calculations are deterministic', () => {
  assert.deepEqual(computeLayout(tiny), computeLayout(tiny));
});

test('an explicitly full-width composite uses the complete content column', () => {
  const plan = computeLayout([{ src: 'workspace', aspect: 6144 / 1712, priority: 3, fullWidth: true }]);
  assert.equal(plan.tiles.workspace.width, 100);
  assert.equal(plan.tiles.workspace.left, 0);
  assert.ok(Math.abs(plan.aspect - 6144 / 1712) < 1e-9);
});
