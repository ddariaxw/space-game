import { Entity } from './Entity.js';
import { Vector2 } from './Vector2.js';

export class Bullet extends Entity {
  constructor(x, y, angle) {
    super(x, y, 3, 'bullet');
    this.speed = 500;
    this.vel = Vector2.fromAngle(angle).scale(this.speed);
    this.ttl = 2.0;
  }

  reset(x, y, angle) {
    this.pos.x = x;
    this.pos.y = y;
    this.vel = Vector2.fromAngle(angle).scale(this.speed);
    this.ttl = 2.0;
    this.markedForRemoval = false;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.markedForRemoval = true;
  }
}

export class BulletPool {
  constructor(maxSize = 100) {
    this.pool = [];
    this.maxSize = maxSize;
  }

  get(x, y, angle) {
    if (this.pool.length > 0) {
      const bullet = this.pool.pop();
      bullet.reset(x, y, angle);
      return bullet;
    }
    return new Bullet(x, y, angle);
  }

  release(bullet) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(bullet);
    }
  }
}