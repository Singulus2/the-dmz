import { randomUUID } from 'crypto';

import { describe, it, beforeEach, afterEach } from 'vitest';

import {
  assertSuccessEnvelope,
  assertErrorEnvelope,
  registerUser,
  createTestContext,
  seedTenantAuthModel,
  phishingMetricsServiceMock,
} from './analytics.routes.envelope.shared.js';

describe('analytics routes API envelope format - phishing', () => {
  const ctx = createTestContext();

  beforeEach(async () => {
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  describe('POST /api/v1/analytics/phishing', () => {
    it('returns success envelope with data.phishingMetrics on authenticated request', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      phishingMetricsServiceMock.computeAggregatedMetrics.mockResolvedValue({
        clickRate: 0.1,
        reportRate: 0.5,
        falsePositiveRate: 0.05,
        meanTimeToReportSeconds: 120,
        meanTimeToDecisionSeconds: 60,
        suspiciousIndicatorFlaggingRate: 0.8,
        period: { start: new Date().toISOString(), end: new Date().toISOString() },
        sampleSize: 100,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/phishing',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'phishingMetrics');
      const data = body.data as Record<string, unknown>;
      expect(data.phishingMetrics as Record<string, unknown>).toHaveProperty('clickRate');
      expect(data.phishingMetrics as Record<string, unknown>).toHaveProperty('reportRate');
    });

    it('returns success envelope with data.phishingMetrics from cache', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const cachedMetrics = {
        clickRate: 0.15,
        reportRate: 0.55,
        falsePositiveRate: 0.03,
        meanTimeToReportSeconds: 100,
        meanTimeToDecisionSeconds: 50,
        suspiciousIndicatorFlaggingRate: 0.85,
        period: { start: new Date().toISOString(), end: new Date().toISOString() },
        sampleSize: 200,
      };

      phishingMetricsServiceMock.computeAggregatedMetrics.mockResolvedValue(cachedMetrics);

      const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/phishing',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response1.statusCode).toBe(200);
      const body1 = response1.json();
      assertSuccessEnvelope(body1, 'phishingMetrics');
    });

    it('returns error envelope on missing authentication', async () => {
      const app = ctx.getApp();
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/phishing',
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
        url: `/api/v1/analytics/phishing?targetTenantId=${otherTenantId}`,
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
      expect(error.message).toBe('Target tenant override not permitted');
    });
  });
});
