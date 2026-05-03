import { randomUUID } from 'crypto';

import { describe, it, beforeEach, afterEach } from 'vitest';

import {
  assertSuccessEnvelope,
  assertErrorEnvelope,
  registerUser,
  createTestContext,
  seedTenantAuthModel,
  decisionQualityServiceMock,
} from './analytics.routes.envelope.shared.js';

describe('analytics routes API envelope format - scoring & trends', () => {
  const ctx = createTestContext();

  beforeEach(async () => {
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  describe('POST /api/v1/analytics/scoring', () => {
    it('returns success envelope with data.score on single user scoring', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      decisionQualityServiceMock.computePlayerScore.mockResolvedValue({
        userId: user.id,
        scores: {
          overallScore: 85,
          weightedCorrectness: 0.9,
          difficultyAdjustedScore: 82,
          contextWeightedScore: 88,
          competencyBreakdown: { email: 90, link: 80 },
          experienceLevel: 'experienced',
          evidenceCount: 50,
        },
        percentileRank: 75,
        trend: 'improving',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/scoring',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { userId: user.id },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'score');
      const data = body.data as Record<string, unknown>;
      expect(data.score as Record<string, unknown>).toHaveProperty('userId');
      expect(data.score as Record<string, unknown>).toHaveProperty('scores');
    });

    it('returns success envelope with data.scores on all players scoring', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      decisionQualityServiceMock.computeAllPlayerScores.mockResolvedValue([
        {
          userId: user.id,
          scores: {
            overallScore: 85,
            weightedCorrectness: 0.9,
            difficultyAdjustedScore: 82,
            contextWeightedScore: 88,
            competencyBreakdown: { email: 90, link: 80 },
            experienceLevel: 'experienced',
            evidenceCount: 50,
          },
        },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/scoring',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'scores');
      const data = body.data as Record<string, unknown>;
      expect(Array.isArray(data.scores)).toBe(true);
      expect((data.scores as Array<Record<string, unknown>>)[0]).toHaveProperty('userId');
    });

    it('returns error envelope with NOT_FOUND when player does not exist', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      decisionQualityServiceMock.computePlayerScore.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/scoring',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { userId: '00000000-0000-0000-0000-000000000001' },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('NOT_FOUND');
    });

    it('returns error envelope on missing authentication', async () => {
      const app = ctx.getApp();
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/scoring',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
    });

    it('returns error envelope with AUTH_FORBIDDEN when non-super-admin uses targetTenantId', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const otherTenantId = randomUUID();

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/analytics/scoring?targetTenantId=${otherTenantId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_FORBIDDEN');
    });
  });

  describe('POST /api/v1/analytics/trends', () => {
    it('returns success envelope with data.trends on authenticated request', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      decisionQualityServiceMock.computeTrends.mockResolvedValue({
        weeklyTrends: [
          {
            period: '2024-W01',
            averageScore: 75,
            playerCount: 100,
            weekOverWeekChange: 2.5,
          },
        ],
        monthlyTrends: [
          {
            period: '2024-M01',
            averageScore: 73,
            playerCount: 450,
            monthOverMonthChange: 5.0,
          },
        ],
        improvementRate: 0.35,
        decliningRate: 0.2,
        stableRate: 0.45,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/trends',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { weeks: 4, months: 3 },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'trends');
      const data = body.data as Record<string, unknown>;
      expect(data.trends as Record<string, unknown>).toHaveProperty('weeklyTrends');
      expect(data.trends as Record<string, unknown>).toHaveProperty('monthlyTrends');
      expect(data.trends as Record<string, unknown>).toHaveProperty('improvementRate');
    });

    it('returns success envelope with data.trends from cache', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const cachedTrends = {
        weeklyTrends: [],
        monthlyTrends: [],
        improvementRate: 0.3,
        decliningRate: 0.25,
        stableRate: 0.45,
      };

      decisionQualityServiceMock.computeTrends.mockResolvedValue(cachedTrends);

      const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/trends',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { weeks: 4, months: 3 },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = response1.json();
      assertSuccessEnvelope(body1, 'trends');
    });

    it('returns error envelope on missing authentication', async () => {
      const app = ctx.getApp();
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/trends',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
    });

    it('returns error envelope with AUTH_FORBIDDEN when non-super-admin uses targetTenantId', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const otherTenantId = randomUUID();

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/analytics/trends?targetTenantId=${otherTenantId}`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_FORBIDDEN');
    });
  });
});
