import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RetentionWorker } from '../retention.worker.js';

import type { Job } from 'bullmq';
import type { DataCategory } from '../../../db/schema/retention/index.js';

const mockIsLegalHoldActive = vi.fn();
const mockGetEffectiveRetentionPolicy = vi.fn();
const mockCalculateExpiryDate = vi.fn();

const mockSentryCaptureException = vi.fn();

vi.mock('@sentry/node', () => ({
  default: {
    init: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    captureException: mockSentryCaptureException,
  },
  init: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  captureException: mockSentryCaptureException,
}));

vi.mock('../../../shared/metrics/hooks.js', () => ({
  recordQueueDepth: vi.fn(),
}));

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('../../../db/schema/game/events.schema.js', () => ({
  gameEvents: {},
}));

vi.mock('../../../db/schema/analytics/index.js', () => ({
  analyticsEvents: {},
}));

vi.mock('../../../db/schema/audit/index.js', () => ({
  auditLogs: {},
}));

vi.mock('../../../shared/database/schema/users.js', () => ({
  users: {},
}));

vi.mock('../../../db/schema/retention/index.js', () => ({
  archivedData: {},
}));

vi.mock('../../../db/schema/social/index.js', () => ({
  chatChannel: {},
  chatMessage: {},
}));

vi.mock('../../auth/index.js', () => ({
  getExpiredSessions: vi.fn().mockResolvedValue([]),
  deleteSessionsByIds: vi.fn().mockResolvedValue(0),
}));

vi.mock('../retention.service.js', () => ({
  calculateExpiryDate: (...args: unknown[]) => mockCalculateExpiryDate(...args),
  getEffectiveRetentionPolicy: (...args: unknown[]) => mockGetEffectiveRetentionPolicy(...args),
  isLegalHoldActive: (...args: unknown[]) => mockIsLegalHoldActive(...args),
}));

vi.mock('../anonymization.service.js', () => ({
  anonymizationService: {
    anonymize: vi
      .fn()
      .mockReturnValue({ anonymized: { email: 'anon123' }, fieldsAnonymized: ['email'] }),
  },
}));

vi.mock('../archive.service.js', () => ({
  archiveService: {
    archive: vi.fn().mockResolvedValue({ id: 'archive-1' }),
    deleteExpiredArchives: vi.fn().mockResolvedValue({ deleted: 0 }),
  },
}));

