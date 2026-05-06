import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FastifyInstance } from 'fastify';

import { createTestId } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import { seedTenantAuthModel } from '../../../shared/database/seed.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const registerAdminUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `error-envelope-test-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Error Envelope Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  const result = response.json() as { accessToken: string; user: { id: string; tenantId: string } };
  await seedTenantAuthModel(testConfig, result.user.tenantId, [
    { userId: result.user.id, role: 'tenant_admin' },
  ]);

  return result;
};

const registerSuperAdminUser = async (
  app: FastifyInstance,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `error-envelope-superadmin-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Error Envelope SuperAdmin Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${response.statusCode} ${response.body}`);
  }

  const result = response.json() as { accessToken: string; user: { id: string; tenantId: string } };
  await seedTenantAuthModel(testConfig, result.user.tenantId, [
    { userId: result.user.id, role: 'super_admin' },
  ]);

  return result;
};

describe('admin routes error envelope details field', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
  });

  describe('campaign.handlers - error responses include details field', () => {
    it('handleCreateCampaign returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/campaigns',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Campaign',
          campaignType: 'phishing',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleListCampaigns returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/campaigns',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleGetCampaign returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleUpdateCampaign returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleDeleteCampaign returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleCampaignStatusUpdate returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001/status',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { status: 'active' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleCampaignAudienceUpdate returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001/audience',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { groupIds: [] },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleCampaignContent returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001/content',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { content: 'test' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('handleCampaignProgress returns details field with tenant context error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/campaigns/00000000-0000-0000-0000-000000000001/progress',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Tenant context required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('phishing-simulation.routes - error responses include details field', () => {
    it('GET /api/v1/admin/simulations/:id returns details field with NOT_FOUND error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Simulation not found');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('phishing-simulation-templates.routes - error responses include details field', () => {
    it('GET /api/v1/admin/simulations/templates/:templateId returns details field with NOT_FOUND error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/templates/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Template not found');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('phishing-simulation-teachable-moments.routes - error responses include details field', () => {
    it('GET /api/v1/admin/simulations/teachable-moments/:id returns details field with NOT_FOUND error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/teachable-moments/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Teachable moment not found');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('phishing-simulation-results.routes - error responses include details field', () => {
    it('GET /api/v1/admin/simulations/results/:id returns details field with NOT_FOUND error', async () => {
      const { accessToken } = await registerAdminUser(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/simulations/results/00000000-0000-0000-0000-000000000001',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Simulation not found');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('admin-tenants.routes - error responses include details field', () => {
    it('POST /admin/tenants returns details field with TENANT_CREATION_FAILED error', async () => {
      const { accessToken } = await registerSuperAdminUser(app);

      const response = await app.inject({
        method: 'POST',
        url: '/admin/tenants',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          name: 'Test Tenant',
          slug: 'test-tenant',
          adminEmail: 'admin@test.com',
          adminDisplayName: 'Test Admin',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TENANT_CREATION_FAILED');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('admin-roles.routes - error responses include details field', () => {
    it('POST /api/v1/admin/roles/assign returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/roles/assign',
        payload: { userId: 'test', role: 'tenant_admin' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('POST /api/v1/admin/roles/revoke returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/roles/revoke',
        payload: { userId: 'test', role: 'tenant_admin' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('admin-users.routes - error responses include details field', () => {
    it('GET /api/v1/admin/users returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('GET /api/v1/admin/users/:id returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('POST /api/v1/admin/users returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/users',
        payload: { email: 'test@test.com' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('PUT /api/v1/admin/users/:id returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/users/00000000-0000-0000-0000-000000000001',
        payload: { displayName: 'Test' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('DELETE /api/v1/admin/users/:id returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/users/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });

  describe('onboarding.routes - error responses include details field', () => {
    it('GET /api/v1/admin/onboarding/status returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/onboarding/status',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });

    it('POST /api/v1/admin/onboarding/step returns details field with UNAUTHORIZED error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/onboarding/step',
        payload: { step: 'test' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.details).toBeDefined();
      expect(typeof body.error.details).toBe('object');
    });
  });
});