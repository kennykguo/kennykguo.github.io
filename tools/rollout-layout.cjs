/* Pure, deterministic layout calculation. Used by the generator and its tests. */
const REFERENCE_WIDTH = 1000;
const GAP = 8;

function weightsFor(media) {
  const ranks = [...new Set(media.map(item => item.priority || 1))].sort((a, b) => b - a);
  // Priority is an ordering, not an exponential size multiplier.
  return media.map(item => 1 + 0.2 * (ranks.length - 1 - ranks.indexOf(item.priority || 1)));
}

function ordersFor(count) {
  const result = [];
  const visit = (prefix, remaining) => {
    if (result.length >= 720) return;
    if (!remaining.length) { result.push(prefix); return; }
    remaining.forEach((index, position) => visit([...prefix, index],
      remaining.filter((_, i) => i !== position)));
  };
  visit([], Array.from({ length: count }, (_, index) => index));
  return result;
}

function normalize(tiles, width, height) {
  return {
    aspect: width / height,
    width,
    height,
    tiles: Object.fromEntries(tiles.map(tile => [tile.src, {
      left: tile.x / width * 100,
      top: tile.y / height * 100,
      width: tile.width / width * 100,
      height: tile.height / height * 100,
    }])),
  };
}

function computeLayout(media, maxHeightRatio = 2 / 3) {
  if (!media.length) throw new Error('Cannot lay out an empty gallery');
  if (media.length > 9) throw new Error('Split galleries with more than nine media items');
  if (media.some(item => !(item.aspect > 0) || !item.src)) throw new Error('Invalid media dimensions');
  const weights = weightsFor(media);
  const units = media.map((item, index) => ({
    ...item,
    width: Math.sqrt(weights[index] * item.aspect),
    height: Math.sqrt(weights[index] / item.aspect),
  }));
  const width = REFERENCE_WIDTH;
  const maxHeight = width * maxHeightRatio;

  if (media.length < 3) {
    const reference = Math.max(...units.map(item => item.width));
    const maxWidth = media.length === 1 && media[0].fullWidth ? width : width * 0.4;
    const scale = Math.min(maxWidth / reference,
      maxHeight / Math.max(...units.map(item => item.height)));
    let x = 0;
    const tiles = units.map(item => {
      const tile = { src: item.src, x, y: 0, width: item.width * scale, height: item.height * scale };
      x += tile.width + GAP;
      return tile;
    });
    // Retain the content-width reference for ordinary 40%-width media.
    return normalize(tiles, width, Math.max(...tiles.map(item => item.height)));
  }

  let best;
  for (const order of ordersFor(media.length)) {
    for (let mask = 0; mask < 2 ** (media.length - 1); mask += 1) {
      const rows = [[]];
      order.forEach((index, position) => {
        rows[rows.length - 1].push(units[index]);
        if (position < order.length - 1 && (mask & (1 << position))) rows.push([]);
      });
      const availableHeight = maxHeight - GAP * (rows.length - 1);
      if (availableHeight <= 0) continue;
      const rowHeights = rows.map(row => Math.max(...row.map(item => item.height)));
      const scale = Math.min(availableHeight / rowHeights.reduce((a, b) => a + b, 0),
        ...rows.map(row => (width - GAP * (row.length - 1))
          / row.reduce((sum, item) => sum + item.width, 0)));
      if (scale <= 0) continue;
      const tiles = [];
      let y = 0;
      let usedWidth = 0;
      let staircase = 0;
      rows.forEach((row, rowIndex) => {
        let x = 0;
        row.forEach((item, index) => {
          tiles.push({ src: item.src, x, y, width: item.width * scale, height: item.height * scale });
          if (index) staircase += Math.max(0, item.height - row[index - 1].height);
          x += item.width * scale + GAP;
        });
        if (rowIndex) staircase += Math.max(0, rowHeights[rowIndex] - rowHeights[rowIndex - 1]);
        usedWidth = Math.max(usedWidth, x - GAP);
        y += rowHeights[rowIndex] * scale + GAP;
      });
      const usedHeight = y - GAP;
      const area = tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0);
      // Measure the actual display size after fitting the height ceiling.
      // Favor width, useful image area, and a descending outline over symmetry.
      const widthCoverage = Math.min(1, maxHeightRatio * usedWidth / usedHeight);
      const usefulArea = area / (usedWidth * usedWidth) * widthCoverage ** 2 / maxHeightRatio;
      const footprintFill = area / (usedWidth * usedHeight);
      const cost = 5 * (1 - widthCoverage) + 2 * (1 - usefulArea)
        + 0.35 * (1 - footprintFill) + 0.08 * staircase + 0.015 * (rows.length - 1);
      if (!best || cost < best.cost - 1e-9) best = { cost, tiles, width: usedWidth, height: usedHeight };
    }
  }
  return normalize(best.tiles, best.width, best.height);
}

// Explicit rows retain source order and justify each row without cropping.
function computeRows(media, rows) {
  if (rows.some(count => !Number.isInteger(count) || count < 1)
      || rows.reduce((sum, count) => sum + count, 0) !== media.length) {
    throw new Error('Media rows must account for every image/video exactly once');
  }
  const width = 1000;
  const tiles = [];
  let offset = 0;
  let y = 0;
  for (const count of rows) {
    const row = media.slice(offset, offset + count);
    const height = (width - GAP * (count - 1)) / row.reduce((sum, item) => sum + item.aspect, 0);
    let x = 0;
    for (const item of row) {
      const tileWidth = height * item.aspect;
      tiles.push({ src: item.src, x, y, width: tileWidth, height });
      x += tileWidth + GAP;
    }
    y += height + GAP;
    offset += count;
  }
  return normalize(tiles, width, y - GAP);
}

module.exports = { computeLayout, computeRows, weightsFor };
