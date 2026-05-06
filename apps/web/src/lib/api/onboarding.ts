import { apiClient } from './client.js';
import { apiCall } from './api-call.js';

import type { CategorizedApiError } from './types.js';

export type OnboardingStep =
  | 'not_started'
  | 'org_profile'
  | 'idp_config'
  | 'scim_token'
  | 'compliance'
  | 'complete';

export interface OrgProfileData {
  name: string;
  domain: string;
  industry: string;
  companySize: string;
}

export interface IdpConfigData {
  type: 'saml' | 'oidc';
  enabled: boolean;
  metadataUrl?: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  scopes?: string[];
  authorizedDomains?: string[];
}

export interface ComplianceCoordinatorContact {
  name: string;
  email: string;
  phone?: string;
}

export type RegulatoryRegion =
  | 'us_federal'
  | 'us_state_local'
  | 'eu'
  | 'uk'
  | 'canada'
  | 'australia'
  | 'japan'
  | 'singapore'
  | 'other';

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  startedAt: string | null;
  completedAt: string | null;
  orgProfile?: OrgProfileData;
  idpConfig?: IdpConfigData;
  scimTokenId?: string;
  complianceFrameworks?: string[];
  regulatoryRegion?: RegulatoryRegion;
  complianceCoordinatorContact?: ComplianceCoordinatorContact;
}

export interface OnboardingStatus {
  tenantId: string;
  state: OnboardingState;
  canProceed: boolean;
  nextStep: OnboardingStep | null;
  completed: boolean;
}

export interface IdpTestConnectionResult {
  success: boolean;
  message: string;
  diagnostics: {
    metadataValid: boolean;
    entityIdValid: boolean;
    ssoUrlReachable: boolean;
    certificateValid: boolean;
    attributes: string[];
    errors: string[];
  };
}

export async function getOnboardingSteps(): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.get<OnboardingStatus>('/admin/onboarding/steps'));
}

export async function startOnboarding(): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.post<OnboardingStatus>('/admin/onboarding/start', {}));
}

export async function saveOrgProfile(profile: OrgProfileData): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.put<OnboardingStatus>('/admin/onboarding/org-profile', profile));
}

export async function saveIdpConfig(config: IdpConfigData): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.put<OnboardingStatus>('/admin/onboarding/idp-config', config));
}

export async function testIdpConnection(config: IdpConfigData): Promise<{
  data?: IdpTestConnectionResult;
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.post<IdpTestConnectionResult>('/admin/onboarding/test-connection', config),
  );
}

export interface ScimTokenResponse {
  tenantId: string;
  tokenId: string;
  token: string;
}

export async function generateScimToken(
  name: string,
  expiresInDays?: number,
): Promise<{
  data?: ScimTokenResponse;
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.post<ScimTokenResponse>('/admin/onboarding/scim-token', {
      name,
      expiresInDays,
    }),
  );
}

export async function saveComplianceFrameworks(data: {
  frameworks: string[];
  regulatoryRegion: RegulatoryRegion | undefined;
  complianceCoordinatorContact: ComplianceCoordinatorContact | undefined;
}): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  const payload: Record<string, unknown> = {
    frameworks: data.frameworks,
  };

  if (data.regulatoryRegion !== undefined) {
    payload['regulatoryRegion'] = data.regulatoryRegion;
  }

  if (
    data.complianceCoordinatorContact !== undefined &&
    (data.complianceCoordinatorContact.name || data.complianceCoordinatorContact.email)
  ) {
    payload['complianceCoordinatorContact'] = data.complianceCoordinatorContact;
  }

  return apiCall(() => apiClient.put<OnboardingStatus>('/admin/onboarding/compliance', payload));
}

export async function completeOnboarding(): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.post<OnboardingStatus>('/admin/onboarding/complete', {}));
}

export async function resetOnboarding(): Promise<{
  data?: OnboardingStatus;
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.post<OnboardingStatus>('/admin/onboarding/reset', {}));
}
