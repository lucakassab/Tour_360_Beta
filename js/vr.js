// vr.js
import { VRButton } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js?module';
import {
  THREE,
  scene,
  camera,
  renderer,
  loadMediaInSphere,
  showButtonHUD,
  updateHUDPositions,
  lastMediaURL,
  lastMediaStereo
} from './core.js';

export let onEnterXR = null;

const LABEL = { 4: 'A', 5: 'B' };
let canRotateL = true, canRotateR = true;

function change(delta) {
  const sel = document.getElementById('mediaSelect');
  if (!sel.options.length) return;
  let i = (+sel.value + delta + sel.options.length) % sel.options.length;
  sel.value = i;
  loadMediaInSphere(
    sel.options[i].getAttribute('data-url'),
    sel.options[i].getAttribute('data-stereo') === 'true'
  );
}

function rotateScene(deg) { scene.rotation.y += THREE.MathUtils.degToRad(deg); }

export function initialize() {
  if (renderer.xr.enabled) return;
  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));

  renderer.xr.addEventListener('sessionstart', () => {
    onEnterXR?.();
    if (lastMediaURL) loadMediaInSphere(lastMediaURL, lastMediaStereo);
  });

  renderer.setAnimationLoop(loop);
}

function loop() {
  const s = renderer.xr.getSession();
  if (s) {
    s.inputSources.forEach(src => {
      const gp = src.gamepad;
      if (!gp) return;

      if (gp.buttons[4]?.pressed) { showButtonHUD(LABEL[4]); change(-1); }
      if (gp.buttons[5]?.pressed) { showButtonHUD(LABEL[5]); change(+1); }

      const ax = gp.axes[2] ?? gp.axes[0];
      if (ax > 0.5 && canRotateR) { rotateScene(-20); canRotateR = false; }
      if (ax < -0.5 && canRotateL) { rotateScene(+20); canRotateL = false; }
      if (Math.abs(ax) <= 0.5) { canRotateL = canRotateR = true; }
    });
  }
  updateHUDPositions();
  renderer.render(scene, camera);
}

export function loadMedia(url, stereo) {
  camera.layers.enable(stereo ? 1 : 0);
  camera.layers.enable(stereo ? 2 : 0);
  camera.layers.disable(stereo ? 0 : 1);
  camera.layers.disable(stereo ? 0 : 2);
  loadMediaInSphere(url, stereo);
}
