import { Entity } from './Entity.js';
import { Vector2 } from './Vector2.js';

export class Bullet extends Entity {
  constructor(x, y, angle) {
    super(x, y, 3, 'bullet');
    this.speed = 500;
    this.vel = Vector2.fromAngle(angle).scale(this.speed);
    this.ttl = 2.0;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.markedForRemoval = true;
  }
}