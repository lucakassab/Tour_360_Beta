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

const BUTTON_LABEL = {
  0: 'Trigger',
  1: 'Grip',
  3: 'Thumb',
  4: 'A',
  5: 'B'
};

let canRotateLeft = true;
let canRotateRight = true;

function changeMediaInSelect(delta) {
  const select = document.getElementById('mediaSelect');
  const len = select.options.length;
  if (len === 0) return;

  let idx = parseInt(select.value);
  idx = (idx + delta + len) % len;
  select.value = idx;

  const opt = select.options[idx];
  const url    = opt.getAttribute('data-url');
  const stereo = opt.getAttribute('data-stereo') === 'true';

  loadMediaInSphere(url, stereo);
}

function rotateScene(angleDeg) {
  const angleRad = THREE.MathUtils.degToRad(angleDeg);
  scene.rotation.y += angleRad;
}

export function initialize() {
  if (renderer.xr.enabled) return;
  renderer.xr.enabled = true;

  document.body.appendChild(VRButton.createButton(renderer));

  renderer.xr.addEventListener('sessionstart', () => {
    if (typeof onEnterXR === 'function') onEnterXR();

    if (lastMediaURL) {
      loadMediaInSphere(lastMediaURL, lastMediaStereo);
    }
  });

  renderer.setAnimationLoop(loop);
}

function loop() {
  const session = renderer.xr.getSession();
  if (session) {
    session.inputSources.forEach(source => {
      if (!source.gamepad) return;
      const gp = source.gamepad;

      // Botão A (índice 4) → mídia anterior
      if (gp.buttons[4]?.pressed) {
        showButtonHUD(BUTTON_LABEL[4]);
        changeMediaInSelect(-1);
      }
      // Botão B (índice 5) → próxima mídia
      if (gp.buttons[5]?.pressed) {
        showButtonHUD(BUTTON_LABEL[5]);
        changeMediaInSelect(+1);
      }

      // Eixo horizontal do analógico pra rotação suave
      const axisH = gp.axes[2] !== undefined ? gp.axes[2] : gp.axes[0];
      if (axisH > 0.5 && canRotateRight) {
        rotateScene(-20);
        canRotateRight = false;
        canRotateLeft  = true;
      }
      if (axisH < -0.5 && canRotateLeft) {
        rotateScene(+20);
        canRotateLeft = false;
        canRotateRight = true;
      }
      if (axisH >= -0.5 && axisH <= 0.5) {
        canRotateLeft = true;
        canRotateRight = true;
      }
    });
  }

  updateHUDPositions();
  renderer.render(scene, camera);
}

export function loadMedia(url, stereo) {
  if (stereo) {
    camera.layers.enable(1);
    camera.layers.enable(2);
    camera.layers.disable(0);
  } else {
    camera.layers.enable(0);
    camera.layers.disable(1);
    camera.layers.disable(2);
  }
  loadMediaInSphere(url, stereo);
}
