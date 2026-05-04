import { apiClient } from './client.js';
import { apiCall } from './api-call.js';

import type { CategorizedApiError } from './types.js';

export interface SAMLProviderConfig {
  id: string;
  tenantId: string;
  name: string;
  provider: 'saml';
  metadataUrl: string;
  idpCertificate: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SAMLProviderListResponse {
  providers: SAMLProviderConfig[];
}

export interface SAMLProviderResponse {
  id: string;
  tenantId: string;
  name: string;
  provider: 'saml';
  metadataUrl: string;
  idpCertificate: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSAMLProviderRequest {
  name: string;
  metadataUrl: string;
  idpCertificate?: string;
  spPrivateKey?: string;
  spCertificate?: string;
}

export interface UpdateSAMLProviderRequest {
  name?: string;
  metadataUrl?: string;
  idpCertificate?: string | null;
  spPrivateKey?: string | null;
  spCertificate?: string | null;
  isActive?: boolean;
}

export interface SAMLTestConnectionResponse {
  success: boolean;
  message: string;
}

export async function getSAMLProviders(): Promise<{
  data?: SAMLProviderConfig[];
  error?: CategorizedApiError;
}> {
  return apiCall(
    () => apiClient.get<SAMLProviderListResponse>('/admin/saml/config'),
    (data) => data.providers,
  );
}

export async function getSAMLProvider(id: string): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.get<SAMLProviderResponse>(`/admin/saml/config/${id}`));
}

export async function createSAMLProvider(provider: CreateSAMLProviderRequest): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.post<SAMLProviderResponse>('/admin/saml/config', provider));
}

export async function updateSAMLProvider(
  id: string,
  provider: UpdateSAMLProviderRequest,
): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.put<SAMLProviderResponse>(`/admin/saml/config/${id}`, provider));
}

export async function deleteSAMLProvider(id: string): Promise<{
  data?: boolean;
  error?: CategorizedApiError;
}> {
  return apiCall(
    () => apiClient.delete<{ success: boolean }>(`/admin/saml/config/${id}`),
    (data) => data.success,
  );
}

export async function testSAMLConnection(id: string): Promise<{
  data?: SAMLTestConnectionResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.post<SAMLTestConnectionResponse>(`/admin/saml/test/${id}`, {}));
}
