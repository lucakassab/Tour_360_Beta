import {
  clamp,
  isMobileDevice,
  setText,
  wrapIndex
} from './shared/utils.js';
import { initDesktopControls } from './desktop.js';
import { initMobileControls } from './mobile.js';

const PANORAMAS = [
  {
    title: 'Panorama 01',
    src: './assets/panoramas/panorama_01.jpg'
  },
  {
    title: 'Panorama 02',
    src: './assets/panoramas/panorama_02.jpg'
  },
  {
    title: 'Panorama 03',
    src: './assets/panoramas/panorama_03.jpg'
  },
  {
    title: 'Panorama 04',
    src: './assets/panoramas/panorama_04.jpg'
  }
];

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
    this.status = document.getElementById('status');

    this.currentIndex = 0;
    this.currentTexture = null;
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.gyroYaw = 0;
    this.gyroPitch = 0;
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
    this.loadPanorama(0);
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
    this.viewer.appendChild(this.renderer.domElement);

    this.geometry = new THREE.SphereGeometry(500, 64, 40);
    this.applyMonoStereoUvCrop(this.geometry);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide
    });
    this.sphere = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.sphere);

    this.textureLoader = new THREE.TextureLoader();
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
  }

  initControls() {
    const controlOptions = {
      element: this.viewer,
      camera: this.camera,
      rotateBy: (deltaYaw, deltaPitch) => this.rotateBy(deltaYaw, deltaPitch),
      setFov: (nextFov) => this.setFov(nextFov),
      setGyroRotation: (yaw, pitch) => this.setGyroRotation(yaw, pitch),
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

  loadPanorama(index) {
    const nextIndex = wrapIndex(index, PANORAMAS.length);
    const panorama = PANORAMAS[nextIndex];

    this.setStatus(`Carregando ${panorama.title}...`);

    this.textureLoader.load(
      panorama.src,
      (texture) => {
        if (this.THREE.sRGBEncoding) {
          texture.encoding = this.THREE.sRGBEncoding;
        }

        if (this.currentTexture) {
          this.currentTexture.dispose();
        }

        this.currentTexture = texture;
        this.material.map = texture;
        this.material.needsUpdate = true;
        this.currentIndex = nextIndex;
        this.select.value = String(nextIndex);
        this.setStatus(`${panorama.title} carregado`);
      },
      undefined,
      () => {
        this.setStatus(`Erro ao carregar ${panorama.title}`);
      }
    );
  }

  applyMonoStereoUvCrop(geometry) {
    const uv = geometry.attributes.uv;

    // Top-down stereo stores one eye per vertical half; use the upper eye for mono 2D.
    for (let index = 0; index < uv.count; index += 1) {
      uv.setY(index, 0.5 + uv.getY(index) * 0.5);
    }

    uv.needsUpdate = true;
  }

  rotateBy(deltaYaw, deltaPitch) {
    this.manualYaw += deltaYaw;
    this.manualPitch = clamp(this.manualPitch + deltaPitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  setGyroRotation(yaw, pitch) {
    this.gyroYaw = yaw;
    this.gyroPitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  setFov(nextFov) {
    this.camera.fov = clamp(nextFov, MIN_FOV, MAX_FOV);
    this.camera.updateProjectionMatrix();
  }

  applyCameraRotation() {
    this.camera.rotation.y = this.manualYaw + this.gyroYaw;
    this.camera.rotation.x = clamp(this.manualPitch + this.gyroPitch, -PITCH_LIMIT, PITCH_LIMIT);
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
    setText(this.status, message);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .catch(console.error);
      });
    }
  }
}

const app = new Tour360App();
app.init();
