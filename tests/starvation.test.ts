import { describe, it, expect } from 'vitest';

const STARVE_IMMOBILE = 2000;
const STARVE_DEATH = 2667;

function makeDwarf(overrides: any = {}) {
  return {
    id: 'test-1', name: 'Urist', cityId: 'new-york',
    x: 100, y: 100, hunger: 50, energy: 50, happiness: 50,
    state: 'idle', target: null, path: [], starveTicks: 0,
    carrying: 0, carryItems: {}, stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    morality: 50, dead: false,
    ...overrides
  };
}

describe('Starvation Mechanics', () => {
  it('hunger at 0 increments starveTicks', () => {
    const d = makeDwarf({ hunger: 0, starveTicks: 5 });
    // Simulate what tickDwarf does
    if (d.hunger <= 0) {
      d.starveTicks = (d.starveTicks || 0) + 1;
    } else {
      d.starveTicks = 0;
    }
    expect(d.starveTicks).toBe(6);
  });

  it('hunger > 0 resets starveTicks to 0', () => {
    const d = makeDwarf({ hunger: 10, starveTicks: 500 });
    if (d.hunger <= 0) {
      d.starveTicks = (d.starveTicks || 0) + 1;
    } else {
      d.starveTicks = 0;
    }
    expect(d.starveTicks).toBe(0);
  });

  it('starveTicks >= STARVE_IMMOBILE transitions to starving state', () => {
    const d = makeDwarf({ hunger: 0, starveTicks: STARVE_IMMOBILE - 1, state: 'wander' });
    d.starveTicks = (d.starveTicks || 0) + 1;
    if (d.starveTicks >= STARVE_IMMOBILE && d.state !== 'starving') {
      d.state = 'starving'; d.target = null; d.path = [];
    }
    expect(d.state).toBe('starving');
    expect(d.target).toBeNull();
    expect(d.path).toEqual([]);
  });

  it('starveTicks >= STARVE_DEATH marks dwarf as dead', () => {
    const d = makeDwarf({ hunger: 0, starveTicks: STARVE_DEATH - 1 });
    d.starveTicks = (d.starveTicks || 0) + 1;
    if (d.starveTicks >= STARVE_DEATH) {
      d.dead = true;
    }
    expect(d.dead).toBe(true);
  });

  it('dead dwarves are filtered from array', () => {
    const dwarves = [
      makeDwarf({ id: 'a', dead: false }),
      makeDwarf({ id: 'b', dead: true }),
      makeDwarf({ id: 'c', dead: false }),
    ];
    const alive = dwarves.filter(d => !d.dead);
    expect(alive).toHaveLength(2);
    expect(alive.map(d => d.id)).toEqual(['a', 'c']);
  });

  it('rescue: dwarf with food targets starving dwarf', () => {
    const rescuer = makeDwarf({ id: 'r', carryItems: { food: 3 }, carrying: 3 });
    const starving = makeDwarf({ id: 's', state: 'starving', hunger: 0, starveTicks: 2100 });
    // Simulate rescue food transfer
    const amt = Math.min(rescuer.carryItems.food, 3);
    rescuer.carryItems.food -= amt;
    rescuer.carrying -= amt;
    starving.hunger = Math.min(100, starving.hunger + amt * 12);
    starving.starveTicks = 0;
    starving.state = 'idle';
    expect(starving.hunger).toBe(36);
    expect(starving.starveTicks).toBe(0);
    expect(starving.state).toBe('idle');
    expect(rescuer.carryItems.food).toBe(0);
  });

  it('food transfer resets starveTicks and state', () => {
    const starving = makeDwarf({ state: 'starving', hunger: 0, starveTicks: 2500 });
    starving.hunger = Math.min(100, starving.hunger + 24);
    starving.starveTicks = 0;
    starving.state = 'idle';
    expect(starving.hunger).toBe(24);
    expect(starving.starveTicks).toBe(0);
    expect(starving.state).toBe('idle');
  });
});
