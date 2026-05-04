import { gameSessionBootstrapSchema, type GameSessionBootstrap } from '@the-dmz/shared/schemas';

import { apiClient } from './client.js';
import { apiCall } from './api-call.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

export type GameSessionBootstrapResponse = {
  data: GameSessionBootstrap;
};

export async function bootstrapGameSession(): Promise<{
  data?: GameSessionBootstrap;
  error?: CategorizedApiError;
}> {
  return apiCall(
    () => apiClient.post<GameSessionBootstrapResponse>('/game/session', undefined),
    (data) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return { data: gameSessionBootstrapSchema.parse(data.data) };
      } catch {
        return {
          error: createInvalidResponseError('Invalid game session bootstrap response from server'),
        };
      }
    },
  );
}

export async function getGameSession(): Promise<{
  data?: GameSessionBootstrap;
  error?: CategorizedApiError;
}> {
  return apiCall(
    () => apiClient.get<GameSessionBootstrapResponse>('/game/session'),
    (data) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return { data: gameSessionBootstrapSchema.parse(data.data) };
      } catch {
        return { error: createInvalidResponseError('Invalid game session response from server') };
      }
    },
  );
}
