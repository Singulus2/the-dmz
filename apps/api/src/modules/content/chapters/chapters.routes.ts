import { chapterListResponseJsonSchema } from '@the-dmz/shared/schemas';

import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import { findChaptersBySeason } from './chapters.repo.js';

import type { AuthenticatedUser } from '../../auth/index.js';
import type { FastifyInstance } from 'fastify';

export const registerChapterRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = fastify.config;

  fastify.get(
    '/content/chapters/:seasonId',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            seasonId: { type: 'string', format: 'uuid' },
          },
          required: ['seasonId'],
        },
        querystring: {
          type: 'object',
          properties: {
            act: { type: 'integer', minimum: 1, maximum: 3 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          200: chapterListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { seasonId } = request.params as { seasonId: string };
      const query = request.query as {
        act?: number;
        isActive?: boolean;
      };

      const db = getDatabaseClient(config);
      const chapters = await findChaptersBySeason(db, user.tenantId, seasonId, query);

      return { data: chapters };
    },
  );
};
