import { z } from 'zod';

import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { analyticsReadRoutePreHandlers } from '../../shared/routes/content-routes-config.js';

import { PhishingMetricsService } from './phishing-metrics.service.js';
import { DecisionQualityService } from './decision-quality.service.js';
import { metricsCache } from './metrics-cache.js';

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

const metricsResponseSchema = z.object({
  eventsIngested: z.number(),
  eventsFailed: z.number(),
  eventsRetried: z.number(),
  queueDepth: z.number(),
  processingLatencyMs: z.number(),
  lastProcessedAt: z.string().nullable(),
});

const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  details: z.record(z.unknown()),
});

const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .optional();

const phishingMetricsRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  dateRange: dateRangeSchema,
});

const phishingMetricsResponseSchema = z.object({
  clickRate: z.number(),
  reportRate: z.number(),
  falsePositiveRate: z.number(),
  meanTimeToReportSeconds: z.number().nullable(),
  meanTimeToDecisionSeconds: z.number().nullable(),
  suspiciousIndicatorFlaggingRate: z.number(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  sampleSize: z.number(),
});

const scoringRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  dateRange: dateRangeSchema,
});

const decisionQualityScoreSchema = z.object({
  overallScore: z.number(),
  weightedCorrectness: z.number(),
  difficultyAdjustedScore: z.number(),
  contextWeightedScore: z.number(),
  competencyBreakdown: z.record(z.string(), z.number()),
  experienceLevel: z.enum(['new', 'intermediate', 'experienced', 'expert']),
  evidenceCount: z.number(),
});

const scoringResponseSchema = z.object({
  userId: z.string().uuid(),
  scores: decisionQualityScoreSchema,
  percentileRank: z.number().optional(),
  trend: z.enum(['improving', 'declining', 'stable']).optional(),
  previousScore: z.number().optional(),
});

const scoringListResponseSchema = z.array(scoringResponseSchema);

const trendsRequestSchema = z.object({
  weeks: z.number().min(1).max(12).optional(),
  months: z.number().min(1).max(12).optional(),
});

const trendPeriodSchema = z.object({
  period: z.string(),
  averageScore: z.number(),
  playerCount: z.number(),
  weekOverWeekChange: z.number().optional(),
  monthOverMonthChange: z.number().optional(),
});

const trendsResponseSchema = z.object({
  weeklyTrends: z.array(trendPeriodSchema),
  monthlyTrends: z.array(trendPeriodSchema),
  improvementRate: z.number(),
  decliningRate: z.number(),
  stableRate: z.number(),
});

type ErrorEnvelope = {
  success: false;
  error: { code: string; message: string; details: Record<string, unknown> };
};

const buildErrorEnvelope = (code: string, message: string): ErrorEnvelope => ({
  success: false,
  error: { code, message, details: {} },
});

const resolveTenantId = (user: AuthenticatedUser, targetTenantId?: string): string => {
  if (user.role === 'super_admin' && targetTenantId) {
    return targetTenantId;
  }
  return user.tenantId;
};

const authorizeTargetTenant = (
  user: AuthenticatedUser,
  targetTenantId?: string,
): ErrorEnvelope | null => {
  if (user.role !== 'super_admin' && targetTenantId) {
    return buildErrorEnvelope('AUTH_FORBIDDEN', 'Target tenant override not permitted');
  }
  return null;
};

declare module 'fastify' {
  interface FastifyInstance {
    phishingMetrics: PhishingMetricsService;
    decisionQuality: DecisionQualityService;
  }
}

const buildDateRange = (dateRange?: {
  startDate?: string | undefined;
  endDate?: string | undefined;
}) => {
  const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : undefined;
  const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : undefined;
  return { startDate, endDate };
};

type ScoreInput = {
  tenantId: string;
  userId: string;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
};

