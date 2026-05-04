import {
  logoutResponseSchema,
  meResponseSchema,
  type LoginInput,
  type RegisterInput,
  type LogoutResponse,
  type MeResponse,
  type MfaStatusResponse,
  type WebauthnChallengeResponse,
  type WebauthnRegistrationResponse,
  type WebauthnVerificationResponse,
  type WebauthnCredentialsListResponse,
  type UpdatePreferencesInput,
  type ProfileData,
} from '@the-dmz/shared/schemas';

import { apiClient } from './client.js';
import { apiCall } from './api-call.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    tenantId: string;
    role: string;
    isActive: boolean;
  };
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export async function login(
  credentials: LoginInput,
): Promise<{ data?: AuthResponse; error?: CategorizedApiError }> {
  return apiCall(
    () => apiClient.post<AuthResponse, LoginInput>('/auth/login', credentials),
    (data) => {
      if (!data.user || !data.accessToken) {
        return { error: createInvalidResponseError('No data received from server') };
      }
      return data;
    },
  );
}

export async function updatePreferences(
  preferences: UpdatePreferencesInput,
): Promise<{ data?: ProfileData; error?: CategorizedApiError }> {
  return apiCall(() =>
    apiClient.patch<ProfileData, UpdatePreferencesInput>('/auth/profile', preferences),
  );
}

export async function register(
  credentials: RegisterInput,
): Promise<{ data?: AuthResponse; error?: CategorizedApiError }> {
  return apiCall(
    () => apiClient.post<AuthResponse, RegisterInput>('/auth/register', credentials),
    (data) => {
      if (!data.user || !data.accessToken) {
        return { error: createInvalidResponseError('Invalid register response from server') };
      }
      return data;
    },
  );
}

export async function refresh(): Promise<{ data?: RefreshResponse; error?: CategorizedApiError }> {
  const csrfToken = apiClient.getCsrfToken();

  return apiCall(
    () =>
      apiClient.post<RefreshResponse>('/auth/refresh', undefined, {
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      }),
    (data) => {
      if (!data.accessToken) {
        return { error: createInvalidResponseError('Invalid refresh response from server') };
      }
      return data;
    },
  );
}

export async function logout(): Promise<{ data?: LogoutResponse; error?: CategorizedApiError }> {
  const csrfToken = apiClient.getCsrfToken();

  return apiCall(
    () =>
      apiClient.delete<LogoutResponse>('/auth/logout', {
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      }),
    (data) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return { data: logoutResponseSchema.parse(data) };
      } catch {
        return { error: createInvalidResponseError('Invalid logout response from server') };
      }
    },
  );
}

export async function getCurrentUser(): Promise<{
  data?: MeResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(
    () => apiClient.get<MeResponse>('/auth/me'),
    (data) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return { data: meResponseSchema.parse(data) };
      } catch {
        return { error: createInvalidResponseError('Invalid me response from server') };
      }
    },
  );
}

export type WebauthnChallengeRequest = {
  challengeType: 'registration' | 'verification';
};

export async function getMfaStatus(): Promise<{
  data?: MfaStatusResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.get<MfaStatusResponse>('/auth/mfa/status'));
}

export async function createWebauthnChallenge(request: WebauthnChallengeRequest): Promise<{
  data?: WebauthnChallengeResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.post<WebauthnChallengeResponse, WebauthnChallengeRequest>(
      '/auth/mfa/webauthn/challenge',
      request,
    ),
  );
}

export type WebauthnRegistrationRequest = {
  credential: {
    id: string;
    rawId: string;
    type: 'public-key';
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
    clientExtensionResults?: Record<string, unknown>;
  };
  challengeId: string;
};

export async function registerWebauthnCredential(request: WebauthnRegistrationRequest): Promise<{
  data?: WebauthnRegistrationResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.post<WebauthnRegistrationResponse, WebauthnRegistrationRequest>(
      '/auth/mfa/webauthn/register',
      request,
    ),
  );
}

export type WebauthnVerificationRequest = {
  credential: {
    id: string;
    rawId: string;
    type: 'public-key';
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
    clientExtensionResults?: Record<string, unknown>;
  };
  challengeId: string;
};

export async function verifyWebauthnAssertion(request: WebauthnVerificationRequest): Promise<{
  data?: WebauthnVerificationResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.post<WebauthnVerificationResponse, WebauthnVerificationRequest>(
      '/auth/mfa/webauthn/verify',
      request,
    ),
  );
}

export async function listWebauthnCredentials(): Promise<{
  data?: WebauthnCredentialsListResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.get<WebauthnCredentialsListResponse>('/auth/mfa/webauthn/credentials'),
  );
}

export async function deleteWebauthnCredential(
  credentialId: string,
): Promise<{ error?: CategorizedApiError }> {
  const result = await apiClient.delete<void>(`/auth/mfa/webauthn/credentials/${credentialId}`);

  if (result.error) {
    return { error: result.error };
  }

  return {};
}
