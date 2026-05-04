import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import {
  getTrainerDashboard,
  getTrainerCompetencies,
  getTrainerErrors,
  getTrainerCampaigns,
  getTrainerLearners,
} from '$lib/api/admin-trainer';
import { apiClient } from '$lib/api/client';

describe('API envelope handling for admin trainer endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly extract data from success envelope for dashboard endpoint', async () => {
    const envelopeResponse = {
      success: true,
      data: {
        competencies: [],
        errorPatterns: [],
        campaigns: [],
        totalLearners: 0,
        averageScore: 0,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelopeResponse.data,
    });

    const result = await getTrainerDashboard();

    expect(result.data).toEqual(envelopeResponse.data);
    expect(result.data).not.toHaveProperty('success');
    expect(result.data).not.toEqual(envelopeResponse);
  });

  it('should correctly extract data from success envelope for competencies endpoint', async () => {
    const envelopeResponse = {
      success: true,
      data: [
        {
          domain: 'communication',
          averageScore: 85.5,
          learnerCount: 42,
          distribution: {
            foundational: 5,
            operational: 10,
            consistent: 15,
            mastery: 12,
          },
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelopeResponse.data,
    });

    const result = await getTrainerCompetencies();

    expect(result.data).toEqual(envelopeResponse.data);
    expect(result.data).not.toHaveProperty('success');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should correctly extract data from success envelope for errors endpoint', async () => {
    const envelopeResponse = {
      success: true,
      data: [
        {
          pattern: 'test-pattern',
          count: 10,
          domain: 'communication',
          recentOccurrences: ['2024-01-01T00:00:00Z'],
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelopeResponse.data,
    });

    const result = await getTrainerErrors();

    expect(result.data).toEqual(envelopeResponse.data);
    expect(result.data).not.toHaveProperty('success');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should correctly extract data from success envelope for campaigns endpoint', async () => {
    const envelopeResponse = {
      success: true,
      data: [
        {
          campaignId: 'campaign-1',
          campaignName: 'Test Campaign',
          totalLearners: 100,
          completed: 50,
          inProgress: 30,
          notStarted: 20,
          completionRate: 0.5,
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelopeResponse.data,
    });

    const result = await getTrainerCampaigns();

    expect(result.data).toEqual(envelopeResponse.data);
    expect(result.data).not.toHaveProperty('success');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should correctly extract data from success envelope for learners endpoint', async () => {
    const envelopeResponse = {
      success: true,
      data: [
        {
          userId: 'user-1',
          email: 'learner1@example.com',
          displayName: 'Learner One',
          score: 92,
          trend: 'improving',
          lastActivity: '2024-01-15T10:30:00Z',
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: envelopeResponse.data,
    });

    const result = await getTrainerLearners('communication');

    expect(result.data).toEqual(envelopeResponse.data);
    expect(result.data).not.toHaveProperty('success');
    expect(Array.isArray(result.data)).toBe(true);
  });
});
