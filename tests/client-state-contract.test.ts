import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const indexHtml = readFileSync(
  join(process.cwd(), 'public/index.html'),
  'utf8'
);

describe('client state contract', () => {
  it('serializes extended world state for local saves', () => {
    expect(indexHtml).toContain("graves: G.graves || {}");
    expect(indexHtml).toContain("yearResolutions: G.yearResolutions || []");
    expect(indexHtml).toContain("suburbs: G.suburbs || []");
    expect(indexHtml).toContain("dirtTiles: G.dirtTiles || []");
  });

  it('serializes extended dwarf state for reloads', () => {
    expect(indexHtml).toContain("travelMode: d.travelMode || null");
    expect(indexHtml).toContain("hp: d.hp, maxHp: d.maxHp, ac: d.ac, poisonTicks: d.poisonTicks || 0, pet: d.pet || null");
    expect(indexHtml).toContain("sponsored: d.sponsored || false");
    expect(indexHtml).toContain("relationships: d.relationships || []");
  });

  it('restores extended dwarf state from saves', () => {
    expect(indexHtml).toContain("hp: sd.hp ?? d.hp, maxHp: sd.maxHp ?? d.maxHp, ac: sd.ac ?? d.ac");
    expect(indexHtml).toContain("poisonTicks: sd.poisonTicks || 0, pet: sd.pet || null");
    expect(indexHtml).toContain("travelMode: sd.travelMode ?? null");
    expect(indexHtml).toContain("sponsored: sd.sponsored || false, sponsorTier: sd.sponsorTier || null");
    expect(indexHtml).toContain("relationships: sd.relationships || []");
  });

  it('passes restored world state into worker init', () => {
    expect(indexHtml).toContain("yearResolutions: G.yearResolutions || []");
    expect(indexHtml).toContain("suburbs: G.suburbs || []");
    expect(indexHtml).toContain("dirtTiles: G.dirtTiles || []");
  });

  it('keeps terrain updates tracked in fallback and worker snapshot paths', () => {
    expect(indexHtml).toContain("setWorldTile(ch.x, ch.y, ch.tile, { markDirty: false })");
    expect(indexHtml).toContain("setWorldTile(x, y, T.D_MINE)");
    expect(indexHtml).toContain("setWorldTile(x, y, T.D_FARM)");
  });

  it('preserves travel intents in fallback mode', () => {
    expect(indexHtml).toContain("case 'travel':");
    expect(indexHtml).toContain('tryTravelFallback(d)');
  });
});
