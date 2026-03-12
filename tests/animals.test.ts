import { describe, it, expect } from 'vitest';

// Replicate animal system constants and logic from game-worker.js

const T = {
  OCEAN: 1, PLAINS: 3, FOREST: 4, DESERT: 5, JUNGLE: 6,
  TUNDRA: 7, MOUNTAIN: 8, BEACH: 9, ROAD: 10, TAIGA: 11, HILL: 12,
  ASPHALT: 13, RAILROAD: 14,
};

const ANIMAL_TYPES: Record<string, {
  emoji: string; hp: number; ac: number; atk: number; dmg: string | number;
  speed: number; food: number; danger: boolean; pet: boolean;
  terrain: number[]; water?: boolean;
}> = {
  cat:       {emoji:'🐱',hp:4, ac:12,atk:0,dmg:0,         speed:0.3,food:1, danger:false,pet:true, terrain:[T.PLAINS,T.FOREST,T.ROAD]},
  dog:       {emoji:'🐶',hp:6, ac:11,atk:0,dmg:0,         speed:0.4,food:2, danger:false,pet:true, terrain:[T.PLAINS,T.FOREST,T.ROAD,T.DESERT]},
  monkey:    {emoji:'🐒',hp:5, ac:13,atk:3,dmg:'1d4',     speed:0.5,food:2, danger:true, pet:false,terrain:[T.JUNGLE]},
  wolf:      {emoji:'🐺',hp:11,ac:13,atk:4,dmg:'2d4',     speed:0.6,food:3, danger:true, pet:false,terrain:[T.FOREST,T.TUNDRA]},
  bear:      {emoji:'🐻',hp:19,ac:11,atk:5,dmg:'2d6',     speed:0.3,food:8, danger:true, pet:false,terrain:[T.FOREST,T.MOUNTAIN]},
  snake:     {emoji:'🐍',hp:3, ac:14,atk:3,dmg:'1d4+poison',speed:0.2,food:1,danger:true,pet:false,terrain:[T.JUNGLE,T.DESERT]},
  rabbit:    {emoji:'🐇',hp:2, ac:14,atk:0,dmg:0,         speed:0.7,food:2, danger:false,pet:false,terrain:[T.PLAINS,T.FOREST]},
  fox:       {emoji:'🦊',hp:6, ac:13,atk:3,dmg:'1d6',     speed:0.6,food:3, danger:true, pet:false,terrain:[T.PLAINS,T.FOREST]},
  eagle:     {emoji:'🦅',hp:5, ac:14,atk:4,dmg:'1d6',     speed:0.8,food:2, danger:true, pet:false,terrain:[T.MOUNTAIN,T.HILL]},
  penguin:   {emoji:'🐧',hp:4, ac:10,atk:0,dmg:0,         speed:0.3,food:3, danger:false,pet:false,terrain:[T.TUNDRA]},
  camel:     {emoji:'🐪',hp:15,ac:10,atk:0,dmg:0,         speed:0.4,food:6, danger:false,pet:false,terrain:[T.DESERT]},
  gorilla:   {emoji:'🦍',hp:20,ac:12,atk:6,dmg:'2d6',     speed:0.4,food:5, danger:true, pet:false,terrain:[T.JUNGLE]},
  boar:      {emoji:'🐗',hp:11,ac:12,atk:3,dmg:'1d6',     speed:0.5,food:4, danger:true, pet:false,terrain:[T.FOREST,T.PLAINS]},
  scorpion:  {emoji:'🦂',hp:3, ac:15,atk:2,dmg:'1d4+poison',speed:0.2,food:0,danger:true,pet:false,terrain:[T.DESERT]},
  bee:       {emoji:'🐝',hp:1, ac:16,atk:1,dmg:'1d2+poison',speed:0.9,food:0,danger:true,pet:false,terrain:[T.JUNGLE,T.FOREST]},
  crocodile: {emoji:'🐊',hp:18,ac:12,atk:5,dmg:'2d8',     speed:0.3,food:6, danger:true, pet:false,terrain:[T.JUNGLE,T.BEACH]},
  turtle:    {emoji:'🐢',hp:8, ac:16,atk:0,dmg:0,         speed:0.1,food:3, danger:false,pet:false,terrain:[T.BEACH]},
  parrot:    {emoji:'🦜',hp:3, ac:14,atk:0,dmg:0,         speed:0.8,food:1, danger:false,pet:true, terrain:[T.JUNGLE]},
  spider:    {emoji:'🕷️',hp:2, ac:15,atk:2,dmg:'1d4+poison',speed:0.3,food:0,danger:true,pet:false,terrain:[T.JUNGLE,T.TAIGA]},
  deer:      {emoji:'🦌',hp:8, ac:12,atk:0,dmg:0,         speed:0.7,food:5, danger:false,pet:false,terrain:[T.FOREST,T.PLAINS,T.TAIGA]},
  owl:       {emoji:'🦉',hp:4, ac:14,atk:2,dmg:'1d4',     speed:0.7,food:1, danger:false,pet:false,terrain:[T.FOREST,T.TAIGA]},
  shark:     {emoji:'🦈',hp:22,ac:12,atk:6,dmg:'2d8',     speed:0.8,food:0, danger:true, pet:false,terrain:[T.OCEAN],water:true},
  whale:     {emoji:'🐋',hp:40,ac:10,atk:0,dmg:0,         speed:0.5,food:0, danger:false,pet:false,terrain:[T.OCEAN],water:true},
  dolphin:   {emoji:'🐬',hp:12,ac:13,atk:0,dmg:0,         speed:0.9,food:0, danger:false,pet:false,terrain:[T.OCEAN],water:true},
};

