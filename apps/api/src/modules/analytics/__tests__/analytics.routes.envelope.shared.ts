import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { expect, vi } from 'vitest';

const phishingMetricsServiceMock = vi.hoisted(() => ({
  computeAggregatedMetrics: vi.fn(),
}));

const decisionQualityServiceMock = vi.hoisted(() => ({
  computePlayerScore: vi.fn(),
  computeAllPlayerScores: vi.fn(),
  computeTrends: vi.fn(),
}));

const analyticsServiceMock = vi.hoisted(() => ({
  getHealth: vi.fn().mockReturnValue({
    status: 'healthy',
    details: {
      circuitBreaker: 'closed',
      queueDepth: 0,
      queueMaxSize: 1000,
      eventsIngested: 0,
      eventsFailed: 0,
      lastProcessedAt: null,
    },
  }),
  getMetrics: vi.fn().mockReturnValue({
    eventsIngested: 100,
    eventsFailed: 5,
    eventsRetried: 2,
    queueDepth: 10,
    processingLatencyMs: 50,
    lastProcessedAt: new Date('2024-01-15T10:30:00Z'),
  }),
}));

vi.mock('../phishing-metrics.service.js', async () => {
  const actual = await vi.importActual('../phishing-metrics.service.js');
  return {
    ...actual,
    PhishingMetricsService: vi.fn().mockImplementation(() => phishingMetricsServiceMock),
  };
});

vi.mock('../decision-quality.service.js', async () => {
  const actual = await vi.importActual('../decision-quality.service.js');
  return {
    ...actual,
    DecisionQualityService: vi.fn().mockImplementation(() => decisionQualityServiceMock),
  };
});

import {
  createIsolatedDatabase,
  createIsolatedTestConfig,
  createTestId,
} from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabaseClient } from '../../../shared/database/connection.js';
import { seedDatabase, seedTenantAuthModel } from '../../../shared/database/seed.js';

import type { FastifyInstance } from 'fastify';
import type { AnalyticsService } from '../analytics.service.js';

const migrationsFolder = fileURLToPath(
  new URL('../../../shared/database/migrations', import.meta.url),
);

const assertSuccessEnvelope = (body: Record<string, unknown>, dataKey?: string) => {
  expect(body).toHaveProperty('success');
  expect(body.success).toBe(true);
  expect(body).toHaveProperty('data');
  expect(typeof body.data).toBe('object');
  if (dataKey) {
    expect(body.data as Record<string, unknown>).toHaveProperty(dataKey);
  }
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

const registerUser = async (
  app: FastifyInstance,
  email?: string,
): Promise<{ accessToken: string; user: { id: string; tenantId: string } }> => {
  const unique = email ?? createTestId();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `analytics-envelope-${unique}@archive.test`,
      password: 'Valid' + 'Pass123!',
      displayName: 'Analytics Envelope Test',
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to register analytics envelope test user: ${response.statusCode}`);
  }

  return response.json() as { accessToken: string; user: { id: string; tenantId: string } };
};

const createTestContext = () => {
  let app: FastifyInstance | undefined;
  let testConfig: AppConfig | undefined;
  let cleanupDatabase: (() => Promise<void>) | undefined;

  const setup = async () => {
    vi.restoreAllMocks();

    const databaseName = `dmz_t_are_${randomUUID().replace(/-/g, '_')}`;
    testConfig = createIsolatedTestConfig(databaseName);
    cleanupDatabase = await createIsolatedDatabase(testConfig);

    const db = getDatabaseClient(testConfig);
    await migrate(db, { migrationsFolder });
    await db.execute(
      sql`ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(128)`,
    );
    await seedDatabase(testConfig);

    app = buildApp(testConfig, { skipHealthCheck: true });
    await app.ready();

    app.decorate('analytics', analyticsServiceMock as unknown as AnalyticsService);
  };

  const teardown = async () => {
    vi.restoreAllMocks();
    if (app) {
      await app.close();
    }
    app = undefined;
    await closeDatabase();
    if (cleanupDatabase) {
      await cleanupDatabase();
    }
    cleanupDatabase = undefined;
    testConfig = undefined;
  };

  return { setup, teardown, getApp: () => app, getConfig: () => testConfig };
};

export {
  assertSuccessEnvelope,
  assertErrorEnvelope,
  registerUser,
  createTestContext,
  phishingMetricsServiceMock,
  decisionQualityServiceMock,
  analyticsServiceMock,
  seedTenantAuthModel,
};
