// Profound: scatter the entries across the 12-column board at random, fresh on every load.
// Each row holds one to three entries with random widths, gaps and small vertical nudges.
// Entries on the right half align right; images and hover tilts get random angles.
// The CSS only applies this on desktop; phones keep the stepped single column.
(function () {
  const board = document.querySelector('.profound-board');
  if (!board) return;

  const COLS = 12;
  const items = [...board.querySelectorAll('.thought-item')];
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const sum = list => list.reduce((a, b) => a + b, 0);
  const sign = () => (Math.random() < 0.5 ? -1 : 1);

  let row = 1;
  let i = 0;
  while (i < items.length) {
    const roll = Math.random();
    const count = Math.min(roll < 0.3 ? 1 : roll < 0.85 ? 2 : 3, items.length - i);
    const group = items.slice(i, i + count);

    // Images get a little more room than text
    const spans = group.map(item => (item.querySelector('.thought-image') ? randInt(4, 5) : randInt(3, 5)));

    // Shrink the widest until the row fits, keeping at least one empty column between entries
    while (sum(spans) + (count - 1) > COLS) {
      spans[spans.indexOf(Math.max(...spans))]--;
    }

    // Share the leftover columns at random among the gaps before, between and after
    let slack = COLS - sum(spans) - (count - 1);
    const gaps = new Array(count + 1).fill(0);
    while (slack-- > 0) gaps[randInt(0, count)]++;

    let col = 1;
    group.forEach((item, k) => {
      col += gaps[k] + (k > 0 ? 1 : 0);
      const style = item.style;
      style.setProperty('--row', row);
      style.setProperty('--col', `${col} / span ${spans[k]}`);
      style.setProperty('--shift', `${rand(0, 2.5).toFixed(2)}rem`);
      style.setProperty('--align', col + spans[k] / 2 > 7 ? 'right' : 'left');
      style.setProperty('--tilt', `${(sign() * rand(0.8, 2)).toFixed(2)}deg`);
      style.setProperty('--hover-tilt', `${(sign() * 1.5).toFixed(2)}deg`);
      col += spans[k];
    });

    i += count;
    row++;
  }

  board.classList.add('is-scattered');
})();
