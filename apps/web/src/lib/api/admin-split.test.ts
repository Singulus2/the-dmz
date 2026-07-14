import { describe, expect, it, vi, expectTypeOf } from 'vitest';

import type {
  ComplianceDashboardData,
  ComplianceDetail,
  ComplianceStatus,
  ComplianceSummary,
  FrameworkRequirement,
} from '$lib/api/admin-compliance';
import type {
  ActiveUsersData,
  DashboardData,
  TenantFeatureFlags,
  TenantInfo,
  UserGrowthTrendItem,
  UserMetrics,
  UsersByRole,
} from '$lib/api/admin-dashboard';
import type {
  CreateSAMLProviderRequest,
  SAMLProviderConfig,
  SAMLTestConnectionResponse,
  UpdateSAMLProviderRequest,
} from '$lib/api/admin-saml';
import type {
  SCIMGroupRoleMapping,
  SCIMRole,
  SCIMSyncStatus,
  SCIMTestConnectionResponse,
  SCIMTestProvisioningResponse,
  SCIMTokenConfig,
  SCIMTokenWithSecret,
} from '$lib/api/admin-scim';
import type {
  CampaignCompletion,
  CompetencyDistribution,
  ErrorPattern,
  LearnerSummary,
  TrainerDashboardData,
} from '$lib/api/admin-trainer';

vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('admin-dashboard module', () => {
  it('should export getDashboard function', async () => {
    const module = await import('$lib/api/admin-dashboard');
    expect(typeof module.getDashboard).toBe('function');
  });

  it('should export DashboardData type', () => {
    expectTypeOf<DashboardData>().not.toBeAny();
  });

  it('should export TenantInfo type', () => {
    expectTypeOf<TenantInfo>().not.toBeAny();
  });

  it('should export TenantFeatureFlags type', () => {
    expectTypeOf<TenantFeatureFlags>().not.toBeAny();
  });

  it('should export ActiveUsersData type', () => {
    expectTypeOf<ActiveUsersData>().not.toBeAny();
  });

  it('should export UserMetrics type', () => {
    expectTypeOf<UserMetrics>().not.toBeAny();
  });

  it('should export UserGrowthTrendItem type', () => {
    expectTypeOf<UserGrowthTrendItem>().not.toBeAny();
  });

  it('should export UsersByRole type', () => {
    expectTypeOf<UsersByRole>().not.toBeAny();
  });
});

describe('admin-trainer module', () => {
  it('should export getTrainerDashboard function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerDashboard).toBe('function');
  });

  it('should export getTrainerCompetencies function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerCompetencies).toBe('function');
  });

  it('should export getTrainerErrors function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerErrors).toBe('function');
  });

  it('should export getTrainerCampaigns function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerCampaigns).toBe('function');
  });

  it('should export getTrainerLearners function', async () => {
    const module = await import('$lib/api/admin-trainer');
    expect(typeof module.getTrainerLearners).toBe('function');
  });

  it('should export TrainerDashboardData type', () => {
    expectTypeOf<TrainerDashboardData>().not.toBeAny();
  });

  it('should export CompetencyDistribution type', () => {
    expectTypeOf<CompetencyDistribution>().not.toBeAny();
  });

  it('should export ErrorPattern type', () => {
    expectTypeOf<ErrorPattern>().not.toBeAny();
  });

  it('should export CampaignCompletion type', () => {
    expectTypeOf<CampaignCompletion>().not.toBeAny();
  });

  it('should export LearnerSummary type', () => {
    expectTypeOf<LearnerSummary>().not.toBeAny();
  });
});

