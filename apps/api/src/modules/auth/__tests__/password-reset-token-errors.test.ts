import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PASSWORD_RECOVERY_ERROR_CODES } from '@the-dmz/shared/contracts';

import { AppError } from '../../../shared/middleware/error-handler.js';
import {
  PasswordResetTokenExpiredError,
  PasswordResetTokenInvalidError,
  PasswordResetTokenAlreadyUsedError,
  PasswordResetRateLimitedError,
} from '../auth.errors.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('PasswordResetTokenExpiredError', () => {
  it('has correct error code AUTH_PASSWORD_RESET_TOKEN_EXPIRED', () => {
    const error = new PasswordResetTokenExpiredError();
    expect(error.code).toBe(PASSWORD_RECOVERY_ERROR_CODES.EXPIRED);
  });

  it('has statusCode 400', () => {
    const error = new PasswordResetTokenExpiredError();
    expect(error.statusCode).toBe(400);
  });

  it('has descriptive message', () => {
    const error = new PasswordResetTokenExpiredError();
    expect(error.message).toBe('Password reset token has expired');
  });

  it('contains reason: expired in details', () => {
    const error = new PasswordResetTokenExpiredError();
    expect(error.details).toMatchObject({ reason: 'expired' });
  });

  it('extends AuthError which extends AppError', () => {
    const error = new PasswordResetTokenExpiredError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('PasswordResetTokenInvalidError', () => {
  it('has correct error code AUTH_PASSWORD_RESET_TOKEN_INVALID', () => {
    const error = new PasswordResetTokenInvalidError();
    expect(error.code).toBe(PASSWORD_RECOVERY_ERROR_CODES.INVALID);
  });

  it('has statusCode 400', () => {
    const error = new PasswordResetTokenInvalidError();
    expect(error.statusCode).toBe(400);
  });

  it('has descriptive message', () => {
    const error = new PasswordResetTokenInvalidError();
    expect(error.message).toBe('Password reset token is invalid');
  });

  it('contains reason: invalid in details', () => {
    const error = new PasswordResetTokenInvalidError();
    expect(error.details).toMatchObject({ reason: 'invalid' });
  });

  it('extends AuthError which extends AppError', () => {
    const error = new PasswordResetTokenInvalidError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('PasswordResetTokenAlreadyUsedError', () => {
  it('has correct error code AUTH_PASSWORD_RESET_TOKEN_ALREADY_USED', () => {
    const error = new PasswordResetTokenAlreadyUsedError();
    expect(error.code).toBe(PASSWORD_RECOVERY_ERROR_CODES.ALREADY_USED);
  });

  it('has statusCode 400', () => {
    const error = new PasswordResetTokenAlreadyUsedError();
    expect(error.statusCode).toBe(400);
  });

  it('has descriptive message', () => {
    const error = new PasswordResetTokenAlreadyUsedError();
    expect(error.message).toBe('Password reset token has already been used');
  });

  it('contains reason: already_used in details', () => {
    const error = new PasswordResetTokenAlreadyUsedError();
    expect(error.details).toMatchObject({ reason: 'already_used' });
  });

  it('extends AuthError which extends AppError', () => {
    const error = new PasswordResetTokenAlreadyUsedError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('PasswordResetRateLimitedError', () => {
  it('has correct error code AUTH_PASSWORD_RESET_RATE_LIMITED', () => {
    const error = new PasswordResetRateLimitedError(3600);
    expect(error.code).toBe(PASSWORD_RECOVERY_ERROR_CODES.RATE_LIMITED);
  });

  it('has statusCode 429', () => {
    const error = new PasswordResetRateLimitedError(3600);
    expect(error.statusCode).toBe(429);
  });

  it('has descriptive message', () => {
    const error = new PasswordResetRateLimitedError(3600);
    expect(error.message).toBe('Too many password reset requests. Please try again later.');
  });

  it('contains reason: rate_limited and retryAfterSeconds in details', () => {
    const retryAfterSeconds = 3600;
    const error = new PasswordResetRateLimitedError(retryAfterSeconds);
    expect(error.details).toMatchObject({ reason: 'rate_limited', retryAfterSeconds });
  });

  it('extends AuthError which extends AppError', () => {
    const error = new PasswordResetRateLimitedError(3600);
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('requestPasswordReset rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PasswordResetRateLimitedError is thrown when rate limit is exceeded', async () => {
    vi.mock('../../../shared/database/redis.js', () => ({
      getRedisClient: vi.fn().mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        incrementRateLimitKey: vi.fn().mockResolvedValue({ current: 4, ttl: 3600000 }),
      }),
    }));

    const { requestPasswordReset } = await import('../auth.password.service.js');

    await expect(
      requestPasswordReset({} as never, { email: 'test@example.com' }, { tenantId: 'test-tenant' }),
    ).rejects.toThrow(PasswordResetRateLimitedError);
  });
});

describe('validatePasswordResetToken error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PasswordResetTokenInvalidError is thrown when token record not found', async () => {
    const { getDatabaseClient } = await import('../../../shared/database/connection.js');

    const mockDb = {
      query: {
        passwordResetTokens: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as ReturnType<typeof getDatabaseClient>);

    const { changePasswordWithToken } = await import('../auth.password.service.js');

    await expect(
      changePasswordWithToken(
        {} as never,
        { token: 'example-token', password: 'ValidPassword123!' },
        { tenantId: 'test-tenant' },
      ),
    ).rejects.toThrow(PasswordResetTokenInvalidError);
  });

  it('PasswordResetTokenAlreadyUsedError is thrown when token already used', async () => {
    const { getDatabaseClient } = await import('../../../shared/database/connection.js');

    const mockDb = {
      query: {
        passwordResetTokens: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'token-id',
            userId: 'user-id',
            tenantId: 'test-tenant',
            usedAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
          }),
        },
      },
    };

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as ReturnType<typeof getDatabaseClient>);

    const { changePasswordWithToken } = await import('../auth.password.service.js');

    await expect(
      changePasswordWithToken(
        {} as never,
        { token: 'example-token', password: 'ValidPassword123!' },
        { tenantId: 'test-tenant' },
      ),
    ).rejects.toThrow(PasswordResetTokenAlreadyUsedError);
  });

  it('PasswordResetTokenExpiredError is thrown when token is expired', async () => {
    const { getDatabaseClient } = await import('../../../shared/database/connection.js');

    const mockDb = {
      query: {
        passwordResetTokens: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'token-id',
            userId: 'user-id',
            tenantId: 'test-tenant',
            usedAt: null,
            expiresAt: new Date(Date.now() - 3600000),
          }),
        },
      },
    };

    vi.mocked(getDatabaseClient).mockReturnValue(mockDb as ReturnType<typeof getDatabaseClient>);

    const { changePasswordWithToken } = await import('../auth.password.service.js');

    await expect(
      changePasswordWithToken(
        {} as never,
        { token: 'example-token', password: 'ValidPassword123!' },
        { tenantId: 'test-tenant' },
      ),
    ).rejects.toThrow(PasswordResetTokenExpiredError);
  });
});
