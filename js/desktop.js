// desktop.js
// Importa OrbitControls com "?module". Internamente, o unpkg vai reescrever 'import "three"' para
// "https://unpkg.com/three@0.158.0/build/three.module.js" (sem ?module), que é EXATAMENTE a URL que o core.js usou.
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js?module';
import {
  THREE,
  initializeCore,
  loadMediaInSphere,
  scene,
  camera,
  renderer,
  updateHUDPositions
} from './core.js';

let controls;

export function initialize() {
  initializeCore();
  document.body.appendChild(renderer.domElement);

  camera.position.set(0, 0, 0.1);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan   = false;
  controls.rotateSpeed = 0.4;
  controls.zoomSpeed   = 1.0;

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateHUDPositions();
  renderer.render(scene, camera);
}

// Reexporta direta a loadMediaInSphere do core
export const loadMedia = loadMediaInSphere;
