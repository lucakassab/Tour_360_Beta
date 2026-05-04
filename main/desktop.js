const ROTATE_SPEED = 0.0045;
const FOV_SPEED = 0.035;

export function initDesktopControls(options) {
  const {
    element,
    camera,
    rotateBy,
    setFov,
    setStatus
  } = options;

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  function handleMouseDown(event) {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    element.setPointerCapture?.(event.pointerId);
  }

  function handleMouseMove(event) {
    if (!isDragging) {
      return;
    }

    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    rotateBy(-deltaX * ROTATE_SPEED, -deltaY * ROTATE_SPEED);
  }

  function stopDragging(event) {
    isDragging = false;
    element.releasePointerCapture?.(event.pointerId);
  }

  function handleWheel(event) {
    event.preventDefault();
    setFov(camera.fov + event.deltaY * FOV_SPEED);
  }

  element.addEventListener('pointerdown', handleMouseDown);
  element.addEventListener('pointermove', handleMouseMove);
  element.addEventListener('pointerup', stopDragging);
  element.addEventListener('pointercancel', stopDragging);
  element.addEventListener('wheel', handleWheel, { passive: false });

  setStatus('Arraste para olhar ao redor');
}
