import { describe, expect, it, expectTypeOf } from 'vitest';

import type {
  ActiveUsersData,
  CampaignCompletion,
  CompetencyDistribution,
  ComplianceDashboardData,
  ComplianceDetail,
  ComplianceStatus,
  ComplianceSummary,
  CreateSAMLProviderRequest,
  DashboardData,
  ErrorPattern,
  FrameworkRequirement,
  LearnerSummary,
  SAMLProviderConfig,
  SAMLTestConnectionResponse,
  SCIMGroupRoleMapping,
  SCIMRole,
  SCIMSyncStatus,
  SCIMTestConnectionResponse,
  SCIMTestProvisioningResponse,
  SCIMTokenConfig,
  SCIMTokenWithSecret,
  TenantFeatureFlags,
  TenantInfo,
  TrainerDashboardData,
  UpdateSAMLProviderRequest,
  UserMetrics,
} from '$lib/api/admin';

describe('admin barrel re-exports (backward compatibility)', () => {
  describe('dashboard exports', () => {
    it('should re-export getDashboard from admin-dashboard', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getDashboard).toBe('function');
    });

    it('should re-export DashboardData from admin-dashboard', () => {
      expectTypeOf<DashboardData>().not.toBeAny();
    });

    it('should re-export TenantInfo from admin-dashboard', () => {
      expectTypeOf<TenantInfo>().not.toBeAny();
    });

    it('should re-export TenantFeatureFlags from admin-dashboard', () => {
      expectTypeOf<TenantFeatureFlags>().not.toBeAny();
    });

    it('should re-export ActiveUsersData from admin-dashboard', () => {
      expectTypeOf<ActiveUsersData>().not.toBeAny();
    });

    it('should re-export UserMetrics from admin-dashboard', () => {
      expectTypeOf<UserMetrics>().not.toBeAny();
    });
  });

  describe('trainer exports', () => {
    it('should re-export getTrainerDashboard from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerDashboard).toBe('function');
    });

    it('should re-export getTrainerCompetencies from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerCompetencies).toBe('function');
    });

    it('should re-export getTrainerErrors from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerErrors).toBe('function');
    });

    it('should re-export getTrainerCampaigns from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerCampaigns).toBe('function');
    });

    it('should re-export getTrainerLearners from admin-trainer', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getTrainerLearners).toBe('function');
    });

    it('should re-export TrainerDashboardData from admin-trainer', () => {
      expectTypeOf<TrainerDashboardData>().not.toBeAny();
    });

    it('should re-export CompetencyDistribution from admin-trainer', () => {
      expectTypeOf<CompetencyDistribution>().not.toBeAny();
    });

    it('should re-export ErrorPattern from admin-trainer', () => {
      expectTypeOf<ErrorPattern>().not.toBeAny();
    });

    it('should re-export CampaignCompletion from admin-trainer', () => {
      expectTypeOf<CampaignCompletion>().not.toBeAny();
    });

    it('should re-export LearnerSummary from admin-trainer', () => {
      expectTypeOf<LearnerSummary>().not.toBeAny();
    });
  });

  describe('compliance exports', () => {
    it('should re-export getComplianceSummary from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getComplianceSummary).toBe('function');
    });

    it('should re-export getComplianceDetail from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getComplianceDetail).toBe('function');
    });

    it('should re-export getFrameworkRequirements from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getFrameworkRequirements).toBe('function');
    });

    it('should re-export calculateCompliance from admin-compliance', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.calculateCompliance).toBe('function');
    });

    it('should re-export ComplianceStatus from admin-compliance', () => {
      expectTypeOf<ComplianceStatus>().not.toBeAny();
    });

    it('should re-export ComplianceSummary from admin-compliance', () => {
      expectTypeOf<ComplianceSummary>().not.toBeAny();
    });

    it('should re-export FrameworkRequirement from admin-compliance', () => {
      expectTypeOf<FrameworkRequirement>().not.toBeAny();
    });

    it('should re-export ComplianceDetail from admin-compliance', () => {
      expectTypeOf<ComplianceDetail>().not.toBeAny();
    });

    it('should re-export ComplianceDashboardData from admin-compliance', () => {
      expectTypeOf<ComplianceDashboardData>().not.toBeAny();
    });
  });

  describe('saml exports', () => {
    it('should re-export getSAMLProviders from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSAMLProviders).toBe('function');
    });

    it('should re-export getSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSAMLProvider).toBe('function');
    });

    it('should re-export createSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.createSAMLProvider).toBe('function');
    });

    it('should re-export updateSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.updateSAMLProvider).toBe('function');
    });

    it('should re-export deleteSAMLProvider from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.deleteSAMLProvider).toBe('function');
    });

    it('should re-export testSAMLConnection from admin-saml', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.testSAMLConnection).toBe('function');
    });

    it('should re-export SAMLProviderConfig from admin-saml', () => {
      expectTypeOf<SAMLProviderConfig>().not.toBeAny();
    });

    it('should re-export CreateSAMLProviderRequest from admin-saml', () => {
      expectTypeOf<CreateSAMLProviderRequest>().not.toBeAny();
    });

    it('should re-export UpdateSAMLProviderRequest from admin-saml', () => {
      expectTypeOf<UpdateSAMLProviderRequest>().not.toBeAny();
    });

    it('should re-export SAMLTestConnectionResponse from admin-saml', () => {
      expectTypeOf<SAMLTestConnectionResponse>().not.toBeAny();
    });
  });

  describe('scim exports', () => {
    it('should re-export getSCIMTokens from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSCIMTokens).toBe('function');
    });

    it('should re-export createSCIMToken from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.createSCIMToken).toBe('function');
    });

    it('should re-export revokeSCIMToken from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.revokeSCIMToken).toBe('function');
    });

    it('should re-export rotateSCIMToken from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.rotateSCIMToken).toBe('function');
    });

    it('should re-export testSCIMConnection from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.testSCIMConnection).toBe('function');
    });

    it('should re-export testSCIMProvisioning from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.testSCIMProvisioning).toBe('function');
    });

    it('should re-export getSCIMSyncStatus from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSCIMSyncStatus).toBe('function');
    });

    it('should re-export getSCIMGroupMappings from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.getSCIMGroupMappings).toBe('function');
    });

    it('should re-export updateSCIMGroupRole from admin-scim', async () => {
      const admin = await import('$lib/api/admin');
      expect(typeof admin.updateSCIMGroupRole).toBe('function');
    });

    it('should re-export SCIMTokenConfig from admin-scim', () => {
      expectTypeOf<SCIMTokenConfig>().not.toBeAny();
    });

    it('should re-export SCIMTokenWithSecret from admin-scim', () => {
      expectTypeOf<SCIMTokenWithSecret>().not.toBeAny();
    });

    it('should re-export SCIMTestConnectionResponse from admin-scim', () => {
      expectTypeOf<SCIMTestConnectionResponse>().not.toBeAny();
    });

    it('should re-export SCIMTestProvisioningResponse from admin-scim', () => {
      expectTypeOf<SCIMTestProvisioningResponse>().not.toBeAny();
    });

    it('should re-export SCIMSyncStatus from admin-scim', () => {
      expectTypeOf<SCIMSyncStatus>().not.toBeAny();
    });

    it('should re-export SCIMGroupRoleMapping from admin-scim', () => {
      expectTypeOf<SCIMGroupRoleMapping>().not.toBeAny();
    });

    it('should re-export SCIMRole from admin-scim', () => {
      expectTypeOf<SCIMRole>().not.toBeAny();
    });
  });
});
