import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ErrorCodes } from '@the-dmz/shared';

import { AppError } from '../../../shared/middleware/error-handler.js';
import { PasswordPolicyError } from '../auth.errors.js';
import { validatePasswordAgainstPolicy, screenPasswordForCompromise } from '../auth.crypto.js';

import type { AppConfig } from '../../../config.js';

vi.mock('../../../config.js', async () => {
  const actual = await vi.importActual('../../../config.js');
  return {
    ...actual,
  };
});

const mockConfig = {} as AppConfig;

describe('PasswordPolicyError', () => {
  describe('error class properties', () => {
    it('has code AUTH_PASSWORD_TOO_SHORT when violation contains tooShort', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 1,
        },
        violations: ['tooShort'],
      });
      expect(error.code).toBe(ErrorCodes.AUTH_PASSWORD_TOO_SHORT);
    });

    it('has code AUTH_PASSWORD_TOO_LONG when violation contains tooLong', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 1,
        },
        violations: ['tooLong'],
      });
      expect(error.code).toBe(ErrorCodes.AUTH_PASSWORD_TOO_LONG);
    });

    it('has code AUTH_PASSWORD_TOO_WEAK for complexity violations', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 1,
        },
        violations: ['missingUppercase', 'missingSpecial'],
      });
      expect(error.code).toBe(ErrorCodes.AUTH_PASSWORD_TOO_WEAK);
    });

    it('has code AUTH_PASSWORD_COMPROMISED when password is found in breach', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 0,
        },
        violations: ['compromised'],
      });
      expect(error.code).toBe(ErrorCodes.AUTH_PASSWORD_COMPROMISED);
    });

    it('has statusCode 400', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 0,
        },
        violations: ['compromised'],
      });
      expect(error.statusCode).toBe(400);
    });

    it('contains policyRequirements and violations in details', () => {
      const details = {
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 2,
        },
        violations: ['missingSpecial'],
      };
      const error = new PasswordPolicyError(details);
      expect(error.details).toMatchObject(details);
    });

    it('extends AuthError which extends AppError', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 0,
        },
        violations: ['compromised'],
      });
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('error messages', () => {
    it('returns correct message for AUTH_PASSWORD_TOO_SHORT', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 0,
        },
        violations: ['tooShort'],
      });
      expect(error.message).toBe('Password is below the minimum length requirement');
    });

    it('returns correct message for AUTH_PASSWORD_TOO_LONG', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 0,
        },
        violations: ['tooLong'],
      });
      expect(error.message).toBe('Password exceeds the maximum length requirement');
    });

    it('returns correct message for AUTH_PASSWORD_COMPROMISED', () => {
      const error = new PasswordPolicyError({
        policyRequirements: {
          minLength: 12,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: true,
          characterClassesRequired: 3,
          characterClassesMet: 0,
        },
        violations: ['compromised'],
      });
      expect(error.message).toBe(
        'Password found in known data breach. Please choose a different password.',
      );
    });
  });
});

describe('validatePasswordAgainstPolicy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws PasswordPolicyError with AUTH_PASSWORD_TOO_SHORT for too short password', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'AABBCC001:5',
    } as Response);

    expect(() => validatePasswordAgainstPolicy('Abc1!', 'test-tenant-id')).toThrow(
      PasswordPolicyError,
    );
    expect(() => validatePasswordAgainstPolicy('Abc1!', 'test-tenant-id')).toThrow((error) => {
      expect((error as PasswordPolicyError).code).toBe(ErrorCodes.AUTH_PASSWORD_TOO_SHORT);
      return true;
    });
  });

  it('throws PasswordPolicyError with AUTH_PASSWORD_TOO_LONG for too long password', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'AABBCC001:5',
    } as Response);

    const longPassword = 'A'.repeat(129) + 'a1!';
    expect(() => validatePasswordAgainstPolicy(longPassword, 'test-tenant-id')).toThrow(
      PasswordPolicyError,
    );
    expect(() => validatePasswordAgainstPolicy(longPassword, 'test-tenant-id')).toThrow((error) => {
      expect((error as PasswordPolicyError).code).toBe(ErrorCodes.AUTH_PASSWORD_TOO_LONG);
      return true;
    });
  });

  it('throws PasswordPolicyError with AUTH_PASSWORD_TOO_WEAK for password missing character classes', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'AABBCC001:5',
    } as Response);

    const weakPassword = 'password123';
    expect(() => validatePasswordAgainstPolicy(weakPassword, 'test-tenant-id')).toThrow(
      PasswordPolicyError,
    );
    expect(() => validatePasswordAgainstPolicy(weakPassword, 'test-tenant-id')).toThrow((error) => {
      expect((error as PasswordPolicyError).code).toBe(ErrorCodes.AUTH_PASSWORD_TOO_WEAK);
      return true;
    });
  });

  it('returns policy when password meets all requirements', () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'AABBCC001:5',
    } as Response);

    const validPassword = 'ValidPassword123!';
    expect(validatePasswordAgainstPolicy(validPassword, 'test-tenant-id')).toBeDefined();
  });
});

describe('screenPasswordForCompromise', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws PasswordPolicyError with AUTH_PASSWORD_COMPROMISED when password is found in breach', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'AABBCC001:5', // password appears in HIBP
    } as Response);

    await expect(screenPasswordForCompromise(mockConfig, 'password')).rejects.toThrow(
      PasswordPolicyError,
    );

    await expect(screenPasswordForCompromise(mockConfig, 'password')).rejects.toMatchObject({
      code: ErrorCodes.AUTH_PASSWORD_COMPROMISED,
      statusCode: 400,
    });
  });

  it('does not throw when password is not found in HIBP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'AABBCC001:5\nDDEEFF002:3', // password not in list
    } as Response);

    await expect(
      screenPasswordForCompromise(mockConfig, 'UniquePassword123!'),
    ).resolves.toBeUndefined();
  });

  it('propagates HIBP unavailability errors without throwing policy error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response);

    await expect(screenPasswordForCompromise(mockConfig, 'password')).rejects.toMatchObject({
      provider: 'hibp',
      unavailable: true,
    });
  });
});
