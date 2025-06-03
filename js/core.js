// core.js

// 1) Importa a instância única de Three.js
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
// 2) Importa o OrbitControls (pode nem usar aqui, mas tá exportado)
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

/**
 * Inicializa core (scene, câmera, renderer e HUDs) de forma síncrona.
 * A parte de checar XR e foveated rendering é feita depois, via .then(),
 * pra não pausar a criação dos HUDs.
 */
export function initializeCore() {
  // 1) Cena e Câmera
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
  scene.add(camera);

  // 2) Renderer sem antialias e com pixelRatio limitado → performance
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // evita explodir a GPU
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 3) Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // 4) Cria HUD “Loading…” imediatamente
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

  // 5) Cria HUD “Button” imediatamente
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

  // 6) Depois que já temos renderer + HUDs, tenta checar XR e foveated rendering
  if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-vr')
      .then((suporta) => {
        if (suporta) {
          // Só ativa foveation se suportar
          renderer.xr.setFoveation?.(1);
        }
      })
      .catch(() => {
        // ignora erro de checagem
      });
  }
}

export const showLoading = () => { if (loadingMesh) loadingMesh.visible = true; };
export const hideLoading = () => { if (loadingMesh) loadingMesh.visible = false; };

export function updateHUDPositions() {
  // Se não tiver inicializado ainda os HUDs, sai fora
  if (!loadingMesh || !buttonHUDMesh) return;
  // Se nenhum HUD estiver visível, não faz nada
  if (!loadingMesh.visible && !buttonHUDMesh.visible) return;

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
  if (!buttonCanvas || !buttonTexture || !buttonHUDMesh) return;
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
  buttonTimeout = setTimeout(() => {
    if (buttonHUDMesh) buttonHUDMesh.visible = false;
  }, 2000);
}

