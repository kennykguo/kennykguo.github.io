(function () {
  'use strict';

  var canvas = document.getElementById('diffusion-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) ctx = canvas.getContext('2d');
  if (!ctx) return;

  // =====================================================================
  //  Simplex noise (2D)
  // =====================================================================
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var grad3 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  var perm = new Uint8Array(512);
  var permMod8 = new Uint8Array(512);
  (function () {
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    var s = 1729;
    for (var i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      var j = s % (i + 1);
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod8[i] = perm[i] & 7;
    }
  })();

  function simplex2(x, y) {
    var s = (x + y) * F2;
    var i = Math.floor(x + s), j = Math.floor(y + s);
    var t = (i + j) * G2;
    var x0 = x - (i - t), y0 = y - (j - t);
    var i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    var ii = i & 255, jj = j & 255;
    var n0 = 0, n1 = 0, n2 = 0;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; var g = grad3[permMod8[ii + perm[jj]]]; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; var g = grad3[permMod8[ii + i1 + perm[jj + j1]]]; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; var g = grad3[permMod8[ii + 1 + perm[jj + 1]]]; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2);
  }

  // =====================================================================
  //  Curl noise — single octave
  // =====================================================================
  var eps = 0.0001;
  function curlAt(x, y, t) {
    var dy = (simplex2(x, y + eps + t) - simplex2(x, y - eps + t)) / (2 * eps);
    var dx = (simplex2(x + eps, y + t) - simplex2(x - eps, y + t)) / (2 * eps);
    return { x: dy, y: -dx };
  }

  // =====================================================================
  //  Config
  // =====================================================================
  var CREAM = '#fffff8';
  var FRAME_DURATION = 1000 / 60;

  // Sky paint particles
  var SKY_COUNT = 1400;
  var SKY_SPEED = 0.68;
  var ANGLE_QUANT = Math.PI / 9;

  // Multi-octave curl scales
  var S0 = 0.00042, S1 = 0.0024, S2 = 0.0085;
  var A0_BASE = 1.0, A1_BASE = 0.35, A2_BASE = 0.12;
  var K0 = 1.55, K1 = 2.65, K2 = 4.9;

  // Vortex attractors
  var VORTEX_COUNT = 5;
  var VORTEX_TANGENT_K = 0.12;
  var VORTEX_RADIAL_K = 0.00005;
  var VORTEX_FALLOFF = 150;

  // Density grid
  var DENSITY_COLS = 160, DENSITY_ROWS = 100;

  // Diffusion phase (oscillation between noise and coherence)
  var PHASE_PERIOD = 1300 * FRAME_DURATION;

  // Dye drop events (replaces explosions)
  var DYE_INTERVAL_MIN = 300 * FRAME_DURATION;
  var DYE_INTERVAL_MAX = 700 * FRAME_DURATION;
  var DYE_PARTICLE_COUNT = 50;
  var QUALITY_PROFILES = [
    { skyCount: 1400, dyeParticleCount: 50, densityCols: 160, densityRows: 100, dprCap: 1.5 },
    { skyCount: 950, dyeParticleCount: 36, densityCols: 120, densityRows: 76, dprCap: 1.25 },
    { skyCount: 650, dyeParticleCount: 24, densityCols: 90, densityRows: 56, dprCap: 1 }
  ];

  // Rich palette — blues, ambers, muted reds, greens, purples
  var SKY_PALETTE = [
    [60, 75, 130],   // deep blue
    [85, 95, 140],   // muted blue
    [50, 65, 110],   // navy
    [100, 70, 50],   // burnt sienna
    [140, 100, 45],  // amber
    [120, 80, 60],   // rust
    [80, 100, 75],   // sage green
    [65, 85, 70],    // dark teal
    [110, 70, 95],   // mulberry
    [85, 70, 100],   // dusty violet
    [125, 115, 70],  // olive ochre
    [110, 95, 120],  // lavender gray
  ];

  // Dye drop color palette — more saturated/concentrated versions
  var DYE_PALETTE = [
    [40, 50, 120],   // deep indigo
    [130, 55, 30],   // burnt orange
    [45, 80, 55],    // forest green
    [90, 40, 90],    // plum
    [150, 90, 25],   // golden amber
    [55, 70, 120],   // steel blue
    [120, 50, 50],   // brick red
    [60, 95, 95],    // teal
    [95, 60, 110],   // violet ink
  ];

  // =====================================================================
  //  State
  // =====================================================================
  var W, H;
  var skyParticles = [];
  var vortices = [];
  var dyeParticles = [];
  var time = 0;
  var frameCount = 0;
  var elapsedMs = 0;
  var densityElapsedMs = 0;
  var nextDyeTime = 250 * FRAME_DURATION;
  var densityGrid, densityCellW, densityCellH;
  var qualityLevel = 0;
  var renderDprCap = QUALITY_PROFILES[0].dprCap;
  var lastQualitySampleTime = 0;
  var lastAnimationTime = 0;
  var slowFrameStreak = 0;

  // Diffusion phase: 0 = most coherent, 1 = most noisy
  var diffPhase = 0;

  function initialQualityLevel() {
    var cores = navigator.hardwareConcurrency || 4;
    var memory = navigator.deviceMemory || 4;
    if (cores <= 4 || memory <= 4) return 2;
    if (cores >= 8 && memory >= 8) return 0;
    return 1;
  }

  function viewportScale() {
    var width = W || window.innerWidth || 1440;
    var height = H || window.innerHeight || 900;
    var area = Math.max(1, width * height);
    return Math.max(0.65, Math.min(1, Math.sqrt(area / (1440 * 900))));
  }

  function applyQuality(level) {
    var clamped = Math.max(0, Math.min(level, QUALITY_PROFILES.length - 1));
    var profile = QUALITY_PROFILES[clamped];
    var scale = viewportScale();

    qualityLevel = clamped;
    SKY_COUNT = Math.max(360, Math.round(profile.skyCount * scale));
    DYE_PARTICLE_COUNT = Math.max(14, Math.round(profile.dyeParticleCount * scale));
    DENSITY_COLS = Math.max(72, Math.round(profile.densityCols * scale));
    DENSITY_ROWS = Math.max(44, Math.round(profile.densityRows * scale));
    renderDprCap = profile.dprCap;
  }

  function resetScene() {
    initDensity();
    initVortices();
    initSkyParticles();
    dyeParticles = [];
    densityElapsedMs = 0;
    nextDyeTime = elapsedMs + (20 * FRAME_DURATION);
    lastHallucinationTime = elapsedMs;
  }

  function maybeReduceQuality(now) {
    if (!lastQualitySampleTime) {
      lastQualitySampleTime = now;
      return;
    }

    var delta = now - lastQualitySampleTime;
    lastQualitySampleTime = now;

    if (delta > 28) {
      slowFrameStreak += 1;
    } else {
      slowFrameStreak = Math.max(0, slowFrameStreak - 2);
    }

    if (slowFrameStreak < 8 || qualityLevel >= QUALITY_PROFILES.length - 1) {
      return;
    }

    slowFrameStreak = 0;
    applyQuality(qualityLevel + 1);
    resize();
    resetScene();
  }

  // =====================================================================
  //  Velocity field: multi-octave curl + vortex tangential flow
  // =====================================================================
  function velocityAt(px, py, t, phase) {
    // Base curl with phase-modulated octave weights
    var a0 = A0_BASE;
    var a1 = A1_BASE + phase * 0.15;
    var a2 = A2_BASE + phase * 0.4;
    var c0 = curlAt(px * S0, py * S0, t * K0);
    var c1 = curlAt(px * S1, py * S1, t * K1);
    var c2 = curlAt(px * S2, py * S2, t * K2);
    var vx = a0 * c0.x + a1 * c1.x + a2 * c2.x;
    var vy = a0 * c0.y + a1 * c1.y + a2 * c2.y;

    // Vortex attractors: tangential orbit + mild radial pull
    for (var i = 0; i < vortices.length; i++) {
      var v = vortices[i];
      var dx = px - v.x, dy = py - v.y;
      var dist = Math.sqrt(dx * dx + dy * dy) + 1;
      var influence = 1 / (1 + dist / VORTEX_FALLOFF);
      var tx = -dy / dist, ty = dx / dist;
      vx += tx * VORTEX_TANGENT_K * influence * v.dir;
      vy += ty * VORTEX_TANGENT_K * influence * v.dir;
      vx -= dx * VORTEX_RADIAL_K * influence;
      vy -= dy * VORTEX_RADIAL_K * influence;
    }

    // Brownian jitter during noisy phase
    if (phase > 0.3) {
      var jitterAmt = (phase - 0.3) * 0.08;
      vx += (Math.random() - 0.5) * jitterAmt;
      vy += (Math.random() - 0.5) * jitterAmt;
    }

    return { x: vx, y: vy };
  }

  // =====================================================================
  //  Vortex attractors
  // =====================================================================
  function initVortices() {
    vortices = [];
    for (var i = 0; i < VORTEX_COUNT; i++) {
      vortices.push({
        x: 0.1 * W + Math.random() * 0.8 * W,
        y: 0.1 * H + Math.random() * 0.8 * H,
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.03,
        dir: Math.random() > 0.5 ? 1 : -1,
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

  // =====================================================================
  //  Density grid (feedback: paint affects future paint)
  // =====================================================================
  function initDensity() {
    densityCellW = W / DENSITY_COLS;
    densityCellH = H / DENSITY_ROWS;
    densityGrid = new Float32Array(DENSITY_COLS * DENSITY_ROWS);
  }

  function depositDensity(px, py) {
    var c = Math.floor(px / densityCellW), r = Math.floor(py / densityCellH);
    if (c >= 0 && c < DENSITY_COLS && r >= 0 && r < DENSITY_ROWS)
      densityGrid[r * DENSITY_COLS + c] += 1;
  }

  function readDensity(px, py) {
    var c = Math.floor(px / densityCellW), r = Math.floor(py / densityCellH);
    if (c >= 0 && c < DENSITY_COLS && r >= 0 && r < DENSITY_ROWS)
      return densityGrid[r * DENSITY_COLS + c];
    return 0;
  }

  function diffuseDensityGrid() {
    var next = new Float32Array(DENSITY_COLS * DENSITY_ROWS);
    for (var r = 1; r < DENSITY_ROWS - 1; r++) {
      for (var c = 1; c < DENSITY_COLS - 1; c++) {
        var idx = r * DENSITY_COLS + c;
        next[idx] = (densityGrid[idx] * 4
          + densityGrid[idx - 1] + densityGrid[idx + 1]
          + densityGrid[idx - DENSITY_COLS] + densityGrid[idx + DENSITY_COLS]
        ) / 8 * 0.97;
      }
    }
    densityGrid = next;
  }

  // =====================================================================
  //  Diffusion phase controller
  // =====================================================================
  function updateDiffusionPhase() {
    diffPhase = 0.5 + 0.5 * Math.sin(elapsedMs * Math.PI * 2 / PHASE_PERIOD);
  }

  function fadeAlpha() {
    return 0.01 + diffPhase * 0.008;
  }
  function timeSpeed() {
    return 0.000095 + diffPhase * 0.00014;
  }
  function strokeAlphaMod() {
    return 1.0 + (1 - diffPhase) * 0.3;
  }

  // =====================================================================
  //  Sky paint particles + brush-stroke deposition
  // =====================================================================
  function initSkyParticles() {
    skyParticles = [];
    for (var i = 0; i < SKY_COUNT; i++) {
      var ci = Math.floor(Math.random() * SKY_PALETTE.length);
      skyParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        rgb: SKY_PALETTE[ci],
        baseAlpha: 0.02 + Math.random() * 0.02,
        baseWidth: 0.5 + Math.random() * 1.0,
        bristleOff: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBrushStroke(x, y, vx, vy, rgb, baseAlpha, baseWidth, bristleOff) {
    var speed = Math.sqrt(vx * vx + vy * vy);
    var theta = Math.atan2(vy, vx);
    theta = Math.round(theta / ANGLE_QUANT) * ANGLE_QUANT;

    var baseLen = 4 + (1 - diffPhase) * 3;
    var maxLen = 18;
    var len = baseLen + Math.min(speed * 20, maxLen - baseLen);

    var density = readDensity(x, y);
    var df = Math.min(density / 50, 1);
    var width = baseWidth * (1 + df * 0.6);
    var alpha = baseAlpha * strokeAlphaMod() * (1 + df * 0.3);

    var cosT = Math.cos(theta), sinT = Math.sin(theta);
    var halfL = len * 0.5;

    var jitter = simplex2(x * 0.008 + bristleOff, y * 0.008) * 1.2;

    ctx.lineCap = 'round';

    // Main stroke
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x - cosT * halfL + sinT * jitter, y - sinT * halfL - cosT * jitter);
    ctx.lineTo(x + cosT * halfL - sinT * jitter * 0.5, y + sinT * halfL + cosT * jitter * 0.5);
    ctx.stroke();

    // Side strand
    var sideOff = width * 0.7;
    var sideAlpha = alpha * 0.3;
    var sideLen = halfL * (0.5 + Math.random() * 0.3);
    ctx.globalAlpha = sideAlpha;
    ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + sideAlpha + ')';
    ctx.lineWidth = width * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - cosT * sideLen + sinT * sideOff, y - sinT * sideLen - cosT * sideOff);
    ctx.lineTo(x + cosT * sideLen + sinT * sideOff, y + sinT * sideLen - cosT * sideOff);
    ctx.stroke();
  }

  // =====================================================================
  //  Dye drop system — concentrated color diffusing through the flow
  //  Like a drop of ink in swirling water
  // =====================================================================
  function spawnDyeDrop(x, y) {
    // Pick one color for the whole drop (coherent dye)
    var ci = Math.floor(Math.random() * DYE_PALETTE.length);
    var rgb = DYE_PALETTE[ci];

    for (var i = 0; i < DYE_PARTICLE_COUNT; i++) {
      // Start clustered tightly at drop point with small random offset
      var ang = Math.random() * Math.PI * 2;
      var dist = Math.random() * 8; // tight initial cluster
      var pushSpd = 0.15 + Math.random() * 0.35; // mild outward push

      dyeParticles.push({
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        // Small outward velocity — the flow field does most of the spreading
        vx: Math.cos(ang) * pushSpd,
        vy: Math.sin(ang) * pushSpd,
        rgb: rgb,
        life: 0,
        maxLife: 200 + Math.floor(Math.random() * 250),
        baseAlpha: 0.04 + Math.random() * 0.04,
        baseWidth: 0.8 + Math.random() * 1.2,
        bristleOff: Math.random() * Math.PI * 2,
      });
    }

    // Schedule next dye drop
    nextDyeTime = elapsedMs + DYE_INTERVAL_MIN +
      Math.random() * (DYE_INTERVAL_MAX - DYE_INTERVAL_MIN);
  }

  function spawnRandomDyeDrop() {
    spawnDyeDrop(
      0.15 * W + Math.random() * 0.7 * W,
      0.15 * H + Math.random() * 0.7 * H
    );
  }

  function updateAndDrawDye(step) {
    for (var i = dyeParticles.length - 1; i >= 0; i--) {
      var d = dyeParticles[i];
      d.life += step;
      if (d.life > d.maxLife) { dyeParticles.splice(i, 1); continue; }

      var progress = d.life / d.maxLife;

      // Follow the same flow field as sky particles
      var v = velocityAt(d.x, d.y, time, diffPhase);
      // Outward push decays, flow field takes over
      var decay = Math.pow(0.97, step);
      d.vx *= decay;
      d.vy *= decay;
      d.x += (d.vx + v.x * SKY_SPEED * 1.1) * step;
      d.y += (d.vy + v.y * SKY_SPEED * 1.1) * step;

      // Wrap edges
      if (d.x < 0) d.x += W;
      if (d.x > W) d.x -= W;
      if (d.y < 0) d.y += H;
      if (d.y > H) d.y -= H;

      // Alpha envelope: concentrated early, fading as it diffuses
      // Quick ramp up, then long smooth fade out
      var alpha;
      if (progress < 0.05) {
        alpha = d.baseAlpha * (progress / 0.05);
      } else {
        // Smooth cubic fade — dye diluting into the water
        var fadeT = (progress - 0.05) / 0.95;
        alpha = d.baseAlpha * (1 - fadeT) * (1 - fadeT);
      }

      if (alpha < 0.001) continue;

      // Skip drawing near edges to avoid wrap artifacts
      var edgeM = 20;
      if (d.x < edgeM || d.x > W - edgeM || d.y < edgeM || d.y > H - edgeM) continue;

      // Draw as brush stroke, same as sky particles — organic, not circular
      depositDensity(d.x, d.y);
      drawBrushStroke(d.x, d.y, v.x, v.y, d.rgb, alpha, d.baseWidth, d.bristleOff);
    }
  }

  // =====================================================================
  //  Hallucination events (dreamlike discontinuities)
  // =====================================================================
  var lastHallucinationTime = 0;
  var HALLUC_INTERVAL = 1800 * FRAME_DURATION;

  function maybeHallucinate() {
    if (elapsedMs - lastHallucinationTime < HALLUC_INTERVAL) return;
    if (Math.random() > 0.02) return;
    lastHallucinationTime = elapsedMs;

    var count = 1 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count && i < vortices.length; i++) {
      var idx = Math.floor(Math.random() * vortices.length);
      var v = vortices[idx];
      v.x = 0.15 * W + Math.random() * 0.7 * W;
      v.y = 0.15 * H + Math.random() * 0.7 * H;
      v.dir *= -1;
    }
  }

  // =====================================================================
  //  Resize
  // =====================================================================
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    applyQuality(qualityLevel);
    var dpr = Math.min(window.devicePixelRatio || 1, renderDprCap);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
    lastAnimationTime = 0;
  }

  // =====================================================================
  //  Rendering
  // =====================================================================
  function renderStep(deltaMs, overlayScale, allowHallucination) {
    elapsedMs += deltaMs;
    var step = deltaMs / FRAME_DURATION;

    updateDiffusionPhase();
    if (allowHallucination) {
      maybeHallucinate();
    }

    // Fade overlay
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,248,' + Math.min(0.08, fadeAlpha() * step * overlayScale) + ')';
    ctx.fillRect(0, 0, W, H);

    time += timeSpeed() * step;
    updateVortices(step);

    densityElapsedMs += deltaMs;
    while (densityElapsedMs >= 30 * FRAME_DURATION) {
      diffuseDensityGrid();
      densityElapsedMs -= 30 * FRAME_DURATION;
    }

    // Dye drop scheduling
    if (elapsedMs >= nextDyeTime) {
      spawnRandomDyeDrop();
    }

    // --- Sky paint particles ---
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < skyParticles.length; i++) {
      var p = skyParticles[i];
      var v = velocityAt(p.x, p.y, time, diffPhase);

      p.x += v.x * SKY_SPEED * step;
      p.y += v.y * SKY_SPEED * step;

      if (p.x < 0) p.x += W;
      if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H;
      if (p.y > H) p.y -= H;

      depositDensity(p.x, p.y);
      var edgeM = 20;
      if (p.x > edgeM && p.x < W - edgeM && p.y > edgeM && p.y < H - edgeM) {
        drawBrushStroke(p.x, p.y, v.x, v.y, p.rgb, p.baseAlpha, p.baseWidth, p.bristleOff);
      }
    }

    // --- Dye particles (ink diffusing in water) ---
    updateAndDrawDye(step);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function warmStartScene() {
    var warmupSteps = qualityLevel === 2 ? 16 : qualityLevel === 1 ? 24 : 30;
    var warmupDelta = FRAME_DURATION * (qualityLevel === 2 ? 4 : 3.5);

    for (var i = 0; i < 4; i++) {
      spawnRandomDyeDrop();
    }

    for (var stepIndex = 0; stepIndex < warmupSteps; stepIndex++) {
      renderStep(warmupDelta, stepIndex < 6 ? 0.12 : 0.3, false);
    }
  }

  // =====================================================================
  //  Main loop
  // =====================================================================
  function animate(now) {
    requestAnimationFrame(animate);
    var currentTime = now || performance.now();
    if (!lastAnimationTime) lastAnimationTime = currentTime;
    var deltaMs = Math.min(96, Math.max(8, currentTime - lastAnimationTime || FRAME_DURATION));
    lastAnimationTime = currentTime;
    frameCount++;
    maybeReduceQuality(currentTime);
    renderStep(deltaMs, 1, true);
  }

  // =====================================================================
  //  Init
  // =====================================================================
  applyQuality(initialQualityLevel());
  resize();
  resetScene();
  warmStartScene();
  animate();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      resetScene();
      warmStartScene();
    }, 200);
  });
})();
