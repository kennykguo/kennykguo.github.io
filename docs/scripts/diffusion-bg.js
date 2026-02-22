(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('diffusion-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // =====================================================================
  //  Simplex noise (2D)
  // =====================================================================
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var grad3 = [
    [1,1],[-1,1],[1,-1],[-1,-1],
    [1,0],[-1,0],[0,1],[0,-1]
  ];
  var perm = new Uint8Array(512);
  var permMod8 = new Uint8Array(512);

  (function seedPerm() {
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    var s = 42;
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
    var i = Math.floor(x + s);
    var j = Math.floor(y + s);
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
  function curlSingle(x, y, t) {
    var dy = (simplex2(x, y + eps + t) - simplex2(x, y - eps + t)) / (2 * eps);
    var dx = (simplex2(x + eps, y + t) - simplex2(x - eps, y + t)) / (2 * eps);
    return { x: dy, y: -dx };
  }

  // =====================================================================
  //  Multi-octave curl (big swirls + small eddies)
  // =====================================================================
  // Three scales: galaxy arms, mid structure, sparkle jitter
  var S0 = 0.0006, S1 = 0.0024, S2 = 0.008;
  var A0 = 1.0,    A1 = 0.4,    A2 = 0.15;
  var K0 = 1.0,    K1 = 2.0,    K2 = 4.0;

  function curlMulti(px, py, t) {
    var c0 = curlSingle(px * S0, py * S0, t * K0);
    var c1 = curlSingle(px * S1, py * S1, t * K1);
    var c2 = curlSingle(px * S2, py * S2, t * K2);
    return {
      x: A0 * c0.x + A1 * c1.x + A2 * c2.x,
      y: A0 * c0.y + A1 * c1.y + A2 * c2.y
    };
  }

  // =====================================================================
  //  Config
  // =====================================================================
  var PAINT_COUNT      = 2200;
  var STAR_COUNT       = 7;
  var PARTICLE_SPEED   = 0.55;
  var FADE_ALPHA       = 0.008;
  var CREAM            = '#fffff8';

  // Stroke config
  var BASE_STROKE_LEN  = 6;
  var MAX_STROKE_LEN   = 18;
  var STROKE_WIDTH_MIN = 0.6;
  var STROKE_WIDTH_MAX = 1.8;
  var ANGLE_QUANT      = Math.PI / 12; // 15-degree quantization for hand-done feel

  // Dreaming config
  var DREAM_CYCLE      = 900;   // frames per full dream cycle (~15s at 60fps)
  var DREAM_CHAOS_FRAC = 0.7;   // fraction of cycle that is "noisy/chaotic"

  // Density grid
  var DENSITY_COLS     = 200;
  var DENSITY_ROWS     = 120;

  // Sky-paint palette (muted blues, blue-grays, warm grays)
  var SKY_COLORS = [
    'rgba(100,110,140,',   // muted steel blue
    'rgba(120,125,145,',   // blue gray
    'rgba(90,100,130,',    // deeper blue
    'rgba(140,135,150,',   // lavender gray
    'rgba(110,115,125,',   // cool gray
    'rgba(130,120,110,',   // warm taupe
    'rgba(150,140,130,',   // sand
  ];

  // Star palette (bright warm accents)
  var STAR_COLORS = [
    'rgba(255,240,180,',   // warm yellow
    'rgba(255,250,220,',   // pale gold
    'rgba(240,230,200,',   // cream bright
    'rgba(255,220,160,',   // amber
    'rgba(230,235,255,',   // cool white
  ];

  // =====================================================================
  //  State
  // =====================================================================
  var W, H;
  var paintParticles = [];
  var stars = [];
  var attractors = [];
  var time = 0;
  var frameCount = 0;
  var densityGrid;
  var densityCellW, densityCellH;

  // Dream state
  var dreamPhaseOffset = 0;
  var dreamNoiseBoost  = 0;
  var dreamPaletteShift = 0;

  // =====================================================================
  //  Attractors (stable star-points that pull particles into halos)
  // =====================================================================
  var ATTRACTOR_COUNT    = 6;
  var ATTRACTOR_STRENGTH = 0.00012;
  var ATTRACTOR_EPSILON  = 80;

  function initAttractors() {
    attractors = [];
    for (var i = 0; i < ATTRACTOR_COUNT; i++) {
      attractors.push({
        x: 0.1 * W + Math.random() * 0.8 * W,
        y: 0.1 * H + Math.random() * 0.8 * H,
        // Attractors drift slowly
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function updateAttractors() {
    for (var i = 0; i < attractors.length; i++) {
      var a = attractors[i];
      a.x += a.vx;
      a.y += a.vy;
      // Soft bounce off edges
      if (a.x < W * 0.05 || a.x > W * 0.95) a.vx *= -1;
      if (a.y < H * 0.05 || a.y > H * 0.95) a.vy *= -1;
    }
  }

  function attractorPull(px, py) {
    var ax = 0, ay = 0;
    for (var i = 0; i < attractors.length; i++) {
      var a = attractors[i];
      var dx = a.x - px, dy = a.y - py;
      var d2 = dx * dx + dy * dy + ATTRACTOR_EPSILON * ATTRACTOR_EPSILON;
      var str = ATTRACTOR_STRENGTH / d2;
      ax += dx * str;
      ay += dy * str;
    }
    return { x: ax, y: ay };
  }

  // =====================================================================
  //  Density grid (density → paint feedback)
  // =====================================================================
  function initDensity() {
    densityCellW = W / DENSITY_COLS;
    densityCellH = H / DENSITY_ROWS;
    densityGrid = new Float32Array(DENSITY_COLS * DENSITY_ROWS);
  }

  function depositDensity(px, py) {
    var col = Math.floor(px / densityCellW);
    var row = Math.floor(py / densityCellH);
    if (col >= 0 && col < DENSITY_COLS && row >= 0 && row < DENSITY_ROWS) {
      densityGrid[row * DENSITY_COLS + col] += 1;
    }
  }

  function readDensity(px, py) {
    var col = Math.floor(px / densityCellW);
    var row = Math.floor(py / densityCellH);
    if (col >= 0 && col < DENSITY_COLS && row >= 0 && row < DENSITY_ROWS) {
      return densityGrid[row * DENSITY_COLS + col];
    }
    return 0;
  }

  function diffuseDensity() {
    // Simple 3x3 box blur with decay
    var next = new Float32Array(DENSITY_COLS * DENSITY_ROWS);
    for (var r = 1; r < DENSITY_ROWS - 1; r++) {
      for (var c = 1; c < DENSITY_COLS - 1; c++) {
        var idx = r * DENSITY_COLS + c;
        var sum = densityGrid[idx] * 4
          + densityGrid[idx - 1] + densityGrid[idx + 1]
          + densityGrid[idx - DENSITY_COLS] + densityGrid[idx + DENSITY_COLS];
        next[idx] = (sum / 8) * 0.97; // slight decay
      }
    }
    densityGrid = next;
  }

  // =====================================================================
  //  Particles
  // =====================================================================
  function initPaintParticles() {
    paintParticles = [];
    for (var i = 0; i < PAINT_COUNT; i++) {
      paintParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        color: SKY_COLORS[Math.floor(Math.random() * SKY_COLORS.length)],
        alpha: 0.025 + Math.random() * 0.03,
        w: STROKE_WIDTH_MIN + Math.random() * (STROKE_WIDTH_MAX - STROKE_WIDTH_MIN),
        bristlePhase: Math.random() * Math.PI * 2
      });
    }
  }

  function initStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      // Place stars near attractors for coherent halos
      var aIdx = i % attractors.length;
      var a = attractors[aIdx];
      stars.push({
        x: a.x + (Math.random() - 0.5) * 60,
        y: a.y + (Math.random() - 0.5) * 60,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        baseAlpha: 0.15 + Math.random() * 0.2,
        baseRadius: 2 + Math.random() * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        bristlePhase: Math.random() * Math.PI * 2
      });
    }
  }

  // =====================================================================
  //  Dreaming: regime shifts
  // =====================================================================
  function updateDreamState() {
    var cyclePos = (frameCount % DREAM_CYCLE) / DREAM_CYCLE;

    if (cyclePos < DREAM_CHAOS_FRAC) {
      // "Forward process" — gradually increasing noise/chaos
      var t = cyclePos / DREAM_CHAOS_FRAC;
      dreamNoiseBoost = t * 0.6;
      dreamPaletteShift = t * 0.3;
      dreamPhaseOffset += 0.00001 * t;
    } else {
      // "Reverse process" — denoising, cohering toward structure
      var t = (cyclePos - DREAM_CHAOS_FRAC) / (1 - DREAM_CHAOS_FRAC);
      dreamNoiseBoost = 0.6 * (1 - t);
      dreamPaletteShift = 0.3 * (1 - t);
    }
  }

  // =====================================================================
  //  Drawing helpers
  // =====================================================================
  function quantizeAngle(theta) {
    return Math.round(theta / ANGLE_QUANT) * ANGLE_QUANT;
  }

  function drawStroke(x, y, vx, vy, p) {
    var speed = Math.sqrt(vx * vx + vy * vy);
    var theta = Math.atan2(vy, vx);

    // Quantize angle for hand-done coherence
    theta = quantizeAngle(theta);

    // Stroke length scales with speed
    var len = BASE_STROKE_LEN + speed * (MAX_STROKE_LEN - BASE_STROKE_LEN) * 2;
    if (len > MAX_STROKE_LEN) len = MAX_STROKE_LEN;

    // Density feedback: thicker/brighter where paint has accumulated
    var density = readDensity(x, y);
    var densityFactor = Math.min(density / 40, 1);
    var width = p.w * (1 + densityFactor * 0.8);
    var alpha = p.alpha * (1 + densityFactor * 0.4);

    // Bristle jitter — wobble endpoints
    var jitter = simplex2(x * 0.01 + p.bristlePhase, y * 0.01) * 1.5;
    var cosT = Math.cos(theta), sinT = Math.sin(theta);
    var halfL = len * 0.5;

    var x0 = x - cosT * halfL + sinT * jitter;
    var y0 = y - sinT * halfL - cosT * jitter;
    var x1 = x + cosT * halfL - sinT * jitter * 0.5;
    var y1 = y + sinT * halfL + cosT * jitter * 0.5;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p.color + (alpha * 1.5).toFixed(3) + ')';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function drawStar(s) {
    var twinkle = 0.5 + 0.5 * Math.sin(frameCount * s.twinkleSpeed + s.twinklePhase);
    var alpha = s.baseAlpha * twinkle;
    var radius = s.baseRadius * (0.8 + 0.4 * twinkle);

    // Core glow
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color + alpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Cross glare (very faint)
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = s.color + (alpha * 0.3).toFixed(3) + ')';
    ctx.lineWidth = 0.5;
    var glareLen = radius * 3;
    ctx.beginPath();
    ctx.moveTo(s.x - glareLen, s.y);
    ctx.lineTo(s.x + glareLen, s.y);
    ctx.moveTo(s.x, s.y - glareLen);
    ctx.lineTo(s.x, s.y + glareLen);
    ctx.stroke();
  }

  // =====================================================================
  //  Resize
  // =====================================================================
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
  }

  // =====================================================================
  //  Main animation loop
  // =====================================================================
  function animate() {
    requestAnimationFrame(animate);
    frameCount++;

    // Update dream state (diffusion forward/reverse cycles)
    updateDreamState();

    // Fade previous frame — slower fade for trail persistence
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,248,' + FADE_ALPHA + ')';
    ctx.fillRect(0, 0, W, H);

    time += 0.00008;
    var effectiveTime = time + dreamPhaseOffset;

    // Update attractors
    updateAttractors();

    // Diffuse density grid periodically
    if (frameCount % 30 === 0) {
      diffuseDensity();
    }

    // High-frequency boost during "chaotic" dream phase
    var boostedA2 = A2 + dreamNoiseBoost;

    // --- Paint particles ---
    for (var i = 0; i < PAINT_COUNT; i++) {
      var p = paintParticles[i];

      // Multi-octave curl with dream boost on high-freq
      var c0 = curlSingle(p.x * S0, p.y * S0, effectiveTime * K0);
      var c1 = curlSingle(p.x * S1, p.y * S1, effectiveTime * K1);
      var c2 = curlSingle(p.x * S2, p.y * S2, effectiveTime * K2);

      var vx = A0 * c0.x + A1 * c1.x + boostedA2 * c2.x;
      var vy = A0 * c0.y + A1 * c1.y + boostedA2 * c2.y;

      // Attractor pull
      var pull = attractorPull(p.x, p.y);
      vx += pull.x;
      vy += pull.y;

      p.x += vx * PARTICLE_SPEED;
      p.y += vy * PARTICLE_SPEED;

      // Wrap edges
      if (p.x < 0) p.x += W;
      if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H;
      if (p.y > H) p.y -= H;

      // Deposit density
      depositDensity(p.x, p.y);

      // Draw oriented brush stroke
      drawStroke(p.x, p.y, vx, vy, p);
    }

    // --- Star particles ---
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];

      // Stars drift slowly with low-freq curl only
      var sc = curlSingle(s.x * S0 * 0.5, s.y * S0 * 0.5, effectiveTime * 0.3);
      s.x += sc.x * 0.08;
      s.y += sc.y * 0.08;

      // Soft wrap
      if (s.x < -20) s.x += W + 40;
      if (s.x > W + 20) s.x -= W + 40;
      if (s.y < -20) s.y += H + 40;
      if (s.y > H + 20) s.y -= H + 40;

      drawStar(s);
    }

    ctx.globalAlpha = 1;
  }

  // =====================================================================
  //  Init
  // =====================================================================
  resize();
  initDensity();
  initAttractors();
  initPaintParticles();
  initStars();
  animate();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      initDensity();
      initAttractors();
      initPaintParticles();
      initStars();
    }, 200);
  });
})();
