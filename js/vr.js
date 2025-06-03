// vr.js

import { VRButton } from './VRButton.js';


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

// Debounce para rotação (eixo analógico)
let canLeft  = true;
let canRight = true;

// Variáveis de “estado anterior” dos botões A (4) e B (5)
let prevPrevPressed = false;
let prevNextPressed = false;

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
    // Começa o loop de VR somente quando a sessão realmente iniciar
    renderer.setAnimationLoop(loop);
  });
}

function loop() {
  const session = renderer.xr.getSession();
  if (session) {
    // 1) Detecta se algum inputSource está pressionando A (4) ou B (5)
    let anyPrevPressed = false;
    let anyNextPressed = false;
    session.inputSources.forEach(src => {
      const gp = src.gamepad;
      if (!gp) return;
      if (gp.buttons[4]?.pressed) anyPrevPressed = true;
      if (gp.buttons[5]?.pressed) anyNextPressed = true;
    });

    // 2) Edge detection: só chama change() quando vai de “solto” → “pressionado”
    if (anyPrevPressed && !prevPrevPressed) {
      showButtonHUD(LABEL[4]);
      change(-1);
    }
    if (anyNextPressed && !prevNextPressed) {
      showButtonHUD(LABEL[5]);
      change(+1);
    }
    // Atualiza o estado anterior para o próximo frame
    prevPrevPressed = anyPrevPressed;
    prevNextPressed = anyNextPressed;

    // 3) Rotação via eixo analógico (axes)
    session.inputSources.forEach(src => {
      const gp = src.gamepad;
      if (!gp) return;
      const ax = gp.axes[2] ?? gp.axes[0]; // eixo principal ou secundário
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

// Função externa para loadMedia (mantida igual)
export const loadMedia = (url, stereo) => {
  camera.layers.enable(stereo ? 1 : 0);
  camera.layers.enable(stereo ? 2 : 0);
  camera.layers.disable(stereo ? 0 : 1);
  camera.layers.disable(stereo ? 0 : 2);
  loadMediaInSphere(url, stereo);
};