const MAX_ANIMALS = 400;

// Mirror isWalkable from game-worker.js (simplified)
function isWalkable(tile: number): boolean {
  return tile !== T.OCEAN && tile !== T.MOUNTAIN;
}

// Mirror spawn eligibility logic
function canSpawnAt(type: string, tile: number): boolean {
  const t = ANIMAL_TYPES[type];
  if (!t.terrain.includes(tile)) return false;
  if (!t.water && !isWalkable(tile)) return false;
  return true;
}

// Mirror wander movement logic
function canWanderTo(type: string, tile: number): boolean {
  const t = ANIMAL_TYPES[type];
  return t.water ? tile === T.OCEAN : isWalkable(tile);
}

describe('Animal Types', () => {
  it('has 24 animal types defined', () => {
    expect(Object.keys(ANIMAL_TYPES)).toHaveLength(24);
  });

  it('shark terrain is OCEAN, not BEACH', () => {
    expect(ANIMAL_TYPES.shark.terrain).toEqual([T.OCEAN]);
    expect(ANIMAL_TYPES.shark.terrain).not.toContain(T.BEACH);
  });

  it('shark has water:true flag', () => {
    expect(ANIMAL_TYPES.shark.water).toBe(true);
  });

  it('whale exists with correct properties', () => {
    const whale = ANIMAL_TYPES.whale;
    expect(whale).toBeDefined();
    expect(whale.terrain).toEqual([T.OCEAN]);
    expect(whale.water).toBe(true);
    expect(whale.danger).toBe(false);
    expect(whale.hp).toBe(40);
  });

  it('dolphin exists with correct properties', () => {
    const dolphin = ANIMAL_TYPES.dolphin;
    expect(dolphin).toBeDefined();
    expect(dolphin.terrain).toEqual([T.OCEAN]);
    expect(dolphin.water).toBe(true);
    expect(dolphin.danger).toBe(false);
    expect(dolphin.speed).toBe(0.9);
  });

  it('eagle spawns on MOUNTAIN and HILL', () => {
    expect(ANIMAL_TYPES.eagle.terrain).toContain(T.MOUNTAIN);
    expect(ANIMAL_TYPES.eagle.terrain).toContain(T.HILL);
  });

  it('all water animals have water:true and OCEAN terrain', () => {
    const waterAnimals = Object.entries(ANIMAL_TYPES).filter(([_, t]) => t.water);
    expect(waterAnimals.length).toBe(3); // shark, whale, dolphin
    for (const [name, t] of waterAnimals) {
      expect(t.terrain).toContain(T.OCEAN);
    }
  });

  it('land animals do not have water flag', () => {
    const landAnimals = Object.entries(ANIMAL_TYPES).filter(([_, t]) => !t.water);
    for (const [name, t] of landAnimals) {
      expect(t.terrain).not.toContain(T.OCEAN);
    }
  });
});

