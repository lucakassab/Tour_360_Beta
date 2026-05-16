import {
  clamp,
  degreesToRadians,
  supportsDeviceOrientation
} from './shared/utils.js?v=16';

const ROTATE_SPEED = 0.005;
const SENSOR_SMOOTHING = 0.18;
const MAX_SENSOR_PITCH = Math.PI * 0.47;

export function initMobileControls(options) {
  const {
    element,
    rotateBy,
    setGyroRotation,
    setGyroResetHandler,
    setStatus,
    gyroButton
  } = options;

  const THREE = window.THREE;
  const zee = THREE ? new THREE.Vector3(0, 0, 1) : null;
  const euler = THREE ? new THREE.Euler() : null;
  const q0 = THREE ? new THREE.Quaternion() : null;
  const q1 = THREE ? new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)) : null;
  const sensorQuaternion = THREE ? new THREE.Quaternion() : null;
  const forwardDirection = THREE ? new THREE.Vector3() : null;

  let isTouching = false;
  let lastX = 0;
  let lastY = 0;
  let gyroActive = false;
  let hasSensorSample = false;
  let referenceYaw = 0;
  let referencePitch = 0;
  let smoothedYaw = 0;
  let smoothedPitch = 0;

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
    if (gyroActive) {
      deactivateGyro();
      return;
    }

    if (!THREE || !supportsDeviceOrientation()) {
      setStatus('Girosc\u00f3pio n\u00e3o dispon\u00edvel');
      return;
    }

    const orientationEvent = window.DeviceOrientationEvent;

    if (typeof orientationEvent.requestPermission === 'function') {
      try {
        const permission = await orientationEvent.requestPermission();

        if (permission !== 'granted') {
          setStatus('Permiss\u00e3o do girosc\u00f3pio negada');
          return;
        }
      } catch (error) {
        setStatus('Permiss\u00e3o do girosc\u00f3pio negada');
        return;
      }
    }

    activateGyro();
    resetGyroCalibration();
    setStatus('Girosc\u00f3pio ativado');
  }

  function activateGyro() {
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    gyroActive = true;
    syncGyroButton();
  }

  function deactivateGyro() {
    window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    gyroActive = false;
    resetGyroCalibration();
    syncGyroButton();
    setStatus('Girosc\u00f3pio desativado');
  }

  function resetGyroCalibration() {
    hasSensorSample = false;
    smoothedYaw = 0;
    smoothedPitch = 0;
    setGyroRotation(0, 0);
  }

  function syncGyroButton() {
    if (!gyroButton) {
      return;
    }

    gyroButton.textContent = gyroActive ? 'Desativar girosc\u00f3pio' : 'Ativar girosc\u00f3pio';
    gyroButton.setAttribute('aria-pressed', gyroActive ? 'true' : 'false');
  }

  function handleDeviceOrientation(event) {
    if (!gyroActive) {
      return;
    }

    if (event.alpha === null && event.beta === null && event.gamma === null) {
      setStatus('Girosc\u00f3pio n\u00e3o dispon\u00edvel');
      return;
    }

    const sensorRotation = getSensorYawPitch(event);

    if (!hasSensorSample) {
      referenceYaw = sensorRotation.yaw;
      referencePitch = sensorRotation.pitch;
      smoothedYaw = 0;
      smoothedPitch = 0;
      hasSensorSample = true;
      setGyroRotation(0, 0);
      return;
    }

    const targetYaw = normalizeAngle(sensorRotation.yaw - referenceYaw);
    const targetPitch = clamp(sensorRotation.pitch - referencePitch, -MAX_SENSOR_PITCH, MAX_SENSOR_PITCH);

    smoothedYaw += normalizeAngle(targetYaw - smoothedYaw) * SENSOR_SMOOTHING;
    smoothedPitch += (targetPitch - smoothedPitch) * SENSOR_SMOOTHING;

    setGyroRotation(smoothedYaw, smoothedPitch);
  }

  function getSensorYawPitch(event) {
    const alpha = degreesToRadians(event.alpha || 0);
    const beta = degreesToRadians(event.beta || 0);
    const gamma = degreesToRadians(event.gamma || 0);
    const screenOrientation = degreesToRadians(getScreenAngle());

    euler.set(beta, alpha, -gamma, 'YXZ');
    sensorQuaternion.setFromEuler(euler);
    sensorQuaternion.multiply(q1);
    sensorQuaternion.multiply(q0.setFromAxisAngle(zee, -screenOrientation));

    forwardDirection.set(0, 0, -1).applyQuaternion(sensorQuaternion);

    return {
      yaw: Math.atan2(-forwardDirection.x, -forwardDirection.z),
      pitch: Math.asin(clamp(forwardDirection.y, -1, 1))
    };
  }

  function normalizeAngle(angle) {
    let normalized = angle;

    while (normalized <= -Math.PI) {
      normalized += Math.PI * 2;
    }

    while (normalized > Math.PI) {
      normalized -= Math.PI * 2;
    }

    return normalized;
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
  window.addEventListener('orientationchange', resetGyroCalibration);

  if (gyroButton) {
    gyroButton.addEventListener('click', handleGyroClick);
    syncGyroButton();
  }

  if (setGyroResetHandler) {
    setGyroResetHandler(resetGyroCalibration);
  }

  setStatus('Arraste para olhar ao redor');
}
