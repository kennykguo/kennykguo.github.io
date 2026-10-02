/*
 * Diffusion background: ink carried through a curl-noise flow with drifting vortices.
 *
 * Particles trace continuous trails through the flow, ink drops bloom and spread, and a
 * steady fade lets old trails dissolve back into the paper, so the field reaches its full
 * look within a few seconds and then stays balanced.
 *
 * Kept fast:
 *  - The flow is the curl of simplex noise, computed with an exact gradient (one noise
 *    evaluation per octave instead of four finite-difference samples).
 *  - Trail segments are batched by colour, opacity and width, so the canvas gets a few
 *    hundred draw calls a frame instead of thousands.
 *  - The full-screen fade runs about 11 times a second, not every frame.
 *  - Quality steps down automatically if frames run long.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('diffusion-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) ctx = canvas.getContext('2d');
  if (!ctx) return;

  // =====================================================================
  //  Simplex noise (2D), plus an exact-gradient variant
  // =====================================================================
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var GX = new Float64Array([1, -1, 1, -1, 1, -1, 0, 0]);
  var GY = new Float64Array([1, 1, -1, -1, 0, 0, 1, -1]);
  var perm = new Uint8Array(512);
  var permMod8 = new Uint8Array(512);
  (function () {
    var p = new Uint8Array(256), i, s = 42;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      var j = s % (i + 1);
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod8[i] = perm[i] & 7;
    }
  })();

  // Partial derivatives of the noise at (x, y), written into NDX / NDY.
  var NDX = 0, NDY = 0;
  function simplexGrad(x, y) {
    var s = (x + y) * F2;
    var i = Math.floor(x + s), j = Math.floor(y + s);
    var t = (i + j) * G2;
    var x0 = x - (i - t), y0 = y - (j - t);
    var i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    var ii = i & 255, jj = j & 255;
    var dx = 0, dy = 0, g, gx, gy, gd, t2, t4, k;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      g = permMod8[ii + perm[jj]]; gx = GX[g]; gy = GY[g];
      gd = gx * x0 + gy * y0; t2 = t0 * t0; t4 = t2 * t2; k = -8 * t2 * t0 * gd;
      dx += k * x0 + t4 * gx; dy += k * y0 + t4 * gy;
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      g = permMod8[ii + i1 + perm[jj + j1]]; gx = GX[g]; gy = GY[g];
      gd = gx * x1 + gy * y1; t2 = t1 * t1; t4 = t2 * t2; k = -8 * t2 * t1 * gd;
      dx += k * x1 + t4 * gx; dy += k * y1 + t4 * gy;
    }
    var t3 = 0.5 - x2 * x2 - y2 * y2;
    if (t3 > 0) {
      g = permMod8[ii + 1 + perm[jj + 1]]; gx = GX[g]; gy = GY[g];
      gd = gx * x2 + gy * y2; t2 = t3 * t3; t4 = t2 * t2; k = -8 * t2 * t3 * gd;
      dx += k * x2 + t4 * gx; dy += k * y2 + t4 * gy;
    }
    NDX = 70 * dx;
    NDY = 70 * dy;
  }

  // =====================================================================
  //  Config
  // =====================================================================
  var CREAM = '#fffff8';
  var FRAME_MS = 1000 / 60;

  // Motion
  var SPEED = 0.5;                    // px per 60fps frame per unit of flow
  var TIME_BASE = 0.00008, TIME_PHASE = 0.0001; // how fast the flow field itself evolves

  // Flow field: three octaves of curl noise
  var S0 = 0.0005, S1 = 0.002, S2 = 0.007;
  var A0 = 1.0, A1_BASE = 0.35, A2_BASE = 0.12;
  var K0 = 1.55, K1 = 2.65, K2 = 4.9;

  // Vortex attractors
  var VORTEX_COUNT = 4;
  var VORTEX_TANGENT_K = 0.12;
  var VORTEX_RADIAL_K = 0.00005;
  var VORTEX_FALLOFF = 120;

  // Alternates between coherent and noisy flow
  var PHASE_PERIOD = 16000;

  // Ink
  var TRAIL_ALPHA_MIN = 0.02, TRAIL_ALPHA_MAX = 0.04;
  var DYE_ALPHA_MIN = 0.07, DYE_ALPHA_MAX = 0.14;
  // Long lives let particles gather along the flow's converging lines into currents;
  // respawning keeps the rest of the page from emptying out
  var LIFE_MIN = 14000, LIFE_MAX = 34000; // ms before a trail particle respawns elsewhere

  // Fade: a stronger fade a few times a second clears old ink properly (tiny per-frame
  // fades round to nothing on an 8-bit canvas and leave permanent residue)
  var FADE_EVERY_MS = 90;
  var FADE_ALPHA = 0.016;
  // ...and whatever the fade can't reach is lifted one level back toward the paper
  // this often, so the page never greys over
  var LIFT_EVERY_MS = 260;

  // Start-up: run the flow at triple speed for the first moments so the page fills fast
  var BOOST_MS = 1800, BOOST_SUBSTEPS = 2, PRESIM_STEPS = 8;

  // Dye drops
  var DYE_EVERY_MIN = 4000, DYE_EVERY_MAX = 7500;
  var DYE_LIFE_MIN = 4500, DYE_LIFE_MAX = 9000;

  // Density grid widens trails where many particles converge
  var DENSITY_COLS = 160, DENSITY_ROWS = 100;

  var QUALITY_PROFILES = [
    { trails: 1400, dyeParticles: 60, densityCols: 160, densityRows: 100, dprCap: 1.5 },
    { trails: 950, dyeParticles: 44, densityCols: 120, densityRows: 76, dprCap: 1.25 },
    { trails: 650, dyeParticles: 30, densityCols: 90, densityRows: 56, dprCap: 1 }
  ];
  var TRAIL_COUNT = 1400, DYE_PARTICLE_COUNT = 60;
  var trailInk = 1; // fewer particles on weaker devices draw a little darker to compensate

  // Palette after Oppenheimer: fire (ember, amber, orange) against blue-white light
  // (steel, ice and Cherenkov blues), with a little charcoal smoke for depth.
  var SKY_PALETTE = [
    [196, 98, 40],   // ember orange
    [214, 140, 58],  // amber
    [160, 72, 36],   // burnt ember
    [185, 110, 62],  // copper
    [92, 128, 176],  // steel blue
    [124, 160, 204], // ice blue
    [70, 110, 170],  // cobalt
    [150, 180, 214], // blue-white
    [88, 92, 102],   // charcoal smoke
    [205, 120, 48]   // flame
  ];
  var DYE_PALETTE = [ // concentrated ink drops
    [222, 112, 30],  // ignition orange
    [236, 152, 52],  // molten amber
    [184, 66, 24],   // deep ember
    [56, 124, 214],  // Cherenkov blue
    [104, 156, 226], // blue-white flash
    [40, 88, 168]    // deep cobalt
  ];

  // =====================================================================
  //  Batched segment rendering: one path + one stroke() per
  //  (colour, opacity step, width step)
  // =====================================================================
  var COLORS = SKY_PALETTE.concat(DYE_PALETTE);
  var DYE_COLOR_OFFSET = SKY_PALETTE.length;
  var COLOR_STYLES = COLORS.map(function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; });

  var ALPHA_MIN = 0.001, ALPHA_RATIO = 1.07, ALPHA_STEPS = 80; // 0.001 .. ~0.2
  var LOG_ALPHA_MIN = Math.log(ALPHA_MIN), LOG_ALPHA_RATIO = Math.log(ALPHA_RATIO);
  var WIDTH_STEP = 0.1, WIDTH_STEPS = 40;
  var BIN_COUNT = COLORS.length * ALPHA_STEPS * WIDTH_STEPS;
  var bins = [];
  var usedBins = [];
  var binUsed = new Uint8Array(BIN_COUNT);

  function addSegment(colorIdx, alpha, width, x1, y1, x2, y2) {
    if (alpha < ALPHA_MIN) return;
    var a = Math.round((Math.log(alpha) - LOG_ALPHA_MIN) / LOG_ALPHA_RATIO);
    if (a >= ALPHA_STEPS) a = ALPHA_STEPS - 1;
    var w = Math.round(width / WIDTH_STEP);
    if (w < 1) w = 1; else if (w >= WIDTH_STEPS) w = WIDTH_STEPS - 1;
    var key = (colorIdx * ALPHA_STEPS + a) * WIDTH_STEPS + w;
    var bin = bins[key];
    if (!bin) bin = bins[key] = [];
    if (!binUsed[key]) { binUsed[key] = 1; usedBins.push(key); }
    bin.push(x1, y1, x2, y2);
  }

  function flushSegments() {
    ctx.lineCap = 'butt';
    for (var u = 0; u < usedBins.length; u++) {
      var key = usedBins[u];
      var bin = bins[key];
      var w = key % WIDTH_STEPS;
      var rest = (key - w) / WIDTH_STEPS;
      var a = rest % ALPHA_STEPS;
      var colorIdx = (rest - a) / ALPHA_STEPS;
      ctx.globalAlpha = Math.exp(LOG_ALPHA_MIN + a * LOG_ALPHA_RATIO);
      ctx.strokeStyle = COLOR_STYLES[colorIdx];
      ctx.lineWidth = w * WIDTH_STEP;
      ctx.beginPath();
      for (var k = 0; k < bin.length; k += 4) {
        ctx.moveTo(bin[k], bin[k + 1]);
        ctx.lineTo(bin[k + 2], bin[k + 3]);
      }
      ctx.stroke();
      bin.length = 0;
      binUsed[key] = 0;
    }
    usedBins.length = 0;
    ctx.globalAlpha = 1;
  }

  // =====================================================================
  //  State
  // =====================================================================
  var W = 0, H = 0;
  var trails = [];
  var dye = [];
  var vortices = [];
  var time = 0;
  var clock = 0;          // simulated ms since start
  var phase = 0;          // 0 = coherent flow, 1 = noisy flow
  var fadeAcc = 0, liftAcc = 0;
  var nextDyeAt = 0;
  var qualityLevel = 0, dprCap = 1.5;
  var densityGrid, densityNext, densityCellW, densityCellH, densityAcc = 0;
  var lastFrame = 0, slowStreak = 0, startedAt = 0;

  function initialQualityLevel() {
    var cores = navigator.hardwareConcurrency || 4;
    var memory = navigator.deviceMemory; // Chromium only
    if (cores <= 4 || (memory !== undefined && memory <= 4)) return 2;
    if (cores >= 8 && (memory === undefined || memory >= 8)) return 0;
    return 1;
  }

  function applyQuality(level) {
    qualityLevel = Math.max(0, Math.min(level, QUALITY_PROFILES.length - 1));
    var q = QUALITY_PROFILES[qualityLevel];
    var area = Math.max(1, (W || window.innerWidth || 1440) * (H || window.innerHeight || 900));
    var scale = Math.max(0.65, Math.min(1, Math.sqrt(area / (1440 * 900))));
    TRAIL_COUNT = Math.max(360, Math.round(q.trails * scale));
    trailInk = Math.min(1.8, Math.pow(QUALITY_PROFILES[0].trails / q.trails, 0.6));
    DYE_PARTICLE_COUNT = Math.max(18, Math.round(q.dyeParticles * scale));
    DENSITY_COLS = Math.max(72, Math.round(q.densityCols * scale));
    DENSITY_ROWS = Math.max(44, Math.round(q.densityRows * scale));
    dprCap = q.dprCap;
  }

  // =====================================================================
  //  Flow field: curl noise + vortex swirls. Writes VX / VY.
  // =====================================================================
  var VX = 0, VY = 0;
  var tK0 = 0, tK1 = 0, tK2 = 0, octA1 = A1_BASE, octA2 = A2_BASE, jitter = 0;

  function velocityAt(px, py) {
    simplexGrad(px * S0, py * S0 + tK0);
    var vx = A0 * NDY, vy = -A0 * NDX;
    simplexGrad(px * S1, py * S1 + tK1);
    vx += octA1 * NDY; vy -= octA1 * NDX;
    simplexGrad(px * S2, py * S2 + tK2);
    vx += octA2 * NDY; vy -= octA2 * NDX;

    for (var i = 0; i < vortices.length; i++) {
      var v = vortices[i];
      var dx = px - v.x, dy = py - v.y;
      var dist = Math.sqrt(dx * dx + dy * dy) + 1;
      var influence = 1 / (1 + dist / VORTEX_FALLOFF);
      var tang = VORTEX_TANGENT_K * influence * v.dir / dist;
      var rad = VORTEX_RADIAL_K * influence;
      vx += -dy * tang - dx * rad;
      vy += dx * tang - dy * rad;
    }

    if (jitter > 0) {
      vx += (Math.random() - 0.5) * jitter;
      vy += (Math.random() - 0.5) * jitter;
    }
    VX = vx;
    VY = vy;
  }

  function initVortices() {
    vortices = [];
    for (var i = 0; i < VORTEX_COUNT; i++) {
      vortices.push({
        x: 0.1 * W + Math.random() * 0.8 * W,
        y: 0.1 * H + Math.random() * 0.8 * H,
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.03,
        dir: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  function updateVortices(step) {
    for (var i = 0; i < vortices.length; i++) {
      var v = vortices[i];
      v.x += v.vx * step;
      v.y += v.vy * step;
      if (v.x < W * 0.05 || v.x > W * 0.95) v.vx *= -1;
      if (v.y < H * 0.05 || v.y > H * 0.95) v.vy *= -1;
    }
  }

  // Now and then a vortex jumps and flips direction, reshaping the flow
  var lastShiftAt = 0;
  function maybeShiftVortex() {
    if (clock - lastShiftAt < 20000 || Math.random() > 0.01) return;
    lastShiftAt = clock;
    var v = vortices[Math.floor(Math.random() * vortices.length)];
    v.x = 0.15 * W + Math.random() * 0.7 * W;
    v.y = 0.15 * H + Math.random() * 0.7 * H;
    v.dir *= -1;
  }

  // =====================================================================
  //  Density grid: where trails converge, they thicken into bands
  // =====================================================================
  function initDensity() {
    densityCellW = W / DENSITY_COLS;
    densityCellH = H / DENSITY_ROWS;
    densityGrid = new Float32Array(DENSITY_COLS * DENSITY_ROWS);
    densityNext = new Float32Array(DENSITY_COLS * DENSITY_ROWS);
  }

  function densityIndex(px, py) {
    var c = (px / densityCellW) | 0, r = (py / densityCellH) | 0;
    if (c >= 0 && c < DENSITY_COLS && r >= 0 && r < DENSITY_ROWS) return r * DENSITY_COLS + c;
    return -1;
  }

  function diffuseDensity() {
    var src = densityGrid, next = densityNext, cols = DENSITY_COLS;
    for (var r = 1; r < DENSITY_ROWS - 1; r++) {
      for (var c = 1; c < cols - 1; c++) {
        var idx = r * cols + c;
        next[idx] = (src[idx] * 4 + src[idx - 1] + src[idx + 1] + src[idx - cols] + src[idx + cols]) / 8 * 0.97;
      }
    }
    densityGrid = next;
    densityNext = src;
  }

  // =====================================================================
  //  Particles
  // =====================================================================
  function spawnTrail(p, initial) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.ci = Math.floor(Math.random() * SKY_PALETTE.length);
    p.alpha = (TRAIL_ALPHA_MIN + Math.random() * (TRAIL_ALPHA_MAX - TRAIL_ALPHA_MIN)) * trailInk;
    p.width = 0.55 + Math.random() * 0.95;
    p.life = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
    // Stagger the first generation so they don't all respawn at once
    p.age = initial ? Math.random() * p.life : 0;
    p.fresh = true;
    return p;
  }

  function initTrails() {
    trails = [];
    for (var i = 0; i < TRAIL_COUNT; i++) trails.push(spawnTrail({}, true));
  }

  function spawnDyeDrop() {
    var x = 0.12 * W + Math.random() * 0.76 * W;
    var y = 0.12 * H + Math.random() * 0.76 * H;
    var ci = DYE_COLOR_OFFSET + Math.floor(Math.random() * DYE_PALETTE.length);
    for (var i = 0; i < DYE_PARTICLE_COUNT; i++) {
      var ang = Math.random() * Math.PI * 2;
      var dist = Math.random() * 10;
      var push = 0.18 + Math.random() * 0.4;
      dye.push({
        x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist,
        vx: Math.cos(ang) * push, vy: Math.sin(ang) * push,
        ci: ci, age: 0,
        life: DYE_LIFE_MIN + Math.random() * (DYE_LIFE_MAX - DYE_LIFE_MIN),
        alpha: DYE_ALPHA_MIN + Math.random() * (DYE_ALPHA_MAX - DYE_ALPHA_MIN),
        width: 0.9 + Math.random() * 1.3
      });
    }
    nextDyeAt = clock + DYE_EVERY_MIN + Math.random() * (DYE_EVERY_MAX - DYE_EVERY_MIN);
  }

  // A trail segment from the previous to the current position, plus a fainter
  // side strand for a brushy, bristled edge.
  function queueTrail(ci, alpha, width, x0, y0, x1, y1, di) {
    // Where many trails crowd together they thicken and darken into currents
    var df = di >= 0 ? Math.min(densityGrid[di] / 30, 1) : 0;
    var w = width * (1 + df * 2.4);
    var a = alpha * (1 + df * 1.3);
    addSegment(ci, a, w, x0, y0, x1, y1);
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy) + 1e-6;
    var off = w * 0.9 + 0.4, nx = -dy / len * off, ny = dx / len * off;
    addSegment(ci, a * 0.32, w * 0.35, x0 + nx, y0 + ny, x1 + nx, y1 + ny);
  }

  // =====================================================================
  //  Simulation step (dt in ms)
  // =====================================================================
  var EDGE = 18;

  function step(dt) {
    var s = dt / FRAME_MS;
    clock += dt;
    phase = 0.5 + 0.5 * Math.sin(clock * Math.PI * 2 / PHASE_PERIOD);
    time += (TIME_BASE + phase * TIME_PHASE) * s;
    tK0 = time * K0; tK1 = time * K1; tK2 = time * K2;
    octA1 = A1_BASE + phase * 0.15;
    octA2 = A2_BASE + phase * 0.4;
    jitter = phase > 0.3 ? (phase - 0.3) * 0.12 : 0;
    var phaseInk = 1 + (1 - phase) * 0.25; // a touch richer when the flow is coherent

    updateVortices(s);
    maybeShiftVortex();

    densityAcc += dt;
    while (densityAcc >= 400) { diffuseDensity(); densityAcc -= 400; }

    if (clock >= nextDyeAt) spawnDyeDrop();

    var move = SPEED * s, i, p, x0, y0, di;
    for (i = 0; i < trails.length; i++) {
      p = trails[i];
      p.age += dt;
      if (p.age >= p.life) { spawnTrail(p, false); continue; }
      velocityAt(p.x, p.y);
      x0 = p.x; y0 = p.y;
      p.x += VX * move;
      p.y += VY * move;
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) { spawnTrail(p, false); continue; }
      di = densityIndex(p.x, p.y);
      if (di >= 0) densityGrid[di] += 1;
      if (p.fresh) { p.fresh = false; continue; } // no segment on the first step
      if (p.x < EDGE || p.x > W - EDGE || p.y < EDGE || p.y > H - EDGE) continue;
      // Fade in and out over the particle's life so trails taper instead of popping
      var lifeT = p.age / p.life;
      var env = lifeT < 0.1 ? lifeT / 0.1 : lifeT > 0.8 ? (1 - lifeT) / 0.2 : 1;
      queueTrail(p.ci, p.alpha * env * phaseInk, p.width, x0, y0, p.x, p.y, di);
    }

    var decay = Math.pow(0.965, s);
    for (i = dye.length - 1; i >= 0; i--) {
      p = dye[i];
      p.age += dt;
      if (p.age >= p.life) { dye[i] = dye[dye.length - 1]; dye.pop(); continue; }
      velocityAt(p.x, p.y);
      x0 = p.x; y0 = p.y;
      p.vx *= decay; p.vy *= decay;
      p.x += (p.vx + VX * SPEED * 1.1) * s;
      p.y += (p.vy + VY * SPEED * 1.1) * s;
      if (p.x < EDGE || p.x > W - EDGE || p.y < EDGE || p.y > H - EDGE) continue;
      // Concentrated at first, diluting as it spreads
      var t = p.age / p.life;
      var a = p.alpha * (t < 0.06 ? t / 0.06 : (1 - t) * (1 - t));
      di = densityIndex(p.x, p.y);
      if (di >= 0) densityGrid[di] += 1;
      queueTrail(p.ci, a, p.width, x0, y0, p.x, p.y, di);
    }
  }

  function fade(dt) {
    fadeAcc += dt;
    var n = 0;
    while (fadeAcc >= FADE_EVERY_MS && n < 4) { fadeAcc -= FADE_EVERY_MS; n++; }
    if (fadeAcc > FADE_EVERY_MS) fadeAcc = 0; // long stall (tab switch): don't catch up
    if (!n) return;
    // Equivalent to n separate fades, in one fill
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,248,' + (1 - Math.pow(1 - FADE_ALPHA, n)).toFixed(4) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function lift(dt) {
    liftAcc += dt;
    if (liftAcc < LIFT_EVERY_MS) return;
    liftAcc = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgb(1,1,1)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'darken';
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // =====================================================================
  //  Frame loop
  // =====================================================================
  function frame(now) {
    requestAnimationFrame(frame);
    if (!lastFrame) { lastFrame = now; return; }
    var dt = Math.min(50, Math.max(4, now - lastFrame));
    var real = now - lastFrame;
    lastFrame = now;

    // Step down quality if frames keep running long
    if (real > 28 && now - startedAt > 2000) slowStreak++; else slowStreak = Math.max(0, slowStreak - 2);
    if (slowStreak >= 10 && qualityLevel < QUALITY_PROFILES.length - 1) {
      slowStreak = 0;
      applyQuality(qualityLevel + 1);
      resize();
      reset(false);
      return;
    }

    // Start-up boost: several simulation steps per frame so the field fills quickly
    var sub = now - startedAt < BOOST_MS ? BOOST_SUBSTEPS : 1;
    for (var i = 0; i < sub; i++) {
      fade(dt);
      step(dt);
    }
    lift(dt * sub);
    flushSegments(); // one batched draw per frame, even while boosting
  }

  // =====================================================================
  //  Setup
  // =====================================================================
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    if (!W || !H) return false;
    applyQuality(qualityLevel);
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
    return true;
  }

  function reset(presim) {
    initDensity();
    initVortices();
    initTrails();
    dye = [];
    fadeAcc = 0;
    nextDyeAt = clock;
    // Open with a few drops already spreading
    for (var i = 0; i < 4; i++) spawnDyeDrop();
    nextDyeAt = clock + 1500;
    if (presim) {
      for (var k = 0; k < PRESIM_STEPS; k++) { fade(FRAME_MS * 2); step(FRAME_MS * 2); flushSegments(); }
    }
    startedAt = performance.now();
  }

  function start() {
    applyQuality(initialQualityLevel());
    if (!resize()) return false;
    reset(true);
    lastFrame = 0;
    requestAnimationFrame(frame);
    return true;
  }

  if (!start()) {
    // Not laid out yet (hidden tab or iframe): start on the first real size
    var waitForSize = function () {
      if (window.innerWidth && window.innerHeight) {
        window.removeEventListener('resize', waitForSize);
        start();
      }
    };
    window.addEventListener('resize', waitForSize);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!W || !H) return;
      if (resize()) reset(true);
    }, 200);
  });
})();
