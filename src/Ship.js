import { Entity } from './Entity.js';
import { Vector2 } from './Vector2.js';
import { Bullet } from './Bullet.js';

export class Ship extends Entity {
  constructor(x, y) {
    super(x, y, 15, 'ship');
    this.angle = 0;
    this.rotationSpeed = Math.PI * 1.5;
    this.acceleration = 300;
    this.friction = 0.98;
  }

  fire = () => {
    return new Bullet(this.pos.x, this.pos.y, this.angle);
  };

  updateInput(input, dt, worldWidth, worldHeight) {
    // Поворот вліво/вправо
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) {
      this.angle -= this.rotationSpeed * dt;
    }
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) {
      this.angle += this.rotationSpeed * dt;
    }

    // Рух вперед (W / стрілочка вгору)
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) {
      const dir = Vector2.fromAngle(this.angle);
      this.vel = this.vel.add(dir.scale(this.acceleration * dt));
    }

    // Рух назад (S / стрілочка вниз) — тепер можна здавати назад і опускатися вниз!
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) {
      const dir = Vector2.fromAngle(this.angle);
      this.vel = this.vel.sub(dir.scale(this.acceleration * dt * 0.5));
    }

    this.vel = this.vel.scale(this.friction);
    super.update(dt);

    // Жорсткі межі екрана (щоб корабель не вилітав за краї і не губився внизу)
    const margin = this.radius;
    if (this.pos.x < margin) { this.pos.x = margin; this.vel.x *= -0.5; }
    if (this.pos.x > worldWidth - margin) { this.pos.x = worldWidth - margin; this.vel.x *= -0.5; }
    if (this.pos.y < margin) { this.pos.y = margin; this.vel.y *= -0.5; }
    if (this.pos.y > worldHeight - margin) { this.pos.y = worldHeight - margin; this.vel.y *= -0.5; }
  }

  render(ctx, alpha) {
    const renderX = this.prevPos.x + (this.pos.x - this.prevPos.x) * alpha;
    const renderY = this.prevPos.y + (this.pos.y - this.prevPos.y) * alpha;

    ctx.save();
    ctx.translate(renderX, renderY);
    ctx.rotate(this.angle);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}