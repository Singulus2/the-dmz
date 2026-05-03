import { describe, it, expect } from 'vitest';

import {
  DAY_PHASES,
  EMAIL_STATUS,
  GAME_ENGINE_EVENTS,
  type GameState,
  type LoadInboxPayload,
  type OpenEmailPayload,
  createInitialBreachState,
} from '@the-dmz/shared';

import { handleLoadInbox, handleOpenEmail } from '../email-handlers.js';

import type { DomainEvent } from '../handler-utils.js';

const createTestGameState = (overrides?: Partial<GameState>): GameState => {
  const state: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: 'SESSION_ACTIVE',
    currentPhase: DAY_PHASES.PHASE_EMAIL_INTAKE,
    funds: 1000,
    trustScore: 50,
    intelFragments: 0,
    playerLevel: 1,
    playerXP: 0,
    threatTier: 'low',
    facilityTier: 'outpost',
    facility: {
      tier: 'outpost',
      capacities: {
        rackCapacityU: 42,
        powerCapacityKw: 10,
        coolingCapacityTons: 5,
        bandwidthCapacityMbps: 100,
      },
      usage: {
        rackUsedU: 0,
        powerUsedKw: 0,
        coolingUsedTons: 0,
        bandwidthUsedMbps: 0,
      },
      clients: [],
      upgrades: [],
      maintenanceDebt: 0,
      facilityHealth: 100,
      operatingCostPerDay: 50,
      securityToolOpExPerDay: 0,
      attackSurfaceScore: 10,
      lastTickDay: 1,
    },
    inbox: [],
    emailInstances: {},
    verificationPackets: {},
    incidents: [],
    threats: [],
    breachState: createInitialBreachState(),
    narrativeState: {
      currentChapter: 1,
      activeTriggers: [],
      completedEvents: [],
    },
    factionRelations: {},
    blacklist: [],
    whitelist: [],
    analyticsState: {
      totalEmailsProcessed: 0,
      totalDecisions: 0,
      approvals: 0,
      denials: 0,
      flags: 0,
      verificationsRequested: 0,
      incidentsTriggered: 0,
      breaches: 0,
    },
    sequenceNumber: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (overrides) {
    return { ...state, ...overrides };
  }
  return state;
};

