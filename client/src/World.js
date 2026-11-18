import { Asteroid } from './Asteroid.js';
import { Bot } from './Bot.js';

export class World {
  constructor(width, height, images) {
    this.width = width;
    this.height = height;
    this.images = images || {};
    this.entities = new Map();
    this.nextEntityId = 1;

    for (let i = 0; i < 5; i++) {
      const asteroid = new Asteroid(Math.random() * width, Math.random() * height);
      this.add(asteroid);
    }

    // Додаємо ботів
    for (let i = 0; i < 2; i++) {
      const bot = new Bot(200 + Math.random() * 400, 200 + Math.random() * 200);
      this.add(bot);
    }
  }

  add(entity) {
    if (!entity.id) {
      entity.id = this.nextEntityId++;
    }
    this.entities.set(entity.id, entity);
    return entity.id;
  }

  step(dt, input) {
    for (const entity of this.entities.values()) {
      if (entity.kind === 'ship' && input) {
        entity.updateInput(input, dt, this.width, this.height);
        if (input.justPressed('Space')) {
          const bullet = entity.fire();
          this.add(bullet);
        }
      } else if (entity.isBot) {
        entity.update(dt, this);
      } else if (entity.kind === 'asteroid') {
        entity.update(dt, this.width, this.height);
      } else {
        entity.update(dt);
      }
    }

    const entitiesArr = Array.from(this.entities.values());
    for (let i = 0; i < entitiesArr.length; i++) {
      for (let j = i + 1; j < entitiesArr.length; j++) {
        const a = entitiesArr[i];
        const b = entitiesArr[j];

        if (a.markedForRemoval || b.markedForRemoval) continue;

        const dist = a.pos.sub(b.pos).length();
        if (dist < a.radius + b.radius) {
          if ((a.kind === 'bullet' && b.kind === 'asteroid') || (a.kind === 'asteroid' && b.kind === 'bullet')) {
            a.damage(100);
            b.damage(100);
          }
        }
      }
    }

    for (const [id, entity] of this.entities.entries()) {
      if (entity.markedForRemoval) {
        this.entities.delete(id);
      }
    }
  }

  render(ctx, alpha) {
    for (const entity of this.entities.values()) {
      entity.render(ctx, alpha, this.images);
    }
  }
}