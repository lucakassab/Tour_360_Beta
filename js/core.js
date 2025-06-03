// core.js

// --- 1) Importa a instância única de Three.js
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
// --- 2) Importa o OrbitControls
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
// --- 3) Exporta pra geral
export { THREE, OrbitControls };

export let scene, camera, renderer;
export let lastMediaURL    = null;
export let lastMediaStereo = false;

// --- Token pra cancelar carregamentos antigos
let loadToken = 0;

// --- Reuso de objetos da esfera
let sphereMesh       = null;   // Mesh único que vamos reutilizar
let sphereGeometry   = null;   // Geometria única, menor subdivisão
let currentMaterial  = null;   // Material que recebe o map (textura/vídeo)

let loadingMesh      = null;
let buttonHUDMesh    = null;

let loadingCanvas, loadingTexture;
let buttonCanvas,  buttonTexture;
let buttonTimeout   = null;

export function initializeCore() {
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
  scene.add(camera);

  // ------------- Renderizador sem antialias (melhora performance no VR) -------------
  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ------------- Cria a esfera UMA VEZ e a esconde (reutilizaremos depois) -------------
  // Reduzimos a resolução para 32 x 16 (antes era 60 x 40)
  sphereGeometry = new THREE.SphereGeometry(500, 32, 16).scale(-1, 1, 1);
  currentMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  sphereMesh = new THREE.Mesh(sphereGeometry, currentMaterial);
  sphereMesh.visible = false;
  scene.add(sphereMesh);

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

  const myToken = ++loadToken;
  showLoading();

  // Se já existe um map carregado, descarte ele antes de criar o novo
  if (currentMaterial.map) {
    currentMaterial.map.dispose();
    currentMaterial.map = null;
  }

  // Carrega a textura ou cria VideoTexture
  let tex;
  try {
    const ext = url.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      // ▶️ VÍDEO: setar crossOrigin antes de definir src
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.src = url;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      // tenta tocar pra ter frames no VideoTexture
      await vid.play().catch(() => {});
      tex = new THREE.VideoTexture(vid);
      tex.colorSpace = THREE.SRGBColorSpace;
    } else {
      // 📷 IMAGEM: usar TextureLoader com crossOrigin
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      tex = await new Promise((ok, err) => {
        loader.load(url, t => {
          t.colorSpace = THREE.SRGBColorSpace;
          ok(t);
        }, undefined, err);
      });
    }
  } catch (e) {
    console.error('Falha ao carregar mídia:', e);
    hideLoading();
    return;
  }

  // Se outro load já começou, descarta este
  if (myToken !== loadToken) {
    tex.dispose?.();
    hideLoading();
    return;
  }

  // Atualiza o material com a nova textura
  currentMaterial.map = tex;
  currentMaterial.needsUpdate = true;

  // Ajuste de repeat/offset para estéreo ou mono (sem layers)
  if (isStereo) {
    currentMaterial.map.repeat.set(1, 0.5);
    currentMaterial.map.offset.set(0, 0.5);
  } else {
    currentMaterial.map.repeat.set(1, 1);
    currentMaterial.map.offset.set(0, 0);
  }

  // Mostra a esfera e esconde o loading
  sphereMesh.visible = true;
  hideLoading();
}
