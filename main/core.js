import {
  clamp,
  isMobileDevice,
  wrapIndex
} from './shared/utils.js?v=16';
import { initDesktopControls } from './desktop.js?v=16';
import { initMobileControls } from './mobile.js?v=16';

const PANORAMAS = [
  {
    id: 'fachada-portico-dia',
    title: 'Pórtico',
    src: './assets/panoramas/mono_images/Fachada_Portico_Dia.jpg',
    yaw: -90
  },
  {
    id: 'fachada-dia',
    title: 'Fachada Diurna',
    src: './assets/panoramas/mono_images/Fachada_Dia.jpg',
    yaw: -90
  },
  {
    id: 'fachada-noite',
    title: 'Fachada Noturna',
    src: './assets/panoramas/mono_images/Fachada_Noite.jpg',
    yaw: -90
  },
  {
    id: 'pet-place',
    title: 'Pet Place',
    src: './assets/panoramas/mono_images/PETPLACE8K.jpg',
    yaw: -90
  },
  {
    id: 'piscina',
    title: 'Piscina',
    src: './assets/panoramas/mono_images/PISCINA8K.jpg',
    yaw: -90
  },
  {
    id: 'salao-de-festas',
    title: 'Salão de Festas',
    src: './assets/panoramas/mono_images/FESTAS8K.jpg',
    yaw: 180
  },
  {
    id: 'academia',
    title: 'Academia',
    src: './assets/panoramas/mono_images/ACADEMIA8K.jpg',
    yaw: 180
  },
  {
    id: 'churrasqueira',
    title: 'Pool House',
    src: './assets/panoramas/mono_images/CHURRASQUEIRA8K.jpg',
    yaw: -90
  }
];

const SCENE_QUERY_PARAM = 'scene';
const PITCH_LIMIT = Math.PI * 0.47;
const MIN_FOV = 35;
const MAX_FOV = 95;

class Tour360App {
  constructor() {
    this.THREE = window.THREE;
    this.viewer = document.getElementById('viewer');
    this.select = document.getElementById('panoramaSelect');
    this.previousButton = document.getElementById('previousButton');
    this.nextButton = document.getElementById('nextButton');
    this.gyroButton = document.getElementById('gyroButton');

    this.currentIndex = 0;
    this.currentTexture = null;
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    this.resetGyroCalibration = null;
  }

  init() {
    if (!this.THREE) {
      console.error('Three.js não carregou. Verifique o arquivo local assets/vendor/three.min.js.');
      this.setStatus('Erro ao carregar Three.js');
      return;
    }

    this.initThree();
    this.populateSelect();
    this.bindUi();
    this.initControls();
    this.loadPanorama(this.getInitialPanoramaIndex(), { updateUrl: false });
    this.resize();
    this.animate();
    this.registerServiceWorker();
  }

  initThree() {
    const THREE = this.THREE;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1100);
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.configureColorManagement(THREE);
    this.viewer.appendChild(this.renderer.domElement);

