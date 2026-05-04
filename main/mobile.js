import {
  clamp,
  degreesToRadians,
  supportsDeviceOrientation
} from './shared/utils.js';

const ROTATE_SPEED = 0.005;
const PITCH_LIMIT = degreesToRadians(85);

export function initMobileControls(options) {
  const {
    element,
    camera,
    rotateBy,
    setGyroRotation,
    setStatus,
    gyroButton
  } = options;

  let isTouching = false;
  let lastX = 0;
  let lastY = 0;
  let gyroActive = false;

  function handleTouchStart(event) {
    if (!event.touches.length) {
      return;
    }

    isTouching = true;
    lastX = event.touches[0].clientX;
    lastY = event.touches[0].clientY;
  }

  function handleTouchMove(event) {
    if (!isTouching || !event.touches.length) {
      return;
    }

    event.preventDefault();

    const touch = event.touches[0];
    const deltaX = touch.clientX - lastX;
    const deltaY = touch.clientY - lastY;

    lastX = touch.clientX;
    lastY = touch.clientY;

    rotateBy(-deltaX * ROTATE_SPEED, -deltaY * ROTATE_SPEED);
  }

  function handleTouchEnd() {
    isTouching = false;
  }

  async function handleGyroClick() {
    if (!supportsDeviceOrientation()) {
      setStatus('Giroscópio não disponível');
      return;
    }

    const orientationEvent = window.DeviceOrientationEvent;

    if (typeof orientationEvent.requestPermission === 'function') {
      try {
        const permission = await orientationEvent.requestPermission();

        if (permission !== 'granted') {
          setStatus('Permissão do giroscópio negada');
          return;
        }
      } catch (error) {
        setStatus('Permissão do giroscópio negada');
        return;
      }
    }

    if (!gyroActive) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      gyroActive = true;
    }

    setStatus('Giroscópio ativado');
  }

  function handleDeviceOrientation(event) {
    if (!gyroActive) {
      return;
    }

    if (event.alpha === null && event.beta === null && event.gamma === null) {
      setStatus('Giroscópio não disponível');
      return;
    }

    const screenAngle = getScreenAngle();
    const isLandscape = Math.abs(screenAngle) === 90;
    const alpha = event.alpha || 0;
    const beta = event.beta || 0;
    const gamma = event.gamma || 0;
    const pitchDegrees = isLandscape ? gamma : beta - 90;

    const yaw = degreesToRadians(-alpha + screenAngle);
    const pitch = clamp(degreesToRadians(pitchDegrees), -PITCH_LIMIT, PITCH_LIMIT);

    setGyroRotation(yaw, pitch);
    camera.updateProjectionMatrix();
  }

  function getScreenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }

    return typeof window.orientation === 'number' ? window.orientation : 0;
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('touchcancel', handleTouchEnd);

  if (gyroButton) {
    gyroButton.addEventListener('click', handleGyroClick);
  }

  setStatus('Arraste para olhar ao redor');
}
