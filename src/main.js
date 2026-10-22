import { World } from './World.js';
import { Ship } from './Ship.js';
import { createInput } from './input.js';
import { createLoop } from './loop.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.scale(dpr, dpr);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const world = new World(window.innerWidth, window.innerHeight);
const player = new Ship(window.innerWidth / 2, window.innerHeight / 2);
world.add(player);

const input = createInput();

const hudSteps = document.getElementById('steps');
const hudFrames = document.getElementById('frames');
const hudFTime = document.getElementById('ftime');

createLoop({
  update: (dt) => {
    world.step(dt, input);
  },
  render: (alpha) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    world.render(ctx, alpha);
  },
  onFpsUpdate: (stats) => {
    hudSteps.innerText = `steps/s: ${stats.stepsPerSec}`;
    hudFrames.innerText = `frames/s: ${stats.framesPerSec}`;
    hudFTime.innerText = `frame ms: ${stats.frameMs} ms`;
  }
});
