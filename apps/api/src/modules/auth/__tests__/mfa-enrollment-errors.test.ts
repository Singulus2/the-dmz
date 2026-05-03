import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ErrorCodes } from '@the-dmz/shared';

import { AppError } from '../../../shared/middleware/error-handler.js';
import { MfaRequiredError, MfaNotEnabledError } from '../auth.errors.js';
import * as totpModule from '../totp.js';
import * as mfaService from '../mfa.service.js';
import { requireMfaForSuperAdmin } from '../../../shared/middleware/mfa-guard.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../../config.js';
import type { AuthenticatedUser } from '../auth.types.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

const createMockConfig = (overrides: Partial<AppConfig> = {}): AppConfig =>
  ({
    MFA_MAX_ATTEMPTS: 5,
    MFA_WINDOW: 1,
    MFA_CODE_LENGTH: 6,
    MFA_ISSUER: 'Test DMZ',
    MFA_BACKUP_CODES: 10,
    JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'test-encryption-key-32-chars!!!',
    ...overrides,
  }) as AppConfig;

const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser =>
  ({
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    sessionId: 'test-session-id',
    role: 'user',
    ...overrides,
  }) as AuthenticatedUser;

const createMockSession = (
  overrides: Partial<{
    id: string;
    mfaVerifiedAt: Date | null;
    mfaLockedAt: Date | null;
    mfaFailedAttempts: number | null;
  }> = {},
) => ({
  id: 'test-session-id',
  mfaVerifiedAt: null,
  mfaLockedAt: null,
  mfaFailedAttempts: 0,
  ...overrides,
});

const createMockUserRecord = (
  overrides: Partial<{ userId: string; email: string; tenantId: string; role: string }> = {},
) => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  tenantId: 'test-tenant-id',
  role: 'user',
  ...overrides,
});

const createMockDb = () => ({
  query: {
    sessions: { findFirst: vi.fn() },
    users: { findFirst: vi.fn() },
  },
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
});

describe('MFA Enrollment Error Classes', () => {
  describe('MfaRequiredError', () => {
    it('has correct error code AUTH_MFA_REQUIRED', () => {
      const error = new MfaRequiredError();
      expect(error.code).toBe(ErrorCodes.AUTH_MFA_REQUIRED);
    });

    it('has statusCode 403', () => {
      const error = new MfaRequiredError();
      expect(error.statusCode).toBe(403);
    });

    it('has descriptive message', () => {
      const error = new MfaRequiredError();
      expect(error.message).toBe('MFA verification required for this action');
    });

    it('extends AuthError which extends AppError', () => {
      const error = new MfaRequiredError();
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('MfaNotEnabledError', () => {
    it('has correct error code AUTH_MFA_NOT_ENABLED', () => {
      const error = new MfaNotEnabledError();
      expect(error.code).toBe(ErrorCodes.AUTH_MFA_NOT_ENABLED);
    });

    it('has statusCode 400', () => {
      const error = new MfaNotEnabledError();
      expect(error.statusCode).toBe(400);
    });

    it('has descriptive message', () => {
      const error = new MfaNotEnabledError();
      expect(error.message).toBe('MFA is not enabled for this user');
    });

    it('extends AuthError which extends AppError', () => {
      const error = new MfaNotEnabledError();
      expect(error).toBeInstanceOf(AppError);
    });
  });
});

describe('MFA Guard Error Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireMfaForSuperAdmin', () => {
    it('throws MfaRequiredError when super-admin has no mfaVerifiedAt', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.users.findFirst.mockResolvedValue(createMockUserRecord({ role: 'super-admin' }));
      db.query.sessions.findFirst.mockResolvedValue(createMockSession({ mfaVerifiedAt: null }));

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      const mockRequest = {
        user: createMockUser({ role: 'super-admin' }),
        tenantContext: { tenantId: 'test-tenant-id' },
        server: { config: createMockConfig() },
      } as unknown as FastifyRequest;

      const mockReply = {} as FastifyReply;

      await expect(requireMfaForSuperAdmin(mockRequest, mockReply)).rejects.toThrow(
        MfaRequiredError,
      );
    });

    it('throws MfaRequiredError when super-admin session not found', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.users.findFirst.mockResolvedValue(createMockUserRecord({ role: 'super-admin' }));
      db.query.sessions.findFirst.mockResolvedValue(null);

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      const mockRequest = {
        user: createMockUser({ role: 'super-admin' }),
        tenantContext: { tenantId: 'test-tenant-id' },
        server: { config: createMockConfig() },
      } as unknown as FastifyRequest;

      const mockReply = {} as FastifyReply;

      await expect(requireMfaForSuperAdmin(mockRequest, mockReply)).rejects.toThrow(
        MfaRequiredError,
      );
    });

    it('does not throw when super-admin has mfaVerifiedAt', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.users.findFirst.mockResolvedValue(createMockUserRecord({ role: 'super-admin' }));
      db.query.sessions.findFirst.mockResolvedValue(
        createMockSession({ mfaVerifiedAt: new Date() }),
      );

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      const mockRequest = {
        user: createMockUser({ role: 'super-admin' }),
        tenantContext: { tenantId: 'test-tenant-id' },
        server: { config: createMockConfig() },
      } as unknown as FastifyRequest;

      const mockReply = {} as FastifyReply;

      await expect(requireMfaForSuperAdmin(mockRequest, mockReply)).resolves.toBeUndefined();
    });

    it('does not throw when user is not super-admin', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.users.findFirst.mockResolvedValue(createMockUserRecord({ role: 'user' }));

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      const mockRequest = {
        user: createMockUser({ role: 'user' }),
        tenantContext: { tenantId: 'test-tenant-id' },
        server: { config: createMockConfig() },
      } as unknown as FastifyRequest;

      const mockReply = {} as FastifyReply;

      await expect(requireMfaForSuperAdmin(mockRequest, mockReply)).resolves.toBeUndefined();
    });
  });
});

