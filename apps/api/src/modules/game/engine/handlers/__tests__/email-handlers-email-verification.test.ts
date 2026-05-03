import { describe, it, expect } from 'vitest';

import {
  DAY_PHASES,
  EMAIL_STATUS,
  GAME_ENGINE_EVENTS,
  type GameState,
  type RequestVerificationPayload,
  type SubmitDecisionPayload,
  createInitialBreachState,
} from '@the-dmz/shared';

import { handleRequestVerification, mapDecisionToStatus } from '../email-handlers.js';

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

describe('handleRequestVerification', () => {
  it('should set email status to EMAIL_STATUS.REQUEST_VERIFICATION', () => {
    const state = createTestGameState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-1',
          status: EMAIL_STATUS.OPENED,
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
      emailInstances: {
        'email-1': {
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
      },
    });
    const events: DomainEvent[] = [];

    const action: RequestVerificationPayload = {
      emailId: 'email-1',
    };

    handleRequestVerification(state, action, events);

    expect(state.inbox[0].status).toBe(EMAIL_STATUS.REQUEST_VERIFICATION);
    expect(state.inbox[0].verificationRequested).toBe(true);
  });

  it('should emit EMAIL_VERIFICATION_REQUESTED and VERIFICATION_PACKET_GENERATED events', () => {
    const state = createTestGameState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-1',
          status: EMAIL_STATUS.OPENED,
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
      emailInstances: {
        'email-1': {
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
      },
    });
    const events: DomainEvent[] = [];

    const action: RequestVerificationPayload = {
      emailId: 'email-1',
    };

    handleRequestVerification(state, action, events);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe(GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED);
    expect(events[0].payload).toEqual({ emailId: 'email-1' });
    expect(events[1].type).toBe(GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED);
    expect(events[1].payload.emailId).toBe('email-1');
    expect(events[1].payload.packetId).toBeDefined();
    expect(events[1].payload.artifactCount).toBeGreaterThanOrEqual(0);
    expect(typeof events[1].payload.hasIntelligenceBrief).toBe('boolean');
  });

  it('should not modify email state when emailId not in inbox but should still emit events', () => {
    const state = createTestGameState({
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
      inbox: [
        {
          emailId: 'email-other',
          status: EMAIL_STATUS.OPENED,
          indicators: [],
          verificationRequested: false,
          timeSpentMs: 0,
        },
      ],
      emailInstances: {
        'email-other': {
          emailId: 'email-other',
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
      },
    });
    const events: DomainEvent[] = [];

    const action: RequestVerificationPayload = {
      emailId: 'email-1',
    };

    handleRequestVerification(state, action, events);

    expect(state.inbox[0].status).toBe(EMAIL_STATUS.OPENED);
    expect(state.inbox[0].verificationRequested).toBe(false);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe(GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED);
    expect(events[1].type).toBe(GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED);
  });
});

describe('mapDecisionToStatus', () => {
  it('should return EMAIL_STATUS.APPROVED for approve decision', () => {
    const result = mapDecisionToStatus('approve');
    expect(result).toBe(EMAIL_STATUS.APPROVED);
  });

  it('should return EMAIL_STATUS.DENIED for deny decision', () => {
    const result = mapDecisionToStatus('deny');
    expect(result).toBe(EMAIL_STATUS.DENIED);
  });

  it('should return EMAIL_STATUS.FLAGGED for flag decision', () => {
    const result = mapDecisionToStatus('flag');
    expect(result).toBe(EMAIL_STATUS.FLAGGED);
  });

  it('should return EMAIL_STATUS.REQUEST_VERIFICATION for request_verification decision', () => {
    const result = mapDecisionToStatus('request_verification');
    expect(result).toBe(EMAIL_STATUS.REQUEST_VERIFICATION);
  });

  it('should return EMAIL_STATUS.DEFERRED for defer decision', () => {
    const result = mapDecisionToStatus('defer');
    expect(result).toBe(EMAIL_STATUS.DEFERRED);
  });

  it('should return EMAIL_STATUS.PENDING for unknown decision types', () => {
    const result = mapDecisionToStatus('unknown' as SubmitDecisionPayload['decision']);
    expect(result).toBe(EMAIL_STATUS.PENDING);
  });
});
