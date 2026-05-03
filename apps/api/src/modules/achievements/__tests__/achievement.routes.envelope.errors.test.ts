import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';

vi.mock('../../shared/database/connection.js', () => {
  const mockExecute = vi.fn().mockImplementation(() => {
    throw new Error('Database error');
  });
  const mockSelect = vi.fn().mockImplementation(() => {
    throw new Error('Database error');
  });
  const mockInsert = vi.fn().mockImplementation(() => {
    throw new Error('Database error');
  });
  const mockUpdate = vi.fn().mockImplementation(() => {
    throw new Error('Database error');
  });

  return {
    getDatabaseClient: vi.fn().mockReturnValue({
      execute: mockExecute,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }),
    getDatabasePool: vi.fn().mockReturnValue({
      unsafe: vi.fn().mockResolvedValue([]),
      end: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

vi.mock('../../../shared/middleware/authorization.js', async () => {
  const actual = await vi.importActual('../../../shared/middleware/authorization.js');
  return {
    ...actual,
    authGuard: async () => undefined,
    requirePermission: () => async () => undefined,
  };
});

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

describe('Achievement routes API envelope - 500 error handling', () => {
  const app = buildApp(createTestConfig());

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  const registerTestUser = async (email: string): Promise<string> => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'Valid' + 'Pass123!',
        displayName: 'Error Test User',
      },
    });
    if (response.statusCode === 201) {
      return response.json().accessToken;
    }
    return 'mock-token';
  };

  const assertInternalErrorEnvelope = (body: Record<string, unknown>) => {
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('object');
    const error = body.error as Record<string, unknown>;
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('details');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Internal server error');
    expect(error.details).toEqual({});
  };

  describe('GET /api/v1/achievements - 500 error', () => {
    it('returns INTERNAL_ERROR envelope when service throws', async () => {
      const token = await registerTestUser('error-achievements@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      assertInternalErrorEnvelope(body);
    });
  });

  describe('GET /api/v1/players/me/achievements - 500 error', () => {
    it('returns INTERNAL_ERROR envelope when service throws', async () => {
      const token = await registerTestUser('error-me-achievements@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/me/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      assertInternalErrorEnvelope(body);
    });
  });

  describe('GET /api/v1/players/:playerId/achievements - 500 error', () => {
    it('returns INTERNAL_ERROR envelope when service throws', async () => {
      const token = await registerTestUser('error-player-achievements@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/players/00000000-0000-0000-0000-000000000001/achievements',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      assertInternalErrorEnvelope(body);
    });
  });

  describe('POST /api/v1/players/me/achievements/:id/share - 500 error', () => {
    it('returns INTERNAL_ERROR envelope when service throws', async () => {
      const token = await registerTestUser('error-share@example.com');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/players/me/achievements/00000000-0000-0000-0000-000000000001/share',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      assertInternalErrorEnvelope(body);
    });
  });

  describe('GET /api/v1/achievements/enterprise - 500 error', () => {
    it('returns INTERNAL_ERROR envelope when service throws', async () => {
      const token = await registerTestUser('error-enterprise@example.com');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/achievements/enterprise',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      assertInternalErrorEnvelope(body);
    });
  });
});
