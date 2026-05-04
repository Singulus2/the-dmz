import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

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
  type CompetencyDistribution,
  type ErrorPattern,
  type CampaignCompletion,
  type LearnerSummary,
  type TrainerDashboardData,
} from '$lib/api/admin-trainer';
import { apiClient } from '$lib/api/client';

describe('admin-trainer API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTrainerDashboard', () => {
    const mockDashboardData: TrainerDashboardData = {
      competencies: [
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
      errorPatterns: [
        {
          pattern: 'test-pattern',
          count: 10,
          domain: 'communication',
          recentOccurrences: ['2024-01-01T00:00:00Z'],
        },
      ],
      campaigns: [
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
      totalLearners: 100,
      averageScore: 75.2,
    };

    it('should return dashboard data when API returns success envelope', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockDashboardData,
      });

      const result = await getTrainerDashboard();

      expect(result.data).toEqual(mockDashboardData);
      expect(result.error).toBeUndefined();
      expect(apiClient.get).toHaveBeenCalledWith('/admin/trainer/dashboard', expect.any(Object));
    });

    it('should return dashboard data with date range params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockDashboardData,
      });

      const dateRange = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      const result = await getTrainerDashboard(dateRange);

      expect(result.data).toEqual(mockDashboardData);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/admin/trainer/dashboard?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z',
        expect.any(Object),
      );
    });

    it('should return error when API returns error response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'TRAINER_DASHBOARD_ERROR',
          message: 'Dashboard error',
          status: 500,
          retryable: false,
        },
      });

      const result = await getTrainerDashboard();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TRAINER_DASHBOARD_ERROR');
    });

    it('should return error when API returns invalid response (no data)', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: undefined,
      });

      const result = await getTrainerDashboard();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('getTrainerCompetencies', () => {
    const mockCompetencies: CompetencyDistribution[] = [
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
      {
        domain: 'technical',
        averageScore: 72.3,
        learnerCount: 38,
        distribution: {
          foundational: 8,
          operational: 12,
          consistent: 10,
          mastery: 8,
        },
      },
    ];

    it('should return competencies data when API returns success envelope', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockCompetencies,
      });

      const result = await getTrainerCompetencies();

      expect(result.data).toEqual(mockCompetencies);
      expect(result.error).toBeUndefined();
      expect(apiClient.get).toHaveBeenCalledWith('/admin/trainer/competencies', expect.any(Object));
    });

    it('should return competencies with date range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockCompetencies,
      });

      const result = await getTrainerCompetencies({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      });

      expect(result.data).toEqual(mockCompetencies);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/admin/trainer/competencies?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z',
        expect.any(Object),
      );
    });

    it('should return error when API returns error response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'COMPETENCIES_ERROR',
          message: 'Competencies error',
          status: 500,
          retryable: false,
        },
      });

      const result = await getTrainerCompetencies();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('COMPETENCIES_ERROR');
    });

    it('should return error when API returns invalid response (no data)', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: undefined,
      });

      const result = await getTrainerCompetencies();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('getTrainerErrors', () => {
    const mockErrorPatterns: ErrorPattern[] = [
      {
        pattern: 'incorrect-format',
        count: 15,
        domain: 'communication',
        recentOccurrences: ['2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', '2024-01-03T00:00:00Z'],
      },
      {
        pattern: 'missing-field',
        count: 8,
        domain: 'technical',
        recentOccurrences: ['2024-01-01T00:00:00Z'],
      },
    ];

    it('should return error patterns when API returns success envelope', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockErrorPatterns,
      });

      const result = await getTrainerErrors();

      expect(result.data).toEqual(mockErrorPatterns);
      expect(result.error).toBeUndefined();
      expect(apiClient.get).toHaveBeenCalledWith('/admin/trainer/errors', expect.any(Object));
    });

    it('should return error patterns with date range', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockErrorPatterns,
      });

      const result = await getTrainerErrors({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      });

      expect(result.data).toEqual(mockErrorPatterns);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/admin/trainer/errors?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z',
        expect.any(Object),
      );
    });

    it('should return error when API returns error response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'ERROR_PATTERNS_ERROR',
          message: 'Error patterns error',
          status: 500,
          retryable: false,
        },
      });

      const result = await getTrainerErrors();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('ERROR_PATTERNS_ERROR');
    });

    it('should return error when API returns invalid response (no data)', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: undefined,
      });

      const result = await getTrainerErrors();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('getTrainerCampaigns', () => {
    const mockCampaigns: CampaignCompletion[] = [
      {
        campaignId: 'campaign-1',
        campaignName: 'Onboarding Campaign',
        totalLearners: 150,
        completed: 75,
        inProgress: 45,
        notStarted: 30,
        completionRate: 0.5,
      },
      {
        campaignId: 'campaign-2',
        campaignName: 'Advanced Training',
        totalLearners: 80,
        completed: 40,
        inProgress: 25,
        notStarted: 15,
        completionRate: 0.5,
      },
    ];

    it('should return campaigns when API returns success envelope', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockCampaigns,
      });

      const result = await getTrainerCampaigns();

      expect(result.data).toEqual(mockCampaigns);
      expect(result.error).toBeUndefined();
      expect(apiClient.get).toHaveBeenCalledWith('/admin/trainer/campaigns', expect.any(Object));
    });

    it('should return error when API returns error response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'CAMPAIGNS_ERROR',
          message: 'Campaigns error',
          status: 500,
          retryable: false,
        },
      });

      const result = await getTrainerCampaigns();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CAMPAIGNS_ERROR');
    });

    it('should return error when API returns invalid response (no data)', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: undefined,
      });

      const result = await getTrainerCampaigns();

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('getTrainerLearners', () => {
    const mockLearners: LearnerSummary[] = [
      {
        userId: 'user-1',
        email: 'learner1@example.com',
        displayName: 'Learner One',
        score: 92,
        trend: 'improving',
        lastActivity: '2024-01-15T10:30:00Z',
      },
      {
        userId: 'user-2',
        email: 'learner2@example.com',
        displayName: 'Learner Two',
        score: 78,
        trend: 'stable',
        lastActivity: '2024-01-14T08:15:00Z',
      },
    ];

    it('should return learners for domain when API returns success envelope', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockLearners,
      });

      const result = await getTrainerLearners('communication');

      expect(result.data).toEqual(mockLearners);
      expect(result.error).toBeUndefined();
      expect(apiClient.get).toHaveBeenCalledWith(
        '/admin/trainer/learners/communication?threshold=50',
        expect.any(Object),
      );
    });

    it('should pass custom threshold to API', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockLearners,
      });

      const result = await getTrainerLearners('communication', 75);

      expect(result.data).toEqual(mockLearners);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/admin/trainer/learners/communication?threshold=75',
        expect.any(Object),
      );
    });

    it('should return error when API returns error response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        error: {
          category: 'server' as const,
          code: 'LEARNERS_ERROR',
          message: 'Learners error',
          status: 500,
          retryable: false,
        },
      });

      const result = await getTrainerLearners('communication');

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('LEARNERS_ERROR');
    });

    it('should return error when API returns invalid response (no data)', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: undefined,
      });

      const result = await getTrainerLearners('communication');

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INVALID_RESPONSE');
    });
  });
});