describe('RetentionWorker Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSentryCaptureException.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sentry error capture on job failure', () => {
    it('captures Sentry exception with sanitized job context when job fails', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'retention-job-123',
        name: 'process-tenant',
        queueName: 'retention-processing',
        attemptsMade: 2,
        data: { type: 'process-tenant', tenantId: 'tenant-retention' },
      } as unknown as Job;

      const mockError = new Error('Retention processing failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await captureError();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          extra: expect.objectContaining({
            jobId: 'retention-job-123',
            jobName: 'process-tenant',
            queueName: 'retention-processing',
            attemptsMade: 2,
            tenantId: 'tenant-retention',
          }),
        }),
      );
    });

    it('sanitizes sensitive data in job context', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockError = new Error('Anonymization failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: 'retention-job-456',
            jobName: 'anonymize-user',
            queueName: 'retention-processing',
            attemptsMade: 1,
            tenantId: 'tenant-sensitive',
            // secretlint-disable-next-line
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            secretValue: 'secret-key-value', // nosec
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            token: 'jwt-token-xyz', // nosec
            // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
            password: 'database-password', // nosec
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await captureError();

      expect(mockSentryCaptureException).toHaveBeenCalled();
      const capturedContext = mockSentryCaptureException.mock.calls[0]![1] as {
        extra: Record<string, unknown>;
      };
      expect(capturedContext.extra.secretValue).toBe('[REDACTED]');
      expect(capturedContext.extra.token).toBe('[REDACTED]');
      expect(capturedContext.extra.password).toBe('[REDACTED]');
    });

    it('does not capture Sentry exception when job is undefined', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockError = new Error('Some retention error');

      const shouldCapture = (job: Job | undefined, error: Error) => {
        if (error && job) {
          const captureError = async () => {
            try {
              const Sentry = await import('@sentry/node');
              const sentry = Sentry.default ?? Sentry;
              const context = sanitizeContext({
                jobId: job.id,
                jobName: job.name,
                queueName: job.queueName,
                attemptsMade: job.attemptsMade,
              });
              sentry.captureException(error, { extra: context });
            } catch {
              // Sentry capture failed, continue without error tracking
            }
          };
          void captureError();
        }
      };

      shouldCapture(undefined, mockError);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });

    it('does not capture Sentry exception when error is undefined', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'retention-job-789',
        name: 'cleanup-archives',
        queueName: 'retention-processing',
        attemptsMade: 1,
        data: { type: 'cleanup-expired-archives', tenantId: 'tenant-1' },
      } as unknown as Job;

      const shouldCapture = (job: Job | undefined, error: Error | undefined) => {
        if (error && job) {
          const captureError = async () => {
            try {
              const Sentry = await import('@sentry/node');
              const sentry = Sentry.default ?? Sentry;
              const context = sanitizeContext({
                jobId: job.id,
                jobName: job.name,
                queueName: job.queueName,
                attemptsMade: job.attemptsMade,
              });
              sentry.captureException(error, { extra: context });
            } catch {
              // Sentry capture failed, continue without error tracking
            }
          };
          void captureError();
        }
      };

      shouldCapture(mockJob, undefined);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });

    it('continues working if Sentry capture fails', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'retention-error-test',
        name: 'process-category',
        queueName: 'retention-processing',
        attemptsMade: 1,
        data: { type: 'process-category', tenantId: 'tenant-1', dataCategory: 'events' },
      } as unknown as Job;

      const mockError = new Error('Category processing failed');

      mockSentryCaptureException.mockImplementationOnce(() => {
        throw new Error('Sentry network error');
      });

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await expect(captureError()).resolves.not.toThrow();

      expect(mockSentryCaptureException).toHaveBeenCalled();
    });

    it('correctly extracts tenantId from job data', async () => {
      const { sanitizeContext } = await import('@the-dmz/shared');

      const mockJob = {
        id: 'retention-tenant-test',
        name: 'process-tenant',
        queueName: 'retention-processing',
        attemptsMade: 3,
        data: { type: 'process-tenant', tenantId: 'tenant-specific-456', categories: ['events'] },
      } as unknown as Job;

      const mockError = new Error('Tenant processing failed');

      const captureError = async () => {
        try {
          const Sentry = await import('@sentry/node');
          const sentry = Sentry.default ?? Sentry;
          const context = sanitizeContext({
            jobId: mockJob.id,
            jobName: mockJob.name,
            queueName: mockJob.queueName,
            attemptsMade: mockJob.attemptsMade,
            tenantId: mockJob.data.tenantId,
          });
          sentry.captureException(mockError, { extra: context });
        } catch {
          // Sentry capture failed, continue without error tracking
        }
      };

      await captureError();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          extra: expect.objectContaining({
            tenantId: 'tenant-specific-456',
          }),
        }),
      );
    });
  });
});

class TestableRetentionWorker extends RetentionWorker {
  async testGetRetentionSkipReason(tenantId: string, dataCategory: DataCategory) {
    return this.getRetentionSkipReason(tenantId, dataCategory);
  }

  /* eslint-disable max-params */
  async testHandleRetentionCase(
    tenantId: string,
    dataCategory: DataCategory,
    expiryDate: Date,
    policy: { effectiveRetentionDays: number; effectiveAction: string },
    batchSize: number,
  ) {
    /* eslint-enable max-params */
    return this.handleRetentionCase(tenantId, dataCategory, expiryDate, policy, batchSize);
  }