export async function loadMediaInSphere(url, isStereo) {
  lastMediaURL    = url;
  lastMediaStereo = isStereo;

  // Gera token único pra este load
  const myToken = ++loadToken;

  showLoading();

  // Remove mesh anterior, se existir
  if (currentMesh) {
    // Antes de remover do scene, limpa vídeo (se tiver)
    currentMesh.traverse((n) => {
      if (n.isMesh) {
        const mat = n.material;
        if (mat.map && mat.map instanceof THREE.VideoTexture) {
          const oldTex = mat.map;
          const oldVid = oldTex._video;
          // Cancela frame callback se existir
          if (oldTex._frameId && oldVid.cancelVideoFrameCallback) {
            oldVid.cancelVideoFrameCallback(oldTex._frameId);
          }
          // Pausa e limpa o vídeo
          oldVid.pause();
          oldVid.src = '';
          oldVid.load();
          oldTex.dispose();
        }
        // Dispose de geometria e material (caso seja Texture normal ou VideoTexture que já limpamos)
        n.geometry.dispose();
        mat.dispose();
      }
    });
    scene.remove(currentMesh);
    currentMesh = null;
  }

  // Cria esfera com menos segmentos pra economizar vértices
  const SEG_W = 40;   // Se ainda engasgar no mobile, testa 32 ou menos
  const SEG_H = 28;
  const geo = new THREE.SphereGeometry(500, SEG_W, SEG_H).scale(-1, 1, 1);

  const ext = url.split('.').pop().toLowerCase();
  let tex, vid;

  try {
    if (['mp4', 'webm', 'mov'].includes(ext)) {
      vid = document.createElement('video');
      vid.src         = url;
      vid.crossOrigin = 'anonymous';
      vid.loop        = true;
      vid.muted       = true;
      vid.playsInline = true;
      try { await vid.play().catch(() => {}); } catch {}

      // Cria uma VideoTexture “base”
      tex = new THREE.VideoTexture(vid);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      // Guarda referência pro vídeo e pra callback
      tex._video    = vid;
      tex._frameId  = null;

      // Função de atualização de textura
      const updateTex = () => {
        tex.needsUpdate = true;
        tex._frameId = vid.requestVideoFrameCallback(updateTex);
      };
      // Primeira chamada
      tex._frameId = vid.requestVideoFrameCallback(updateTex);

    } else {
      const loader = new THREE.TextureLoader();
      tex = await new Promise((ok, err) =>
        loader.load(url, (t) => ok(t), undefined, err)
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
    }
  } catch (e) {
    console.error('Falha ao carregar textura:', e);
    hideLoading();
    return;
  }

  // Constrói o mesh de acordo com mono/estéreo + VR
  let meshToAdd;
  const inXR = renderer.xr.isPresenting;

  // 1) VÍDEO ESTÉREO NO VR
  if (['mp4', 'webm', 'mov'].includes(ext) && isStereo && inXR) {
    // Usamos o mesmo <video> para duas VideoTextures (esquerda e direita)
    const texL = new THREE.VideoTexture(vid);
    texL.minFilter = THREE.LinearFilter;
    texL.magFilter = THREE.LinearFilter;
    texL.generateMipmaps = false;
    texL.colorSpace = THREE.SRGBColorSpace;
    texL._video   = vid;
    texL._frameId = null;

    const texR = new THREE.VideoTexture(vid);
    texR.minFilter = THREE.LinearFilter;
    texR.magFilter = THREE.LinearFilter;
    texR.generateMipmaps = false;
    texR.colorSpace = THREE.SRGBColorSpace;
    texR._video   = vid;
    texR._frameId = null;

    // Agenda updates para ambas texturas
    const updateStereo = () => {
      texL.needsUpdate = true;
      texR.needsUpdate = true;
      const nextId = vid.requestVideoFrameCallback(updateStereo);
      texL._frameId = nextId;
      texR._frameId = nextId;
    };
    // Inicia o loop
    const firstId = vid.requestVideoFrameCallback(updateStereo);
    texL._frameId = firstId;
    texR._frameId = firstId;

    // Material esquerdo (metade superior do vídeo)
    texL.repeat.set(1, 0.5);
    texL.offset.set(0, 0.5);
    texL.needsUpdate = true;
    const matL = new THREE.MeshBasicMaterial({ map: texL });

    // Material direito (metade inferior do vídeo)
    texR.repeat.set(1, 0.5);
    texR.offset.set(0, 0);
    texR.needsUpdate = true;
    const matR = new THREE.MeshBasicMaterial({ map: texR });

    const meshL = new THREE.Mesh(geo.clone(), matL);
    meshL.layers.set(1);
    const meshR = new THREE.Mesh(geo.clone(), matR);
    meshR.layers.set(2);

    meshToAdd = new THREE.Group();
    meshToAdd.add(meshL, meshR);

  // 2) VÍDEO MONO (desktop ou mobile ou VR sem estéreo)
  } else if (['mp4', 'webm', 'mov'].includes(ext) && (!isStereo || !inXR)) {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    tex.needsUpdate = true;
    meshToAdd = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));

  // 3) IMAGEM ESTÉREO FORA DO VR (top-half)
  } else if (!['mp4', 'webm', 'mov'].includes(ext) && isStereo && !inXR) {
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    mat.map.repeat.set(1, 0.5);
    mat.map.offset.set(0, 0.5);
    mat.map.needsUpdate = true;
    meshToAdd = new THREE.Mesh(geo, mat);

  // 4) IMAGEM ESTÉREO NO VR (split left/right)
  } else if (!['mp4', 'webm', 'mov'].includes(ext) && isStereo && inXR) {
    // Clona a textura original para não mexer no repeat/ofs do original
    const texL = tex.clone();
    texL.repeat.set(1, 0.5);
    texL.offset.set(0, 0.5);
    texL.needsUpdate = true;

    const texR = tex.clone();
    texR.repeat.set(1, 0.5);
    texR.offset.set(0, 0);
    texR.needsUpdate = true;

    const matL = new THREE.MeshBasicMaterial({ map: texL });
    const matR = new THREE.MeshBasicMaterial({ map: texR });

    const meshL = new THREE.Mesh(geo.clone(), matL);
    meshL.layers.set(1);
    const meshR = new THREE.Mesh(geo.clone(), matR);
    meshR.layers.set(2);

    meshToAdd = new THREE.Group();
    meshToAdd.add(meshL, meshR);

  // 5) IMAGEM MONO (desktop, mobile ou VR sem estéreo)
  } else {
    meshToAdd = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: tex })
    );
  }

  // Só adiciona se este for o load mais recente
  if (myToken === loadToken) {
    currentMesh = meshToAdd;
    scene.add(currentMesh);
    hideLoading();
  } else {
    // Descartar recursos se não for o mais atual
    meshToAdd.traverse((n) => {
      if (n.isMesh) {
        const mat = n.material;
        if (mat.map instanceof THREE.VideoTexture) {
          const oldTex = mat.map;
          const oldVid = oldTex._video;
          if (oldTex._frameId && oldVid.cancelVideoFrameCallback) {
            oldVid.cancelVideoFrameCallback(oldTex._frameId);
          }
          oldVid.pause();
          oldVid.src = '';
          oldVid.load();
          oldTex.dispose();
        }
        n.geometry.dispose();
        mat.dispose();
      }
    });
  }
}
