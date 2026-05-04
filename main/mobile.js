import {
  degreesToRadians,
  supportsDeviceOrientation
} from './shared/utils.js';

const ROTATE_SPEED = 0.005;
const SENSOR_SMOOTHING = 0.18;

export function initMobileControls(options) {
  const {
    element,
    rotateBy,
    setGyroQuaternion,
    setStatus,
    gyroButton
  } = options;

  const THREE = window.THREE;
  const zee = THREE ? new THREE.Vector3(0, 0, 1) : null;
  const euler = THREE ? new THREE.Euler() : null;
  const q0 = THREE ? new THREE.Quaternion() : null;
  const q1 = THREE ? new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)) : null;
  const sensorQuaternion = THREE ? new THREE.Quaternion() : null;
  const smoothedQuaternion = THREE ? new THREE.Quaternion() : null;

  let isTouching = false;
  let lastX = 0;
  let lastY = 0;
  let gyroActive = false;
  let hasSensorSample = false;

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
    if (!THREE || !supportsDeviceOrientation()) {
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
      hasSensorSample = false;
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

    const alpha = degreesToRadians(event.alpha || 0);
    const beta = degreesToRadians(event.beta || 0);
    const gamma = degreesToRadians(event.gamma || 0);
    const screenOrientation = degreesToRadians(getScreenAngle());

    euler.set(beta, alpha, -gamma, 'YXZ');
    sensorQuaternion.setFromEuler(euler);
    sensorQuaternion.multiply(q1);
    sensorQuaternion.multiply(q0.setFromAxisAngle(zee, -screenOrientation));

    if (!hasSensorSample) {
      smoothedQuaternion.copy(sensorQuaternion);
      hasSensorSample = true;
    } else {
      smoothedQuaternion.slerp(sensorQuaternion, SENSOR_SMOOTHING);
    }

    setGyroQuaternion(smoothedQuaternion);
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
