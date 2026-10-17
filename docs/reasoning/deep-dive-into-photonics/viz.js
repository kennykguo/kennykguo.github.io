// Interactive figures for the photonics notebook post.
// Each <figure class="viz" data-viz="name"> in the post gets a canvas and its controls.
// Maths in figures is typeset by KaTeX in an HTML layer over the canvas, like the text.
// Animations only run while a figure is on screen, and start paused for reduced motion.
// The shared helpers are exposed as window.PhotonicsViz for em-wave-3d.js.
(function () {
  const INK = '#111';
  const MUTED = 'rgba(17, 17, 17, 0.6)';
  const FAINT = 'rgba(17, 17, 17, 0.14)';
  const E_COLOR = '#d1453b';
  const B_COLOR = '#2e6fd8';
  const GLASS = 'rgba(46, 111, 216, 0.13)';
  const FONT = '12px "Roboto Mono", ui-monospace, monospace';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // Text with maths between $...$, e.g. 'field at $z_0$'. The maths is rendered by KaTeX.
  function renderRich(content) {
    return content.split('$').map((part, i) => {
      if (i % 2 === 0) return escapeHtml(part);
      return window.katex ? window.katex.renderToString(part, { throwOnError: false }) : escapeHtml(part);
    }).join('');
  }

  // Row of controls, placed between the figure and its caption
  function makeControls(figure) {
    const bar = el('div', 'viz-controls');
    figure.insertBefore(bar, figure.querySelector('figcaption'));
    return bar;
  }

  function segmented(bar, options, initial, onChange) {
    const group = el('div', 'viz-segmented');
    options.forEach(([value, label]) => {
      const button = el('button', 'viz-button');
      button.innerHTML = renderRich(label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(value === initial));
      button.addEventListener('click', () => {
        group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        onChange(value);
      });
      group.appendChild(button);
    });
    bar.appendChild(group);
    return group;
  }

  function slider(bar, label, { min, max, step, value, format }, onInput) {
    const wrap = el('label', 'viz-slider');
    const text = el('span', 'viz-slider-label');
    const input = el('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    const show = () => { text.innerHTML = renderRich(`${label} ${format(+input.value)}`); };
    input.addEventListener('input', () => { show(); onInput(+input.value); });
    show();
    // The readout sits after the slider, so its changing width can't shift the slider mid-drag
    wrap.append(input, text);
    bar.appendChild(wrap);
    return input;
  }

  function legend(bar, items) {
    const wrap = el('div', 'viz-legend');
    items.forEach(([color, label]) => {
      const item = el('span', 'viz-legend-item');
      const swatch = el('span', 'viz-swatch');
      swatch.style.background = color;
      const words = el('span');
      words.innerHTML = renderRich(label);
      item.append(swatch, words);
      wrap.appendChild(item);
    });
    bar.appendChild(wrap);
  }

  // A canvas that fills the stage's width. draw() runs after every resize. The first sizing
  // waits for a microtask, so the figure's setup (and its variables) has finished by then.
  function makeCanvas(figure, { aspect, minHeight, maxHeight = 520 }, draw) {
    const stage = figure.querySelector('.viz-stage');
    const canvas = el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', figure.dataset.label || '');
    stage.appendChild(canvas);
    const view = { canvas, ctx: canvas.getContext('2d'), w: 0, h: 0 };
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      view.w = stage.clientWidth;
      view.h = Math.round(Math.min(maxHeight, Math.max(minHeight, view.w * aspect)));
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      canvas.style.height = `${view.h}px`;
      view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    new ResizeObserver(resize).observe(stage);
    queueMicrotask(resize);
    return view;
  }

  // HTML labels over the canvas. Each frame: begin(), label(...) for every label, end().
  // A label's KaTeX is only re-rendered when its content changes.
  function makeOverlay(figure) {
    const layer = el('div', 'viz-labels');
    figure.querySelector('.viz-stage').appendChild(layer);
    const labels = new Map();
    let used = new Set();
    return {
      begin() { used = new Set(); },
      label(key, content, x, y, { align = 'left', valign = 'middle', color = MUTED, backed = false } = {}) {
        let item = labels.get(key);
        if (!item) {
          item = { node: el('span', 'viz-label'), content: null };
          layer.appendChild(item.node);
          labels.set(key, item);
        }
        if (item.content !== content) {
          item.node.innerHTML = renderRich(content);
          item.content = content;
        }
        const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
        const ty = valign === 'top' ? '0' : valign === 'bottom' ? '-100%' : '-50%';
        item.node.style.transform = `translate(${x}px, ${y}px) translate(${tx}, ${ty})`;
        item.node.style.color = color;
        item.node.classList.toggle('is-backed', backed);
        item.node.hidden = false;
        used.add(key);
        return item.node;
      },
      end() {
        labels.forEach((item, key) => { if (!used.has(key)) item.node.hidden = true; });
      },
    };
  }

  // Runs draw(t) every frame while the figure is visible and playing, with a play/pause button
  function animate(figure, bar, draw) {
    let playing = !reducedMotion;
    let visible = false;
    let last = null;
    let frame = null;
    const state = { t: 0 };

    const button = el('button', 'viz-button viz-play');
    button.type = 'button';
    const label = () => { button.textContent = playing ? 'pause' : 'play'; };
    label();
    bar.prepend(button);

    function loop(now) {
      frame = null;
      if (!playing || !visible) { last = null; return; }
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;
      state.t += dt;
      draw(state.t);
      frame = requestAnimationFrame(loop);
    }
    function kick() {
      if (frame === null && playing && visible) frame = requestAnimationFrame(loop);
    }
    button.addEventListener('click', () => { playing = !playing; label(); kick(); });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick(); }).observe(figure);

    state.redraw = () => draw(state.t);
    return state;
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function dot(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function arrowHead(ctx, x, y, angle, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - 0.4), y - size * Math.sin(angle - 0.4));
    ctx.lineTo(x - size * Math.cos(angle + 0.4), y - size * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function text(ctx, value, x, y, { color = MUTED, align = 'left', baseline = 'alphabetic' } = {}) {
    ctx.font = FONT;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(value, x, y);
  }

  // Draws y = f(x) for x from x0 to x1 (canvas pixels)
  function plot(ctx, x0, x1, f, step = 2) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) {
      const y = f(x);
      if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const sinc = u => (Math.abs(u) < 1e-9 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u));

  // ---------------------------------------------------------------------------
  // A charge moved once, or wiggled, and the disturbance it sends out
  // ---------------------------------------------------------------------------

  function chargeDisturbance(figure) {
    const bar = makeControls(figure);
    let motion = 'kick';
    const anim = animate(figure, bar, t => draw(t));
    segmented(bar, [['kick', 'one sharp jerk'], ['wiggle', 'keep wiggling']], motion,
      value => { motion = value; anim.t = 0; anim.redraw(); });
    const view = makeCanvas(figure, { aspect: 0.36, minHeight: 220, maxHeight: 320 }, () => draw(anim.t));
    const overlay = makeOverlay(figure);

    // Height of the charge over time: one quick bump every few seconds, or a steady sine
    const period = 4.5;
    const position = time => {
      if (motion === 'wiggle') return Math.sin(2 * Math.PI * time / 1.3);
      const tau = ((time % period) + period) % period;
      return Math.exp(-(((tau - 0.5) / 0.09) ** 2));
    };

    function draw(animTime) {
      // start part-way through, so a paused first frame already shows the pulse in flight
      const t = animTime + 1.6;
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const x0 = 46;
      const right = w - 14;
      const mid = h * 0.52;
      const amp = h * 0.3;
      const c = (right - x0) / 3.2;   // px per second

      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      line(ctx, x0, mid, right, mid);
      arrowHead(ctx, right, mid, 0, 7, FAINT);

      // field along the line: whatever the charge did, delayed by the travel time z / c
      ctx.strokeStyle = E_COLOR;
      ctx.lineWidth = 2;
      plot(ctx, x0 + 18, right, x => mid - amp * position(t - (x - x0) / c));

      // the charge, on the full range it can move along
      ctx.strokeStyle = MUTED;
      ctx.setLineDash([2, 4]);
      line(ctx, x0, mid - amp - 12, x0, mid + amp + 12);
      ctx.setLineDash([]);
      dot(ctx, x0, mid - amp * position(t), 9, INK);
      text(ctx, '+', x0, mid - amp * position(t) + 0.5, { color: '#fff', align: 'center', baseline: 'middle' });
      overlay.label('charge', 'charge', x0, h - 12, { align: 'center' });
      overlay.label('speed', 'disturbance travels outward at $c$ →', right, 16, { align: 'right' });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // A travelling wave, viewed four ways
  // ---------------------------------------------------------------------------

  function waveAnatomy(figure) {
    const bar = makeControls(figure);
    let mode = 'both';
    let pulseShape = false;
    let view;

    const anim = animate(figure, bar, t => draw(t));
    segmented(bar, [
      ['t', '$t$ fixed'],
      ['z', '$z$ fixed'],
      ['both', 'both vary'],
      ['phase', 'phase fixed'],
    ], mode, value => { mode = value; anim.t = 0; anim.redraw(); });
    segmented(bar, [['endless', 'endless wave'], ['pulse', 'short pulse']], 'endless',
      value => { pulseShape = value === 'pulse'; anim.t = 0; anim.redraw(); });

    view = makeCanvas(figure, { aspect: 0.5, minHeight: 280 }, () => draw(anim.t));
    const overlay = makeOverlay(figure);

    function draw(t) {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();

      const left = 28;
      const right = w - 16;
      const plotW = right - left;
      const lambda = plotW / 4.25;
      const k = (2 * Math.PI) / lambda;
      const speed = lambda * 0.32;            // px per second
      const omega = k * speed;

      // A short pulse: the same wave under a smooth on/off window that travels with it. Its
      // centre starts on a crest and wraps around after a whole number of wavelengths.
      const pulseLength = 2.5 * lambda;
      const edge = 0.3 * lambda;
      const start = Math.round(plotW / 2 / lambda) * lambda;
      const wrap = Math.ceil((plotW + 2 * pulseLength) / lambda) * lambda;
      const centre = time => ((start + speed * time + pulseLength) % wrap) - pulseLength;
      const onOff = (z, time) => 0.5 * (1 - Math.tanh((Math.abs(z - centre(time)) - pulseLength / 2) / edge));
      const E = (z, time) => Math.cos(k * z - omega * time) * (pulseShape ? onOff(z, time) : 1);

      const axis = (mid, label) => {
        ctx.strokeStyle = FAINT;
        ctx.lineWidth = 1;
        line(ctx, left, mid, right, mid);
        arrowHead(ctx, right, mid, 0, 7, FAINT);
        overlay.label(`axis-${label}`, `$${label}$`, right - 2, mid + 14, { align: 'right' });
      };

      if (mode === 'z') {
        // Two panels: the wave in space with a probe at z0 (top), and the field at z0 over time (bottom)
        const midS = h * 0.3;
        const midT = h * 0.76;
        const amp = h * 0.15;
        const z0 = plotW * 0.3;
        axis(midS, 'z');
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.35)';
        ctx.lineWidth = 1.5;
        plot(ctx, left, right, x => midS - amp * E(x - left, t));
        ctx.strokeStyle = MUTED;
        ctx.setLineDash([3, 4]);
        line(ctx, left + z0, midS - amp - 10, left + z0, midS + amp + 10);
        ctx.setLineDash([]);
        dot(ctx, left + z0, midS - amp * E(z0, t), 5, E_COLOR);
        overlay.label('z0', '$z_0$', left + z0 + 6, midS + amp + 12);
        overlay.label('top', 'the wave in space, with one spot $z_0$ marked', left, 14);

        axis(midT, 't');
        const seconds = 2.4 * (2 * Math.PI / omega);
        ctx.strokeStyle = E_COLOR;
        ctx.lineWidth = 2;
        plot(ctx, left, right - 8, x => midT - amp * E(z0, t - ((right - 8 - x) / (right - 8 - left)) * seconds));
        dot(ctx, right - 8, midT - amp * E(z0, t), 4, E_COLOR);
        overlay.label('bottom', 'the field at $z_0$ over time (newest on the right)', left, midT - amp - 16);
      } else {
        const mid = h * 0.52;
        const amp = h * 0.28;
        const y = value => mid - amp * value;
        axis(mid, 'z');
        const snapshotTime = mode === 't' ? 0 : t;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        plot(ctx, left, right, x => y(E(x - left, snapshotTime)));

        if (mode === 't') {
          // Time frozen: a snapshot. A cursor walks along z and the phase changes under it.
          const z = ((t * 0.18) % 1) * plotW;
          ctx.strokeStyle = FAINT;
          ctx.setLineDash([3, 4]);
          line(ctx, left + z, mid - amp - 10, left + z, mid + amp + 10);
          ctx.setLineDash([]);
          dot(ctx, left + z, y(E(z, 0)), 5, E_COLOR);
          overlay.label('readout', `$\\phi = kz - \\omega t = ${(k * z / Math.PI).toFixed(2)}\\,\\pi$`, left + 4, 18, { color: E_COLOR });
          overlay.label('note', '$t$ fixed: the phase changes as you move along $z$', left + 4, h - 14);
          if (!pulseShape) {
            const x1 = left + lambda;
            const x2 = left + 2 * lambda;
            const yb = mid - amp - 14;
            ctx.strokeStyle = MUTED;
            line(ctx, x1, yb, x2, yb);
            line(ctx, x1, yb - 4, x1, yb + 4);
            line(ctx, x2, yb - 4, x2, yb + 4);
            overlay.label('lambda', '$\\lambda$', (x1 + x2) / 2, yb - 12, { align: 'center', color: INK });
          }
        } else if (mode === 'both') {
          overlay.label('readout', '$\\vec{E}(z,t) = E_0 \\cos(kz - \\omega t)\\,\\hat{x}$', left + 4, 18, { color: INK });
          overlay.label('note', 'both vary: the wave travels at $v_p = \\omega / k$', left + 4, h - 14);
        } else {
          // Ride one crest: hold kz − ωt constant and the point moves at ω/k
          const span = Math.floor(plotW / lambda) * lambda;
          const z = pulseShape ? centre(t) : (speed * t) % span;
          if (!pulseShape) {
            ctx.strokeStyle = 'rgba(209, 69, 59, 0.45)';
            ctx.setLineDash([2, 4]);
            line(ctx, left, mid - amp - 8, left + z, mid - amp - 8);
            ctx.setLineDash([]);
          }
          if (z >= 0 && z <= plotW) dot(ctx, left + z, y(1), 6, E_COLOR);
          overlay.label('readout', '$kz - \\omega t = 0 \\;\\Rightarrow\\; z = \\dfrac{\\omega}{k}\\, t$', left + 4, 22, { color: E_COLOR });
          overlay.label('note', 'phase fixed: the red dot rides one crest at $v_p = \\omega / k$', left + 4, h - 14);
        }
      }
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Crests matching along the boundary (Snell's law from the wave picture)
  // ---------------------------------------------------------------------------

  function snellWavefronts(figure) {
    const presets = {
      airGlass: { n1: 1, n2: 1.5, name1: 'air', name2: 'glass' },
      airSilicon: { n1: 1, n2: 3.48, name1: 'air', name2: 'silicon' },
    };
    let media = presets.airGlass;
    let theta1 = 40 * Math.PI / 180;
    const bar = makeControls(figure);
    const anim = animate(figure, bar, t => draw(t));
    segmented(bar, [['airGlass', 'air → glass'], ['airSilicon', 'air → silicon']], 'airGlass',
      value => { media = presets[value]; anim.redraw(); });
    slider(bar, 'angle', { min: 20, max: 75, step: 1, value: 40, format: v => `$\\theta_1 = ${v}^\\circ$` },
      v => { theta1 = v * Math.PI / 180; anim.redraw(); });
    legend(bar, [
      [E_COLOR, 'wave crests'],
      ['rgba(46, 111, 216, 0.45)', 'glass (or silicon)'],
      [INK, 'where crests meet the surface'],
    ]);
    const view = makeCanvas(figure, { aspect: 0.6, minHeight: 300 }, () => draw(anim.t));
    const overlay = makeOverlay(figure);

    function draw(t) {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const { n1, n2, name1, name2 } = media;
      const cx = w / 2;
      const cy = h / 2;
      const lambda1 = Math.max(26, Math.min(44, w / 16));
      const lambda2 = lambda1 * n1 / n2;
      const theta2 = Math.asin((n1 / n2) * Math.sin(theta1));
      const shift = (t * 0.5) % 1;       // every wave has the same frequency, so the crests advance together
      const diag = Math.hypot(w, h);

      const R = Math.min(w, h) * 0.3;
      const dIn = [Math.sin(theta1), Math.cos(theta1)];
      const dRef = [Math.sin(theta1), -Math.cos(theta1)];
      const dOut = [Math.sin(theta2), Math.cos(theta2)];
      const airFill = 'rgba(255, 255, 255, 0.55)';
      const glassFill = n2 > 2 ? 'rgba(46, 111, 216, 0.22)' : GLASS;

      // Labels first, so the crest lines can leave a gap behind each one (no white boxes)
      const deg = r => (r * 180 / Math.PI).toFixed(1);
      const nodes = [
        overlay.label('k1', '$\\vec{k}_1$', cx - R * dIn[0] - 8, cy - R * dIn[1], { align: 'right', color: INK }),
        overlay.label('kr', '$\\vec{k}_r$', cx + R * 0.8 * dRef[0] + 8, cy + R * 0.8 * dRef[1], { color: INK }),
        overlay.label('k2', '$\\vec{k}_2$', cx + R * dOut[0] + 8, cy + R * dOut[1], { color: INK }),
        overlay.label('n1', `${name1}, $n_1 = ${n1.toFixed(2)}$`, 12, 18, { color: INK }),
        overlay.label('n2', `${name2}, $n_2 = ${n2.toFixed(2)}$`, 12, h - 16, { color: INK }),
        overlay.label('angles', `$\\theta_1 = ${deg(theta1)}^\\circ \\quad \\theta_2 = ${deg(theta2)}^\\circ$`, w - 12, 18, { align: 'right', color: INK }),
      ];
      const origin = view.canvas.getBoundingClientRect();
      const gaps = nodes.map(node => {
        const r = node.getBoundingClientRect();
        return [r.left - origin.left - 4, r.top - origin.top - 2, r.width + 8, r.height + 4];
      });

      // air above, glass below
      ctx.fillStyle = airFill;
      ctx.fillRect(0, 0, w, cy);
      ctx.fillStyle = glassFill;
      ctx.fillRect(0, cy, w, h - cy);

      // crest lines of a wave travelling along unit vector d with wavelength lam, clipped to one half
      const crests = (d, lam, top, style, width, dash) => {
        ctx.save();
        ctx.beginPath();
        if (top) ctx.rect(0, 0, w, cy); else ctx.rect(0, cy, w, h - cy);
        ctx.clip();
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        const along = [-d[1], d[0]];
        const count = Math.ceil(diag / lam) + 1;
        for (let m = -count; m <= count; m++) {
          const s = (m + shift) * lam;
          const px = cx + d[0] * s;
          const py = cy + d[1] * s;
          line(ctx, px - along[0] * diag, py - along[1] * diag, px + along[0] * diag, py + along[1] * diag);
        }
        ctx.restore();
      };
      crests(dRef, lambda1, true, 'rgba(209, 69, 59, 0.3)', 1.2, [4, 4]);
      crests(dIn, lambda1, true, 'rgba(209, 69, 59, 0.85)', 1.6, []);
      crests(dOut, lambda2, false, 'rgba(209, 69, 59, 0.85)', 1.6, []);

      // clear the crests behind each label, refilled with that region's own colour
      gaps.forEach(([x, y, gw, gh]) => {
        ctx.clearRect(x, y, gw, gh);
        ctx.fillStyle = y + gh / 2 < cy ? airFill : glassFill;
        ctx.fillRect(x, y, gw, gh);
      });

      // the surface, and where the crests meet it: the same points for all three waves
      const spacing = lambda1 / Math.sin(theta1);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      line(ctx, 0, cy, w, cy);
      for (let m = -Math.ceil(w / spacing) - 1; m <= Math.ceil(w / spacing) + 1; m++) {
        const x = cx + (m + shift) * spacing;
        if (x > 0 && x < w) dot(ctx, x, cy, 3.2, INK);
      }

      // wave vectors
      const vec = (x1, y1, x2, y2) => {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        line(ctx, x1, y1, x2, y2);
        arrowHead(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1), 8, INK);
      };
      vec(cx - R * dIn[0], cy - R * dIn[1], cx - 6 * dIn[0], cy - 6 * dIn[1]);
      vec(cx + 6 * dRef[0], cy + 6 * dRef[1], cx + R * 0.8 * dRef[0], cy + R * 0.8 * dRef[1]);
      vec(cx + 6 * dOut[0], cy + 6 * dOut[1], cx + R * dOut[0], cy + R * dOut[1]);
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Snell's law and total internal reflection
  // ---------------------------------------------------------------------------

  function snell(figure) {
    const presets = {
      airGlass: { n1: 1.0003, n2: 1.5, name1: 'air', name2: 'glass' },
      glassAir: { n1: 1.5, n2: 1.0003, name1: 'glass', name2: 'air' },
      siSilica: { n1: 3.48, n2: 1.44, name1: 'silicon', name2: 'silica' },
    };
    let media = presets.airGlass;
    let theta1 = 35 * Math.PI / 180;
    const bar = makeControls(figure);
    segmented(bar, [
      ['airGlass', 'air → glass'],
      ['glassAir', 'glass → air'],
      ['siSilica', 'silicon → silica'],
    ], 'airGlass', value => { media = presets[value]; draw(); });
    slider(bar, 'angle', { min: 0, max: 89, step: 0.5, value: 35, format: v => `$\\theta_1 = ${v.toFixed(1)}^\\circ$` },
      v => { theta1 = v * Math.PI / 180; draw(); });

    const view = makeCanvas(figure, { aspect: 0.6, minHeight: 300 }, () => draw());
    const overlay = makeOverlay(figure);

    function tint(n) {
      return `rgba(46, 111, 216, ${Math.min(0.2, (n - 1) * 0.08)})`;
    }

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const { n1, n2, name1, name2 } = media;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w * 0.42, h * 0.46);

      ctx.fillStyle = tint(n1);
      ctx.fillRect(0, 0, w, cy);
      ctx.fillStyle = tint(n2);
      ctx.fillRect(0, cy, w, h - cy);
      overlay.label('m1', `${name1}, $n_1 = ${n1.toFixed(2)}$`, 12, 18, { color: INK });
      overlay.label('m2', `${name2}, $n_2 = ${n2.toFixed(2)}$`, 12, h - 16, { color: INK });

      // normal
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      line(ctx, cx, cy - R, cx, cy + R);
      ctx.setLineDash([]);

      const s1 = Math.sin(theta1);
      const c1 = Math.cos(theta1);
      const sin2 = (n1 / n2) * s1;
      const tir = sin2 > 1;
      let reflectance = 1;
      let theta2 = null;
      if (!tir) {
        theta2 = Math.asin(sin2);
        const c2 = Math.cos(theta2);
        const rs = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
        const rp = (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2);
        reflectance = (rs * rs + rp * rp) / 2;
      }

      const ray = (x1, y1, x2, y2, alpha, width) => {
        const color = `rgba(209, 69, 59, ${alpha})`;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        line(ctx, x1, y1, x2, y2);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        arrowHead(ctx, x1 + (x2 - x1) * 0.6, y1 + (y2 - y1) * 0.6, angle, 9, color);
      };

      // incident, reflected, transmitted
      ray(cx - R * s1, cy - R * c1, cx, cy, 1, 2.5);
      ray(cx, cy, cx + R * s1, cy - R * c1, Math.max(0.12, reflectance), 1 + 2 * reflectance);
      if (!tir) {
        const transmittance = 1 - reflectance;
        ray(cx, cy, cx + R * Math.sin(theta2), cy + R * Math.cos(theta2), Math.max(0.12, transmittance), 1 + 2 * transmittance);
      }

      // angle arcs
      const arcR = Math.min(46, R * 0.3);
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, -Math.PI / 2 - theta1, -Math.PI / 2);
      ctx.stroke();
      overlay.label('a1', '$\\theta_1$', cx - arcR * Math.sin(theta1 / 2) - 4, cy - arcR - 10, { align: 'right', color: INK });
      if (!tir) {
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, Math.PI / 2 - theta2, Math.PI / 2);
        ctx.stroke();
        overlay.label('a2', '$\\theta_2$', cx + arcR * Math.sin(theta2 / 2) + 4, cy + arcR + 10, { color: INK });
      }

      const deg = r => (r * 180 / Math.PI).toFixed(1);
      const lines = [`$\\theta_1 = ${deg(theta1)}^\\circ$`, tir ? '$\\theta_2$: none' : `$\\theta_2 = ${deg(theta2)}^\\circ$`];
      if (n1 > n2) lines.push(`$\\theta_c = ${deg(Math.asin(n2 / n1))}^\\circ$`);
      lines.push(`reflected ${(reflectance * 100).toFixed(0)}%`);
      lines.forEach((value, i) => overlay.label(`r${i}`, value, w - 12, 18 + i * 20, { align: 'right', color: i < 2 ? INK : MUTED }));
      if (tir) overlay.label('tir', 'total internal reflection', w - 12, h - 16, { align: 'right', color: E_COLOR });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // White light and a laser through a glass prism
  // ---------------------------------------------------------------------------

  // Refractive index of ordinary optical glass (BK7, Sellmeier equation; wavelength in micrometres)
  function nGlass(lambdaUm) {
    const l2 = lambdaUm * lambdaUm;
    return Math.sqrt(1
      + (1.03961212 * l2) / (l2 - 0.00600069867)
      + (0.231792344 * l2) / (l2 - 0.0200179144)
      + (1.01046945 * l2) / (l2 - 103.560653));
  }

  // Approximate visible colour of a wavelength in nm
  function wavelengthColor(nm, alpha = 1) {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = (440 - nm) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
    else { r = 1; }
    let fade = 1;
    if (nm < 420) fade = 0.3 + 0.7 * (nm - 380) / 40;
    else if (nm > 680) fade = 0.3 + 0.7 * (720 - nm) / 40;
    const c = v => Math.round(255 * Math.pow(v * fade, 0.8) * 0.9);
    return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${alpha})`;
  }

  // Refract unit direction d through a surface with normal nrm (either side); null on total internal reflection
  function refract(d, nrm, eta) {
    let nx = nrm[0], ny = nrm[1];
    let cosi = -(d[0] * nx + d[1] * ny);
    if (cosi < 0) { nx = -nx; ny = -ny; cosi = -cosi; }
    const sin2t = eta * eta * (1 - cosi * cosi);
    if (sin2t > 1) return null;
    const k = eta * cosi - Math.sqrt(1 - sin2t);
    return [eta * d[0] + k * nx, eta * d[1] + k * ny];
  }

  // Distance along ray p + s d to segment a-b, or null
  function hitSegment(p, d, a, b) {
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const denom = d[0] * ey - d[1] * ex;
    if (Math.abs(denom) < 1e-9) return null;
    const s = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / denom;
    const u = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / denom;
    return s > 1e-6 && u >= 0 && u <= 1 ? s : null;
  }

  function prism(figure) {
    let source = 'white';
    let exaggerate = 5;
    let incidence = 49 * Math.PI / 180;
    const bar = makeControls(figure);
    segmented(bar, [['white', 'white light'], ['laser', 'red laser']], source, value => { source = value; draw(); });
    slider(bar, 'dispersion', { min: 1, max: 20, step: 1, value: exaggerate, format: v => `×${v}${v === 1 ? ' (real)' : ''}` },
      v => { exaggerate = v; draw(); });
    slider(bar, 'beam angle', { min: 35, max: 75, step: 1, value: 49, format: v => `${v}°` },
      v => { incidence = v * Math.PI / 180; draw(); });

    const view = makeCanvas(figure, { aspect: 0.56, minHeight: 280 }, () => draw());
    const overlay = makeOverlay(figure);
    const nD = nGlass(0.5876);

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();

      const side = Math.min(w * 0.3, (h * 0.6) / 0.866);
      const cx = w * 0.36;
      const baseY = h * 0.66;
      const A = [cx, baseY - side * 0.866];
      const B = [cx - side / 2, baseY];
      const C = [cx + side / 2, baseY];

      ctx.fillStyle = 'rgba(46, 111, 216, 0.08)';
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // incoming beam hits the middle of the left face, at the chosen angle from its normal
      const inward = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
      const angle = Math.PI / 6 - incidence;
      const d = [Math.cos(angle), Math.sin(angle)];
      const P = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      const startS = (P[0] - 8) / d[0];
      const start = [P[0] - d[0] * startS, P[1] - d[1] * startS];

      const laser = source === 'laser';
      ctx.strokeStyle = laser ? wavelengthColor(650) : 'rgba(17, 17, 17, 0.75)';
      ctx.lineWidth = 2.5;
      line(ctx, start[0], start[1], P[0], P[1]);
      overlay.label('source', laser ? 'red laser: one wavelength' : 'white light: every colour', 12, h - 16, { color: INK });

      const wavelengths = laser ? [650] : Array.from({ length: 61 }, (_, i) => 400 + i * 5);
      const faceNormalAB = [-inward[0], -inward[1]];
      const faceNormalAC = [Math.cos(-Math.PI / 6), Math.sin(-Math.PI / 6)];
      let violetEnd = null;
      let redEnd = null;

      wavelengths.forEach(nm => {
        const n = nD + exaggerate * (nGlass(nm / 1000) - nD);
        const inside = refract(d, faceNormalAB, 1 / n);
        if (!inside) return;
        const s = hitSegment(P, inside, A, C);
        if (s === null) return;
        const Q = [P[0] + inside[0] * s, P[1] + inside[1] * s];
        const out = refract(inside, faceNormalAC, n);
        ctx.strokeStyle = wavelengthColor(nm, laser ? 1 : 0.35);
        ctx.lineWidth = laser ? 2.5 : 1.2;
        line(ctx, P[0], P[1], Q[0], Q[1]);
        if (!out) return;
        // where the ray leaves the frame (right or bottom edge)
        const sRight = out[0] > 0 ? (w - 4 - Q[0]) / out[0] : Infinity;
        const sBottom = out[1] > 0 ? (h - 4 - Q[1]) / out[1] : Infinity;
        const sEdge = Math.min(sRight, sBottom);
        const edge = [Q[0] + out[0] * sEdge, Q[1] + out[1] * sEdge];
        ctx.strokeStyle = wavelengthColor(nm, laser ? 1 : 0.85);
        ctx.lineWidth = laser ? 2.5 : 2;
        line(ctx, Q[0], Q[1], edge[0], edge[1]);
        if (violetEnd === null) violetEnd = edge;
        redEnd = edge;
      });

      // Colour names beside the ends of the fan, on the outside: red above it, violet below
      if (!laser && violetEnd && redEnd) {
        const place = (end, below) => {
          const x = Math.min(end[0], w - 8) - 6;
          const y = Math.max(12, Math.min(h - 12, end[1] + (below ? 16 : -16)));
          return [x, y];
        };
        const [rx, ry] = place(redEnd, false);
        const [vx, vy] = place(violetEnd, true);
        overlay.label('red', 'red', rx, ry, { align: 'right', color: INK });
        overlay.label('violet', 'violet', vx, vy, { align: 'right', color: INK });
      }
      overlay.label('index', `glass: $n = ${nGlass(0.4).toFixed(3)}$ for violet, $${nGlass(0.7).toFixed(3)}$ for red`, 12, 16, { color: INK });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // A laser line, and the spectrum of a square pulse
  // ---------------------------------------------------------------------------

  function spectrum(figure) {
    let source = 'pulse';
    let cycles = 8;
    const bar = makeControls(figure);
    segmented(bar, [['laser', 'laser left on'], ['pulse', 'one square pulse']], source,
      value => { source = value; draw(); });
    slider(bar, 'pulse length', { min: 2, max: 24, step: 1, value: cycles, format: v => `${v} cycles` },
      v => { cycles = v; draw(); });
    const view = makeCanvas(figure, { aspect: 0.62, minHeight: 320 }, () => draw());
    const overlay = makeOverlay(figure);

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const left = 14;
      const right = w - 14;
      const plotW = right - left;
      const laser = source === 'laser';

      // Top: field over time, the carrier under a square on/off window
      const midT = h * 0.25;
      const ampT = h * 0.14;
      const shown = 32;                       // carrier cycles across the top panel
      const onFrom = (shown - cycles) / 2;
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      line(ctx, left, midT, right, midT);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      plot(ctx, left, right, x => {
        const c = ((x - left) / plotW) * shown;
        const on = laser || (c >= onFrom && c <= onFrom + cycles);
        return midT - ampT * (on ? Math.cos(2 * Math.PI * c) : 0);
      }, 1);
      overlay.label('top', laser ? 'field over time: $\\cos(2\\pi f_c t)$, forever' : 'field over time: a square pulse lasting $T$', left, 14);

      // Bottom: spectrum, frequencies from fc - fc/2 to fc + fc/2
      const baseF = h - 28;
      const topF = h * 0.52;
      const fx = f => left + (f - 0.5) * plotW;
      ctx.strokeStyle = FAINT;
      line(ctx, left, baseF, right, baseF);
      overlay.label('bottom', 'spectrum: how much of each frequency', left, topF - 12);
      overlay.label('fc', '$f_c$', fx(1), baseF + 14, { align: 'center', color: INK });
      overlay.label('faxis', 'frequency $f$ →', right, baseF + 14, { align: 'right' });

      ctx.strokeStyle = E_COLOR;
      ctx.fillStyle = 'rgba(209, 69, 59, 0.12)';
      ctx.lineWidth = 2;
      if (laser) {
        line(ctx, fx(1), baseF, fx(1), topF + 8);
        dot(ctx, fx(1), topF + 8, 3.5, E_COLOR);
        overlay.label('note', 'one sharp line at $f_c$', fx(1) + 10, topF + 16, { color: E_COLOR });
      } else {
        // |sinc| with the pulse length T = cycles / fc
        ctx.beginPath();
        ctx.moveTo(left, baseF);
        for (let x = left; x <= right; x += 1) {
          const df = (x - left) / plotW - 0.5;
          ctx.lineTo(x, baseF - (baseF - topF - 8) * Math.abs(sinc(df * cycles)));
        }
        ctx.lineTo(right, baseF);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        overlay.label('note', 'a sinc: main lobe $\\approx 2/T$ wide', right, topF + 12, { align: 'right', color: E_COLOR });
      }
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // A data signal on a laser, and its spectrum (a sum of sincs)
  // ---------------------------------------------------------------------------

  function modulation(figure) {
    const bits = [1, 0, 1, 1, 0, 1, 0, 0];
    const cyclesPerBit = 6;
    const bar = makeControls(figure);
    const group = el('div', 'viz-bits');
    const label = el('span', 'viz-legend', 'bits');
    bits.forEach((bit, i) => {
      const button = el('button', 'viz-bit', String(bit));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(bit === 1));
      button.setAttribute('aria-label', `bit ${i + 1}`);
      button.addEventListener('click', () => {
        bits[i] = 1 - bits[i];
        button.textContent = String(bits[i]);
        button.setAttribute('aria-pressed', String(bits[i] === 1));
        draw();
      });
      group.appendChild(button);
    });
    bar.append(label, group);
    legend(bar, [[INK, 'data $m(t)$'], [MUTED, 'laser'], [E_COLOR, 'sent signal and its spectrum']]);
    const view = makeCanvas(figure, { aspect: 0.82, minHeight: 460, maxHeight: 620 }, () => draw());
    const overlay = makeOverlay(figure);

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const left = 14;
      const right = w - 14;
      const plotW = right - left;
      const bitW = plotW / bits.length;
      const m = x => bits[Math.min(bits.length - 1, Math.floor((x - left) / bitW))];
      const carrier = x => Math.cos(2 * Math.PI * cyclesPerBit * (x - left) / bitW);
      const rowAmp = h * 0.055;
      const rows = [h * 0.12, h * 0.31, h * 0.5];

      // bit slots, shaded only around the traces so the row labels sit on plain paper
      ctx.fillStyle = 'rgba(17, 17, 17, 0.035)';
      bits.forEach((bit, i) => {
        if (i % 2 !== 0) return;
        rows.forEach(row => ctx.fillRect(left + i * bitW, row - rowAmp - 4, bitW, 2 * rowAmp + 8));
      });

      // 1. data signal m(t), a step between 0 and 1
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      plot(ctx, left, right, x => rows[0] + rowAmp - 2 * rowAmp * m(x), 1);
      overlay.label('row0', 'data $m(t)$: slow, one value per bit', left + 4, rows[0] - rowAmp - 14);
      bits.forEach((bit, i) => overlay.label(`b${i}`, String(bit), left + (i + 0.5) * bitW, rows[0] + rowAmp + 12, { align: 'center', color: INK }));

      // 2. the laser
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.5)';
      ctx.lineWidth = 1.2;
      plot(ctx, left, right, x => rows[1] - rowAmp * carrier(x), 1);
      overlay.label('row1', 'laser $\\cos(2\\pi f_c t)$: fast, the carrier', left + 4, rows[1] - rowAmp - 14);

      // 3. what's sent: the product
      ctx.strokeStyle = E_COLOR;
      ctx.lineWidth = 1.4;
      plot(ctx, left, right, x => rows[2] - rowAmp * m(x) * carrier(x), 1);
      overlay.label('row2', 'sent: $m(t)\\cos(2\\pi f_c t)$', left + 4, rows[2] - rowAmp - 14);
      overlay.label('time', 'time $t$ →', right, rows[2] + rowAmp + 12, { align: 'right' });

      // 4. spectrum around fc: |S1(f)| times |sum of phases|, with u = (f - fc) T
      const baseF = h - 26;
      const topF = h * 0.66;
      const span = 4;                                 // show fc ± 4/T
      const ux = x => ((x - left) / plotW) * 2 * span - span;
      const ones = bits.reduce((a, b) => a + b, 0);
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      line(ctx, left, baseF, right, baseF);
      overlay.label('row3', 'spectrum $\\lvert S(f) \\rvert$ around $f_c$', left + 4, topF - 14);
      [-2, -1, 1, 2].forEach(u => {
        const x = left + ((u + span) / (2 * span)) * plotW;
        overlay.label(`u${u}`, `$f_c ${u > 0 ? '+' : '-'} ${Math.abs(u)}/T$`, x, baseF + 14, { align: 'center' });
      });
      overlay.label('fc', '$f_c$', left + plotW / 2, baseF + 14, { align: 'center', color: INK });

      if (ones > 0) {
        const scale = (baseF - topF) / ones;
        // dashed: one bit's sinc times the number of ones (the most the sum can reach)
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.4)';
        ctx.setLineDash([4, 4]);
        plot(ctx, left, right, x => baseF - scale * ones * Math.abs(sinc(ux(x))), 1);
        ctx.setLineDash([]);
        // solid: the actual sum, |sinc(u)| times |sum over ones of e^{-i 2 pi u k}|
        ctx.strokeStyle = E_COLOR;
        ctx.fillStyle = 'rgba(209, 69, 59, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, baseF);
        for (let x = left; x <= right; x += 1) {
          const u = ux(x);
          let re = 0, im = 0;
          bits.forEach((bit, k) => {
            if (!bit) return;
            re += Math.cos(-2 * Math.PI * u * k);
            im += Math.sin(-2 * Math.PI * u * k);
          });
          ctx.lineTo(x, baseF - scale * Math.abs(sinc(u)) * Math.hypot(re, im));
        }
        ctx.lineTo(right, baseF);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        overlay.label('empty', 'all zeros: nothing is sent', left + plotW / 2, (topF + baseF) / 2, { align: 'center' });
      }
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Adding more and more nearby frequencies
  // ---------------------------------------------------------------------------

  function addFrequencies(figure) {
    let count = 2;
    const bar = makeControls(figure);
    slider(bar, 'frequencies added', { min: 1, max: 40, step: 1, value: count, format: v => `${v}` },
      v => { count = v; draw(); });
    const view = makeCanvas(figure, { aspect: 0.42, minHeight: 240, maxHeight: 360 }, () => draw());
    const overlay = makeOverlay(figure);

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const left = 10;
      const right = w - 10;
      const plotW = right - left;
      const mid = h * 0.58;
      const amp = h * 0.3;
      const centre = left + plotW / 2;
      const lambda0 = 12;                       // carrier wavelength, px
      const repeat = plotW * 0.48;              // the pattern repeats every 1/Δf
      const k0 = 2 * Math.PI / lambda0;
      const dk = 2 * Math.PI / repeat;

      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      line(ctx, left, mid, right, mid);

      // sum of count cosines at k0 + (j - (count-1)/2) dk, all in step at the centre
      const sum = u => {
        let total = 0;
        for (let j = 0; j < count; j++) total += Math.cos((k0 + (j - (count - 1) / 2) * dk) * u);
        return total / count;
      };
      const envelope = u => {
        const s = Math.sin(dk * u / 2);
        return Math.abs(s) < 1e-9 ? 1 : Math.abs(Math.sin(count * dk * u / 2) / (count * s));
      };

      if (count > 1) {
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.3)';
        ctx.setLineDash([4, 4]);
        for (const sign of [1, -1]) plot(ctx, left, right, x => mid - sign * amp * envelope(x - centre));
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      plot(ctx, left, right, x => mid - amp * sum(x - centre), 1);

      // the frequencies being added, as a small spectrum in the corner
      const sx = right - 120;
      const sy = 30;
      ctx.strokeStyle = FAINT;
      line(ctx, sx, sy, sx + 110, sy);
      ctx.strokeStyle = E_COLOR;
      ctx.lineWidth = 1.5;
      for (let j = 0; j < count; j++) {
        const x = sx + 55 + (j - (count - 1) / 2) * 2.6;
        line(ctx, x, sy, x, sy - 14);
      }
      overlay.label('spec', 'spectrum', sx + 55, sy + 12, { align: 'center' });
      const title = count === 1 ? 'one frequency: a pure wave'
        : count === 2 ? 'two frequencies: beats'
        : count < 6 ? `${count} frequencies`
        : `${count} frequencies: isolated pulses`;
      overlay.label('title', title, left + 4, 16, { color: INK });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Phase velocity and group velocity of a pulse
  // ---------------------------------------------------------------------------

  function pulse(figure) {
    const media = {
      vacuum: { vp: 70, vg: 70, beta: 0, label: 'vacuum: $v_g = v_p$' },
      glass: { vp: 70, vg: 45, beta: 0, label: 'glass: $v_g < v_p$' },
      spread: { vp: 70, vg: 45, beta: 380, label: 'glass, with spreading' },
    };
    let medium = media.glass;
    let crest = null;
    let cycleStart = 0;
    const bar = makeControls(figure);
    const anim = animate(figure, bar, t => draw(t));
    segmented(bar, [['vacuum', 'vacuum'], ['glass', 'glass'], ['spread', 'glass + spreading']], 'glass',
      value => { medium = media[value]; anim.t = 0; crest = null; anim.redraw(); });
    legend(bar, [[E_COLOR, 'crest (phase velocity $v_p$)'], [INK, 'envelope (group velocity $v_g$)']]);

    const view = makeCanvas(figure, { aspect: 0.4, minHeight: 220, maxHeight: 340 }, () => draw(anim.t));
    const overlay = makeOverlay(figure);

    const lambda0 = 26;
    const k0 = (2 * Math.PI) / lambda0;
    const sigmaZ = 46;
    const sigmaK = 1 / sigmaZ;
    const count = 41;
    const comps = Array.from({ length: count }, (_, j) => {
      const dk = (j - (count - 1) / 2) * sigmaK * 0.18;
      return { dk, a: Math.exp(-0.5 * (dk / sigmaK) ** 2) };
    });
    const total = comps.reduce((sum, c) => sum + c.a, 0);

    function draw(t) {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const { vp, vg, beta } = medium;
      const left = 10;
      const right = w - 10;
      const mid = h * 0.54;
      const amp = h * 0.32;
      const zStart = (right - left) * 0.14;
      const travel = (right - left) * 0.72;
      const period = travel / vg;
      const cycle = Math.floor(t / period);
      if (cycle !== cycleStart) { cycleStart = cycle; crest = null; }
      const tt = t - cycle * period;
      const omega0 = vp * k0;

      const field = z => {
        let re = 0, im = 0;
        for (const { dk, a } of comps) {
          const k = k0 + dk;
          const omega = omega0 + vg * dk + 0.5 * beta * dk * dk;
          const phase = k * (z - zStart) - omega * tt;
          re += a * Math.cos(phase);
          im += a * Math.sin(phase);
        }
        return [re / total, Math.hypot(re, im) / total];
      };

      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      line(ctx, left, mid, right, mid);

      const samples = [];
      for (let x = left; x <= right; x += 2) samples.push([x, ...field(x - left)]);

      // envelope
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.35)';
      ctx.setLineDash([4, 4]);
      for (const sign of [1, -1]) {
        ctx.beginPath();
        samples.forEach(([x, , env], i) => { const yy = mid - sign * amp * env; if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); });
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // field
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      samples.forEach(([x, value], i) => { const yy = mid - amp * value; if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); });
      ctx.stroke();

      // envelope centre moves at v_g
      const centre = zStart + vg * tt;
      const width = sigmaZ * Math.sqrt(1 + (beta * tt / (sigmaZ * sigmaZ)) ** 2);
      const peak = field(centre)[1];
      ctx.fillStyle = INK;
      ctx.beginPath();
      const tipY = mid - amp * peak - 8;
      ctx.moveTo(left + centre, tipY);
      ctx.lineTo(left + centre - 6, tipY - 10);
      ctx.lineTo(left + centre + 6, tipY - 10);
      ctx.closePath();
      ctx.fill();

      // follow one crest of the carrier: it moves at v_p, so it drifts through the envelope
      const rel = m => m * lambda0 + (vp - vg) * tt;
      const reach = 2 * width;
      if (crest === null) crest = Math.round((-0.6 * width - (vp - vg) * tt) / lambda0);
      if (rel(crest) > reach) crest = Math.ceil((-reach - (vp - vg) * tt) / lambda0);
      const zc = centre + rel(crest);
      if (zc > 0 && zc < right - left) dot(ctx, left + zc, mid - amp * field(zc)[0], 5, E_COLOR);

      overlay.label('medium', medium.label, left + 4, 16, { color: INK });
      overlay.label('ratio', `$v_g / v_p = ${(vg / vp).toFixed(2)}$`, right - 4, 16, { align: 'right' });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Dispersion of standard single-mode fibre against wavelength
  // ---------------------------------------------------------------------------

  // D(λ) = S0/4 (λ − λ0⁴/λ³), in ps/(nm·km), with λ in nm
  const S0 = 0.092;
  const LAMBDA0 = 1310;
  const fibreD = lambda => (S0 / 4) * (lambda - LAMBDA0 ** 4 / lambda ** 3);

  function dispersionCurve(figure) {
    const view = makeCanvas(figure, { aspect: 0.55, minHeight: 280 }, () => draw());
    const overlay = makeOverlay(figure);
    const lMin = 1200;
    const lMax = 1650;
    const dMin = -15;
    const dMax = 25;

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const left = 56;
      const right = w - 16;
      const top = 30;
      const bottom = h - 40;
      const X = l => left + ((l - lMin) / (lMax - lMin)) * (right - left);
      const Y = d => bottom - ((d - dMin) / (dMax - dMin)) * (bottom - top);

      // bands
      const band = (from, to, name) => {
        ctx.fillStyle = 'rgba(46, 111, 216, 0.1)';
        ctx.fillRect(X(from), top, X(to) - X(from), bottom - top);
        overlay.label(`band-${name}`, name, (X(from) + X(to)) / 2, top + 10, { align: 'center', color: B_COLOR });
      };
      band(1260, 1360, 'O-band');
      band(1530, 1565, 'C-band');

      // grid and axis labels
      ctx.lineWidth = 1;
      for (let d = -10; d <= 20; d += 10) {
        ctx.setLineDash(d === 0 ? [] : [2, 4]);
        ctx.strokeStyle = d === 0 ? 'rgba(17, 17, 17, 0.5)' : FAINT;
        line(ctx, left, Y(d), right, Y(d));
        overlay.label(`y${d}`, `$${d}$`, left - 8, Y(d), { align: 'right' });
      }
      ctx.setLineDash([]);
      for (let l = 1200; l <= 1600; l += 100) overlay.label(`x${l}`, `$${l}$`, X(l), bottom + 14, { align: 'center' });
      overlay.label('xlabel', 'wavelength $\\lambda$ (nm)', right, bottom + 30, { align: 'right' });
      overlay.label('ylabel', '$D$ (ps/(nm·km))', left - 8, top - 16);

      // the curve
      ctx.strokeStyle = E_COLOR;
      ctx.lineWidth = 2.2;
      plot(ctx, X(lMin), X(lMax), x => Y(fibreD(lMin + ((x - left) / (right - left)) * (lMax - lMin))), 1);

      // markers
      dot(ctx, X(1310), Y(0), 5, INK);
      overlay.label('m1310', '$D = 0$ at $1310$ nm', X(1310) + 8, Y(0) + 14, { color: INK });
      const d1550 = fibreD(1550);
      dot(ctx, X(1550), Y(d1550), 5, INK);
      overlay.label('m1550', `$D \\approx ${d1550.toFixed(0)}$ at $1550$ nm`, X(1550) - 8, Y(d1550) - 14, { align: 'right', color: INK });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Bits blurring together as they travel down fibre
  // ---------------------------------------------------------------------------

  function bitSpreading(figure) {
    const bits = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1];
    const slot = 20;            // ps per bit at 50 Gb/s
    const sigma0 = 5;           // ps, starting pulse width
    const bandwidth = 0.4;      // nm of spectrum at 50 Gb/s
    let lambda = 1550;
    let distance = 2;
    const bar = makeControls(figure);
    segmented(bar, [[1310, '1310 nm'], [1550, '1550 nm']], lambda, value => { lambda = value; draw(); });
    slider(bar, 'distance', { min: 0, max: 10, step: 0.5, value: distance, format: v => `${v} km` },
      v => { distance = v; draw(); });
    const view = makeCanvas(figure, { aspect: 0.42, minHeight: 250, maxHeight: 360 }, () => draw());
    const overlay = makeOverlay(figure);

    function draw() {
      const { ctx, w, h } = view;
      ctx.clearRect(0, 0, w, h);
      overlay.begin();
      const left = 52;             // room for the "sent" and "read" labels
      const right = w - 14;
      const top = 76;
      const bottom = h - 34;
      const span = bits.length * slot;
      const X = t => left + (t / span) * (right - left);
      const Y = p => bottom - p * (bottom - top);

      const D = Math.abs(fibreD(lambda));
      const spread = D * distance * bandwidth;                 // ps
      const sigma = Math.sqrt(sigma0 ** 2 + (spread / 2) ** 2);
      const power = t => bits.reduce((sum, bit, k) => {
        if (!bit) return sum;
        const dt = t - (k + 0.5) * slot;
        return sum + (sigma0 / sigma) * Math.exp(-(dt * dt) / (2 * sigma * sigma));
      }, 0);

      // bit slots
      bits.forEach((bit, k) => {
        if (k % 2 === 0) {
          ctx.fillStyle = 'rgba(17, 17, 17, 0.035)';
          ctx.fillRect(X(k * slot), top - 18, X(slot) - X(0), bottom - top + 18);
        }
      });

      // decision threshold
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.4)';
      ctx.setLineDash([4, 4]);
      line(ctx, left, Y(0.5), right, Y(0.5));
      ctx.setLineDash([]);

      // received signal
      ctx.strokeStyle = E_COLOR;
      ctx.fillStyle = 'rgba(209, 69, 59, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      for (let x = left; x <= right; x += 1) ctx.lineTo(x, Y(Math.min(1.15, power(((x - left) / (right - left)) * span))));
      ctx.lineTo(right, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // sent bits (top) and what the receiver reads at each slot's centre (bottom)
      let errors = 0;
      bits.forEach((bit, k) => {
        const read = power((k + 0.5) * slot) > 0.5 ? 1 : 0;
        if (read !== bit) errors++;
        const x = X((k + 0.5) * slot);
        overlay.label(`sent${k}`, String(bit), x, top - 28, { align: 'center', color: INK });
        overlay.label(`read${k}`, String(read), x, bottom + 14, { align: 'center', color: read === bit ? MUTED : E_COLOR });
      });
      overlay.label('sentLabel', 'sent', 8, top - 28);
      overlay.label('readLabel', 'read', 8, bottom + 14);
      overlay.label('spread', `$\\Delta\\tau = D\\,L\\,\\Delta\\lambda \\approx ${spread.toFixed(1)}$ ps (a bit is $20$ ps)`, right, 14, { align: 'right', color: INK });
      overlay.label('errors', errors ? `${errors} bit${errors > 1 ? 's' : ''} read wrong` : 'every bit read correctly', 8, 14, { color: errors ? E_COLOR : INK });
      overlay.end();
    }
  }

  // ---------------------------------------------------------------------------

  const builders = {
    'charge-disturbance': chargeDisturbance,
    'wave-anatomy': waveAnatomy,
    'snell-wavefronts': snellWavefronts,
    snell,
    prism,
    spectrum,
    modulation,
    'add-frequencies': addFrequencies,
    pulse,
    'dispersion-curve': dispersionCurve,
    'bit-spreading': bitSpreading,
  };
  document.querySelectorAll('figure.viz[data-viz]').forEach(figure => {
    const build = builders[figure.dataset.viz];
    if (build) build(figure);
  });

  window.PhotonicsViz = { el, makeControls, segmented, legend, animate, renderRich, colors: { INK, MUTED, FAINT, E_COLOR, B_COLOR } };
  window.dispatchEvent(new Event('photonics-viz-ready'));
})();
