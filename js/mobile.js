// mobile.js
// NUNCA importa Three.js de CDN – PUXA via core.js (só existe uma instância)
import {
  THREE,
  initializeCore,
  loadMediaInSphere,
  scene,
  camera,
  renderer,
  updateHUDPositions
} from './core.js';

let dragging = false;
let sx = 0, sy = 0;
let lon = 0, lat = 0;

export function initialize() {
  initializeCore();
  document.body.appendChild(renderer.domElement);

  const cvs = renderer.domElement;
  cvs.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      dragging = true;
      sx = e.touches[0].pageX;
      sy = e.touches[0].pageY;
    }
  });

  cvs.addEventListener('touchmove', (e) => {
    if (dragging && e.touches.length === 1) {
      const dx = e.touches[0].pageX - sx;
      const dy = e.touches[0].pageY - sy;
      lon -= dx * 0.1;
      lat += dy * 0.1;
      sx = e.touches[0].pageX;
      sy = e.touches[0].pageY;
    }
  });

  cvs.addEventListener('touchend', () => { dragging = false; });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  lat = Math.max(-85, Math.min(85, lat));
  const phi   = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  const tgt = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  );
  camera.lookAt(tgt);
  updateHUDPositions();
  renderer.render(scene, camera);
}

export const loadMedia = loadMediaInSphere;
