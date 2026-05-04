import { describe, it, expect } from 'vitest';

import {
  DAY_PHASES,
  EMAIL_STATUS,
  GAME_ENGINE_EVENTS,
  type GameState,
  type AckDayStartPayload,
  type AdvanceDayPayload,
  type AdvanceRecoveryPayload,
  createInitialBreachState,
} from '@the-dmz/shared';

import { handleAckDayStart } from '../email-handlers.js';
import { handleAdvanceDay } from '../session-handlers.js';
import { handleAdvanceRecovery } from '../breach-handlers.js';

import type { DomainEvent } from '../handler-utils.js';

const createTestGameState = (overrides?: Partial<GameState>): GameState => {
  const state: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: 'SESSION_ACTIVE',
    currentPhase: DAY_PHASES.PHASE_DAY_START,
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

describe('DayStartedEvent payload structure', () => {
  describe('handleAckDayStart', () => {
    it('should emit DAY_STARTED event with sessionId in payload', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_DAY_START,
        currentDay: 1,
      });
      const events: DomainEvent[] = [];

      const action: AckDayStartPayload = { type: 'ACK_DAY_START' };

      handleAckDayStart(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      expect(dayStartedEvents).toHaveLength(1);

      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload).toHaveProperty('sessionId');
      expect(payload.sessionId).toBe(state.sessionId);
    });

    it('should emit DAY_STARTED event with sessionId matching state.sessionId', () => {
      const customSessionId = 'custom-session-abc123';
      const state = createTestGameState({
        sessionId: customSessionId,
        currentPhase: DAY_PHASES.PHASE_DAY_START,
        currentDay: 5,
      });
      const events: DomainEvent[] = [];

      const action: AckDayStartPayload = { type: 'ACK_DAY_START' };

      handleAckDayStart(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      expect(dayStartedEvents).toHaveLength(1);

      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload.sessionId).toBe(customSessionId);
    });

    it('should emit DAY_STARTED event with day matching state.currentDay', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_DAY_START,
        currentDay: 3,
      });
      const events: DomainEvent[] = [];

      const action: AckDayStartPayload = { type: 'ACK_DAY_START' };

      handleAckDayStart(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload.day).toBe(3);
    });
  });

  describe('handleAdvanceDay', () => {
    it('should emit DAY_STARTED event with sessionId in payload', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        currentDay: 1,
        inbox: [
          {
            emailId: 'email-1',
            status: EMAIL_STATUS.APPROVED,
            indicators: [],
            verificationRequested: false,
            timeSpentMs: 100,
          },
        ],
      });
      const events: DomainEvent[] = [];

      const action: AdvanceDayPayload = { type: 'ADVANCE_DAY' };

      handleAdvanceDay(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      expect(dayStartedEvents).toHaveLength(1);

      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload).toHaveProperty('sessionId');
      expect(payload.sessionId).toBe(state.sessionId);
    });

    it('should emit DAY_STARTED event with sessionId matching state.sessionId', () => {
      const customSessionId = 'session-xyz-789';
      const state = createTestGameState({
        sessionId: customSessionId,
        currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        currentDay: 2,
      });
      const events: DomainEvent[] = [];

      const action: AdvanceDayPayload = { type: 'ADVANCE_DAY' };

      handleAdvanceDay(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload.sessionId).toBe(customSessionId);
    });

    it('should emit DAY_STARTED event with deferredEmailsCarried when emails are deferred', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        currentDay: 1,
        inbox: [
          {
            emailId: 'email-1',
            status: EMAIL_STATUS.DEFERRED,
            indicators: [],
            verificationRequested: false,
            timeSpentMs: 0,
          },
          {
            emailId: 'email-2',
            status: EMAIL_STATUS.DEFERRED,
            indicators: [],
            verificationRequested: false,
            timeSpentMs: 0,
          },
        ],
      });
      const events: DomainEvent[] = [];

      const action: AdvanceDayPayload = { type: 'ADVANCE_DAY' };

      handleAdvanceDay(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload.deferredEmailsCarried).toBe(2);
    });
  });

  describe('handleAdvanceRecovery', () => {
    it('should emit DAY_STARTED event with sessionId in payload', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentDay: 1,
        breachState: {
          ...createInitialBreachState(),
          recoveryDaysRemaining: 3,
          postBreachEffectsActive: false,
        },
      });
      const events: DomainEvent[] = [];

      const action: AdvanceRecoveryPayload = { type: 'ADVANCE_RECOVERY' };

      handleAdvanceRecovery(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      expect(dayStartedEvents).toHaveLength(1);

      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload).toHaveProperty('sessionId');
      expect(payload.sessionId).toBe(state.sessionId);
    });

    it('should emit DAY_STARTED event with sessionId matching state.sessionId', () => {
      const customSessionId = 'recovery-session-456';
      const state = createTestGameState({
        sessionId: customSessionId,
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentDay: 4,
        breachState: {
          ...createInitialBreachState(),
          recoveryDaysRemaining: 2,
          postBreachEffectsActive: false,
        },
      });
      const events: DomainEvent[] = [];

      const action: AdvanceRecoveryPayload = { type: 'ADVANCE_RECOVERY' };

      handleAdvanceRecovery(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload.sessionId).toBe(customSessionId);
    });

    it('should NOT include recoveryDaysRemaining in DAY_STARTED payload', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentDay: 1,
        breachState: {
          ...createInitialBreachState(),
          recoveryDaysRemaining: 3,
          postBreachEffectsActive: false,
        },
      });
      const events: DomainEvent[] = [];

      const action: AdvanceRecoveryPayload = { type: 'ADVANCE_RECOVERY' };

      handleAdvanceRecovery(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload).not.toHaveProperty('recoveryDaysRemaining');
    });

    it('should NOT include narrativeMessage in DAY_STARTED payload', () => {
      const state = createTestGameState({
        currentPhase: DAY_PHASES.PHASE_RECOVERY,
        currentDay: 1,
        breachState: {
          ...createInitialBreachState(),
          recoveryDaysRemaining: 3,
          postBreachEffectsActive: false,
        },
      });
      const events: DomainEvent[] = [];

      const action: AdvanceRecoveryPayload = { type: 'ADVANCE_RECOVERY' };

      handleAdvanceRecovery(state, action, events);

      const dayStartedEvents = events.filter((e) => e.type === GAME_ENGINE_EVENTS.DAY_STARTED);
      const payload = dayStartedEvents[0].payload as Record<string, unknown>;
      expect(payload).not.toHaveProperty('narrativeMessage');
    });
  });
});