const computeSinglePlayerScore = async (fastify: FastifyInstance, input: ScoreInput) => {
  const { tenantId, userId, startDate, endDate } = input;
  const cacheKey = `scoring:${tenantId}:${userId}:${startDate?.toISOString() ?? 'default'}:${endDate?.toISOString() ?? 'now'}`;

  const cached = metricsCache.get<z.infer<typeof scoringResponseSchema>>(cacheKey);
  if (cached) {
    return { cached };
  }

  const scoreInput: ScoreInput = { tenantId, userId };
  if (startDate) scoreInput.startDate = startDate;
  if (endDate) scoreInput.endDate = endDate;

  const augmentedFastify = fastify as FastifyInstance & {
    decisionQuality: DecisionQualityService;
  };
  const score = await augmentedFastify.decisionQuality.computePlayerScore(scoreInput);

  if (!score) {
    return { notFound: true };
  }

  metricsCache.set(cacheKey, score, 60000);
  return { score };
};

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('phishingMetrics', new PhishingMetricsService(fastify.db));
  fastify.decorate('decisionQuality', new DecisionQualityService(fastify.db));

  fastify.get(
    '/health',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        response: {
          200: healthResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
      },
    },
    async (_request, reply) => {
      const health = fastify.analytics.getHealth();
      return reply.send({ success: true, data: { health } });
    },
  );

  fastify.get(
    '/metrics',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        response: {
          200: metricsResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
      },
    },
    async (_request, reply) => {
      const metrics = fastify.analytics.getMetrics();
      return reply.send({
        success: true,
        data: {
          metrics: {
            ...metrics,
            lastProcessedAt: metrics.lastProcessedAt?.toISOString() ?? null,
          },
        },
      });
    },
  );

  fastify.post(
    '/phishing',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        body: phishingMetricsRequestSchema,
        querystring: z.object({
          targetTenantId: z.string().uuid().optional(),
        }),
        response: {
          200: phishingMetricsResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { targetTenantId } = request.query as { targetTenantId?: string };
      const tenantId = resolveTenantId(user, targetTenantId);

      const authError = authorizeTargetTenant(user, targetTenantId);
      if (authError) {
        return reply.status(403).send(authError);
      }

      const { userId, dateRange } = request.body as z.infer<typeof phishingMetricsRequestSchema>;
      const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : undefined;
      const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : undefined;

      const cacheKey = `phishing:${tenantId}:${userId ?? 'all'}:${startDate?.toISOString() ?? 'default'}:${endDate?.toISOString() ?? 'now'}`;

      const cached = metricsCache.get<z.infer<typeof phishingMetricsResponseSchema>>(cacheKey);
      if (cached) {
        return reply.send({ success: true, data: { phishingMetrics: cached } });
      }

      const metrics = await fastify.phishingMetrics.computeAggregatedMetrics(
        tenantId,
        startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate ?? new Date(),
      );

      metricsCache.set(cacheKey, metrics, 60000);

      return reply.send({ success: true, data: { phishingMetrics: metrics } });
    },
  );

  fastify.post(
    '/scoring',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        body: scoringRequestSchema,
        querystring: z.object({
          targetTenantId: z.string().uuid().optional(),
        }),
        response: {
          200: z.union([scoringResponseSchema, scoringListResponseSchema]),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { targetTenantId } = request.query as { targetTenantId?: string };
      const tenantId = resolveTenantId(user, targetTenantId);

      const authError = authorizeTargetTenant(user, targetTenantId);
      if (authError) {
        return reply.status(403).send(authError);
      }

      const { userId, dateRange } = request.body as z.infer<typeof scoringRequestSchema>;
      const { startDate, endDate } = buildDateRange(dateRange);

      if (userId) {
        const result = await computeSinglePlayerScore(fastify, {
          tenantId,
          userId,
          startDate,
          endDate,
        });

        if ('notFound' in result) {
          return reply.status(404).send(buildErrorEnvelope('NOT_FOUND', 'Player not found'));
        }
        if ('cached' in result) {
          return reply.send({ success: true, data: { score: result.cached } });
        }
        return reply.send({ success: true, data: { score: result.score } });
      }

      const scores = await fastify.decisionQuality.computeAllPlayerScores(tenantId);
      return reply.send({ success: true, data: { scores } });
    },
  );

  fastify.post(
    '/trends',
    {
      preHandler: analyticsReadRoutePreHandlers,
      schema: {
        body: trendsRequestSchema,
        querystring: z.object({
          targetTenantId: z.string().uuid().optional(),
        }),
        response: {
          200: trendsResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
        },
      },
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;
      const { targetTenantId } = request.query as { targetTenantId?: string };
      const tenantId = resolveTenantId(user, targetTenantId);

      const authError = authorizeTargetTenant(user, targetTenantId);
      if (authError) {
        return reply.status(403).send(authError);
      }

      const { weeks, months } = request.body as z.infer<typeof trendsRequestSchema>;
      const cacheKey = `trends:${tenantId}:${weeks ?? 4}:${months ?? 3}`;

      const cached = metricsCache.get<z.infer<typeof trendsResponseSchema>>(cacheKey);
      if (cached) {
        return reply.send({ success: true, data: { trends: cached } });
      }

      const trends = await fastify.decisionQuality.computeTrends(tenantId, weeks ?? 4, months ?? 3);

      metricsCache.set(cacheKey, trends, 300000);

      return reply.send({ success: true, data: { trends } });
    },
  );
};

export { analyticsRoutes };
