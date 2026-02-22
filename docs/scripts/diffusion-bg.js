(function () {
  'use strict';

  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('diffusion-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // --- Simplex noise (2D) ---
  // Adapted from Stefan Gustavson's implementation
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
    // Fisher-Yates shuffle with fixed seed for consistency
    var s = 42;
    for (var i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      var j = s % (i + 1);
      var t = p[i]; p[i] = p[j]; p[j] = t;
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
    var X0 = i - t, Y0 = j - t;
    var x0 = x - X0, y0 = y - Y0;
    var i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    var ii = i & 255, jj = j & 255;
    var n0 = 0, n1 = 0, n2 = 0;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      var g = grad3[permMod8[ii + perm[jj]]];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      var g = grad3[permMod8[ii + i1 + perm[jj + j1]]];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      var g = grad3[permMod8[ii + 1 + perm[jj + 1]]];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  }

  // --- Curl noise (divergence-free flow) ---
  var eps = 0.0001;
  function curl(x, y, t) {
    // Curl of scalar noise field gives divergence-free 2D vector
    var n1 = simplex2(x, y + eps + t);
    var n2 = simplex2(x, y - eps + t);
    var dx = (n1 - n2) / (2 * eps);
    var n3 = simplex2(x + eps, y + t);
    var n4 = simplex2(x - eps, y + t);
    var dy = (n3 - n4) / (2 * eps);
    return { x: dx, y: -dy };
  }

  // --- Config ---
  var PARTICLE_COUNT = 2500;
  var NOISE_SCALE = 0.0012;
  var TIME_SPEED = 0.00008;
  var PARTICLE_SPEED = 0.6;
  var FADE_ALPHA = 0.012;
  var DOT_ALPHA = 0.04;
  var DOT_RADIUS = 1;
  var CREAM = '#fffff8';
  // Warm muted colors for particles
  var COLORS = [
    'rgba(160,140,120,',  // warm gray
    'rgba(140,130,115,',  // taupe
    'rgba(170,155,135,',  // sand
    'rgba(130,125,115,',  // cool gray
    'rgba(150,135,120,',  // muted brown
  ];

  // --- State ---
  var W, H;
  var particles = [];
  var time = 0;
  var frameCount = 0;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fill with cream to reset
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, W, H);
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: DOT_ALPHA * (0.5 + Math.random() * 0.5)
      });
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    frameCount++;

    // Fade previous frame with cream overlay
    ctx.fillStyle = 'rgba(255,255,248,' + FADE_ALPHA + ')';
    ctx.fillRect(0, 0, W, H);

    time += TIME_SPEED;

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var p = particles[i];
      var c = curl(p.x * NOISE_SCALE, p.y * NOISE_SCALE, time);

      p.x += c.x * PARTICLE_SPEED;
      p.y += c.y * PARTICLE_SPEED;

      // Wrap around edges
      if (p.x < 0) p.x += W;
      if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H;
      if (p.y > H) p.y -= H;

      // Draw particle
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fillRect(p.x, p.y, DOT_RADIUS, DOT_RADIUS);
    }
  }

  // --- Init ---
  resize();
  initParticles();
  animate();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      initParticles();
    }, 200);
  });
})();
