import { documentTemplateListResponseJsonSchema } from '@the-dmz/shared/schemas';

import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import {
  contentReadRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../../../shared/routes/content-routes-config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import { findDocumentTemplateByType } from './documents.repo.js';

import type { AuthenticatedUser } from '../../auth/index.js';
import type { FastifyInstance } from 'fastify';

export const registerDocumentRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = fastify.config;

  fastify.get(
    '/content/templates/:type',
    {
      preHandler: contentReadRoutePreHandlers,
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            type: { type: 'string' },
          },
          required: ['type'],
        },
        querystring: {
          type: 'object',
          properties: {
            faction: { type: 'string' },
            locale: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          200: documentTemplateListResponseJsonSchema,
          401: errorResponseSchemas.Unauthorized,
          403: tenantInactiveOrForbiddenResponseJsonSchema,
          429: errorResponseSchemas.RateLimitExceeded,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { type } = request.params as { type: string };

      const db = getDatabaseClient(config);
      const templates = await findDocumentTemplateByType(db, user.tenantId, type);

      return { data: templates };
    },
  );
};
