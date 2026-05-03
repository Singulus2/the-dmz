import { describe, it, beforeEach, afterEach } from 'vitest';

import {
  assertSuccessEnvelope,
  assertErrorEnvelope,
  registerUser,
  createTestContext,
  seedTenantAuthModel,
} from './analytics.routes.envelope.shared.js';

describe('analytics routes API envelope format - health & metrics', () => {
  const ctx = createTestContext();

  beforeEach(async () => {
    await ctx.setup();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  describe('GET /api/v1/analytics/health', () => {
    it('returns success envelope with data.health on authenticated request', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/health',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'health');
      const data = body.data as Record<string, unknown>;
      expect(data.health as Record<string, unknown>).toHaveProperty('status');
      expect(data.health as Record<string, unknown>).toHaveProperty('details');
    });

    it('returns error envelope on missing authentication', async () => {
      const app = ctx.getApp();
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/health',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
    });
  });

  describe('GET /api/v1/analytics/metrics', () => {
    it('returns success envelope with data.metrics on authenticated request', async () => {
      const app = ctx.getApp();
      const testConfig = ctx.getConfig();
      if (!app || !testConfig) {
        throw new Error('App or testConfig not initialized');
      }

      const { accessToken, user } = await registerUser(app);
      await seedTenantAuthModel(testConfig, user.tenantId, [{ userId: user.id, role: 'player' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/metrics',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'metrics');
      const data = body.data as Record<string, unknown>;
      expect(data.metrics as Record<string, unknown>).toHaveProperty('eventsIngested');
      expect(data.metrics as Record<string, unknown>).toHaveProperty('eventsFailed');
    });

    it('returns error envelope on missing authentication', async () => {
      const app = ctx.getApp();
      if (!app) {
        throw new Error('App was not initialized');
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/metrics',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
    });
  });
});
