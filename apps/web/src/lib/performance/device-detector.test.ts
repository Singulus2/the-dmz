import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

import {
  detectDevicePerformance,
  getRecommendedEffectsForTier,
  getRecommendedEffectIntensityForTier,
  getHardwareScore,
  getMemoryScore,
  getNetworkScore,
  classifyScore,
  calculateTier,
} from './device-detector';

describe('device-detector', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('detectDevicePerformance', () => {
    it('should return a valid performance info object', () => {
      const result = detectDevicePerformance();

      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('hardwareConcurrency');
      expect(result).toHaveProperty('deviceMemory');
      expect(result).toHaveProperty('connectionEffectiveType');
      expect(result).toHaveProperty('isMobile');
      expect(result).toHaveProperty('isLowEndDevice');
    });

    it('should return a valid tier', () => {
      const result = detectDevicePerformance();

      expect(['low', 'medium', 'high']).toContain(result.tier);
    });
  });

  describe('getRecommendedEffectsForTier', () => {
    it('should return all effects disabled for low tier', () => {
      const effects = getRecommendedEffectsForTier('low');

      expect(effects.scanlines).toBe(false);
      expect(effects.curvature).toBe(false);
      expect(effects.glow).toBe(false);
      expect(effects.noise).toBe(false);
      expect(effects.vignette).toBe(false);
      expect(effects.flicker).toBe(false);
    });

    it('should return some effects enabled for medium tier', () => {
      const effects = getRecommendedEffectsForTier('medium');

      expect(effects.scanlines).toBe(true);
      expect(effects.curvature).toBe(false);
      expect(effects.glow).toBe(true);
      expect(effects.noise).toBe(false);
      expect(effects.vignette).toBe(true);
      expect(effects.flicker).toBe(false);
    });

    it('should return all effects enabled for high tier', () => {
      const effects = getRecommendedEffectsForTier('high');

      expect(effects.scanlines).toBe(true);
      expect(effects.curvature).toBe(true);
      expect(effects.glow).toBe(true);
      expect(effects.vignette).toBe(true);
      expect(effects.flicker).toBe(true);
    });
  });

  describe('getRecommendedEffectIntensityForTier', () => {
    it('should return zero intensities for low tier', () => {
      const intensities = getRecommendedEffectIntensityForTier('low');

      expect(intensities.scanlines).toBe(0);
      expect(intensities.curvature).toBe(0);
      expect(intensities.glow).toBe(0);
      expect(intensities.noise).toBe(0);
      expect(intensities.vignette).toBe(0);
      expect(intensities.flicker).toBe(0);
    });

    it('should return medium intensities for medium tier', () => {
      const intensities = getRecommendedEffectIntensityForTier('medium');

      expect(intensities.scanlines).toBeGreaterThan(0);
      expect(intensities.curvature).toBe(0);
      expect(intensities.glow).toBeGreaterThan(0);
      expect(intensities.vignette).toBeGreaterThan(0);
      expect(intensities.flicker).toBe(0);
    });

    it('should return high intensities for high tier', () => {
      const intensities = getRecommendedEffectIntensityForTier('high');

      expect(intensities.scanlines).toBeGreaterThan(0);
      expect(intensities.curvature).toBeGreaterThan(0);
      expect(intensities.glow).toBeGreaterThan(0);
      expect(intensities.vignette).toBeGreaterThan(0);
      expect(intensities.flicker).toBeGreaterThan(0);
    });
  });

  describe('getHardwareScore', () => {
    it('should return 0 for cores less than 4', () => {
      expect(getHardwareScore(1)).toBe(0);
      expect(getHardwareScore(2)).toBe(0);
      expect(getHardwareScore(3)).toBe(0);
    });

    it('should return 1 for cores between 4 and 7', () => {
      expect(getHardwareScore(4)).toBe(1);
      expect(getHardwareScore(6)).toBe(1);
      expect(getHardwareScore(7)).toBe(1);
    });

    it('should return 2 for cores 8 or more', () => {
      expect(getHardwareScore(8)).toBe(2);
      expect(getHardwareScore(12)).toBe(2);
      expect(getHardwareScore(16)).toBe(2);
    });
  });

  describe('getMemoryScore', () => {
    it('should return 2 for memory >= 8', () => {
      expect(getMemoryScore(8, false)).toBe(2);
      expect(getMemoryScore(16, false)).toBe(2);
    });

    it('should return 1 for memory between 4 and 7', () => {
      expect(getMemoryScore(4, false)).toBe(1);
      expect(getMemoryScore(6, false)).toBe(1);
      expect(getMemoryScore(7, false)).toBe(1);
    });

    it('should return 0 for memory < 4', () => {
      expect(getMemoryScore(1, false)).toBe(0);
      expect(getMemoryScore(2, false)).toBe(0);
      expect(getMemoryScore(3, false)).toBe(0);
    });

    it('should return 0 for undefined memory on desktop', () => {
      expect(getMemoryScore(undefined, false)).toBe(0);
    });

    it('should return -1 for undefined memory on mobile', () => {
      expect(getMemoryScore(undefined, true)).toBe(-1);
    });
  });

  describe('getNetworkScore', () => {
    it('should return 1 for 4g connection', () => {
      expect(getNetworkScore('4g')).toBe(1);
    });

    it('should return -1 for 3g connection', () => {
      expect(getNetworkScore('3g')).toBe(-1);
    });

    it('should return -1 for 2g connection', () => {
      expect(getNetworkScore('2g')).toBe(-1);
    });

    it('should return 0 for undefined connection', () => {
      expect(getNetworkScore(undefined)).toBe(0);
    });

    it('should return 0 for other connection types', () => {
      expect(getNetworkScore('wifi')).toBe(0);
      expect(getNetworkScore('ethernet')).toBe(0);
    });
  });

  describe('classifyScore', () => {
    it('should return low for score <= 1', () => {
      expect(classifyScore(-2)).toBe('low');
      expect(classifyScore(-1)).toBe('low');
      expect(classifyScore(0)).toBe('low');
      expect(classifyScore(1)).toBe('low');
    });

    it('should return medium for score 2 and 3', () => {
      expect(classifyScore(2)).toBe('medium');
      expect(classifyScore(3)).toBe('medium');
    });

    it('should return high for score >= 4', () => {
      expect(classifyScore(4)).toBe('high');
      expect(classifyScore(5)).toBe('high');
      expect(classifyScore(10)).toBe('high');
    });
  });

  describe('calculateTier', () => {
    it('should return low tier for low-end device', () => {
      const tier = calculateTier(2, 2, '2g', true);
      expect(tier).toBe('low');
    });

    it('should return medium tier for mid-range device', () => {
      const tier = calculateTier(4, 4, '4g', false);
      expect(tier).toBe('medium');
    });

    it('should return high tier for high-end device', () => {
      const tier = calculateTier(8, 8, '4g', false);
      expect(tier).toBe('high');
    });

    it('should penalize mobile devices with unknown memory', () => {
      const mobileWithUnknownMemory = calculateTier(4, undefined, '4g', true);
      expect(mobileWithUnknownMemory).toBe('low');
    });

    it('should combine all scoring dimensions correctly', () => {
      expect(calculateTier(8, 4, '4g', false)).toBe('high');
      expect(calculateTier(4, 8, '4g', false)).toBe('high');
      expect(calculateTier(4, 4, undefined, false)).toBe('medium');
    });
  });
});