describe('admin-compliance module', () => {
  it('should export getComplianceSummary function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.getComplianceSummary).toBe('function');
  });

  it('should export getComplianceDetail function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.getComplianceDetail).toBe('function');
  });

  it('should export getFrameworkRequirements function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.getFrameworkRequirements).toBe('function');
  });

  it('should export calculateCompliance function', async () => {
    const module = await import('$lib/api/admin-compliance');
    expect(typeof module.calculateCompliance).toBe('function');
  });

  it('should export ComplianceStatus type', () => {
    expectTypeOf<ComplianceStatus>().not.toBeAny();
  });

  it('should export ComplianceSummary type', () => {
    expectTypeOf<ComplianceSummary>().not.toBeAny();
  });

  it('should export FrameworkRequirement type', () => {
    expectTypeOf<FrameworkRequirement>().not.toBeAny();
  });

  it('should export ComplianceDetail type', () => {
    expectTypeOf<ComplianceDetail>().not.toBeAny();
  });

  it('should export ComplianceDashboardData type', () => {
    expectTypeOf<ComplianceDashboardData>().not.toBeAny();
  });
});

describe('admin-saml module', () => {
  it('should export getSAMLProviders function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.getSAMLProviders).toBe('function');
  });

  it('should export getSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.getSAMLProvider).toBe('function');
  });

  it('should export createSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.createSAMLProvider).toBe('function');
  });

  it('should export updateSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.updateSAMLProvider).toBe('function');
  });

  it('should export deleteSAMLProvider function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.deleteSAMLProvider).toBe('function');
  });

  it('should export testSAMLConnection function', async () => {
    const module = await import('$lib/api/admin-saml');
    expect(typeof module.testSAMLConnection).toBe('function');
  });

  it('should export SAMLProviderConfig type', () => {
    expectTypeOf<SAMLProviderConfig>().not.toBeAny();
  });

  it('should export CreateSAMLProviderRequest type', () => {
    expectTypeOf<CreateSAMLProviderRequest>().not.toBeAny();
  });

  it('should export UpdateSAMLProviderRequest type', () => {
    expectTypeOf<UpdateSAMLProviderRequest>().not.toBeAny();
  });

  it('should export SAMLTestConnectionResponse type', () => {
    expectTypeOf<SAMLTestConnectionResponse>().not.toBeAny();
  });
});

describe('admin-scim module', () => {
  it('should export getSCIMTokens function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.getSCIMTokens).toBe('function');
  });

  it('should export createSCIMToken function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.createSCIMToken).toBe('function');
  });

  it('should export revokeSCIMToken function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.revokeSCIMToken).toBe('function');
  });

  it('should export rotateSCIMToken function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.rotateSCIMToken).toBe('function');
  });

  it('should export testSCIMConnection function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.testSCIMConnection).toBe('function');
  });

  it('should export testSCIMProvisioning function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.testSCIMProvisioning).toBe('function');
  });

  it('should export getSCIMSyncStatus function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.getSCIMSyncStatus).toBe('function');
  });

  it('should export getSCIMGroupMappings function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.getSCIMGroupMappings).toBe('function');
  });

  it('should export updateSCIMGroupRole function', async () => {
    const module = await import('$lib/api/admin-scim');
    expect(typeof module.updateSCIMGroupRole).toBe('function');
  });

  it('should export SCIMTokenConfig type', () => {
    expectTypeOf<SCIMTokenConfig>().not.toBeAny();
  });

  it('should export SCIMTokenWithSecret type', () => {
    expectTypeOf<SCIMTokenWithSecret>().not.toBeAny();
  });

  it('should export SCIMTestConnectionResponse type', () => {
    expectTypeOf<SCIMTestConnectionResponse>().not.toBeAny();
  });

  it('should export SCIMTestProvisioningResponse type', () => {
    expectTypeOf<SCIMTestProvisioningResponse>().not.toBeAny();
  });

  it('should export SCIMSyncStatus type', () => {
    expectTypeOf<SCIMSyncStatus>().not.toBeAny();
  });

  it('should export SCIMGroupRoleMapping type', () => {
    expectTypeOf<SCIMGroupRoleMapping>().not.toBeAny();
  });

  it('should export SCIMRole type', () => {
    expectTypeOf<SCIMRole>().not.toBeAny();
  });
});
