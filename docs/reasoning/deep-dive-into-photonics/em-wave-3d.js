// 3D view of an electromagnetic plane wave for the photonics notebook post (Three.js).
// "One line" shows E and B at points along the direction of travel. "Plane wave" shows the same
// wave on a grid of parallel lines, the way a plane is made of lines. Drag to rotate the view.
// Uses the controls and animation loop from viz.js (window.PhotonicsViz).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const kit = window.PhotonicsViz || await new Promise(resolve =>
  window.addEventListener('photonics-viz-ready', () => resolve(window.PhotonicsViz), { once: true }));

const LENGTH = 12;          // length of the beam shown, in scene units
const WAVELENGTH = 4;
const AMPLITUDE = 1.6;
const SAMPLES = 49;         // arrows per field
const CURVE_POINTS = 240;   // points on the curve through the arrow tips
const GRID = [-1.8, 0, 1.8];  // x and y offsets of the parallel lines in the plane-wave view
const GRID_SAMPLES = 25;    // arrows per line in the plane-wave view
const GRID_AMPLITUDE = 0.7;
const k = (2 * Math.PI) / WAVELENGTH;
const omega = 2 * Math.PI * 0.3;

document.querySelectorAll('figure.viz[data-viz="em-wave-3d"]').forEach(setup);

function setup(figure) {
  const stage = figure.querySelector('.viz-stage');
  const bar = kit.makeControls(figure);
  let view = 'line';

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', figure.dataset.label || '');
  renderer.domElement.classList.add('viz-3d');
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 2, 0.1, 100);

  // direction of travel: an axis along z with an arrowhead
  const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, LENGTH + 1.2, 8), axisMaterial);
  axis.rotation.x = Math.PI / 2;
  scene.add(axis);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 16), axisMaterial);
  head.rotation.x = Math.PI / 2;
  head.position.z = LENGTH / 2 + 0.8;
  scene.add(head);

  const field = color => {
    const material = new THREE.MeshBasicMaterial({ color });
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), material, SAMPLES);
    const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), material, SAMPLES);
    const curve = new THREE.Line(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(CURVE_POINTS * 3), 3)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }));
    scene.add(stems, tips, curve);
    return { stems, tips, curve };
  };
  const eColor = new THREE.Color(kit.colors.E_COLOR);
  const E = field(eColor);
  const B = field(new THREE.Color(kit.colors.B_COLOR));

  // Plane-wave view: E and B arrows on a grid of parallel lines
  const gridCount = GRID.length * GRID.length * GRID_SAMPLES;
  const gridField = color => {
    const material = new THREE.MeshBasicMaterial({ color });
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), material, gridCount);
    const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 6), material, gridCount);
    scene.add(stems, tips);
    return { stems, tips };
  };
  const gridE = gridField(eColor);
  const gridB = gridField(new THREE.Color(kit.colors.B_COLOR));

  // E and B at position z and time t (linear polarization). B is drawn at the same scale as E
  // (really it's E/c).
  function vectors(z, t) {
    const c = Math.cos(k * z - omega * t);
    return [[c, 0], [0, c]];
  }

  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  // Arrow i of a field, pointing along (x, y) from the line at (x0, y0, z)
  function place(mesh, tips, i, x, y, z, amplitude = AMPLITUDE, x0 = 0, y0 = 0) {
    const length = Math.hypot(x, y) * amplitude;
    if (length < 1e-3) {
      dir.set(0, 1, 0);
    } else {
      dir.set(x, y, 0).normalize();
    }
    quat.setFromUnitVectors(up, dir);
    pos.set(x0 + dir.x * length / 2, y0 + dir.y * length / 2, z);
    scale.set(1, Math.max(length, 1e-3), 1);
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(i, matrix);
    matrix.makeTranslation(x0 + x * amplitude, y0 + y * amplitude, z);
    tips.setMatrixAt(i, matrix);
  }

  function updatePlane(t) {
    let i = 0;
    for (const x0 of GRID) {
      for (const y0 of GRID) {
        for (let j = 0; j < GRID_SAMPLES; j++) {
          const z = -LENGTH / 2 + (LENGTH * j) / (GRID_SAMPLES - 1);
          const [e, b] = vectors(z, t);
          place(gridE.stems, gridE.tips, i, e[0], e[1], z, GRID_AMPLITUDE, x0, y0);
          place(gridB.stems, gridB.tips, i, b[0], b[1], z, GRID_AMPLITUDE, x0, y0);
          i++;
        }
      }
    }
    for (const part of [gridE.stems, gridE.tips, gridB.stems, gridB.tips]) part.instanceMatrix.needsUpdate = true;
  }

  function update(t) {
    const plane = view === 'plane';
    for (const part of [E.stems, E.tips, E.curve, B.stems, B.tips, B.curve]) part.visible = !plane;
    for (const part of [gridE.stems, gridE.tips, gridB.stems, gridB.tips]) part.visible = plane;
    if (plane) {
      updatePlane(t);
      return;
    }

    for (let i = 0; i < SAMPLES; i++) {
      const z = -LENGTH / 2 + (LENGTH * i) / (SAMPLES - 1);
      const [e, b] = vectors(z, t);
      place(E.stems, E.tips, i, e[0], e[1], z);
      place(B.stems, B.tips, i, b[0], b[1], z);
    }
    for (const part of [E.stems, E.tips, B.stems, B.tips]) part.instanceMatrix.needsUpdate = true;

    const ePos = E.curve.geometry.attributes.position;
    const bPos = B.curve.geometry.attributes.position;
    for (let i = 0; i < CURVE_POINTS; i++) {
      const z = -LENGTH / 2 + (LENGTH * i) / (CURVE_POINTS - 1);
      const [e, b] = vectors(z, t);
      ePos.setXYZ(i, e[0] * AMPLITUDE, e[1] * AMPLITUDE, z);
      bPos.setXYZ(i, b[0] * AMPLITUDE, b[1] * AMPLITUDE, z);
    }
    ePos.needsUpdate = true;
    bPos.needsUpdate = true;
  }

  // camera orbits the middle of the beam; drag to change the angle
  const orbit = { azimuth: -0.85, elevation: 0.38, radius: 14.5 };
  function placeCamera() {
    const { azimuth, elevation } = orbit;
    const radius = view === 'plane' ? 19 : orbit.radius;   // pull back so the whole grid fits
    camera.position.set(
      radius * Math.cos(elevation) * Math.sin(azimuth),
      radius * Math.sin(elevation),
      radius * Math.cos(elevation) * Math.cos(azimuth));
    camera.lookAt(0, 0, 0);
  }

  function render(t) {
    update(t);
    placeCamera();
    renderer.render(scene, camera);
  }

  const anim = kit.animate(figure, bar, render);
  kit.segmented(bar, [['line', 'one line'], ['plane', 'plane wave']], view,
    value => { view = value; anim.redraw(); });
  kit.legend(bar, [[kit.colors.E_COLOR, 'electric field $\\vec{E}$'], [kit.colors.B_COLOR, 'magnetic field $\\vec{B}$'], [kit.colors.INK, 'direction of travel']]);

  let drag = null;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', event => {
    drag = { x: event.clientX, y: event.clientY, azimuth: orbit.azimuth, elevation: orbit.elevation };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    orbit.azimuth = drag.azimuth - (event.clientX - drag.x) * 0.008;
    orbit.elevation = Math.max(-1.3, Math.min(1.3, drag.elevation + (event.clientY - drag.y) * 0.008));
    anim.redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function resize() {
    const width = stage.clientWidth;
    const height = Math.round(Math.min(480, Math.max(260, width * 0.55)));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    anim.redraw();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
}
