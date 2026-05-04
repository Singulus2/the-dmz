import { describe, expect, it } from 'vitest';
import { resolve, extname, basename } from 'path';
import { readdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const SHARED_MIDDLEWARE_DIR = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  'shared',
  'middleware',
);

const AUTH_MODULE_DIR = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  'modules',
  'auth',
);

const SOCIAL_MODULE_DIR = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  'modules',
  'social',
);

async function getFileImports(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, 'utf-8');
  const importLines = content.split('\n').filter((line) => line.startsWith('import '));
  return importLines;
}

async function getModuleExports(moduleDir: string, indexFile: string): Promise<string[]> {
  const indexPath = resolve(moduleDir, indexFile);
  const content = await readFile(indexPath, 'utf-8');
  const exportLines = content.split('\n').filter((line) => line.startsWith('export'));
  return exportLines;
}

describe('shared/middleware barrel file', () => {
  const barrelPath = resolve(SHARED_MIDDLEWARE_DIR, 'index.ts');

  it('should have an index.ts barrel file', async () => {
    const indexExists = await readFile(barrelPath, 'utf-8').then(() => true).catch(() => false);
    expect(indexExists, `Barrel file should exist at ${barrelPath}`).toBe(true);
  });

  it('should export authGuard from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toContain('export');
    expect(content).toMatch(/export\s*\{[^}]*authGuard[^}]*\}/);
  });

  it('should export requirePermission from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*requirePermission[^}]*\}/);
  });

  it('should export requireRole from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*requireRole[^}]*\}/);
  });

  it('should export resolvePermissions from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*resolvePermissions[^}]*\}/);
  });

  it('should export hasPermission from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*hasPermission[^}]*\}/);
  });

  it('should export hasRole from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*hasRole[^}]*\}/);
  });

  it('should export clearPermissionCache from authorization.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*clearPermissionCache[^}]*\}/);
  });

  it('should export requireMfaForSuperAdmin from mfa-guard.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*requireMfaForSuperAdmin[^}]*\}/);
  });

  it('should export isMfaVerifiedForSession from mfa-guard.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*isMfaVerifiedForSession[^}]*\}/);
  });

  it('should export createApiKeyAuthMiddleware from api-key-auth.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*createApiKeyAuthMiddleware[^}]*\}/);
  });

  it('should export apiKeyAuthMiddleware from api-key-auth.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*apiKeyAuthMiddleware[^}]*\}/);
  });

  it('should export moderationEnforcement from moderation-enforcement.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*moderationEnforcement[^}]*\}/);
  });

  it('should export registerModerationEnforcement from moderation-enforcement.ts', async () => {
    const content = await readFile(barrelPath, 'utf-8');
    expect(content).toMatch(/export\s*\{[^}]*registerModerationEnforcement[^}]*\}/);
  });
});

describe('auth module public API for apiKeyService', () => {
  const authIndexPath = resolve(AUTH_MODULE_DIR, 'index.ts');

  it('should export apiKeyService from auth/index.ts', async () => {
    const content = await readFile(authIndexPath, 'utf-8');
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/api-key\.service\.js['"]/);
  });
});

describe('social module public API for isActionAllowed', () => {
  const socialIndexPath = resolve(SOCIAL_MODULE_DIR, 'index.ts');

  it('should export isActionAllowed from social/index.ts', async () => {
    const content = await readFile(socialIndexPath, 'utf-8');
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/moderation-enforcement\.service\.js['"]/);
  });
});

describe('cross-module imports use public APIs', () => {
  const middlewareFiles = [
    'authorization.ts',
    'mfa-guard.ts',
    'api-key-auth.ts',
    'moderation-enforcement.ts',
  ];

  it('authorization.ts should import from modules/auth/index.ts, not auth.errors.js directly', async () => {
    const filePath = resolve(SHARED_MIDDLEWARE_DIR, 'authorization.ts');
    const imports = await getFileImports(filePath);

    const authErrorImport = imports.find((line) => line.includes("from '../../modules/auth/auth.errors.js'"));
    expect(authErrorImport, 'authorization.ts should NOT import auth.errors.js directly').toBeUndefined();

    const authServiceImport = imports.find((line) => line.includes("from '../../modules/auth/auth.service.js'"));
    expect(authServiceImport, 'authorization.ts should NOT import auth.service.js directly').toBeUndefined();

    const authIndexImport = imports.find((line) => line.includes("from '../../modules/auth/index.js'"));
    expect(authIndexImport, 'authorization.ts should import from modules/auth/index.js').toBeDefined();
  });

  it('mfa-guard.ts should import from modules/auth/index.ts, not auth.errors.js directly', async () => {
    const filePath = resolve(SHARED_MIDDLEWARE_DIR, 'mfa-guard.ts');
    const imports = await getFileImports(filePath);

    const authErrorImport = imports.find((line) => line.includes("from '../../modules/auth/auth.errors.js'"));
    expect(authErrorImport, 'mfa-guard.ts should NOT import auth.errors.js directly').toBeUndefined();

    const authIndexImport = imports.find((line) => line.includes("from '../../modules/auth/index.js'"));
    expect(authIndexImport, 'mfa-guard.ts should import from modules/auth/index.js').toBeDefined();
  });

  it('api-key-auth.ts should import apiKeyService from modules/auth/index.ts, not api-key.service.js directly', async () => {
    const filePath = resolve(SHARED_MIDDLEWARE_DIR, 'api-key-auth.ts');
    const imports = await getFileImports(filePath);

    const apiKeyServiceImport = imports.find((line) => line.includes("from '../../modules/auth/api-key.service.js'"));
    expect(apiKeyServiceImport, 'api-key-auth.ts should NOT import api-key.service.js directly').toBeUndefined();

    const authIndexImport = imports.find((line) => line.includes("from '../../modules/auth/index.js'"));
    expect(authIndexImport, 'api-key-auth.ts should import from modules/auth/index.js').toBeDefined();
  });

  it('moderation-enforcement.ts should import isActionAllowed from modules/social/index.ts, not moderation-enforcement.service.js directly', async () => {
    const filePath = resolve(SHARED_MIDDLEWARE_DIR, 'moderation-enforcement.ts');
    const imports = await getFileImports(filePath);

    const moderationImport = imports.find((line) => line.includes("from '../../modules/social/moderation-enforcement.service.js'"));
    expect(moderationImport, 'moderation-enforcement.ts should NOT import moderation-enforcement.service.js directly').toBeUndefined();

    const socialIndexImport = imports.find((line) => line.includes("from '../../modules/social/index.js'"));
    expect(socialIndexImport, 'moderation-enforcement.ts should import from modules/social/index.js').toBeDefined();
  });
});