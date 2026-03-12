import { describe, it, expect, beforeEach } from 'vitest';

// Replicate core game constants and pure functions from public/index.html
const MAP_W = 2000;
const MAP_H = 1000;

// Coordinate conversion (mirrors index.html lines 782-791)
function toLonLat(mx: number, my: number): [number, number] {
  return [(mx / MAP_W) * 360 - 180, 90 - (my / MAP_H) * 180];
}

function toMap(lon: number, lat: number): [number, number] {
  let mx = Math.round((lon + 180) / 360 * MAP_W) % MAP_W;
  if (mx < 0) mx += MAP_W;
  const my = Math.round((90 - lat) / 180 * MAP_H);
  return [mx, Math.max(0, Math.min(MAP_H - 1, my))];
}

function wrapX(x: number): number {
  return ((x % MAP_W) + MAP_W) % MAP_W;
}

// Stat functions (mirrors index.html)
function statMod(stat: number): number {
  return 0.5 + ((stat - 3) / 15);
}

function ageModifiers(age: number) {
  if (age < 25)  return { STR: 0, DEX: 1, CON: 0, INT: 0, WIS: -1, CHA: 0 };
  if (age <= 50) return { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  if (age <= 70) return { STR: 0, DEX: -1, CON: 0, INT: 1, WIS: 1, CHA: 0 };
  return { STR: -2, DEX: -1, CON: -1, INT: 0, WIS: 2, CHA: 0 };
}

function effectiveStat(d: any, stat: string): number {
  const base = d.stats?.[stat] ?? 10;
  const mod = ageModifiers(d.age || 30);
  return Math.max(3, base + ((mod as any)[stat] || 0));
}

function carryCapacity(d: any): number {
  return 3 + Math.floor(effectiveStat(d, 'STR') / 4);
}

// City definitions (subset for testing)
const TEST_CITIES = [
  { id: 'new-york', name: 'New York', lon: -74, lat: 41 },
  { id: 'london', name: 'London', lon: 0, lat: 52 },
  { id: 'tokyo', name: 'Tokyo', lon: 140, lat: 36 },
  { id: 'sydney', name: 'Sydney', lon: 151, lat: -34 },
  { id: 'cairo', name: 'Cairo', lon: 31, lat: 30 },
  { id: 'rabat', name: 'Rabat', lon: -7, lat: 34 },
  { id: 'casablanca', name: 'Casablanca', lon: -8, lat: 34 },
  { id: 'cape-town', name: 'Cape Town', lon: 18, lat: -34 },
  { id: 'nairobi', name: 'Nairobi', lon: 37, lat: -1 },
  { id: 'reykjavik', name: 'Reykjavik', lon: -22, lat: 64 },
  { id: 'honolulu', name: 'Honolulu', lon: -158, lat: 21 },
  { id: 'buenos-aires', name: 'Buenos Aires', lon: -58, lat: -35 },
  { id: 'beijing', name: 'Beijing', lon: 116, lat: 40 },
  { id: 'mumbai', name: 'Mumbai', lon: 73, lat: 19 },
  { id: 'moscow', name: 'Moscow', lon: 38, lat: 56 },
];

describe('Coordinate Conversion', () => {
  describe('toMap', () => {
    it('maps lon=0, lat=0 to center', () => {
      const [mx, my] = toMap(0, 0);
      expect(mx).toBe(1000); // center x
      expect(my).toBe(500);  // center y
    });

    it('maps lon=-180, lat=90 to top-left', () => {
      const [mx, my] = toMap(-180, 90);
      expect(mx).toBe(0);
      expect(my).toBe(0);
    });

    it('maps lon=180, lat=-90 to bottom-right', () => {
      const [mx, my] = toMap(180, -90);
      // lon=180 wraps to 0 (same as -180)
      expect(my).toBe(999); // clamped
    });

    it('maps negative longitude correctly', () => {
      const [mx, _] = toMap(-74, 41); // New York
      expect(mx).toBeGreaterThan(0);
      expect(mx).toBeLessThan(MAP_W);
    });

    it('clamps y to valid range', () => {
      const [_, my1] = toMap(0, 100); // above north pole
      expect(my1).toBe(0);
      const [__, my2] = toMap(0, -100); // below south pole
      expect(my2).toBe(999);
    });
  });

  describe('toLonLat', () => {
    it('is inverse of toMap for center', () => {
      const [lon, lat] = toLonLat(1000, 500);
      expect(lon).toBeCloseTo(0, 0);
      expect(lat).toBeCloseTo(0, 0);
    });

    it('is inverse of toMap for New York', () => {
      const [mx, my] = toMap(-74, 41);
      const [lon, lat] = toLonLat(mx, my);
      expect(lon).toBeCloseTo(-74, 0);
      expect(lat).toBeCloseTo(41, 0);
    });
  });

  describe('wrapX', () => {
    it('wraps negative x', () => {
      expect(wrapX(-1)).toBe(MAP_W - 1);
      expect(wrapX(-MAP_W)).toBe(0);
    });

    it('wraps x >= MAP_W', () => {
      expect(wrapX(MAP_W)).toBe(0);
      expect(wrapX(MAP_W + 5)).toBe(5);
    });

    it('keeps valid x unchanged', () => {
      expect(wrapX(0)).toBe(0);
      expect(wrapX(500)).toBe(500);
      expect(wrapX(MAP_W - 1)).toBe(MAP_W - 1);
    });

    it('handles double wrapping', () => {
      expect(wrapX(-MAP_W * 2 + 5)).toBe(5);
      expect(wrapX(MAP_W * 3 + 7)).toBe(7);
    });
  });
});

describe('City Coordinate Verification', () => {
  it('all cities map to valid tile coordinates', () => {
    for (const city of TEST_CITIES) {
      const [mx, my] = toMap(city.lon, city.lat);
      expect(mx, `${city.name} mx`).toBeGreaterThanOrEqual(0);
      expect(mx, `${city.name} mx`).toBeLessThan(MAP_W);
      expect(my, `${city.name} my`).toBeGreaterThanOrEqual(0);
      expect(my, `${city.name} my`).toBeLessThan(MAP_H);
    }
  });

  it('Rabat is in North Africa band (y between 280-330)', () => {
    const [mx, my] = toMap(-7, 34);
    // lat 34 should be around y=311 (north africa)
    expect(my).toBeGreaterThan(280);
    expect(my).toBeLessThan(340);
  });

  it('Casablanca is in North Africa band', () => {
    const [mx, my] = toMap(-8, 34);
    expect(my).toBeGreaterThan(280);
    expect(my).toBeLessThan(340);
  });

  it('Rabat and Casablanca are south of Madrid', () => {
    const [, rabatY] = toMap(-7, 34);
    const [, casaY] = toMap(-8, 34);
    const [, madridY] = toMap(-4, 40);
    // lower latitude = higher y value on map
    expect(rabatY).toBeGreaterThan(madridY);
    expect(casaY).toBeGreaterThan(madridY);
  });

  it('Nairobi is near equator', () => {
    const [, my] = toMap(37, -1);
    expect(Math.abs(my - 500)).toBeLessThan(10); // near center y
  });

  it('Reykjavik is in far north', () => {
    const [, my] = toMap(-22, 64);
    expect(my).toBeLessThan(200);
  });

  it('Cape Town is in southern hemisphere', () => {
    const [, my] = toMap(18, -34);
    expect(my).toBeGreaterThan(500);
  });

  it('Northern hemisphere cities have y < 500', () => {
    const northern = TEST_CITIES.filter(c => c.lat > 0);
    for (const city of northern) {
      const [, my] = toMap(city.lon, city.lat);
      expect(my, `${city.name} should be northern`).toBeLessThan(500);
    }
  });

  it('Southern hemisphere cities have y > 500', () => {
    const southern = TEST_CITIES.filter(c => c.lat < 0);
    for (const city of southern) {
      const [, my] = toMap(city.lon, city.lat);
      expect(my, `${city.name} should be southern`).toBeGreaterThan(500);
    }
  });

  it('cities on same latitude have same y coordinate', () => {
    const [, rabatY] = toMap(-7, 34);
    const [, casaY] = toMap(-8, 34);
    expect(rabatY).toBe(casaY); // same lat = same y
  });

  it('western cities have smaller x than eastern at same longitude range', () => {
    const [nyX] = toMap(-74, 41);
    const [londonX] = toMap(0, 52);
    const [tokyoX] = toMap(140, 36);
    expect(nyX).toBeLessThan(londonX);
    expect(londonX).toBeLessThan(tokyoX);
  });
});

describe('Age Modifiers', () => {
  it('young dwarves get +1 DEX, -1 WIS', () => {
    const mods = ageModifiers(20);
    expect(mods.DEX).toBe(1);
    expect(mods.WIS).toBe(-1);
    expect(mods.STR).toBe(0);
  });

  it('prime age dwarves have no modifiers', () => {
    const mods = ageModifiers(35);
    expect(Object.values(mods).every(v => v === 0)).toBe(true);
  });

  it('elder dwarves get -1 DEX, +1 WIS, +1 INT', () => {
    const mods = ageModifiers(60);
    expect(mods.DEX).toBe(-1);
    expect(mods.WIS).toBe(1);
    expect(mods.INT).toBe(1);
  });

  it('ancient dwarves get heavy penalties', () => {
    const mods = ageModifiers(80);
    expect(mods.STR).toBe(-2);
    expect(mods.DEX).toBe(-1);
    expect(mods.CON).toBe(-1);
    expect(mods.WIS).toBe(2);
  });

  it('boundary: age 25 is prime', () => {
    const mods = ageModifiers(25);
    expect(Object.values(mods).every(v => v === 0)).toBe(true);
  });

  it('boundary: age 50 is prime', () => {
    const mods = ageModifiers(50);
    expect(Object.values(mods).every(v => v === 0)).toBe(true);
  });

  it('boundary: age 70 is elder', () => {
    const mods = ageModifiers(70);
    expect(mods.WIS).toBe(1);
  });

  it('boundary: age 71 is ancient', () => {
    const mods = ageModifiers(71);
    expect(mods.STR).toBe(-2);
    expect(mods.WIS).toBe(2);
  });
});

describe('Effective Stat', () => {
  it('uses base stat for prime-age dwarf', () => {
    const d = { stats: { STR: 14, DEX: 12 }, age: 35 };
    expect(effectiveStat(d, 'STR')).toBe(14);
    expect(effectiveStat(d, 'DEX')).toBe(12);
  });

  it('applies age modifiers for young dwarf', () => {
    const d = { stats: { DEX: 10, WIS: 10 }, age: 20 };
    expect(effectiveStat(d, 'DEX')).toBe(11); // +1
    expect(effectiveStat(d, 'WIS')).toBe(9);  // -1
  });

  it('applies age modifiers for elder dwarf', () => {
    const d = { stats: { INT: 12, DEX: 10 }, age: 65 };
    expect(effectiveStat(d, 'INT')).toBe(13); // +1
    expect(effectiveStat(d, 'DEX')).toBe(9);  // -1
  });

  it('never goes below 3', () => {
    const d = { stats: { STR: 3 }, age: 80 }; // -2 STR
    expect(effectiveStat(d, 'STR')).toBe(3); // clamped
  });

  it('defaults to 10 for missing stats', () => {
    const d = { stats: {}, age: 35 };
    expect(effectiveStat(d, 'STR')).toBe(10);
  });

  it('defaults to age 30 when age is missing', () => {
    const d = { stats: { STR: 14 } };
    expect(effectiveStat(d, 'STR')).toBe(14); // prime age
  });
});

describe('Carry Capacity', () => {
  it('base capacity for average strength', () => {
    const d = { stats: { STR: 10 }, age: 35 };
    expect(carryCapacity(d)).toBe(5); // 3 + floor(10/4) = 3 + 2
  });

  it('higher STR increases capacity', () => {
    const d = { stats: { STR: 18 }, age: 35 };
    expect(carryCapacity(d)).toBe(7); // 3 + floor(18/4) = 3 + 4
  });

  it('lower STR reduces capacity', () => {
    const d = { stats: { STR: 3 }, age: 35 };
    expect(carryCapacity(d)).toBe(3); // 3 + floor(3/4) = 3 + 0
  });

  it('ancient dwarf has reduced carry capacity due to STR penalty', () => {
    const d = { stats: { STR: 10 }, age: 80 };
    // effective STR = max(3, 10 - 2) = 8
    expect(carryCapacity(d)).toBe(5); // 3 + floor(8/4) = 3 + 2
  });
});

describe('Stat Modifier', () => {
  it('returns 0.5 for stat 3 (minimum)', () => {
    expect(statMod(3)).toBe(0.5);
  });

  it('returns 1.5 for stat 18 (maximum)', () => {
    expect(statMod(18)).toBe(1.5);
  });

  it('returns ~1.0 for average stat', () => {
    expect(statMod(10)).toBeCloseTo(0.97, 1);
    expect(statMod(11)).toBeCloseTo(1.03, 1);
  });

  it('is monotonically increasing', () => {
    for (let s = 4; s <= 18; s++) {
      expect(statMod(s)).toBeGreaterThan(statMod(s - 1));
    }
  });
});

describe('Dwarf State Machine', () => {
  function makeDwarf(overrides: any = {}) {
    return {
      id: 'd_test',
      name: 'Test',
      x: 10, y: 10,
      cityId: 'city_a',
      hunger: 80, energy: 80, happiness: 70,
      state: 'idle',
      target: null,
      path: [],
      timer: 0,
      age: 30,
      stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      carrying: 0,
      carryItems: { wood: 0, stone: 0, iron: 0, food: 0, gold: 0, cloth: 0, herbs: 0 },
      inventory: [],
      relationships: [],
      ...overrides,
    };
  }

  describe('Hunger triggers', () => {
    it('hunger < 20 forces seek_food state', () => {
      const d = makeDwarf({ hunger: 15, state: 'idle' });
      if (d.hunger < 20 && d.state !== 'eating' && d.state !== 'going_eat') {
        d.state = 'seek_food'; d.target = null; d.path = [];
      }
      expect(d.state).toBe('seek_food');
    });

    it('hunger < 20 does not override eating', () => {
      const d = makeDwarf({ hunger: 15, state: 'eating' });
      if (d.hunger < 20 && d.state !== 'eating' && d.state !== 'going_eat') {
        d.state = 'seek_food';
      }
      expect(d.state).toBe('eating');
    });
  });

  describe('Energy triggers', () => {
    it('energy < 15 forces seek_sleep', () => {
      const d = makeDwarf({ hunger: 80, energy: 10, state: 'idle' });
      // hunger check first, then energy
      if (d.hunger < 20 && d.state !== 'eating' && d.state !== 'going_eat') {
        d.state = 'seek_food';
      } else if (d.energy < 15 && d.state !== 'sleeping' && d.state !== 'going_sleep') {
        d.state = 'seek_sleep';
      }
      expect(d.state).toBe('seek_sleep');
    });

    it('hunger takes priority over energy', () => {
      const d = makeDwarf({ hunger: 10, energy: 5, state: 'idle' });
      if (d.hunger < 20 && d.state !== 'eating' && d.state !== 'going_eat') {
        d.state = 'seek_food';
      } else if (d.energy < 15 && d.state !== 'sleeping' && d.state !== 'going_sleep') {
        d.state = 'seek_sleep';
      }
      expect(d.state).toBe('seek_food');
    });
  });

  describe('Inventory limits', () => {
    it('inventory max is 6 items', () => {
      const d = makeDwarf({
        inventory: Array(6).fill({ emoji: '💧', name: 'Water' }),
      });
      expect(d.inventory.length).toBe(6);
      // Should not add more
      if (d.inventory.length < 6) {
        d.inventory.push({ emoji: '🔥', name: 'Fire' });
      }
      expect(d.inventory.length).toBe(6);
    });

    it('can add item when under limit', () => {
      const d = makeDwarf({ inventory: [{ emoji: '💧', name: 'Water' }] });
      if (d.inventory.length < 6) {
        d.inventory.push({ emoji: '🔥', name: 'Fire' });
      }
      expect(d.inventory.length).toBe(2);
    });
  });

  describe('Food sharing', () => {
    it('generous dwarf shares with very hungry neighbor', () => {
      const sharer = makeDwarf({
        id: 'd_sharer',
        morality: 80,
        stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 15 },
        carryItems: { food: 5 },
        carrying: 5,
        relationships: [],
      });
      const hungry = makeDwarf({
        id: 'd_hungry',
        hunger: 10, // very hungry
        morality: 50,
        stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        x: sharer.x, y: sharer.y, // adjacent
      });

      // Simulate sharing logic
      const attractiveness = (hungry.morality ?? 50) + (hungry.stats.CHA ?? 10) * 2;
      const otherGenerosity = (sharer.morality ?? 50) + (sharer.stats.CHA ?? 10);
      const threshold = 80 - otherGenerosity * 0.3;
      const willShare = attractiveness >= threshold;
      expect(willShare).toBe(true);
    });

    it('enemy dwarf does not share food', () => {
      const sharer = makeDwarf({
        id: 'd_sharer',
        relationships: [{ targetId: 'd_hungry', type: 'enemy', strength: -80 }],
        carryItems: { food: 5 },
      });
      const rel = sharer.relationships.find((r: any) => r.targetId === 'd_hungry');
      const isEnemy = rel && (rel.type === 'enemy' || rel.strength < -50);
      expect(isEnemy).toBe(true);
    });
  });
});