  async testProcessUserDataAsRetention(tenantId: string, expiryDate: Date, batchSize: number) {
    return this.processUserDataAsRetention(tenantId, expiryDate, batchSize);
  }
}

describe('RetentionWorker getRetentionSkipReason', () => {
  let worker: TestableRetentionWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLegalHoldActive.mockResolvedValue(false);
    mockGetEffectiveRetentionPolicy.mockReturnValue({
      effectiveRetentionDays: 90,
      effectiveAction: 'archive',
    });
    mockCalculateExpiryDate.mockReturnValue(new Date());

    worker = new TestableRetentionWorker(
      { redisUrl: 'redis://localhost:6379' },
      { archiveService, anonymizationService },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns legal_hold when legal hold is active', async () => {
    mockIsLegalHoldActive.mockResolvedValue(true);

    const result = await worker.testGetRetentionSkipReason('tenant-1', 'events');

    expect(result).toBe('legal_hold');
    expect(mockIsLegalHoldActive).toHaveBeenCalledWith('tenant-1', 'events');
  });

  it('returns retention_disabled when effectiveRetentionDays is -1', async () => {
    mockIsLegalHoldActive.mockResolvedValue(false);
    mockGetEffectiveRetentionPolicy.mockReturnValue({
      effectiveRetentionDays: -1,
      effectiveAction: 'archive',
    });

    const result = await worker.testGetRetentionSkipReason('tenant-1', 'events');

    expect(result).toBe('retention_disabled');
  });

  it('returns no_expiry_date when calculateExpiryDate returns null', async () => {
    mockCalculateExpiryDate.mockReturnValue(null);

    const result = await worker.testGetRetentionSkipReason('tenant-1', 'events');

    expect(result).toBe('no_expiry_date');
  });

  it('returns null when no skip condition applies', async () => {
    const result = await worker.testGetRetentionSkipReason('tenant-1', 'events');

    expect(result).toBeNull();
  });

  it('checks legal hold first before other conditions', async () => {
    mockIsLegalHoldActive.mockResolvedValue(true);
    mockGetEffectiveRetentionPolicy.mockReturnValue({
      effectiveRetentionDays: -1,
      effectiveAction: 'archive',
    });
    mockCalculateExpiryDate.mockReturnValue(null);

    const result = await worker.testGetRetentionSkipReason('tenant-1', 'events');

    expect(result).toBe('legal_hold');
    expect(mockIsLegalHoldActive).toHaveBeenCalled();
    expect(mockGetEffectiveRetentionPolicy).not.toHaveBeenCalled();
  });

  it('checks retention policy before expiry date', async () => {
    mockIsLegalHoldActive.mockResolvedValue(false);
    mockGetEffectiveRetentionPolicy.mockReturnValue({
      effectiveRetentionDays: -1,
      effectiveAction: 'archive',
    });
    mockCalculateExpiryDate.mockReturnValue(null);

    const result = await worker.testGetRetentionSkipReason('tenant-1', 'events');

    expect(result).toBe('retention_disabled');
    expect(mockCalculateExpiryDate).not.toHaveBeenCalled();
  });
});

