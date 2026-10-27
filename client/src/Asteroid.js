import { Entity } from './Entity.js';
import { Vector2 } from './Vector2.js';

export class Asteroid extends Entity {
  constructor(x, y) {
    super(x, y, 20, 'asteroid');
    const angle = Math.random() * Math.PI * 2;
    this.vel = Vector2.fromAngle(angle).scale(50 + Math.random() * 50);
  }

  update(dt, worldWidth, worldHeight) {
    super.update(dt);
    if (this.pos.x < 0) this.pos.x = worldWidth;
    if (this.pos.x > worldWidth) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = worldHeight;
    if (this.pos.y > worldHeight) this.pos.y = 0;
  }

  render(ctx, alpha) {
    const renderX = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha;
    const renderY = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha;

    ctx.save();
    ctx.translate(renderX, renderY);
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}