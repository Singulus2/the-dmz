import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcurrentSessionStrategy } from '@the-dmz/shared/auth/session-policy.js';
import { ErrorCodes } from '@the-dmz/shared';

import { SessionConcurrentLimitError } from '../auth.errors.js';
import { login } from '../auth.login.service.js';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../auth.repo.js', () => ({
  findUserByEmail: vi.fn(),
  createSession: vi.fn(),
  countActiveUserSessions: vi.fn(),
  deleteOldestUserSessions: vi.fn(),
}));

vi.mock('../auth.crypto.js', () => ({
  hashToken: vi.fn(),
  generateTokens: vi.fn(),
  verifyPassword: vi.fn(),
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
}));

vi.mock('../auth.utils.js', () => ({
  resolveTenantId: vi.fn(),
}));

const mockConfig = {
  TOKEN_HASH_SALT: 'test-salt',
  JWT_ISSUER: 'https://test-issuer.local',
  JWT_AUDIENCE: 'test-api',
} as const;

describe('login() concurrent session limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SessionConcurrentLimitError', () => {
    it('throws SessionConcurrentLimitError when at concurrent limit with REJECT_NEWEST strategy', async () => {
      const { findUserByEmail, countActiveUserSessions } = await import('../auth.repo.js');
      const { verifyPassword } = await import('../auth.crypto.js');
      const { resolveTenantId } = await import('../auth.utils.js');

      vi.mocked(resolveTenantId).mockResolvedValue('tenant-123');

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
        passwordHash: 'hashed-password',
      });

      vi.mocked(verifyPassword).mockResolvedValue(true);

      vi.mocked(countActiveUserSessions).mockResolvedValue(5);

      const tenantSettings = {
        sessionPolicy: {
          maxConcurrentSessionsPerUser: 5,
          concurrentSessionStrategy: ConcurrentSessionStrategy.REJECT_NEWEST,
          idleTimeoutMinutes: 30,
          absoluteTimeoutMinutes: 480,
          sessionBindingMode: 'NONE',
          forceLogoutOnPasswordChange: false,
          forceLogoutOnRoleChange: false,
        },
      };

      const mockDb = vi.fn().mockReturnValue({
        query: {
          tenants: {
            findFirst: vi.fn().mockResolvedValue({
              tenantId: 'tenant-123',
              status: 'ACTIVE',
              settings: tenantSettings,
            }),
          },
        },
      });

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(
        login(mockConfig, { email: 'test@example.com', password: 'ValidPassword123!' }),
      ).rejects.toThrow(SessionConcurrentLimitError);
    });

    it('throws SessionConcurrentLimitError with correct maxSessions and currentCount', async () => {
      const { findUserByEmail, countActiveUserSessions } = await import('../auth.repo.js');
      const { verifyPassword } = await import('../auth.crypto.js');
      const { resolveTenantId } = await import('../auth.utils.js');

      vi.mocked(resolveTenantId).mockResolvedValue('tenant-123');

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
        passwordHash: 'hashed-password',
      });

      vi.mocked(verifyPassword).mockResolvedValue(true);

      const maxSessions = 3;
      const currentCount = 3;
      vi.mocked(countActiveUserSessions).mockResolvedValue(currentCount);

      const tenantSettings = {
        sessionPolicy: {
          maxConcurrentSessionsPerUser: maxSessions,
          concurrentSessionStrategy: ConcurrentSessionStrategy.REJECT_NEWEST,
          idleTimeoutMinutes: 30,
          absoluteTimeoutMinutes: 480,
          sessionBindingMode: 'NONE',
          forceLogoutOnPasswordChange: false,
          forceLogoutOnRoleChange: false,
        },
      };

      const mockDb = vi.fn().mockReturnValue({
        query: {
          tenants: {
            findFirst: vi.fn().mockResolvedValue({
              tenantId: 'tenant-123',
              status: 'ACTIVE',
              settings: tenantSettings,
            }),
          },
        },
      });

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(
        login(mockConfig, { email: 'test@example.com', password: 'ValidPassword123!' }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(`Maximum concurrent sessions (${maxSessions}) reached`),
          statusCode: 403,
          details: expect.objectContaining({
            reason: 'concurrent_session_limit',
            maxSessions,
            currentCount,
          }),
        }),
      );
    });

    it('does not throw when at limit with REVOKE_OLDEST strategy', async () => {
      const { findUserByEmail, countActiveUserSessions, createSession, deleteOldestUserSessions } =
        await import('../auth.repo.js');
      const { verifyPassword, hashToken, generateTokens } = await import('../auth.crypto.js');
      const { resolveTenantId } = await import('../auth.utils.js');

      vi.mocked(resolveTenantId).mockResolvedValue('tenant-123');

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
        passwordHash: 'hashed-password',
      });

      vi.mocked(verifyPassword).mockResolvedValue(true);

      vi.mocked(countActiveUserSessions).mockResolvedValue(5);

      vi.mocked(deleteOldestUserSessions).mockResolvedValue({ deletedCount: 1 });

      vi.mocked(hashToken).mockResolvedValue('hashed-token');
      vi.mocked(generateTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });

      vi.mocked(createSession).mockResolvedValue({
        id: 'new-session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(),
        createdAt: new Date(),
        lastActiveAt: new Date(),
        ipAddress: null,
        userAgent: null,
        deviceFingerprint: null,
      });

      const tenantSettings = {
        sessionPolicy: {
          maxConcurrentSessionsPerUser: 5,
          concurrentSessionStrategy: ConcurrentSessionStrategy.REVOKE_OLDEST,
          idleTimeoutMinutes: 30,
          absoluteTimeoutMinutes: 480,
          sessionBindingMode: 'NONE',
          forceLogoutOnPasswordChange: false,
          forceLogoutOnRoleChange: false,
        },
      };

      const mockDb = vi.fn().mockReturnValue({
        query: {
          tenants: {
            findFirst: vi.fn().mockResolvedValue({
              tenantId: 'tenant-123',
              status: 'ACTIVE',
              settings: tenantSettings,
            }),
          },
        },
      });

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as ReturnType<typeof getDatabaseClient>);

      const result = await login(mockConfig, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      expect(deleteOldestUserSessions).toHaveBeenCalledWith(mockDb, 'user-123', 'tenant-123', 4);
      expect(result).toHaveProperty('accessToken');
    });

    it('does not throw when under concurrent limit', async () => {
      const { findUserByEmail, countActiveUserSessions, createSession } = await import('../auth.repo.js');
      const { verifyPassword, hashToken, generateTokens } = await import('../auth.crypto.js');
      const { resolveTenantId } = await import('../auth.utils.js');

      vi.mocked(resolveTenantId).mockResolvedValue('tenant-123');

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
        passwordHash: 'hashed-password',
      });

      vi.mocked(verifyPassword).mockResolvedValue(true);

      vi.mocked(countActiveUserSessions).mockResolvedValue(2);

      vi.mocked(hashToken).mockResolvedValue('hashed-token');
      vi.mocked(generateTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });

      vi.mocked(createSession).mockResolvedValue({
        id: 'new-session-123',
        userId: 'user-123',
        tenantId: 'tenant-123',
        expiresAt: new Date(),
        createdAt: new Date(),
        lastActiveAt: new Date(),
        ipAddress: null,
        userAgent: null,
        deviceFingerprint: null,
      });

      const tenantSettings = {
        sessionPolicy: {
          maxConcurrentSessionsPerUser: 5,
          concurrentSessionStrategy: ConcurrentSessionStrategy.REJECT_NEWEST,
          idleTimeoutMinutes: 30,
          absoluteTimeoutMinutes: 480,
          sessionBindingMode: 'NONE',
          forceLogoutOnPasswordChange: false,
          forceLogoutOnRoleChange: false,
        },
      };

      const mockDb = vi.fn().mockReturnValue({
        query: {
          tenants: {
            findFirst: vi.fn().mockResolvedValue({
              tenantId: 'tenant-123',
              status: 'ACTIVE',
              settings: tenantSettings,
            }),
          },
        },
      });

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as ReturnType<typeof getDatabaseClient>);

      const result = await login(mockConfig, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      });

      expect(result).toHaveProperty('accessToken');
    });

    it('throws with correct error code AUTH_SESSION_CONCURRENT_LIMIT', async () => {
      const { findUserByEmail, countActiveUserSessions } = await import('../auth.repo.js');
      const { verifyPassword } = await import('../auth.crypto.js');
      const { resolveTenantId } = await import('../auth.utils.js');

      vi.mocked(resolveTenantId).mockResolvedValue('tenant-123');

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tenantId: 'tenant-123',
        role: 'learner',
        isActive: true,
        passwordHash: 'hashed-password',
      });

      vi.mocked(verifyPassword).mockResolvedValue(true);

      vi.mocked(countActiveUserSessions).mockResolvedValue(5);

      const tenantSettings = {
        sessionPolicy: {
          maxConcurrentSessionsPerUser: 5,
          concurrentSessionStrategy: ConcurrentSessionStrategy.REJECT_NEWEST,
          idleTimeoutMinutes: 30,
          absoluteTimeoutMinutes: 480,
          sessionBindingMode: 'NONE',
          forceLogoutOnPasswordChange: false,
          forceLogoutOnRoleChange: false,
        },
      };

      const mockDb = vi.fn().mockReturnValue({
        query: {
          tenants: {
            findFirst: vi.fn().mockResolvedValue({
              tenantId: 'tenant-123',
              status: 'ACTIVE',
              settings: tenantSettings,
            }),
          },
        },
      });

      const { getDatabaseClient } = await import('../../shared/database/connection.js');
      vi.mocked(getDatabaseClient).mockReturnValue(mockDb as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(
        login(mockConfig, { email: 'test@example.com', password: 'ValidPassword123!' }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCodes.AUTH_SESSION_CONCURRENT_LIMIT,
        }),
      );
    });
  });
});