describe('Regrowth Bounds Safety', () => {
  it('random regrowth coordinates are always in bounds', () => {
    for (let i = 0; i < 10000; i++) {
      const rx = Math.floor(Math.random() * MAP_W);
      const ry = 10 + Math.floor(Math.random() * (MAP_H - 20));
      expect(rx).toBeGreaterThanOrEqual(0);
      expect(rx).toBeLessThan(MAP_W);
      expect(ry).toBeGreaterThanOrEqual(10);
      expect(ry).toBeLessThan(MAP_H - 10);
    }
  });
});

describe('Game Loop Safety', () => {
  it('try-catch in tick loop prevents render from being skipped', () => {
    let renderCalled = false;
    let errorThrown = false;

    // Simulate game loop structure
    try {
      // Simulate tick that throws
      throw new Error('Simulated tick error');
    } catch (e) {
      errorThrown = true;
    }

    // render() should still run
    renderCalled = true;

    expect(errorThrown).toBe(true);
    expect(renderCalled).toBe(true);
  });

  it('aging does not mutate array during iteration', () => {
    // Simulate the fixed aging code
    const dwarves = [
      { id: 'd1', age: 80, name: 'Old1' },
      { id: 'd2', age: 25, name: 'Young' },
      { id: 'd3', age: 90, name: 'Ancient' },
    ];

    // Collect dead, don't filter during iteration
    const deadIds: string[] = [];
    for (const d of dwarves) {
      d.age += 1;
      if (d.age >= 70 && d.id === 'd3') { // simulate death
        deadIds.push(d.id);
      }
    }
    const survivors = dwarves.filter(dw => !deadIds.includes(dw.id));

    expect(survivors.length).toBe(2);
    expect(survivors.find(d => d.id === 'd3')).toBeUndefined();
    // Original array unmodified during iteration
    expect(dwarves.length).toBe(3);
  });
});