    this.geometry = new THREE.SphereGeometry(500, 64, 40);
    this.flipPanoramaUvHorizontally(this.geometry);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide
    });
    this.material.toneMapped = false;
    this.sphere = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.sphere);

    this.textureLoader = new THREE.TextureLoader();
  }

  configureColorManagement(THREE) {
    if (THREE.NoToneMapping !== undefined) {
      this.renderer.toneMapping = THREE.NoToneMapping;
    }

    if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    if ('outputEncoding' in this.renderer && THREE.sRGBEncoding) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }
  }

  populateSelect() {
    PANORAMAS.forEach((panorama, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = panorama.title;
      this.select.appendChild(option);
    });
  }

  bindUi() {
    this.select.addEventListener('change', () => {
      this.loadPanorama(Number(this.select.value));
    });

    this.previousButton.addEventListener('click', () => {
      this.loadPanorama(wrapIndex(this.currentIndex - 1, PANORAMAS.length));
    });

    this.nextButton.addEventListener('click', () => {
      this.loadPanorama(wrapIndex(this.currentIndex + 1, PANORAMAS.length));
    });

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => {
      window.setTimeout(() => this.resize(), 200);
    });

    window.addEventListener('popstate', () => {
      this.loadPanorama(this.getInitialPanoramaIndex(), { updateUrl: false });
    });
  }

  initControls() {
    const controlOptions = {
      element: this.viewer,
      camera: this.camera,
      rotateBy: (deltaYaw, deltaPitch) => this.rotateBy(deltaYaw, deltaPitch),
      setFov: (nextFov) => this.setFov(nextFov),
      setGyroRotation: (yaw, pitch) => this.setGyroRotation(yaw, pitch),
      setGyroResetHandler: (handler) => this.setGyroResetHandler(handler),
      setStatus: (message) => this.setStatus(message),
      gyroButton: this.gyroButton
    };

    if (isMobileDevice()) {
      initMobileControls(controlOptions);
      return;
    }

    initDesktopControls(controlOptions);
    this.gyroButton.hidden = true;
  }

  loadPanorama(index, options = {}) {
    const { updateUrl = true } = options;
    const nextIndex = wrapIndex(index, PANORAMAS.length);
    const panorama = PANORAMAS[nextIndex];

    if (updateUrl) {
      this.updateSceneUrl(nextIndex);
    }

    this.textureLoader.load(
      panorama.src,
      (texture) => {
        this.configureTextureColorSpace(texture);

        if (this.currentTexture) {
          this.currentTexture.dispose();
        }

        this.currentTexture = texture;
        this.material.map = texture;
        this.material.needsUpdate = true;
        this.currentIndex = nextIndex;
        this.select.value = String(nextIndex);
        this.applyPanoramaInitialYaw(panorama);
      },
      undefined,
      () => {
        console.error(`Erro ao carregar ${panorama.title}`);
      }
    );
  }

  getInitialPanoramaIndex() {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get(SCENE_QUERY_PARAM);

    if (!scene) {
      return 0;
    }

    const sceneIndex = PANORAMAS.findIndex((panorama) => panorama.id === scene);

    if (sceneIndex !== -1) {
      return sceneIndex;
    }

    const numericIndex = Number(scene);

    if (Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < PANORAMAS.length) {
      return numericIndex;
    }

    return 0;
  }

  updateSceneUrl(index) {
    const panorama = PANORAMAS[index];

    if (!panorama || !window.history || !window.history.pushState) {
      return;
    }

    const url = new URL(window.location.href);

    if (url.searchParams.get(SCENE_QUERY_PARAM) === panorama.id) {
      return;
    }

    url.searchParams.set(SCENE_QUERY_PARAM, panorama.id);
    window.history.pushState({ scene: panorama.id }, '', url);
  }

  configureTextureColorSpace(texture) {
    if ('colorSpace' in texture && this.THREE.SRGBColorSpace) {
      texture.colorSpace = this.THREE.SRGBColorSpace;
    }

    if (this.THREE.sRGBEncoding) {
      texture.encoding = this.THREE.sRGBEncoding;
    }

    texture.needsUpdate = true;
  }

  degreesToRadians(degrees = 0) {
    const yaw = Number(degrees);

    if (!Number.isFinite(yaw)) {
      return 0;
    }

    return yaw * Math.PI / 180;
  }

  flipPanoramaUvHorizontally(geometry) {
    const uv = geometry.attributes.uv;

    for (let index = 0; index < uv.count; index += 1) {
      uv.setX(index, 1 - uv.getX(index));
    }

    uv.needsUpdate = true;
  }

  rotateBy(deltaYaw, deltaPitch) {
    this.manualYaw += deltaYaw;
    this.manualPitch = clamp(this.manualPitch + deltaPitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  applyPanoramaInitialYaw(panorama) {
    if (panorama.yaw === undefined || panorama.yaw === null) {
      return;
    }

    this.manualYaw = this.degreesToRadians(panorama.yaw);
    this.resetGyroForScene();
  }

  resetGyroForScene() {
    this.gyroYaw = 0;
    this.gyroPitch = 0;

    if (this.resetGyroCalibration) {
      this.resetGyroCalibration();
    }
  }

  setGyroRotation(yaw, pitch) {
    this.gyroYaw = yaw;
    this.gyroPitch = pitch;
  }

  setGyroResetHandler(handler) {
    this.resetGyroCalibration = handler;
  }

  setFov(nextFov) {
    this.camera.fov = clamp(nextFov, MIN_FOV, MAX_FOV);
    this.camera.updateProjectionMatrix();
  }

  applyCameraRotation() {
    this.camera.rotation.y = this.manualYaw + this.gyroYaw;
    this.camera.rotation.x = clamp(this.manualPitch + this.gyroPitch, -PITCH_LIMIT, PITCH_LIMIT);
    this.camera.rotation.z = 0;
  }

  resize() {
    const width = this.viewer.clientWidth || window.innerWidth || 1;
    const height = this.viewer.clientHeight || window.innerHeight || 1;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.applyCameraRotation();
    this.renderer.render(this.scene, this.camera);
  }

  setStatus(message) {
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && !this.isLocalHttps()) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .catch(console.error);
      });
    }
  }

  isLocalHttps() {
    if (window.location.protocol !== 'https:') {
      return false;
    }

    const hostname = window.location.hostname;

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  }
}

const app = new Tour360App();
app.init();