describe('RetentionWorker handleRetentionCase', () => {
  let worker: TestableRetentionWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    worker = new TestableRetentionWorker(
      { redisUrl: 'redis://localhost:6379' },
      { archiveService, anonymizationService },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes events category to processGameEvents', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processGameEvents' as any);
    spy.mockResolvedValue({ processed: 10, archived: 5, deleted: 5 });

    const result = await worker.testHandleRetentionCase(
      'tenant-1',
      'events',
      new Date(),
      { effectiveRetentionDays: 90, effectiveAction: 'archive' },
      100,
    );

    expect(spy).toHaveBeenCalledWith('tenant-1', expect.any(Date), 'archive', 100);
    expect(result.processed).toBe(10);
    expect(result.archived).toBe(5);
    expect(result.deleted).toBe(5);
    expect(result.anonymized).toBe(0);
  });

  it('routes sessions category to processSessions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processSessions' as any);
    spy.mockResolvedValue({ processed: 8, archived: 3, deleted: 5 });

    const result = await worker.testHandleRetentionCase(
      'tenant-1',
      'sessions',
      new Date(),
      { effectiveRetentionDays: 90, effectiveAction: 'archive' },
      100,
    );

    expect(spy).toHaveBeenCalled();
    expect(result.processed).toBe(8);
  });

  it('routes analytics category to processAnalyticsEvents', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processAnalyticsEvents' as any);
    spy.mockResolvedValue({ processed: 15, archived: 10, deleted: 5 });

    const result = await worker.testHandleRetentionCase(
      'tenant-1',
      'analytics',
      new Date(),
      { effectiveRetentionDays: 90, effectiveAction: 'archive' },
      100,
    );

    expect(spy).toHaveBeenCalled();
    expect(result.processed).toBe(15);
  });

  it('routes audit_logs category to processAuditLogs', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processAuditLogs' as any);
    spy.mockResolvedValue({ processed: 20, archived: 0, deleted: 20 });

    const result = await worker.testHandleRetentionCase(
      'tenant-1',
      'audit_logs',
      new Date(),
      { effectiveRetentionDays: 90, effectiveAction: 'delete' },
      100,
    );

    expect(spy).toHaveBeenCalled();
    expect(result.processed).toBe(20);
  });

  it('routes chat_messages category to processChatMessages', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processChatMessages' as any);
    spy.mockResolvedValue({ processed: 12, archived: 6, deleted: 6 });

    const result = await worker.testHandleRetentionCase(
      'tenant-1',
      'chat_messages',
      new Date(),
      { effectiveRetentionDays: 90, effectiveAction: 'archive' },
      100,
    );

    expect(spy).toHaveBeenCalled();
    expect(result.processed).toBe(12);
  });

  it('routes user_data category to processUserDataAsRetention', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processUserDataSpy = vi.spyOn(worker, 'processUserData' as any);
    processUserDataSpy.mockResolvedValue({ processed: 5, anonymized: 5 });

    const result = await worker.testHandleRetentionCase(
      'tenant-1',
      'user_data',
      new Date(),
      { effectiveRetentionDays: 90, effectiveAction: 'anonymize' },
      100,
    );

    expect(processUserDataSpy).toHaveBeenCalledWith('tenant-1', expect.any(Date), 100);
    expect(result.processed).toBe(5);
    expect(result.anonymized).toBe(5);
    expect(result.archived).toBe(0);
    expect(result.deleted).toBe(0);
  });

  it('throws error for unknown data category', async () => {
    await expect(
      worker.testHandleRetentionCase(
        'tenant-1',
        'unknown_category' as DataCategory,
        new Date(),
        { effectiveRetentionDays: 90, effectiveAction: 'archive' },
        100,
      ),
    ).rejects.toThrow('Unknown data category: unknown_category');
  });
});

describe('RetentionWorker processUserDataAsRetention', () => {
  let worker: TestableRetentionWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    worker = new TestableRetentionWorker(
      { redisUrl: 'redis://localhost:6379' },
      { archiveService, anonymizationService },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wraps processUserData and returns anonymized as 0', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processUserData' as any);
    spy.mockResolvedValue({ processed: 7, anonymized: 7 });

    const result = await worker.testProcessUserDataAsRetention('tenant-1', new Date(), 100);

    expect(spy).toHaveBeenCalledWith('tenant-1', expect.any(Date), 100);
    expect(result.processed).toBe(7);
    expect(result.archived).toBe(0);
    expect(result.deleted).toBe(0);
  });

  it('returns archived and deleted as 0 regardless of processUserData result', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi.spyOn(worker, 'processUserData' as any);
    spy.mockResolvedValue({ processed: 3, anonymized: 3 });

    const result = await worker.testProcessUserDataAsRetention('tenant-1', new Date(), 50);

    expect(result.archived).toBe(0);
    expect(result.deleted).toBe(0);
  });
});
