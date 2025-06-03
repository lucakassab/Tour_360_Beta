// vr.js

import { VRButton } from 'https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js';

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

// Debounce para rotação (eixo) — já existia
let canLeft  = true;
let canRight = true;

// Debounce para troca de mídia (botões 4 e 5)
let readyPrev = true;
let readyNext = true;

function change(delta) {
  const sel = document.getElementById('mediaSelect');
  if (!sel.options.length) return;

  let i = (+sel.value + delta + sel.options.length) % sel.options.length;
  sel.value = i;

  loadMediaInSphere(
    sel.options[i].dataset.url,
    sel.options[i].dataset.stereo === 'true'
  );
}

function rotate(deg) {
  scene.rotation.y += THREE.MathUtils.degToRad(deg);
}

export function initialize() {
  if (renderer.xr.enabled) return;
  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));

  renderer.xr.addEventListener('sessionstart', () => {
    onEnterXR?.();

    if (lastMediaURL) {
      loadMediaInSphere(lastMediaURL, lastMediaStereo);
    }

    // Só começa o loop depois que a sessão VR realmente iniciou
    renderer.setAnimationLoop(loop);
  });
}

function loop() {
  const session = renderer.xr.getSession();
  if (session) {
    session.inputSources.forEach((src) => {
      const gp = src.gamepad;
      if (!gp) return;

      /* -------- BOTÕES 4 (Anterior) / 5 (Próximo) -------- */
      const prevPressed = gp.buttons[4]?.pressed;
      const nextPressed = gp.buttons[5]?.pressed;

      if (prevPressed && readyPrev) {
        showButtonHUD(LABEL[4]);
        change(-1);
        readyPrev = false;          // trava até soltar
      }
      if (!prevPressed) readyPrev = true;

      if (nextPressed && readyNext) {
        showButtonHUD(LABEL[5]);
        change(+1);
        readyNext = false;          // trava até soltar
      }
      if (!nextPressed) readyNext = true;

      /* -------- ROTACIONAR CENÁRIO PELO EIXO ANALÓGICO -------- */
      const ax = gp.axes[2] ?? gp.axes[0];      // Quest / padrão
      if (ax > 0.5 && canRight) {
        rotate(-20);
        canRight = false;
      }
      if (ax < -0.5 && canLeft) {
        rotate(20);
        canLeft = false;
      }
      if (Math.abs(ax) <= 0.5) {
        canLeft = canRight = true;
      }
    });
  }

  updateHUDPositions();
  renderer.render(scene, camera);
}

/* ------------- Helper público pra quando loader troca pra VR ------------- */
export const loadMedia = (url, stereo) => {
  camera.layers.enable(stereo ? 1 : 0);
  camera.layers.enable(stereo ? 2 : 0);
  camera.layers.disable(stereo ? 0 : 1);
  camera.layers.disable(stereo ? 0 : 2);
  loadMediaInSphere(url, stereo);
};
