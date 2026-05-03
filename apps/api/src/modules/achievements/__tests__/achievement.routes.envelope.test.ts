import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
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

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);

  const pool = getDatabasePool(testConfig);
  try {
    await pool.unsafe(`TRUNCATE TABLE "auth"."oauth_clients" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  await ensureTenantColumns(testConfig);
};

describe('Achievement routes API envelope format', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await resetTestData();
    app = await buildApp(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  const registerTestUser = async (email: string): Promise<string> => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'Valid' + 'Pass123!',
        displayName: 'Envelope Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    return registerResponse.json().accessToken;
  };

  const assertSuccessEnvelope = (body: Record<string, unknown>, dataKey: string) => {
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
    expect(body.data as Record<string, unknown>).toHaveProperty(dataKey);
  };

  const assertErrorEnvelope = (body: Record<string, unknown>) => {
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('object');
    const error = body.error as Record<string, unknown>;
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('details');
  };

  describe('GET /api/v1/achievements', () => {
    it('returns success envelope with data.achievements on authenticated request', async () => {
      const token = await registerTestUser('envelope-list@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'achievements');
      expect(Array.isArray((body.data as Record<string, unknown>).achievements)).toBe(true);
    });

    it('returns error envelope on missing tenant context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/players/me/achievements', () => {
    it('returns success envelope with data.achievements on authenticated request', async () => {
      const token = await registerTestUser('envelope-me@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'achievements');
      expect(Array.isArray((body.data as Record<string, unknown>).achievements)).toBe(true);
    });

    it('returns error envelope on missing authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/players/:playerId/achievements', () => {
    it('returns success envelope with data.achievements on valid playerId', async () => {
      const token = await registerTestUser('envelope-player@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/00000000-0000-0000-0000-000000000001/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'achievements');
      expect(Array.isArray((body.data as Record<string, unknown>).achievements)).toBe(true);
    });

    it('returns error envelope on missing tenant context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/00000000-0000-0000-0000-000000000001/achievements',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/players/me/achievements/:id/share', () => {
    it('returns success envelope with data.shared after toggle', async () => {
      const token = await registerTestUser('envelope-share@example.com');

      const achievementsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(achievementsResponse.statusCode).toBe(200);
      const achievementsBody = achievementsResponse.json();
      const achievements = (achievementsBody.data as Record<string, unknown>)
        .achievements as Array<{ id: string }>;
      if (achievements.length === 0) {
        throw new Error('No achievements available for testing');
      }
      const achievementId = achievements[0].id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/players/me/achievements/${achievementId}/share`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'shared');
      expect(body.data as Record<string, unknown>).toHaveProperty('shared');
    });

    it('returns error envelope on missing authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/players/me/achievements/00000000-0000-0000-0000-000000000001/share',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('returns error envelope with NOT_FOUND when achievement does not exist', async () => {
      const token = await registerTestUser('envelope-share-notfound@example.com');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/players/me/achievements/00000000-0000-0000-0000-000000000001/share',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('GET /api/v1/achievements/enterprise', () => {
    it('returns success envelope with data.achievements on authenticated request', async () => {
      const token = await registerTestUser('envelope-enterprise@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      assertSuccessEnvelope(body, 'achievements');
      expect(Array.isArray((body.data as Record<string, unknown>).achievements)).toBe(true);
    });

    it('returns error envelope on missing tenant context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      assertErrorEnvelope(body);
      const error = body.error as Record<string, unknown>;
      expect(error.code).toBe('AUTH_UNAUTHORIZED');
    });
  });
});
