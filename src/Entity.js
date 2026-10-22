import { Vector2 } from './Vector2.js';

export class Entity {
  static #counter = 0;
  #id = ++Entity.#counter;
  #hp = 100;

  constructor(x, y, radius, kind) {
    this.pos = new Vector2(x, y);
    this.prevPos = new Vector2(x, y);
    this.vel = new Vector2(0, 0);
    this.radius = radius;
    this.kind = kind;
    this.markedForRemoval = false;
  }

  get id() { return this.#id; }
  get hp() { return this.#hp; }

  damage(amount) {
    this.#hp = Math.max(0, this.#hp - amount);
    if (this.#hp === 0) this.markedForRemoval = true;
  }

  update(dt) {
    this.prevPos = this.pos;
    this.pos = this.pos.add(this.vel.scale(dt));
  }

  render(ctx, alpha) {
    const renderX = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha;
    const renderY = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha;

    ctx.save();
    ctx.translate(renderX, renderY);
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}