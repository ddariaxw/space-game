import { Ship } from './Ship.js';

export class Bot extends Ship {
  constructor(x, y) {
    super(x, y);
    this.isBot = true;
    this.changeDirTimer = 0;
  }

  update(dt, world) {
    super.update(dt);
    
    this.changeDirTimer += dt;
    if (this.changeDirTimer > 2.0) {
      this.turn = Math.random() > 0.5 ? 1 : -1;
      this.thrust = Math.random() > 0.3 ? 1 : 0;
      this.changeDirTimer = 0;
    }

    // Простий обхід меж арени
    if (this.pos.x < 50 || this.pos.x > 750 || this.pos.y < 50 || this.pos.y > 550) {
      this.turn = 1;
      this.thrust = 1;
    }
  }
}