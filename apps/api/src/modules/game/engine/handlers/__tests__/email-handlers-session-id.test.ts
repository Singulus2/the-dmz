import { describe, it, expect } from 'vitest';

import {
  DAY_PHASES,
  EMAIL_STATUS,
  GAME_ENGINE_EVENTS,
  type GameState,
  type OpenEmailPayload,
  type MarkIndicatorPayload,
  createInitialBreachState,
} from '@the-dmz/shared';

import { handleOpenEmail, handleMarkIndicator } from '../email-handlers.js';

import type { DomainEvent } from '../handler-utils.js';

const createTestGameState = (overrides?: Partial<GameState>): GameState => {
  const state: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: 'SESSION_ACTIVE',
    currentPhase: DAY_PHASES.PHASE_TRIAGE,
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
    inbox: [
      {
        emailId: 'email-1',
        status: EMAIL_STATUS.PENDING,
        indicators: [],
        verificationRequested: false,
        timeSpentMs: 0,
      },
    ],
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

describe('email-handlers sessionId in event payloads', () => {
  describe('handleOpenEmail', () => {
    it('should emit EMAIL_OPENED event with sessionId in payload', () => {
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
      expect(events[0].payload).toHaveProperty('sessionId');
      expect((events[0].payload as { sessionId: string }).sessionId).toBe(state.sessionId);
      expect((events[0].payload as { emailId: string }).emailId).toBe('email-1');
    });

    it('should emit EMAIL_OPENED event with sessionId matching state.sessionId', () => {
      const customSessionId = 'custom-session-12345';
      const state = createTestGameState({
        sessionId: customSessionId,
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
      expect((events[0].payload as { sessionId: string }).sessionId).toBe(customSessionId);
    });

    it('should include optional viewMode when provided', () => {
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

      expect(events[0].payload).toHaveProperty('sessionId');
    });
  });

  describe('handleMarkIndicator', () => {
    it('should emit EMAIL_INDICATOR_MARKED event with sessionId in payload', () => {
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

      const action: MarkIndicatorPayload = {
        emailId: 'email-1',
        indicatorType: 'suspicious_sender',
      };

      handleMarkIndicator(state, action, events);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED);
      expect(events[0].payload).toHaveProperty('sessionId');
      expect((events[0].payload as { sessionId: string }).sessionId).toBe(state.sessionId);
      expect((events[0].payload as { emailId: string }).emailId).toBe('email-1');
      expect((events[0].payload as { indicatorType: string }).indicatorType).toBe(
        'suspicious_sender',
      );
    });

    it('should emit EMAIL_INDICATOR_MARKED event with sessionId matching state.sessionId', () => {
      const customSessionId = 'another-session-67890';
      const state = createTestGameState({
        sessionId: customSessionId,
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

      const action: MarkIndicatorPayload = {
        emailId: 'email-1',
        indicatorType: 'urgent_urgency',
      };

      handleMarkIndicator(state, action, events);

      expect(events).toHaveLength(1);
      expect((events[0].payload as { sessionId: string }).sessionId).toBe(customSessionId);
    });

    it('should include optional location when provided', () => {
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

      const action: MarkIndicatorPayload = {
        emailId: 'email-1',
        indicatorType: 'suspicious_sender',
      };

      handleMarkIndicator(state, action, events);

      expect(events[0].payload).toHaveProperty('sessionId');
    });
  });
});
