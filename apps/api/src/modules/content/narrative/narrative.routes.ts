import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import { findMorpheusMessagesByTrigger, findMorpheusMessageByKey } from './narrative.repo.js';

import type { AuthenticatedUser } from '../../auth/index.js';
import type { FastifyInstance } from 'fastify';

export const registerNarrativeRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = fastify.config;

  fastify.get(
    '/content/narrative/scripts/:trigger',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            trigger: { type: 'string', maxLength: 50 },
          },
          required: ['trigger'],
        },
        querystring: {
          type: 'object',
          properties: {
            day: { type: 'integer', minimum: 1 },
            factionKey: { type: 'string', maxLength: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { trigger } = request.params as { trigger: string };
      const query = request.query as {
        day?: number;
        factionKey?: string;
      };

      const db = getDatabaseClient(config);
      const messages = await findMorpheusMessagesByTrigger(db, user.tenantId, trigger, query);

      return { data: messages };
    },
  );

  fastify.get(
    '/content/narrative/scripts/key/:key',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            key: { type: 'string', maxLength: 100 },
          },
          required: ['key'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          404: errorResponseSchemas.NotFound,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { key } = request.params as { key: string };

      const db = getDatabaseClient(config);
      const message = await findMorpheusMessageByKey(db, user.tenantId, key);

      if (!message) {
        return _reply.status(404).send({
          success: false,
          error: {
            code: 'NARRATIVE_NOT_FOUND',
            message: 'Narrative script not found',
            details: {},
          },
        });
      }

      return { data: message };
    },
  );
};
