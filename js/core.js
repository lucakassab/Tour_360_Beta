// core.js

// 1) Importa a instância única de Three.js
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
// 2) Importa o OrbitControls
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
// 3) Exporta pra geral
export { THREE, OrbitControls };

export let scene, camera, renderer;
export let lastMediaURL    = null;
export let lastMediaStereo = false;

// --- token pra cancelar carregamentos antigos ----
let loadToken = 0;

let currentMesh    = null;
let loadingMesh    = null;
let buttonHUDMesh  = null;

let loadingCanvas, loadingTexture;
let buttonCanvas,  buttonTexture;
let buttonTimeout  = null;

export function initializeCore() {
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------- HUD “Loading…” ---------- */
  loadingCanvas = document.createElement('canvas');
  loadingCanvas.width  = 512;
  loadingCanvas.height = 128;
  const ctxL = loadingCanvas.getContext('2d');
  ctxL.fillStyle = 'rgba(0,0,0,.7)';
  ctxL.fillRect(0, 0, 512, 128);
  ctxL.fillStyle = '#fff';
  ctxL.font = '48px sans-serif';
  ctxL.textAlign = 'center';
  ctxL.fillText('Loading…', 256, 80);
  loadingTexture = new THREE.CanvasTexture(loadingCanvas);
  loadingMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.4),
    new THREE.MeshBasicMaterial({ map: loadingTexture, transparent: true })
  );
  loadingMesh.visible = false;
  scene.add(loadingMesh);

  /* ---------- HUD “Button” ---------- */
  buttonCanvas = document.createElement('canvas');
  buttonCanvas.width  = 512;
  buttonCanvas.height = 128;
  const ctxB = buttonCanvas.getContext('2d');
  ctxB.fillStyle = 'rgba(0,0,0,.7)';
  ctxB.fillRect(0, 0, 512, 128);
  ctxB.fillStyle = '#ff0';
  ctxB.font = 'bold 42px sans-serif';
  ctxB.textAlign = 'center';
  ctxB.fillText('Button: —', 256, 80);
  buttonTexture = new THREE.CanvasTexture(buttonCanvas);
  buttonHUDMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.4),
    new THREE.MeshBasicMaterial({ map: buttonTexture, transparent: true })
  );
  buttonHUDMesh.visible = false;
  scene.add(buttonHUDMesh);
}

export const showLoading = () => (loadingMesh.visible = true);
export const hideLoading = () => (loadingMesh.visible = false);

export function updateHUDPositions() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  if (loadingMesh.visible) {
    loadingMesh.position.copy(camera.position).add(dir.clone().multiplyScalar(2));
    loadingMesh.quaternion.copy(camera.quaternion);
  }
  if (buttonHUDMesh.visible) {
    const pos = camera.position.clone().add(dir.clone().multiplyScalar(1.5));
    pos.y -= 0.5;
    buttonHUDMesh.position.copy(pos);
    buttonHUDMesh.quaternion.copy(camera.quaternion);
  }
}

export function showButtonHUD(txt) {
  const ctx = buttonCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#ff0';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Button: ${txt}`, 256, 80);
  buttonTexture.needsUpdate = true;
  buttonHUDMesh.visible = true;
  clearTimeout(buttonTimeout);
  buttonTimeout = setTimeout(() => (buttonHUDMesh.visible = false), 2000);
}

export async function loadMediaInSphere(url, isStereo) {
  lastMediaURL    = url;
  lastMediaStereo = isStereo;

  // gera token único pra este load
  const myToken = ++loadToken;

  showLoading();

  // limpa mesh anterior (se existir)
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.traverse((n) => {
      if (n.isMesh) {
        n.material.map?.dispose();
        n.geometry.dispose();
        n.material.dispose();
      }
    });
    currentMesh = null;
  }

  // prepara esfera e textura
  const geo = new THREE.SphereGeometry(500, 60, 40).scale(-1, 1, 1);
  const ext = url.split('.').pop().toLowerCase();
  let tex;

  try {
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      const vid = document.createElement('video');
      vid.src         = url;
      vid.crossOrigin = 'anonymous';
      vid.loop        = true;
      vid.muted       = true;
      vid.playsInline = true;
      try { await vid.play().catch(() => {}); } catch {}
      tex = new THREE.VideoTexture(vid);
    } else {
      const loader = new THREE.TextureLoader();
      tex = await new Promise((ok, err) =>
        loader.load(url, (t) => ok(t), undefined, err)
      );
    }
    tex.colorSpace = THREE.SRGBColorSpace;
  } catch (e) {
    console.error('Falha ao carregar textura:', e);
    hideLoading();
    return;
  }

  // constrói o mesh de acordo com mono/estéreo + XR
  let meshToAdd;
  if (isStereo && !renderer.xr.isPresenting) {
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    mat.map.repeat.set(1, 0.5);
    mat.map.offset.set(0, 0.5);
    mat.map.needsUpdate = true;
    meshToAdd = new THREE.Mesh(geo, mat);

  } else if (isStereo && renderer.xr.isPresenting) {
    const matL = new THREE.MeshBasicMaterial({ map: tex.clone() });
    matL.map.repeat.set(1, 0.5);
    matL.map.offset.set(0, 0.5);
    matL.map.needsUpdate = true;

    const matR = new THREE.MeshBasicMaterial({ map: tex.clone() });
    matR.map.repeat.set(1, 0.5);
    matR.map.offset.set(0, 0);
    matR.map.needsUpdate = true;

    const meshL = new THREE.Mesh(geo.clone(), matL); meshL.layers.set(1);
    const meshR = new THREE.Mesh(geo.clone(), matR); meshR.layers.set(2);

    meshToAdd = new THREE.Group();
    meshToAdd.add(meshL, meshR);

  } else {
    meshToAdd = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: tex })
    );
  }

  // *** verificação de token: só adiciona se este for o load mais recente ***
  if (myToken === loadToken) {
    currentMesh = meshToAdd;
    scene.add(currentMesh);
    hideLoading();
  } else {
    // outro load mais novo já começou → descarta recursos
    meshToAdd.traverse((n) => {
      if (n.isMesh) {
        n.material.map?.dispose();
        n.geometry.dispose();
        n.material.dispose();
      }
    });
  }
}