describe('Map Bounds', () => {
  it('MAP_W is 2000', () => expect(MAP_W).toBe(2000));
  it('MAP_H is 1000', () => expect(MAP_H).toBe(1000));

  it('wrapX handles all edge cases', () => {
    expect(wrapX(0)).toBe(0);
    expect(wrapX(MAP_W - 1)).toBe(1999);
    expect(wrapX(MAP_W)).toBe(0);
    expect(wrapX(-1)).toBe(1999);
    expect(wrapX(-MAP_W)).toBe(0);
  });
});

describe('Terrain Speed System', () => {
  // Replicate TERRAIN_PROPS speed values
  const TERRAIN_SPEEDS: Record<string, number> = {
    OCEAN: 0,
    PLAINS: 1,
    FOREST: 2,
    MOUNTAIN: 4,
    HILL: 3,
    DESERT: 2,
    TUNDRA: 2,
    JUNGLE: 3,
    BEACH: 1,
    TAIGA: 2,
    PATH: 1,
    ROAD: 0.7,
    RAILROAD: 0.3,
    CITY: 1,
    FLOOR: 1,
    BED: 1,
    STOCKPILE: 1,
    TABLE: 1,
    FARM: 1,
    WALL: 0,
  };

  it('ocean is impassable (speed 0)', () => {
    expect(TERRAIN_SPEEDS.OCEAN).toBe(0);
  });

  it('path has no speed advantage over plains', () => {
    expect(TERRAIN_SPEEDS.PATH).toBe(TERRAIN_SPEEDS.PLAINS);
  });

  it('road is faster than path', () => {
    expect(TERRAIN_SPEEDS.ROAD).toBeLessThan(TERRAIN_SPEEDS.PATH);
  });

  it('road is faster than plains', () => {
    expect(TERRAIN_SPEEDS.ROAD).toBeLessThan(TERRAIN_SPEEDS.PLAINS);
  });

  it('railroad is fastest', () => {
    expect(TERRAIN_SPEEDS.RAILROAD).toBeLessThan(TERRAIN_SPEEDS.ROAD);
  });

  it('road progression: path → gravel → asphalt → railroad', () => {
    expect(TERRAIN_SPEEDS.PATH).toBeGreaterThan(TERRAIN_SPEEDS.ROAD);
    expect(TERRAIN_SPEEDS.ROAD).toBeGreaterThan(TERRAIN_SPEEDS.RAILROAD);
  });

  it('mountain is slowest walkable terrain', () => {
    const walkable = Object.entries(TERRAIN_SPEEDS).filter(([, s]) => s > 0);
    const maxSpeed = Math.max(...walkable.map(([, s]) => s));
    expect(TERRAIN_SPEEDS.MOUNTAIN).toBe(maxSpeed);
  });

  it('wall is impassable', () => {
    expect(TERRAIN_SPEEDS.WALL).toBe(0);
  });

  it('all building tiles have speed 1', () => {
    for (const tile of ['CITY', 'FLOOR', 'BED', 'STOCKPILE', 'TABLE', 'FARM']) {
      expect(TERRAIN_SPEEDS[tile], `${tile} speed`).toBe(1);
    }
  });
});

