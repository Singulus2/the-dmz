import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { LogLevel } from '@the-dmz/shared';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { tenants } from '../../../shared/database/schema/tenants.js';
import { getRefreshCookieName, csrfCookieName } from '../../auth/index.js';
import {
  createDualTenantFixture,
  type DualTenantFixture,
  type TestTenant,
} from '../../../__tests__/helpers/factory.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const createTestConfig = (logLevel: LogLevel = 'silent'): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: logLevel as LogLevel,
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
    TENANT_RESOLVER_ENABLED: true,
    TENANT_HEADER_NAME: 'x-tenant-id',
    TENANT_FALLBACK_ENABLED: false,
  };
};

const testConfig = createTestConfig('silent');

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

const createUserWithTenant = async (
  app: ReturnType<typeof buildApp>,
  tenantId: string,
  email: string,
  displayName: string,
): Promise<{ userId: string; tokens: AuthTokens; tenantId: string }> => {
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    headers: {
      'x-tenant-id': tenantId,
    },
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
  const csrfCookie = cookies.find((c) => c.name === csrfCookieName);

  const { accessToken, user } = registerResponse.json() as {
    accessToken: string;
    user: { id: string; tenantId: string };
  };

  return {
    userId: user.id,
    tenantId: user.tenantId,
    tokens: {
      accessToken,
      refreshToken: refreshTokenCookie?.value ?? '',
      csrfToken: csrfCookie?.value ?? '',
    },
  };
};

describe('consumer-leaderboard envelope', () => {
  const app = buildApp(testConfig);
  let fixture: DualTenantFixture;

  beforeAll(async () => {
    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await resetTestDatabase(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
    fixture = createDualTenantFixture('social');
  });

  const setupTenant = async (): Promise<{
    tenant: TestTenant;
    user: { userId: string; tokens: AuthTokens };
  }> => {
    const db = getDatabaseClient(testConfig);

    const [tenantRow] = await db
      .insert(tenants)
      .values({
        tenantId: fixture.tenantA.id,
        name: fixture.tenantA.name,
        slug: fixture.tenantA.slug,
        status: 'active',
      })
      .returning({ tenantId: tenants.tenantId });

    if (!tenantRow) {
      throw new Error('Failed to create tenant');
    }

    const tenant = { ...fixture.tenantA, id: tenantRow.tenantId };
    const user = await createUserWithTenant(
      app,
      tenant.id,
      fixture.userAStandard.email,
      fixture.userAStandard.displayName,
    );

    return { tenant, user };
  };

  describe('GET /api/v1/leaderboards', () => {
    it('returns response with data wrapper', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.leaderboards).toBeDefined();
      expect(Array.isArray(body.data.leaderboards)).toBe(true);
    });
  });

  describe('GET /api/v1/leaderboards/:leaderboardId', () => {
    it('returns response with data wrapper', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/leaderboards/me', () => {
    it('returns response with data wrapper', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/me',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.ranks).toBeDefined();
      expect(Array.isArray(body.data.ranks)).toBe(true);
    });
  });

  describe('GET /api/v1/leaderboards/me/position/:leaderboardId', () => {
    it('returns response with data wrapper', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/me/position/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/leaderboards/friends', () => {
    it('returns response with data wrapper', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/friends',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.entries).toBeDefined();
      expect(Array.isArray(body.data.entries)).toBe(true);
    });
  });

  describe('GET /api/v1/leaderboards/guild/:guildId', () => {
    it('returns response with data wrapper', async () => {
      const { user } = await setupTenant();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/leaderboards/guild/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
