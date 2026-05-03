import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AchievementService } from './achievement.service.js';

async function registerAchievementRoutes(
  fastify: FastifyInstance,
  _config: unknown,
  service: AchievementService,
): Promise<void> {
  fastify.get('/api/v1/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as FastifyRequest & { tenantId: string }).tenantId;
      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          error: { code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized', details: {} },
        });
      }

      const achievements = await service.getAllAchievementDefinitions(tenantId);
      return reply.send({ success: true, data: { achievements } });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
      });
    }
  });

  fastify.get(
    '/api/v1/players/me/achievements',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as FastifyRequest & { userId: string }).userId;
        const tenantId = (request as FastifyRequest & { tenantId: string }).tenantId;

        if (!userId || !tenantId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized', details: {} },
          });
        }

        const playerId = await service.getPlayerByUserId(userId, tenantId);
        if (!playerId) {
          return reply.status(404).send({
            success: false,
            error: { code: 'RESOURCE_NOT_FOUND', message: 'Player profile not found', details: {} },
          });
        }

        const achievements = await service.getPlayerAchievements(playerId, tenantId);
        return reply.send({ success: true, data: { achievements } });
      } catch (error) {
        console.error('Error fetching player achievements:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
        });
      }
    },
  );

  fastify.get<{ Params: { playerId: string } }>(
    '/api/v1/players/:playerId/achievements',
    async (request, reply) => {
      try {
        const tenantId = (request as FastifyRequest & { tenantId: string }).tenantId;
        const { playerId } = request.params;

        if (!tenantId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized', details: {} },
          });
        }

        const achievements = await service.getPublicPlayerAchievements(playerId, tenantId);
        return reply.send({ success: true, data: { achievements } });
      } catch (error) {
        console.error('Error fetching player achievements:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
        });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/players/me/achievements/:id/share',
    async (request, reply) => {
      try {
        const userId = (request as FastifyRequest & { userId: string }).userId;
        const tenantId = (request as FastifyRequest & { tenantId: string }).tenantId;
        const { id } = request.params;

        if (!userId || !tenantId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized', details: {} },
          });
        }

        const playerId = await service.getPlayerByUserId(userId, tenantId);
        if (!playerId) {
          return reply.status(404).send({
            success: false,
            error: { code: 'RESOURCE_NOT_FOUND', message: 'Player profile not found', details: {} },
          });
        }

        const newShareStatus = await service.toggleShareAchievement(playerId, id, tenantId);
        return reply.send({ success: true, data: { shared: newShareStatus } });
      } catch (error) {
        console.error('Error toggling achievement share:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
        });
      }
    },
  );

  fastify.get(
    '/api/v1/achievements/enterprise',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as FastifyRequest & { tenantId: string }).tenantId;
        if (!tenantId) {
          return reply.status(401).send({
            success: false,
            error: { code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized', details: {} },
          });
        }

        const achievements = await service.getEnterpriseReportableAchievements(tenantId);
        return reply.send({ success: true, data: { achievements } });
      } catch (error) {
        console.error('Error fetching enterprise achievements:', error);
        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
        });
      }
    },
  );
}

export { registerAchievementRoutes };
