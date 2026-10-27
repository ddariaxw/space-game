export function createInput() {
  const keys = new Set();

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  return {
    isDown(code) {
      return keys.has(code);
    },
    justPressed(code) {
      if (keys.has(code)) {
        keys.delete(code);
        return true;
      }
      return false;
    }
  };
}