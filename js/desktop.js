// desktop.js

import { OrbitControls, THREE, initializeCore, loadMediaInSphere, scene, camera, renderer, updateHUDPositions } from './core.js';

let controls;

export function initialize() {
  initializeCore();
  document.body.appendChild(renderer.domElement);

  camera.position.set(0, 0, 0.1);

  // Usa OrbitControls que já veio de core.js (mesma instância do THREE)
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
