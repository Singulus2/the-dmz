import { randomBytes, scryptSync, createCipheriv } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT, importPKCS8 } from 'jose';

import {
  generateRSAKeyPair,
  signJWT,
  verifyJWT,
} from '../jwt-keys.service.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import type { AppConfig } from '../../../config.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
  closeDatabase: vi.fn(),
}));

type MockKey = {
  id: string;
  keyType: string;
  algorithm: string;
  publicKeyPem: string;
  privateKeyEncryptedPem: string;
  status: string;
  activatedAt: Date;
  expiresAt: Date | null;
} | null;

const mockDbForKey = (key: MockKey) => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(key ? [key] : [])) })),
    })),
  })),
});

describe('verifyJWT payload validation', () => {
  const mockIssuer = 'https://the-dmz.local';
  const mockAudience = 'the-dmz-api';
  const mockKid = 'test-key-id-1234';

  const SALT_LENGTH = 32;
  const IV_LENGTH = 16;

  const encryptPrivateKeyForMock = (privateKeyPem: string, encryptionKey: string): string => {
    const salt = randomBytes(SALT_LENGTH);
    const key = scryptSync(encryptionKey, salt, 32);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
  };

  let createdKey: MockKey = null;

  const createMockConfig = (overrides: Partial<AppConfig> = {}): AppConfig =>
    ({
      JWT_ISSUER: mockIssuer,
      JWT_AUDIENCE: mockAudience,
      JWT_EXPIRES_IN: '7d',
      JWT_PRIVATE_KEY_ENCRYPTION_KEY: 'test-encryption-key-at-least-32-chars',
      ...overrides,
    }) as AppConfig;

  const createMockDb = (keyPair: { publicKeyPem: string; privateKeyPem: string }) => {
    const encryptedPem = encryptPrivateKeyForMock(
      keyPair.privateKeyPem,
      'test-encryption-key-at-least-32-chars',
    );
    createdKey = {
      id: mockKid,
      keyType: 'RSA',
      algorithm: 'RS256',
      publicKeyPem: keyPair.publicKeyPem,
      privateKeyEncryptedPem: encryptedPem,
      status: 'ACTIVE',
      activatedAt: new Date(),
      expiresAt: null,
    };
    return mockDbForKey(createdKey);
  };

  beforeEach(async () => {
    const keyPair = await generateRSAKeyPair();
    const mockDb = createMockDb(keyPair);
    vi.mocked(getDatabaseClient).mockReset();
    vi.mocked(getDatabaseClient).mockReturnValue(
      mockDb as unknown as ReturnType<typeof getDatabaseClient>,
    );
  });

  describe('payload structure validation', () => {
    it('should throw when payload is missing required sub field', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({ tenantId: 'tenant-123', sessionId: 'session-456' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when payload is missing required tenantId field', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({ sub: 'user-123', sessionId: 'session-456' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when payload is missing required sessionId field', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({ sub: 'user-123', tenantId: 'tenant-456' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when sub is not a string', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({
        sub: 12345 as unknown as string,
        tenantId: 'tenant-456',
        sessionId: 'session-789',
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when tenantId is not a string', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({
        sub: 'user-123',
        tenantId: 999 as unknown as string,
        sessionId: 'session-789',
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when sessionId is not a string', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 777 as unknown as string,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when role is not a string when present', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
        role: 42 as unknown as string,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when iat is not a number when present', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
        iat: 'not-a-number' as unknown as number,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });

    it('should throw when exp is not a number when present', async () => {
      const keyPair = await generateRSAKeyPair();
      const privateKey = await importPKCS8(keyPair.privateKeyPem, 'RS256');

      const token = await new SignJWT({
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
        exp: { value: 999 } as unknown as number,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: mockKid })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer(mockIssuer)
        .setAudience(mockAudience)
        .sign(privateKey);

      await expect(verifyJWT(createMockConfig(), token)).rejects.toThrow();
    });
  });

  describe('valid payload returns typed result', () => {
    it('should return properly typed payload with required fields', async () => {
      const config = createMockConfig();
      const token = await signJWT(config, {
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
      });

      const result = await verifyJWT(config, token);

      expect(result.payload).toBeDefined();
      expect(result.payload.sub).toBe('user-123');
      expect(result.payload.tenantId).toBe('tenant-456');
      expect(result.payload.sessionId).toBe('session-789');
    });

    it('should return properly typed payload including optional role field', async () => {
      const config = createMockConfig();
      const token = await signJWT(config, {
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
        role: 'admin',
      });

      const result = await verifyJWT(config, token);

      expect(result.payload).toBeDefined();
      expect(result.payload.role).toBe('admin');
    });

    it('should return result where payload has typed properties, not just Record<string, unknown>', async () => {
      const config = createMockConfig();
      const token = await signJWT(config, {
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
      });

      const result = await verifyJWT(config, token);

      expect(typeof result.payload.sub).toBe('string');
      expect(typeof result.payload.tenantId).toBe('string');
      expect(typeof result.payload.sessionId).toBe('string');

      expect(result.payload.missingField).toBeUndefined();
    });

    it('should return header with typed kid and alg properties', async () => {
      const config = createMockConfig();
      const token = await signJWT(config, {
        sub: 'user-123',
        tenantId: 'tenant-456',
        sessionId: 'session-789',
      });

      const result = await verifyJWT(config, token);

      expect(result.header).toBeDefined();
      expect(typeof result.header.kid).toBe('string');
      expect(typeof result.header.alg).toBe('string');
    });
  });
});