describe('email-handlers EMAIL_STATUS integration', () => {
  describe('handleLoadInbox', () => {
    it('should set email status to EMAIL_STATUS.PENDING using the constant', () => {
      const state = createTestGameState();
      const events: DomainEvent[] = [];

      const action: LoadInboxPayload = {
        emails: [
          {
            emailId: 'email-1',
            sessionId: 'test-session-id',
            dayNumber: 1,
            difficulty: 1,
            intent: 'legitimate',
            technique: 'phishing',
            threatTier: 'low',
            faction: 'test-faction',
            sender: {
              displayName: 'Test Sender',
              emailAddress: 'test@example.com',
              domain: 'example.com',
              jobRole: 'Developer',
              organization: 'Test Org',
              relationshipHistory: 5,
            },
            headers: {
              messageId: 'msg-1',
              returnPath: 'test@example.com',
              received: [],
              spfResult: 'pass',
              dkimResult: 'pass',
              dmarcResult: 'pass',
              originalDate: new Date().toISOString(),
              subject: 'Test Email',
            },
            body: {
              preview: 'Test preview',
              fullBody: 'Test body',
              embeddedLinks: [],
            },
            attachments: [],
            accessRequest: {
              applicantName: 'Test Applicant',
              applicantRole: 'Developer',
              organization: 'Test Org',
              requestedAssets: ['asset-1'],
              requestedServices: ['service-1'],
              justification: 'Testing',
              urgency: 'low',
              value: 100,
            },
            indicators: [],
            groundTruth: {
              isMalicious: false,
              correctDecision: 'approve',
              riskScore: 10,
              explanation: 'Test explanation',
              consequences: {
                approved: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
                denied: { trustImpact: -5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
                flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
                deferred: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              },
            },
            createdAt: new Date().toISOString(),
          },
        ],
      };

      handleLoadInbox(state, action, events);

      expect(state.inbox).toHaveLength(1);
      expect(state.inbox[0].status).toBe(EMAIL_STATUS.PENDING);
    });

    it('should emit INBOX_LOADED event', () => {
      const state = createTestGameState();
      const events: DomainEvent[] = [];

      const action: LoadInboxPayload = {
        emails: [
          {
            emailId: 'email-1',
            sessionId: 'test-session-id',
            dayNumber: 1,
            difficulty: 1,
            intent: 'legitimate',
            technique: 'phishing',
            threatTier: 'low',
            faction: 'test-faction',
            sender: {
              displayName: 'Test Sender',
              emailAddress: 'test@example.com',
              domain: 'example.com',
              jobRole: 'Developer',
              organization: 'Test Org',
              relationshipHistory: 5,
            },
            headers: {
              messageId: 'msg-1',
              returnPath: 'test@example.com',
              received: [],
              spfResult: 'pass',
              dkimResult: 'pass',
              dmarcResult: 'pass',
              originalDate: new Date().toISOString(),
              subject: 'Test Email',
            },
            body: {
              preview: 'Test preview',
              fullBody: 'Test body',
              embeddedLinks: [],
            },
            attachments: [],
            accessRequest: {
              applicantName: 'Test Applicant',
              applicantRole: 'Developer',
              organization: 'Test Org',
              requestedAssets: ['asset-1'],
              requestedServices: ['service-1'],
              justification: 'Testing',
              urgency: 'low',
              value: 100,
            },
            indicators: [],
            groundTruth: {
              isMalicious: false,
              correctDecision: 'approve',
              riskScore: 10,
              explanation: 'Test explanation',
              consequences: {
                approved: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
                denied: { trustImpact: -5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
                flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
                deferred: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
              },
            },
            createdAt: new Date().toISOString(),
          },
        ],
      };

      handleLoadInbox(state, action, events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GAME_ENGINE_EVENTS.INBOX_LOADED);
      expect(events[0].payload).toEqual({
        day: state.currentDay,
        emailCount: 1,
      });
    });
  });

  describe('handleOpenEmail', () => {
    it('should change email status from EMAIL_STATUS.PENDING to EMAIL_STATUS.OPENED', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_TRIAGE,
        inbox: [
          {
            emailId: 'email-1',
            status: EMAIL_STATUS.PENDING,
            indicators: [],
            verificationRequested: false,
            timeSpentMs: 0,
          },
        ],
      });
      const events: DomainEvent[] = [];

      const action: OpenEmailPayload = {
        emailId: 'email-1',
      };

      handleOpenEmail(state, action, events);

      expect(state.inbox[0].status).toBe(EMAIL_STATUS.OPENED);
    });

    it('should emit EMAIL_OPENED event', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_TRIAGE,
        inbox: [
          {
            emailId: 'email-1',
            status: EMAIL_STATUS.PENDING,
            indicators: [],
            verificationRequested: false,
            timeSpentMs: 0,
          },
        ],
      });
      const events: DomainEvent[] = [];

      const action: OpenEmailPayload = {
        emailId: 'email-1',
      };

      handleOpenEmail(state, action, events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GAME_ENGINE_EVENTS.EMAIL_OPENED);
      expect(events[0].payload).toEqual({ emailId: 'email-1' });
    });

    it('should throw Error when email not found', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_TRIAGE,
        inbox: [],
      });
      const events: DomainEvent[] = [];

      const action: OpenEmailPayload = {
        emailId: 'nonexistent-email',
      };

      expect(() => handleOpenEmail(state, action, events)).toThrow('Email not found');
    });

    it('should not change status if email is not pending', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_TRIAGE,
        inbox: [
          {
            emailId: 'email-1',
            status: EMAIL_STATUS.OPENED,
            indicators: [],
            verificationRequested: false,
            timeSpentMs: 1000,
            openedAt: new Date().toISOString(),
          },
        ],
      });
      const events: DomainEvent[] = [];

      const action: OpenEmailPayload = {
        emailId: 'email-1',
      };

      const originalOpenedAt = state.inbox[0].openedAt;
      handleOpenEmail(state, action, events);

      expect(state.inbox[0].status).toBe(EMAIL_STATUS.OPENED);
      expect(state.inbox[0].openedAt).toBe(originalOpenedAt);
    });
  });
});