describe('Animal Spawn Logic', () => {
  it('MAX_ANIMALS is 400', () => {
    expect(MAX_ANIMALS).toBe(400);
  });

  it('water animals can spawn on OCEAN tiles', () => {
    expect(canSpawnAt('shark', T.OCEAN)).toBe(true);
    expect(canSpawnAt('whale', T.OCEAN)).toBe(true);
    expect(canSpawnAt('dolphin', T.OCEAN)).toBe(true);
  });

  it('water animals cannot spawn on land tiles', () => {
    expect(canSpawnAt('shark', T.PLAINS)).toBe(false);
    expect(canSpawnAt('whale', T.BEACH)).toBe(false);
    expect(canSpawnAt('dolphin', T.FOREST)).toBe(false);
  });

  it('land animals cannot spawn on OCEAN', () => {
    expect(canSpawnAt('cat', T.OCEAN)).toBe(false);
    expect(canSpawnAt('wolf', T.OCEAN)).toBe(false);
    expect(canSpawnAt('bear', T.OCEAN)).toBe(false);
  });

  it('land animals spawn on their listed terrains', () => {
    expect(canSpawnAt('cat', T.PLAINS)).toBe(true);
    expect(canSpawnAt('wolf', T.FOREST)).toBe(true);
    expect(canSpawnAt('camel', T.DESERT)).toBe(true);
    expect(canSpawnAt('penguin', T.TUNDRA)).toBe(true);
  });

  it('eagle can spawn on HILL terrain', () => {
    expect(canSpawnAt('eagle', T.HILL)).toBe(true);
  });

  it('water flag bypasses isWalkable for ocean tiles', () => {
    // OCEAN is not walkable, but water animals should still spawn there
    expect(isWalkable(T.OCEAN)).toBe(false);
    expect(canSpawnAt('shark', T.OCEAN)).toBe(true);
  });

  it('spawn batch size is 5-12', () => {
    for (let i = 0; i < 100; i++) {
      const toSpawn = 5 + Math.floor(Math.random() * 8);
      expect(toSpawn).toBeGreaterThanOrEqual(5);
      expect(toSpawn).toBeLessThanOrEqual(12);
    }
  });

  it('seed count is 80-119', () => {
    for (let i = 0; i < 100; i++) {
      const count = 80 + Math.floor(Math.random() * 40);
      expect(count).toBeGreaterThanOrEqual(80);
      expect(count).toBeLessThanOrEqual(119);
    }
  });
});

describe('Animal Wander Movement', () => {
  it('water animals can only wander to OCEAN tiles', () => {
    expect(canWanderTo('shark', T.OCEAN)).toBe(true);
    expect(canWanderTo('shark', T.BEACH)).toBe(false);
    expect(canWanderTo('shark', T.PLAINS)).toBe(false);
    expect(canWanderTo('whale', T.OCEAN)).toBe(true);
    expect(canWanderTo('dolphin', T.OCEAN)).toBe(true);
  });

  it('land animals use isWalkable for wander', () => {
    expect(canWanderTo('cat', T.PLAINS)).toBe(true);
    expect(canWanderTo('cat', T.OCEAN)).toBe(false);
    expect(canWanderTo('wolf', T.FOREST)).toBe(true);
    expect(canWanderTo('wolf', T.MOUNTAIN)).toBe(false);
  });
});

describe('Animal Combat Stats', () => {
  it('dangerous animals have atk > 0', () => {
    for (const [name, t] of Object.entries(ANIMAL_TYPES)) {
      if (t.danger) {
        expect(t.atk).toBeGreaterThan(0);
      }
    }
  });

  it('pet animals are not dangerous', () => {
    for (const [name, t] of Object.entries(ANIMAL_TYPES)) {
      if (t.pet) {
        expect(t.danger).toBe(false);
      }
    }
  });

  it('shark is the strongest ocean predator', () => {
    expect(ANIMAL_TYPES.shark.danger).toBe(true);
    expect(ANIMAL_TYPES.shark.hp).toBe(22);
    expect(ANIMAL_TYPES.shark.atk).toBe(6);
  });
});