describe('TOTP Error Paths with MfaNotEnabledError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyTotpCode', () => {
    it('throws MfaNotEnabledError when no TOTP credential exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.sessions.findFirst.mockResolvedValue(createMockSession());
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      await expect(
        totpModule.verifyTotpCode(createMockConfig(), createMockUser(), '123456'),
      ).rejects.toThrow(MfaNotEnabledError);
    });

    it('MfaNotEnabledError has correct properties when thrown from verifyTotpCode', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.sessions.findFirst.mockResolvedValue(createMockSession());
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      try {
        await totpModule.verifyTotpCode(createMockConfig(), createMockUser(), '123456');
        expect.fail('Expected MfaNotEnabledError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MfaNotEnabledError);
        expect((error as MfaNotEnabledError).code).toBe(ErrorCodes.AUTH_MFA_NOT_ENABLED);
        expect((error as MfaNotEnabledError).statusCode).toBe(400);
      }
    });
  });

  describe('verifyBackupCode', () => {
    it('throws MfaNotEnabledError when no backup codes exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.sessions.findFirst.mockResolvedValue(createMockSession());
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      await expect(
        totpModule.verifyBackupCode(createMockConfig(), createMockUser(), 'ABCD1234'),
      ).rejects.toThrow(MfaNotEnabledError);
    });

    it('MfaNotEnabledError has correct properties when thrown from verifyBackupCode', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const db = createMockDb();

      db.query.sessions.findFirst.mockResolvedValue(createMockSession());
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      try {
        await totpModule.verifyBackupCode(createMockConfig(), createMockUser(), 'ABCD1234');
        expect.fail('Expected MfaNotEnabledError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MfaNotEnabledError);
        expect((error as MfaNotEnabledError).code).toBe(ErrorCodes.AUTH_MFA_NOT_ENABLED);
        expect((error as MfaNotEnabledError).statusCode).toBe(400);
        expect((error as MfaNotEnabledError).message).toBe('MFA is not enabled for this user');
      }
    });
  });
});

describe('MFA Service Error Paths with MfaNotEnabledError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMfaChallenge', () => {
    it('throws MfaNotEnabledError when no WebAuthn credentials exist for verification', async () => {
      vi.mock('../../../shared/database/redis.js', () => ({
        getRedisClient: vi.fn().mockReturnValue({
          status: 'ready',
          connect: vi.fn().mockResolvedValue(undefined),
          ping: vi.fn().mockResolvedValue('PONG'),
          getValue: vi.fn().mockResolvedValue(null),
          setValue: vi.fn(),
          deleteKey: vi.fn(),
          getKeys: vi.fn(),
          quit: vi.fn().mockResolvedValue(undefined),
          disconnect: vi.fn(),
        }),
      }));

      const { getRedisClient } = await import('../../../shared/database/redis.js');
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');

      const db = createMockDb();
      db.query.users.findFirst.mockResolvedValue(createMockUserRecord());
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(getRedisClient).mockReturnValue({
        status: 'ready',
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
        getValue: vi.fn().mockResolvedValue(null),
        setValue: vi.fn(),
        deleteKey: vi.fn(),
        getKeys: vi.fn(),
        quit: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
      });

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      await expect(
        mfaService.getMfaChallenge(createMockConfig(), createMockUser(), 'verification'),
      ).rejects.toThrow(MfaNotEnabledError);
    });

    it('MfaNotEnabledError has correct properties when thrown from getMfaChallenge', async () => {
      vi.mock('../../../shared/database/redis.js', () => ({
        getRedisClient: vi.fn().mockReturnValue({
          status: 'ready',
          connect: vi.fn().mockResolvedValue(undefined),
          ping: vi.fn().mockResolvedValue('PONG'),
          getValue: vi.fn().mockResolvedValue(null),
          setValue: vi.fn(),
          deleteKey: vi.fn(),
          getKeys: vi.fn(),
          quit: vi.fn().mockResolvedValue(undefined),
          disconnect: vi.fn(),
        }),
      }));

      const { getRedisClient } = await import('../../../shared/database/redis.js');
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');

      const db = createMockDb();
      db.query.users.findFirst.mockResolvedValue(createMockUserRecord());
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(getRedisClient).mockReturnValue({
        status: 'ready',
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockResolvedValue('PONG'),
        getValue: vi.fn().mockResolvedValue(null),
        setValue: vi.fn(),
        deleteKey: vi.fn(),
        getKeys: vi.fn(),
        quit: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
      });

      vi.mocked(getDatabaseClient).mockReturnValue(db);

      try {
        await mfaService.getMfaChallenge(createMockConfig(), createMockUser(), 'verification');
        expect.fail('Expected MfaNotEnabledError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MfaNotEnabledError);
        expect((error as MfaNotEnabledError).code).toBe(ErrorCodes.AUTH_MFA_NOT_ENABLED);
        expect((error as MfaNotEnabledError).statusCode).toBe(400);
        expect((error as MfaNotEnabledError).message).toBe('MFA is not enabled for this user');
      }
    });
  });
});
