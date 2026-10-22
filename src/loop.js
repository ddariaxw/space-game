export function createLoop({ update, render, onFpsUpdate }) {
  let lastTime = performance.now();
  let accumulator = 0;
  const timeStep = 1 / 60;

  let framesCount = 0;
  let stepsCount = 0;
  let lastFpsTimer = performance.now();

  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    if (dt > 0.25) dt = 0.25;

    accumulator += dt;

    while (accumulator >= timeStep) {
      update(timeStep);
      stepsCount++;
      accumulator -= timeStep;
    }

    const alpha = accumulator / timeStep;
    render(alpha);
    framesCount++;

    if (now - lastFpsTimer >= 1000) {
      onFpsUpdate({
        stepsPerSec: stepsCount,
        framesPerSec: framesCount,
        frameMs: (1000 / framesCount).toFixed(2)
      });
      stepsCount = 0;
      framesCount = 0;
      lastFpsTimer = now;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}