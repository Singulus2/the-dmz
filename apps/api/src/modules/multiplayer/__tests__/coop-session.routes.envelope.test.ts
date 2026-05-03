import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { coopSessionBootstrapSchema } from '@the-dmz/shared/schemas';

import { playerProfiles } from '#/db/schema/social/player-profiles.js';
import { buildApp } from '#/app.js';
import { loadConfig, type AppConfig } from '#/config.js';
import { closeDatabase, getDatabaseClient } from '#/shared/database/connection.js';
import { resetTestDatabase, ensureTenantColumns } from '#/__tests__/helpers/db.js';
import { getRefreshCookieName } from '#/modules/auth/cookies.js';

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

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const createUserAndGetTokens = async (
  app: ReturnType<typeof buildApp>,
  email: string,
  displayName: string,
): Promise<{ userId: string; tenantId: string; tokens: AuthTokens; profileId: string }> => {
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email,
      password: 'Valid' + 'Pass123!',
      displayName,
    },
  });

  if (registerResponse.statusCode !== 201) {
    throw new Error(
      `Failed to create user: ${registerResponse.statusCode} - ${registerResponse.body}`,
    );
  }

  const cookies = registerResponse.cookies;
  const refreshTokenCookie = cookies.find((c) => c.name === getRefreshCookieName());

  const body = registerResponse.json() as {
    accessToken: string;
    user: { id: string; tenantId: string };
  };

  const db = getDatabaseClient(testConfig);
  const [profile] = await db
    .insert(playerProfiles)
    .values({
      profileId: body.user.id,
      tenantId: body.tenantId,
      displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ profileId: playerProfiles.profileId });

  return {
    userId: body.user.id,
    tenantId: body.tenantId,
    tokens: {
      accessToken: body.accessToken,
      refreshToken: refreshTokenCookie?.value ?? '',
    },
    profileId: profile.profileId,
  };
};

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);
  await ensureTenantColumns(testConfig);

  const pool = getDatabaseClient(testConfig);
  try {
    await pool.unsafe(
      `TRUNCATE TABLE "multiplayer"."coop_decision_proposal" RESTART IDENTITY CASCADE`,
    );
    await pool.unsafe(
      `TRUNCATE TABLE "multiplayer"."coop_role_assignment" RESTART IDENTITY CASCADE`,
    );
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."coop_session" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."party_member" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "multiplayer"."party" RESTART IDENTITY CASCADE`);
    await pool.unsafe(`TRUNCATE TABLE "social"."player_profiles" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }
};

describe('coop session API envelope format', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    try {
      await app.close();
    } catch {
      // App may not be ready or already closed
    }
  });

  beforeEach(async () => {
    await resetTestData();
  });

  let user1: { userId: string; tenantId: string; tokens: AuthTokens; profileId: string };
  let user2: { userId: string; tenantId: string; tokens: AuthTokens; profileId: string };
  let party1Id: string;

  it('registers two users and creates a party', async () => {
    user1 = await createUserAndGetTokens(
      app,
      `coop-env-user1-${Date.now()}@archive.test`,
      'Coop Env User 1',
    );
    user2 = await createUserAndGetTokens(
      app,
      `coop-env-user2-${Date.now()}@archive.test`,
      'Coop Env User 2',
    );

    const partyResponse1 = await app.inject({
      method: 'POST',
      url: '/api/v1/parties',
      headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      payload: {},
    });

    expect(partyResponse1.statusCode).toBe(200);
    const partyBody1 = partyResponse1.json() as { party: { partyId: string } };
    party1Id = partyBody1.party.partyId;

    const partyResponse2 = await app.inject({
      method: 'POST',
      url: '/api/v1/parties',
      headers: { authorization: `Bearer ${user2.tokens.accessToken}` },
      payload: {},
    });

    expect(partyResponse2.statusCode).toBe(200);
  });

  describe('POST /api/v1/coop/sessions', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('GET /api/v1/coop/sessions/:sessionId', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/coop/sessions/${createdSessionId}`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('POST /api/v1/coop/:sessionId/start', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/${createdSessionId}/start`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          scenarioId: 'triage-training-01',
          difficultyTier: 'training',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('POST /api/v1/coop/sessions/:sessionId/advance-day', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/${createdSessionId}/start`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          scenarioId: 'triage-training-01',
          difficultyTier: 'training',
        },
      });
      expect(startResponse.statusCode).toBe(200);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/sessions/${createdSessionId}/advance-day`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('POST /api/v1/coop/sessions/:sessionId/roles', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/sessions/${createdSessionId}/roles`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          player1Id: user1.profileId,
          player2Id: user2.profileId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('PUT /api/v1/coop/sessions/:sessionId/authority', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/${createdSessionId}/start`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          scenarioId: 'triage-training-01',
          difficultyTier: 'training',
        },
      });
      expect(startResponse.statusCode).toBe(200);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/coop/sessions/${createdSessionId}/authority`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('POST /api/v1/coop/sessions/:sessionId/end', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/${createdSessionId}/start`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          scenarioId: 'triage-training-01',
          difficultyTier: 'training',
        },
      });
      expect(startResponse.statusCode).toBe(200);

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/sessions/${createdSessionId}/end`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('DELETE /api/v1/coop/sessions/:sessionId', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/coop/sessions/${createdSessionId}`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });

  describe('POST /api/v1/coop/:sessionId/role-preference', () => {
    it('returns success envelope with data.bootstrap containing schemaVersion', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/coop/sessions',
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          partyId: party1Id,
          seed: '12345678901234567890123456789012',
        },
      });

      const createBody = createResponse.json() as { data?: { sessionId?: string } };
      const createdSessionId = createBody.data?.sessionId;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/coop/${createdSessionId}/role-preference`,
        headers: { authorization: `Bearer ${user1.tokens.accessToken}` },
        payload: {
          playerId: user1.profileId,
          preference: 'archivist',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as Record<string, unknown>;

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);

      expect(body).toHaveProperty('data');
      expect(typeof body.data).toBe('object');

      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('schemaVersion');
      expect(data.schemaVersion).toBe(1);

      expect(coopSessionBootstrapSchema.safeParse(data).success).toBe(true);
    });
  });
});
