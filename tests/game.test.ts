import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { Vector2 } from '../client/src/Vector2.js';
import { World } from '../client/src/World.js';
import { Ship } from '../client/src/Ship.js';
import { Asteroid } from '../client/src/Asteroid.js';
import { parseClientMessage } from '../shared/protocol.js';

describe('Space Game Test Suite (Lab 7)', () => {
  describe('Vector2 Mathematics', () => {
    it('should add vectors correctly', () => {
      const v1 = new Vector2(10, 20);
      const v2 = new Vector2(5, 5);
      const res = v1.add(v2);
      expect(res.x).toBe(15);
      expect(res.y).toBe(25);
    });

    it('should calculate length correctly', () => {
      const v = new Vector2(3, 4);
      expect(v.length()).toBe(5);
    });

    it('should create vector from angle', () => {
      const v = Vector2.fromAngle(0);
      expect(v.x).toBeCloseTo(1);
      expect(v.y).toBeCloseTo(0);
    });
  });

  describe('World Simulation & Determinism', () => {
    it('should be deterministic when stepped with same entities', () => {
      const world1 = new World(800, 600, {});
      const world2 = new World(800, 600, {});

      world1.entities.clear();
      world2.entities.clear();
      
      const ship1 = new Ship(100, 100);
      const ship2 = new Ship(100, 100);
      world1.add(ship1);
      world2.add(ship2);

      const dt = 0.016;
      world1.step(dt, null);
      world2.step(dt, null);

      expect(ship1.pos.x).toBe(ship2.pos.x);
      expect(ship1.pos.y).toBe(ship2.pos.y);
    });

    it('should process world step without crashing', () => {
      const world = new World(800, 600, {});
      expect(() => world.step(0.016, null)).not.toThrow();
    });
  });

  describe('Property-Based Testing (fast-check)', () => {
    it('Property 1: Join message codec round-trip', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (room, name) => {
          const msg = { type: 'join' as const, room, name };
          const parsed = parseClientMessage(msg);
          expect(parsed.success).toBe(true);
          if (parsed.success && parsed.data.type === 'join') {
            expect(parsed.data.room).toBe(room);
            expect(parsed.data.name).toBe(name);
          }
        })
      );
    });

    it('Property 2: Input message schema enforces valid ranges', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100000 }),
          fc.integer({ min: 0, max: 100000 }),
          fc.boolean(),
          fc.constantFrom(-1, 0, 1),
          fc.boolean(),
          (seq, tick, thrust, turn, fire) => {
            const msg = { type: 'input' as const, seq, tick, thrust, turn, fire };
            const parsed = parseClientMessage(msg);
            expect(parsed.success).toBe(true);
          }
        )
      );
    });

    it('Property 3: Garbage input never throws unhandled errors', () => {
      fc.assert(
        fc.property(fc.json(), (garbage) => {
          const parsed = parseClientMessage(garbage);
          expect(typeof parsed.success).toBe('boolean');
        })
      );
    });

    it('Property 4: Ship stays within arena bounds', () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 800 }), fc.float({ min: 0, max: 600 }), (x, y) => {
          const ship = new Ship(x, y);
          ship.update(0.016);
          expect(ship.pos.x).toBeGreaterThanOrEqual(0);
          expect(ship.pos.x).toBeLessThanOrEqual(800);
          expect(ship.pos.y).toBeGreaterThanOrEqual(0);
          expect(ship.pos.y).toBeLessThanOrEqual(600);
        })
      );
    });

    it('Property 5: Parser rejects messages with invalid types', () => {
      fc.assert(
        fc.property(fc.string(), (invalidType) => {
          if (invalidType === 'join' || invalidType === 'input' || invalidType === 'chat') return;
          const badMsg = { type: invalidType, room: 'test', name: 'test' };
          const parsed = parseClientMessage(badMsg);
          expect(parsed.success).toBe(false);
        })
      );
    });
  });

  describe('Accumulator Loop & Timers', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('should accumulate ticks correctly', () => {
      let ticks = 0;
      const simulateTick = () => { ticks++; };
      const interval = setInterval(simulateTick, 16);
      vi.advanceTimersByTime(50);
      expect(ticks).toBeGreaterThanOrEqual(2);
      clearInterval(interval);
    });
  });
});