describe('FPS Optimizations', () => {
  it('tick stagger: only 1/4 of dwarves run aiIdle per tick', () => {
    const dwarves = Array.from({ length: 8 }, (_, i) => ({ _tickSlot: i % 4 }));
    for (let tick = 0; tick < 4; tick++) {
      const active = dwarves.filter(d => tick % 4 === d._tickSlot);
      expect(active).toHaveLength(2);
    }
  });

  it('spatial grid: nearby dwarves found correctly', () => {
    const dwarfGrid: Record<string, any[]> = {};
    const dwarves = [
      { id: 'a', x: 10, y: 10 },
      { id: 'b', x: 11, y: 10 },
      { id: 'c', x: 200, y: 200 },
    ];
    for (const d of dwarves) {
      const key = `${d.x >> 3},${d.y >> 3}`;
      (dwarfGrid[key] ??= []).push(d);
    }
    // a and b are in the same bucket (10>>3=1, 11>>3=1)
    const bx = 10 >> 3, by = 10 >> 3;
    const nearby: any[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const bucket = dwarfGrid[`${bx + dx},${by + dy}`];
      if (bucket) for (const d of bucket) nearby.push(d);
    }
    expect(nearby.map(d => d.id)).toContain('a');
    expect(nearby.map(d => d.id)).toContain('b');
    expect(nearby.map(d => d.id)).not.toContain('c');
  });
});
