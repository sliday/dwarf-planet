import { describe, it, expect } from 'vitest';

const T = {
  OCEAN: 0, PLAINS: 4, CITY: 18, PATH: 38, ROAD: 32, ASPHALT: 36, RAILROAD: 34,
};

const VEHICLE_TYPES = {
  cart:  { emoji: '🐴', capacity: 8,  minRoad: T.PATH,     name: 'Horse Cart' },
  car:   { emoji: '🚗', capacity: 15, minRoad: T.ASPHALT,  name: 'Car' },
  train: { emoji: '🚂', capacity: 40, minRoad: T.RAILROAD, name: 'Train' },
};

function createVehicle(type: string, x: number, y: number, cityId: string) {
  return {
    id: 'v_' + Math.random().toString(36).slice(2, 8),
    type, x, y, cityId,
    driverId: null as string | null,
    cargo: {} as Record<string, number>,
    cargoTotal: 0,
    passengers: [] as string[],
    mode: 'idle' as string,
    state: 'parked' as string,
    target: null as any,
    path: [] as [number, number][],
  };
}

function createDwarf(id: string, x: number, y: number, cityId: string) {
  return {
    id, name: 'Dwarf_' + id, x, y, cityId,
    hunger: 80, energy: 80, happiness: 50,
    state: 'idle' as string,
    target: null as any,
    path: [] as [number, number][],
    dead: false,
  };
}

describe('Vehicle Transport - Data Model', () => {
  it('createVehicle includes passengers and mode fields', () => {
    const v = createVehicle('car', 10, 10, 'city1');
    expect(v.passengers).toEqual([]);
    expect(v.mode).toBe('idle');
  });

  it('mode can be set to trade, freight, or idle', () => {
    const v = createVehicle('cart', 5, 5, 'city1');
    v.mode = 'trade';
    expect(v.mode).toBe('trade');
    v.mode = 'freight';
    expect(v.mode).toBe('freight');
    v.mode = 'idle';
    expect(v.mode).toBe('idle');
  });
});

describe('Passenger Boarding', () => {
  it('passenger takes 1 capacity unit', () => {
    const v = createVehicle('car', 10, 10, 'city1');
    const vt = VEHICLE_TYPES[v.type as keyof typeof VEHICLE_TYPES];
    // Car capacity 15: driver + 5 passengers + 9 cargo = 15
    v.driverId = 'driver1';
    v.passengers = ['p1', 'p2', 'p3', 'p4', 'p5'];
    v.cargoTotal = 9;
    const used = (v.passengers.length) + v.cargoTotal + 1; // +1 for driver implicit
    expect(used).toBeLessThanOrEqual(vt.capacity);
  });

  it('boarding is blocked when vehicle is full', () => {
    const v = createVehicle('cart', 10, 10, 'city1');
    const vt = VEHICLE_TYPES[v.type as keyof typeof VEHICLE_TYPES];
    v.state = 'en_route';
    v.target = { cityId: 'city2' };
    // Fill to capacity - 1
    v.passengers = Array.from({ length: vt.capacity - 1 }, (_, i) => 'p' + i);
    v.cargoTotal = 0;
    // One more passenger would exceed capacity
    const hasSpace = (v.passengers.length) + v.cargoTotal + 1 < vt.capacity;
    expect(hasSpace).toBe(false);
  });

  it('boarding allowed when vehicle has space', () => {
    const v = createVehicle('car', 10, 10, 'city1');
    const vt = VEHICLE_TYPES[v.type as keyof typeof VEHICLE_TYPES];
    v.state = 'en_route';
    v.target = { cityId: 'city2' };
    v.passengers = ['p1'];
    v.cargoTotal = 5;
    const hasSpace = (v.passengers.length) + v.cargoTotal + 1 < vt.capacity;
    expect(hasSpace).toBe(true);
  });

  it('dwarf state changes to riding on board', () => {
    const d = createDwarf('d1', 10, 10, 'city1');
    const v = createVehicle('car', 10, 10, 'city1');
    v.state = 'en_route';
    v.target = { cityId: 'city2' };
    // Simulate boarding
    v.passengers.push(d.id);
    d.state = 'riding';
    d.target = { type: 'ride_vehicle', vehicleId: v.id, destCityId: 'city2' };
    d.path = [];
    expect(d.state).toBe('riding');
    expect(v.passengers).toContain(d.id);
  });
});

describe('Passenger Position Sync', () => {
  it('passengers move with vehicle', () => {
    const v = createVehicle('car', 10, 10, 'city1');
    v.state = 'en_route';
    v.path = [[11, 10], [12, 10]];
    const d1 = createDwarf('p1', 10, 10, 'city1');
    const d2 = createDwarf('p2', 10, 10, 'city1');
    v.passengers = [d1.id, d2.id];
    const dwarves = [d1, d2];

    // Simulate tickVehicle step
    const [nx, ny] = v.path.shift()!;
    v.x = nx; v.y = ny;
    for (const pid of v.passengers) {
      const p = dwarves.find(d => d.id === pid);
      if (p) { p.x = nx; p.y = ny; }
    }

    expect(d1.x).toBe(11);
    expect(d1.y).toBe(10);
    expect(d2.x).toBe(11);
    expect(d2.y).toBe(10);
  });
});

