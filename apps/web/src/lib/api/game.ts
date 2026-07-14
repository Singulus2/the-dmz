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
        return gameSessionBootstrapSchema.parse(data.data);
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
        return gameSessionBootstrapSchema.parse(data.data);
      } catch {
        return { error: createInvalidResponseError('Invalid game session response from server') };
      }
    },
  );
}
