import { World } from './World.js';
import { Ship } from './Ship.js';
import { createInput } from './input.js';
import { createLoop } from './loop.js';
import { loadAll } from './assets/loader.js';

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

function renderLoadingScreen(progress) {
  ctx.fillStyle = '#0b0d17';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Завантаження асетів гри...', window.innerWidth / 2, window.innerHeight / 2 - 40);

  const barWidth = 400;
  const barHeight = 20;
  const barX = (window.innerWidth - barWidth) / 2;
  const barY = window.innerHeight / 2;

  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = '#00ffcc';
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);

  ctx.fillText(`${Math.round(progress * 100)}%`, window.innerWidth / 2, barY + 45);
}

async function initGame() {
  const controller = new AbortController();

  try {
    renderLoadingScreen(0);

    const assets = await loadAll('/src/assets/manifest.json', {
      onProgress: (progress) => {
        renderLoadingScreen(progress);
      },
      signal: controller.signal
    });

    console.log('Усі асети успішно завантажено:', assets);

    startSpaceGame(assets);

  } catch (error) {
    console.error('Помилка під час завантаження асетів:', error);
    ctx.fillStyle = '#ff3366';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Помилка завантаження! Перевірте консоль.', window.innerWidth / 2, window.innerHeight / 2);
  }
}

function startSpaceGame(assets) {
  const world = new World(window.innerWidth, window.innerHeight, assets.images);
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
}

initGame();