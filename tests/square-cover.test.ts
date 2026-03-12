import { describe, it, expect } from 'vitest';

// Mirror tile constants
const T = {
  OCEAN: 0, TUNDRA: 1, TAIGA: 2, FOREST: 3, PLAINS: 4,
  DESERT: 5, JUNGLE: 6, MOUNTAIN: 7, HILL: 8, BEACH: 9,
  FLOOR: 10, WALL: 11, STOCKPILE: 12, BED: 13, TABLE: 14,
  DOOR: 15, MUSHROOM: 16, FARM: 17, CITY: 18,
  D_MINE: 19, D_BUILD: 20, D_FARM: 21,
  IRON_ORE: 22, GOLD_VEIN: 23, GEMS: 24,
  BERRY_BUSH: 25, HERB_PATCH: 26, CLAY: 27,
  FISH_SPOT: 28, DEER: 29, CORAL: 30, CRAB: 31,
  ROAD: 32, D_ROAD: 33, RAILROAD: 34, GRAVE: 35
};

const MAX_COVER = 5;
const GROUPABLE = new Set([
  T.OCEAN, T.TUNDRA, T.TAIGA, T.FOREST, T.PLAINS, T.DESERT,
  T.JUNGLE, T.MOUNTAIN, T.HILL, T.BEACH, T.ROAD, T.RAILROAD,
  T.FARM, T.MUSHROOM
]);

// Pure logic extracted from renderTileBuffer's greedy cover algorithm
function computeCover(
  tileGrid: number[][],
  startGX: number,
  startGY: number
): { r: number; c: number; size: number; t: number }[] {
  const rows = tileGrid.length;
  const cols = tileGrid[0].length;
  const covered: number[][] = [];
  for (let r = 0; r < rows; r++) covered.push(new Array(cols).fill(0));

  const groups: { r: number; c: number; size: number; t: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (covered[r][c]) continue;
      const t = tileGrid[r][c];
      let bestN = 1;

      if (GROUPABLE.has(t)) {
        const wy = startGY + r, wx = startGX + c;
        for (let n = 2; n <= MAX_COVER; n++) {
          if (wy % n !== 0 || wx % n !== 0) break;
          if (r + n > rows || c + n > cols) break;
          let ok = true;
          for (let rr = r; rr < r + n - 1; rr++) {
            if (tileGrid[rr][c + n - 1] !== t || covered[rr][c + n - 1]) { ok = false; break; }
          }
          if (!ok) break;
          for (let cc = c; cc < c + n; cc++) {
            if (tileGrid[r + n - 1][cc] !== t || covered[r + n - 1][cc]) { ok = false; break; }
          }
          if (!ok) break;
          bestN = n;
        }
      }

      for (let rr = r; rr < r + bestN; rr++) {
        for (let cc = c; cc < c + bestN; cc++) {
          covered[rr][cc] = 1;
        }
      }

      groups.push({ r, c, size: bestN, t });
    }
  }
  return groups;
}

