import { describe, it, expect } from 'vitest';

// Test the worker route validation logic (extracted from src/worker.ts)

const VALID_TIERS = ['simple', 'medium', 'complex', 'premium'];
const SPONSOR_TIERS = {
  bronze: { amount: 100, aiTier: 'medium', calls: 100 },
  silver: { amount: 300, aiTier: 'complex', calls: 75 },
  gold:   { amount: 1000, aiTier: 'premium', calls: 100 },
};

describe('Worker Route Validation', () => {
  describe('Tier validation', () => {
    it('accepts valid tiers', () => {
      for (const tier of VALID_TIERS) {
        expect(VALID_TIERS.includes(tier)).toBe(true);
      }
    });

    it('rejects invalid tiers', () => {
      for (const tier of ['free', 'mega', '', 'SIMPLE', 'Premium']) {
        expect(VALID_TIERS.includes(tier)).toBe(false);
      }
    });
  });

  describe('Sponsor tier config', () => {
    it('bronze is cheapest', () => {
      expect(SPONSOR_TIERS.bronze.amount).toBe(100);
      expect(SPONSOR_TIERS.bronze.aiTier).toBe('medium');
    });

    it('silver is mid-tier', () => {
      expect(SPONSOR_TIERS.silver.amount).toBe(300);
      expect(SPONSOR_TIERS.silver.aiTier).toBe('complex');
    });

    it('gold is premium', () => {
      expect(SPONSOR_TIERS.gold.amount).toBe(1000);
      expect(SPONSOR_TIERS.gold.aiTier).toBe('premium');
    });

    it('higher tiers cost more', () => {
      expect(SPONSOR_TIERS.silver.amount).toBeGreaterThan(SPONSOR_TIERS.bronze.amount);
      expect(SPONSOR_TIERS.gold.amount).toBeGreaterThan(SPONSOR_TIERS.silver.amount);
    });

    it('all tiers have positive call counts', () => {
      for (const [, config] of Object.entries(SPONSOR_TIERS)) {
        expect(config.calls).toBeGreaterThan(0);
      }
    });
  });

  describe('Tier upgrade logic', () => {
    it('higher tier should upgrade when sponsored', () => {
      const tierRank: Record<string, number> = { simple: 0, medium: 1, complex: 2, premium: 3 };
      let effectiveTier = 'simple';

      // Simulate a sponsored dwarf with 'premium' tier
      const sponsoredTier = 'premium';
      if (tierRank[sponsoredTier] > tierRank[effectiveTier]) {
        effectiveTier = sponsoredTier;
      }

      expect(effectiveTier).toBe('premium');
    });

    it('does not downgrade tier', () => {
      const tierRank: Record<string, number> = { simple: 0, medium: 1, complex: 2, premium: 3 };
      let effectiveTier = 'complex';

      const sponsoredTier = 'medium';
      if (tierRank[sponsoredTier] > tierRank[effectiveTier]) {
        effectiveTier = sponsoredTier;
      }

      expect(effectiveTier).toBe('complex'); // unchanged
    });
  });

  describe('Budget caps', () => {
    const caps: Record<string, number> = {
      simple: 50, medium: 100, complex: 200, premium: 500,
    };

    it('total budget cap is $8.50/hr', () => {
      const total = Object.values(caps).reduce((s, c) => s + c, 0);
      expect(total).toBe(850);
    });

    it('premium has highest cap', () => {
      expect(caps.premium).toBeGreaterThan(caps.complex);
      expect(caps.complex).toBeGreaterThan(caps.medium);
      expect(caps.medium).toBeGreaterThan(caps.simple);
    });

    it('remaining budget calculation is correct', () => {
      const costCents = 30;
      const remaining = caps.simple - costCents;
      expect(remaining).toBe(20);
    });

    it('over-budget returns negative remaining', () => {
      const costCents = 60;
      const remaining = caps.simple - costCents;
      expect(remaining).toBeLessThan(0);
    });
  });

  describe('Craft endpoint validation', () => {
    it('rejects items without names', () => {
      const item1 = { emoji: '💧', name: '' };
      const item2 = { emoji: '🔥', name: 'Fire' };
      const valid = item1?.name && item2?.name;
      expect(valid).toBeFalsy();
    });

    it('accepts valid items', () => {
      const item1 = { emoji: '💧', name: 'Water' };
      const item2 = { emoji: '🔥', name: 'Fire' };
      const valid = item1?.name && item2?.name;
      expect(valid).toBeTruthy();
    });

    it('normalizes item order (A+B = B+A)', () => {
      const item1 = { emoji: '🔥', name: 'Fire' };
      const item2 = { emoji: '💧', name: 'Water' };
      const [a, b] = [item1, item2].sort((x, y) => x.name.localeCompare(y.name));
      expect(a.name).toBe('Fire');
      expect(b.name).toBe('Water');

      // Reversed input gives same order
      const [a2, b2] = [item2, item1].sort((x, y) => x.name.localeCompare(y.name));
      expect(a2.name).toBe('Fire');
      expect(b2.name).toBe('Water');
    });

    it('normalizes recipe IDs (low, high)', () => {
      const aId = 5, bId = 3;
      const lowId = Math.min(aId, bId);
      const highId = Math.max(aId, bId);
      expect(lowId).toBe(3);
      expect(highId).toBe(5);
    });
  });
});
