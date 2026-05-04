export function isMobileDevice() {
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return hasTouch || mobileUserAgent;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function wrapIndex(index, length) {
  if (length <= 0) {
    return 0;
  }

  return ((index % length) + length) % length;
}

export function supportsDeviceOrientation() {
  return typeof window.DeviceOrientationEvent !== 'undefined';
}

export function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

export function degreesToRadians(value) {
  return value * (Math.PI / 180);
}