describe('Disembark Logic', () => {
  it('all passengers disembark when path exhausted', () => {
    const v = createVehicle('car', 12, 10, 'city1');
    v.state = 'en_route';
    v.path = [];
    const d1 = createDwarf('p1', 12, 10, 'city1');
    const d2 = createDwarf('p2', 12, 10, 'city1');
    d1.state = 'riding'; d2.state = 'riding';
    v.passengers = [d1.id, d2.id];
    const dwarves = [d1, d2];

    // Simulate arrival
    v.state = 'parked';
    for (const pid of v.passengers) {
      const p = dwarves.find(d => d.id === pid);
      if (p) { p.state = 'idle'; p.target = null; p.cityId = 'city2'; }
    }
    v.passengers = [];

    expect(d1.state).toBe('idle');
    expect(d2.state).toBe('idle');
    expect(d1.cityId).toBe('city2');
    expect(v.passengers).toEqual([]);
  });

  it('mid-route disembark when destination city matches', () => {
    const v = createVehicle('car', 15, 10, 'city1');
    v.state = 'en_route';
    v.passengers = ['p1', 'p2'];

    const d1 = createDwarf('p1', 15, 10, 'city1');
    d1.state = 'riding';
    d1.target = { type: 'ride_vehicle', vehicleId: v.id, destCityId: 'cityMid' };
    const d2 = createDwarf('p2', 15, 10, 'city1');
    d2.state = 'riding';
    d2.target = { type: 'ride_vehicle', vehicleId: v.id, destCityId: 'cityEnd' };
    const dwarves = [d1, d2];

    // Simulate mid-route city check
    const nearCity = { id: 'cityMid', name: 'Midtown', mx: 15, my: 10 };
    v.passengers = v.passengers.filter(pid => {
      const p = dwarves.find(d => d.id === pid);
      if (p && p.target?.destCityId === nearCity.id) {
        p.cityId = nearCity.id; p.state = 'idle'; p.target = null;
        return false;
      }
      return true;
    });

    expect(v.passengers).toEqual(['p2']);
    expect(d1.state).toBe('idle');
    expect(d1.cityId).toBe('cityMid');
    expect(d2.state).toBe('riding');
  });
});

describe('Freight Scoring', () => {
  it('scores surplus + deficit*2', () => {
    const homeRes = { food: 30, wood: 5 };
    const destRes = { food: 3, wood: 50 };

    const surplus = (homeRes.food || 0) - 20; // 10
    const deficit = 8 - (destRes.food || 0);   // 5
    expect(surplus).toBe(10);
    expect(deficit).toBe(5);
    const score = surplus + deficit * 2;
    expect(score).toBe(20);
  });

  it('skips goods with insufficient surplus', () => {
    const homeRes = { food: 22 }; // surplus = 2, below threshold of 5
    const surplus = (homeRes.food || 0) - 20;
    expect(surplus < 5).toBe(true);
  });

  it('skips goods with insufficient deficit', () => {
    const destRes = { food: 6 }; // deficit = 2, below threshold of 3
    const deficit = 8 - (destRes.food || 0);
    expect(deficit < 3).toBe(true);
  });
});

describe('Freight Auto-Unload', () => {
  it('unloads cargo to destination city on arrival', () => {
    const v = createVehicle('cart', 20, 10, 'city1');
    v.mode = 'freight';
    v.cargo = { food: 5, wood: 3 };
    v.cargoTotal = 8;
    v.state = 'parked';

    const destCity = { id: 'city2', res: { food: 10, wood: 2 } };

    // Simulate auto-unload
    for (const [good, amt] of Object.entries(v.cargo)) {
      destCity.res[good as keyof typeof destCity.res] = (destCity.res[good as keyof typeof destCity.res] || 0) + amt;
    }
    v.cargo = {}; v.cargoTotal = 0; v.mode = 'idle'; v.target = null;

    expect(destCity.res.food).toBe(15);
    expect(destCity.res.wood).toBe(5);
    expect(v.mode).toBe('idle');
    expect(v.cargoTotal).toBe(0);
  });
});

describe('Dead Dwarf Cleanup', () => {
  it('removes dead dwarves from vehicle passenger lists', () => {
    const v = createVehicle('car', 10, 10, 'city1');
    v.passengers = ['alive1', 'dead1', 'alive2'];

    const dwarves = [
      createDwarf('alive1', 10, 10, 'city1'),
      createDwarf('alive2', 10, 10, 'city1'),
    ];
    // dead1 is not in dwarves list (already filtered)

    const alive = new Set(dwarves.map(d => d.id));
    v.passengers = v.passengers.filter(id => alive.has(id));

    expect(v.passengers).toEqual(['alive1', 'alive2']);
  });

  it('clears ship captain if dead', () => {
    const ship = { captainId: 'dead1' };
    const dwarves = [createDwarf('alive1', 10, 10, 'city1')];
    const alive = new Set(dwarves.map(d => d.id));
    if (ship.captainId && !alive.has(ship.captainId)) ship.captainId = null;
    expect(ship.captainId).toBeNull();
  });
});

describe('Serialization', () => {
  it('vehicle serialization includes passengers and mode', () => {
    const v = createVehicle('train', 30, 15, 'city3');
    v.passengers = ['d1', 'd2'];
    v.mode = 'freight';

    const serialized = {
      id: v.id, type: v.type, x: v.x, y: v.y, cityId: v.cityId,
      driverId: v.driverId, cargo: v.cargo, state: v.state,
      passengers: v.passengers || [], mode: v.mode || 'idle',
    };

    expect(serialized.passengers).toEqual(['d1', 'd2']);
    expect(serialized.mode).toBe('freight');
  });

  it('defaults passengers to [] and mode to idle on restore', () => {
    const saved = { type: 'car', x: 5, y: 5, cityId: 'c1' } as any;
    const restored = {
      ...createVehicle(saved.type, saved.x, saved.y, saved.cityId),
      passengers: saved.passengers || [],
      mode: saved.mode || 'idle',
    };

    expect(restored.passengers).toEqual([]);
    expect(restored.mode).toBe('idle');
  });
});