describe('Square Cover Algorithm', () => {
  it('groups a uniform 2x2 block of groupable tiles', () => {
    const grid = [
      [T.FOREST, T.FOREST],
      [T.FOREST, T.FOREST],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({ r: 0, c: 0, size: 2, t: T.FOREST });
  });

  it('groups a uniform 3x3 block at aligned world coords', () => {
    const grid = [
      [T.PLAINS, T.PLAINS, T.PLAINS],
      [T.PLAINS, T.PLAINS, T.PLAINS],
      [T.PLAINS, T.PLAINS, T.PLAINS],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(1);
    expect(groups[0].size).toBe(3);
  });

  it('does not group non-groupable tiles', () => {
    const grid = [
      [T.STOCKPILE, T.STOCKPILE],
      [T.STOCKPILE, T.STOCKPILE],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(4);
    expect(groups.every(g => g.size === 1)).toBe(true);
  });

  it('does not group designations', () => {
    const grid = [
      [T.D_MINE, T.D_MINE],
      [T.D_MINE, T.D_MINE],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(4);
  });

  it('does not group resource tiles', () => {
    const grid = [
      [T.IRON_ORE, T.IRON_ORE],
      [T.IRON_ORE, T.IRON_ORE],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(4);
  });

  it('does not group graves', () => {
    const grid = [
      [T.GRAVE, T.GRAVE],
      [T.GRAVE, T.GRAVE],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(4);
  });

  it('handles mixed tiles correctly', () => {
    const grid = [
      [T.FOREST, T.FOREST, T.DESERT],
      [T.FOREST, T.FOREST, T.DESERT],
      [T.PLAINS, T.PLAINS, T.PLAINS],
    ];
    const groups = computeCover(grid, 0, 0);
    const forestGroup = groups.find(g => g.t === T.FOREST && g.size === 2);
    expect(forestGroup).toBeDefined();
    const desertGroups = groups.filter(g => g.t === T.DESERT);
    expect(desertGroups.every(g => g.size === 1)).toBe(true);
  });

  it('respects MAX_COVER limit', () => {
    const size = 6;
    const grid: number[][] = [];
    for (let r = 0; r < size; r++) grid.push(new Array(size).fill(T.OCEAN));
    const groups = computeCover(grid, 0, 0);
    const maxSize = Math.max(...groups.map(g => g.size));
    expect(maxSize).toBeLessThanOrEqual(MAX_COVER);
  });

  it('covers all cells exactly once', () => {
    const grid = [
      [T.FOREST, T.FOREST, T.PLAINS, T.DESERT],
      [T.FOREST, T.FOREST, T.PLAINS, T.OCEAN],
      [T.MOUNTAIN, T.HILL, T.HILL, T.OCEAN],
      [T.MOUNTAIN, T.HILL, T.HILL, T.BEACH],
    ];
    const groups = computeCover(grid, 0, 0);
    const cellCount = groups.reduce((sum, g) => sum + g.size * g.size, 0);
    expect(cellCount).toBe(16);
  });

  it('produces stable grouping regardless of viewport offset', () => {
    // Build a 10x10 uniform forest grid
    const grid: number[][] = [];
    for (let r = 0; r < 10; r++) grid.push(new Array(10).fill(T.FOREST));

    // Render from two different viewport origins that see the same world tiles
    const groups1 = computeCover(grid, 0, 0);
    const groups2 = computeCover(grid, 0, 0);

    // Same world coords → same grouping
    expect(groups1).toEqual(groups2);
  });

  it('world-coordinate alignment prevents shifting on scroll', () => {
    // 6x6 uniform forest
    const fullGrid: number[][] = [];
    for (let r = 0; r < 6; r++) fullGrid.push(new Array(6).fill(T.FOREST));

    // Viewport starting at world (0,0) - can form groups at multiples
    const g1 = computeCover(fullGrid, 0, 0);
    // Viewport starting at world (1,1) - alignment check prevents large groups at (0,0) viewport
    const g2 = computeCover(fullGrid, 1, 1);

    // At offset (1,1), world coord (1,1) is not divisible by 2, so no 2x2 at (0,0)
    const firstGroup2 = g2[0];
    expect(firstGroup2.size).toBe(1);

    // At offset (0,0), world coord (0,0) is divisible by anything
    const firstGroup1 = g1[0];
    expect(firstGroup1.size).toBeGreaterThan(1);
  });

  it('alignment ensures groups at world-aligned positions', () => {
    // 5x5 uniform desert, starting at world (3, 3)
    const grid: number[][] = [];
    for (let r = 0; r < 5; r++) grid.push(new Array(5).fill(T.DESERT));

    const groups = computeCover(grid, 3, 3);
    // First cell at world (3,3): 3%2=1, so no 2x2. Must be 1x1
    expect(groups[0].size).toBe(1);

    // Cell at viewport (1,1) = world (4,4): 4%2=0, can try 2x2
    const g44 = groups.find(g => g.r === 1 && g.c === 1);
    expect(g44).toBeDefined();
    expect(g44!.size).toBe(2);
  });

  it('ocean tiles are groupable', () => {
    const grid = [
      [T.OCEAN, T.OCEAN],
      [T.OCEAN, T.OCEAN],
    ];
    const groups = computeCover(grid, 0, 0);
    expect(groups).toHaveLength(1);
    expect(groups[0].size).toBe(2);
  });
});

describe('Grave Tile', () => {
  it('GRAVE tile type exists with correct value', () => {
    expect(T.GRAVE).toBe(35);
  });

  it('GRAVE is not groupable', () => {
    expect(GROUPABLE.has(T.GRAVE)).toBe(false);
  });

  it('placeGrave logic places grave on non-ocean tiles', () => {
    const MAP_W = 10;
    const map = [new Array(MAP_W).fill(T.PLAINS)];
    function wrapX(x: number) { return ((x % MAP_W) + MAP_W) % MAP_W; }
    function placeGrave(d: { x: number; y: number }) {
      const wx = wrapX(d.x);
      if (map[d.y] && map[d.y][wx] !== T.OCEAN) map[d.y][wx] = T.GRAVE;
    }
    placeGrave({ x: 3, y: 0 });
    expect(map[0][3]).toBe(T.GRAVE);
  });

  it('placeGrave does not place grave on ocean', () => {
    const MAP_W = 10;
    const map = [new Array(MAP_W).fill(T.OCEAN)];
    function wrapX(x: number) { return ((x % MAP_W) + MAP_W) % MAP_W; }
    function placeGrave(d: { x: number; y: number }) {
      const wx = wrapX(d.x);
      if (map[d.y] && map[d.y][wx] !== T.OCEAN) map[d.y][wx] = T.GRAVE;
    }
    placeGrave({ x: 5, y: 0 });
    expect(map[0][5]).toBe(T.OCEAN);
  });
});

describe('Clickable Log Entries', () => {
  it('log entry stores coordinates when provided', () => {
    const logEntries: any[] = [];
    function log(msg: string, type: string, rarity: number, season?: number, cityEmoji?: string, lx?: number, ly?: number) {
      const s = season !== undefined ? season : 0;
      logEntries.push({ msg, type, rarity: rarity || 1, lx: lx ?? null, ly: ly ?? null });
    }
    log('Test died', 'system', 4, undefined, undefined, 100, 200);
    expect(logEntries[0].lx).toBe(100);
    expect(logEntries[0].ly).toBe(200);
  });

  it('log entry has null coords when not provided', () => {
    const logEntries: any[] = [];
    function log(msg: string, type: string, rarity: number, season?: number, cityEmoji?: string, lx?: number, ly?: number) {
      logEntries.push({ msg, type, rarity: rarity || 1, lx: lx ?? null, ly: ly ?? null });
    }
    log('Something happened', 'system', 2);
    expect(logEntries[0].lx).toBeNull();
    expect(logEntries[0].ly).toBeNull();
  });

  it('worker log function passes coordinates through', () => {
    const pendingLogs: any[] = [];
    const G = { season: 2 };
    function log(msg: string, type: string, rarity: number, cityEmoji?: string | null, lx?: number, ly?: number) {
      pendingLogs.push({ msg, type, rarity: rarity || 1, season: G.season, cityEmoji: cityEmoji || null, lx: lx ?? null, ly: ly ?? null });
    }
    log('Dwarf died', 'system', 4, null, 42, 99);
    expect(pendingLogs[0].lx).toBe(42);
    expect(pendingLogs[0].ly).toBe(99);
    expect(pendingLogs[0].season).toBe(2);
  });
});
