import { describe, expect, it } from 'vitest';

import { type PartyDifficultyTier } from '../coop-scaling.js';

describe('coop-scaling', () => {
  describe('PARTY_DIFFICULTY_TIERS', () => {
    it('should export PARTY_DIFFICULTY_TIERS constant', async () => {
      const module = await import('../coop-scaling.js');
      expect(module.PARTY_DIFFICULTY_TIERS).toBeDefined();
    });

    it('should have exactly 4 difficulty tiers', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      expect(PARTY_DIFFICULTY_TIERS).toHaveLength(4);
    });

    it('should contain training tier', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      expect(PARTY_DIFFICULTY_TIERS).toContain('training');
    });

    it('should contain standard tier', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      expect(PARTY_DIFFICULTY_TIERS).toContain('standard');
    });

    it('should contain hardened tier', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      expect(PARTY_DIFFICULTY_TIERS).toContain('hardened');
    });

    it('should contain nightmare tier', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      expect(PARTY_DIFFICULTY_TIERS).toContain('nightmare');
    });

    it('should have all values match PartyDifficultyTier type', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      for (const tier of PARTY_DIFFICULTY_TIERS) {
        const isValidTier: PartyDifficultyTier = tier;
        expect(typeof isValidTier).toBe('string');
      }
    });

    it('should be readonly array', async () => {
      const { PARTY_DIFFICULTY_TIERS } = await import('../coop-scaling.js');
      expect(PARTY_DIFFICULTY_TIERS).toBeReadonly();
    });
  });

  describe('DIFFICULTY_TIER_MULTIPLIERS', () => {
    it('should have keys matching PARTY_DIFFICULTY_TIERS values', async () => {
      const { PARTY_DIFFICULTY_TIERS, DIFFICULTY_TIER_MULTIPLIERS } = await import('../coop-scaling.js');
      for (const tier of PARTY_DIFFICULTY_TIERS) {
        expect(DIFFICULTY_TIER_MULTIPLIERS).toHaveProperty(tier);
      }
    });

    it('should have training with volume multiplier less than standard', async () => {
      const { DIFFICULTY_TIER_MULTIPLIERS } = await import('../coop-scaling.js');
      expect(DIFFICULTY_TIER_MULTIPLIERS.training.volumeMult).toBeLessThan(
        DIFFICULTY_TIER_MULTIPLIERS.standard.volumeMult,
      );
    });

    it('should have nightmare with highest volume multiplier', async () => {
      const { DIFFICULTY_TIER_MULTIPLIERS } = await import('../coop-scaling.js');
      expect(DIFFICULTY_TIER_MULTIPLIERS.nightmare.volumeMult).toBeGreaterThan(
        DIFFICULTY_TIER_MULTIPLIERS.hardened.volumeMult,
      );
      expect(DIFFICULTY_TIER_MULTIPLIERS.hardened.volumeMult).toBeGreaterThan(
        DIFFICULTY_TIER_MULTIPLIERS.standard.volumeMult,
      );
    });
  });
});