import { describe, it, expect } from 'vitest';

import {
  GAME_ACTIONS,
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  createInitialBreachState,
} from '@the-dmz/shared';

import { reduce, ACTION_HANDLERS } from '../reducer.js';

const createTestState = (overrides?: Partial<GameState>): GameState => {
  const baseState: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
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
    factionRelations: {
      sovereign_compact: 50,
      nexion_industries: 50,
      librarians: 50,
      hacktivists: 50,
      criminals: 50,
    },
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

  return { ...baseState, ...overrides };
};

const ALL_GAME_ACTION_TYPES = Object.values(GAME_ACTIONS);

// eslint-disable-next-line max-statements
describe('ACTION_HANDLERS dispatch map', () => {
  it('should be exported from reducer module', () => {
    expect(ACTION_HANDLERS).toBeDefined();
    expect(typeof ACTION_HANDLERS).toBe('object');
  });

  it('should have entries for all 24 action types in GAME_ACTIONS', () => {
    for (const actionType of ALL_GAME_ACTION_TYPES) {
      expect(ACTION_HANDLERS).toHaveProperty(actionType);
      expect(typeof ACTION_HANDLERS[actionType]).toBe('function');
    }
  });

  it('should have exactly 24 entries matching GAME_ACTIONS count', () => {
    const handlerCount = Object.keys(ACTION_HANDLERS).length;
    const gameActionsCount = ALL_GAME_ACTION_TYPES.length;
    expect(handlerCount).toBe(gameActionsCount);
  });

  it('should map ACK_DAY_START to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.ACK_DAY_START]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.ACK_DAY_START]).toBe('function');
  });

  it('should map ADVANCE_DAY to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.ADVANCE_DAY]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.ADVANCE_DAY]).toBe('function');
  });

  it('should map LOAD_INBOX to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.LOAD_INBOX]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.LOAD_INBOX]).toBe('function');
  });

  it('should map OPEN_EMAIL to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.OPEN_EMAIL]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.OPEN_EMAIL]).toBe('function');
  });

  it('should map MARK_INDICATOR to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.MARK_INDICATOR]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.MARK_INDICATOR]).toBe('function');
  });

  it('should map REQUEST_VERIFICATION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.REQUEST_VERIFICATION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.REQUEST_VERIFICATION]).toBe('function');
  });

  it('should map OPEN_VERIFICATION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.OPEN_VERIFICATION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.OPEN_VERIFICATION]).toBe('function');
  });

  it('should map CLOSE_VERIFICATION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.CLOSE_VERIFICATION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.CLOSE_VERIFICATION]).toBe('function');
  });

  it('should map FLAG_DISCREPANCY to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.FLAG_DISCREPANCY]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.FLAG_DISCREPANCY]).toBe('function');
  });

  it('should map SUBMIT_DECISION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.SUBMIT_DECISION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.SUBMIT_DECISION]).toBe('function');
  });

  it('should map APPLY_CONSEQUENCES to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.APPLY_CONSEQUENCES]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.APPLY_CONSEQUENCES]).toBe('function');
  });

  it('should map PROCESS_THREATS to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.PROCESS_THREATS]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.PROCESS_THREATS]).toBe('function');
  });

  it('should map RESOLVE_INCIDENT to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.RESOLVE_INCIDENT]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.RESOLVE_INCIDENT]).toBe('function');
  });

  it('should map TRIGGER_BREACH to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.TRIGGER_BREACH]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.TRIGGER_BREACH]).toBe('function');
  });

  it('should map PAY_RANSOM to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.PAY_RANSOM]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.PAY_RANSOM]).toBe('function');
  });

  it('should map REFUSE_RANSOM to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.REFUSE_RANSOM]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.REFUSE_RANSOM]).toBe('function');
  });

  it('should map ADVANCE_RECOVERY to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.ADVANCE_RECOVERY]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.ADVANCE_RECOVERY]).toBe('function');
  });

  it('should map PURCHASE_UPGRADE to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.PURCHASE_UPGRADE]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.PURCHASE_UPGRADE]).toBe('function');
  });

  it('should map ADJUST_RESOURCE to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.ADJUST_RESOURCE]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.ADJUST_RESOURCE]).toBe('function');
  });

  it('should map ONBOARD_CLIENT to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.ONBOARD_CLIENT]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.ONBOARD_CLIENT]).toBe('function');
  });

  it('should map EVICT_CLIENT to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.EVICT_CLIENT]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.EVICT_CLIENT]).toBe('function');
  });

  it('should map PROCESS_FACILITY_TICK to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.PROCESS_FACILITY_TICK]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.PROCESS_FACILITY_TICK]).toBe('function');
  });

  it('should map UPGRADE_FACILITY_TIER to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.UPGRADE_FACILITY_TIER]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.UPGRADE_FACILITY_TIER]).toBe('function');
  });

  it('should map PURCHASE_FACILITY_UPGRADE to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.PURCHASE_FACILITY_UPGRADE]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.PURCHASE_FACILITY_UPGRADE]).toBe('function');
  });

  it('should map PAUSE_SESSION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.PAUSE_SESSION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.PAUSE_SESSION]).toBe('function');
  });

  it('should map RESUME_SESSION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.RESUME_SESSION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.RESUME_SESSION]).toBe('function');
  });

  it('should map ABANDON_SESSION to a handler function', () => {
    expect(ACTION_HANDLERS[GAME_ACTIONS.ABANDON_SESSION]).toBeDefined();
    expect(typeof ACTION_HANDLERS[GAME_ACTIONS.ABANDON_SESSION]).toBe('function');
  });
});

describe('reduce with dispatch map - unknown action types', () => {
  it('should throw Error for unknown action type not in GAME_ACTIONS', () => {
    const state = createTestState();
    const action = { type: 'UNKNOWN_ACTION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Unknown action type');
  });

  it('should include the unknown action type in the error message', () => {
    const state = createTestState();
    const action = { type: 'INVALID_ACTION_XYZ' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('INVALID_ACTION_XYZ');
  });
});

describe('reduce with dispatch map - empty/noop action handlers', () => {
  it('should handle APPLY_CONSEQUENCES without producing events or side effects', () => {
    const state = createTestState({
      sequenceNumber: 5,
      funds: 1000,
      trustScore: 50,
    });

    const action = { type: 'APPLY_CONSEQUENCES' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(0);
    expect(result.newState.funds).toBe(1000);
    expect(result.newState.trustScore).toBe(50);
    expect(result.newState.sequenceNumber).toBe(6);
  });

  it('should handle CLOSE_VERIFICATION without producing events or side effects', () => {
    const state = createTestState({
      sequenceNumber: 3,
      funds: 500,
    });

    const action = { type: 'CLOSE_VERIFICATION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(0);
    expect(result.newState.funds).toBe(500);
    expect(result.newState.sequenceNumber).toBe(4);
  });

  it('should handle OPEN_VERIFICATION without producing events or side effects', () => {
    const state = createTestState({
      sequenceNumber: 7,
      trustScore: 75,
    });

    const action = { type: 'OPEN_VERIFICATION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(0);
    expect(result.newState.trustScore).toBe(75);
    expect(result.newState.sequenceNumber).toBe(8);
  });
});

describe('reduce with dispatch map - sequence number behavior', () => {
  it('should increment sequence number for all successful actions', () => {
    const actionTypes: Array<keyof typeof GAME_ACTIONS> = [
      'ACK_DAY_START',
      'ADVANCE_DAY',
      'LOAD_INBOX',
      'OPEN_EMAIL',
      'MARK_INDICATOR',
      'REQUEST_VERIFICATION',
      'OPEN_VERIFICATION',
      'CLOSE_VERIFICATION',
      'FLAG_DISCREPANCY',
      'SUBMIT_DECISION',
      'APPLY_CONSEQUENCES',
      'PROCESS_THREATS',
      'RESOLVE_INCIDENT',
      'TRIGGER_BREACH',
      'PAY_RANSOM',
      'REFUSE_RANSOM',
      'ADVANCE_RECOVERY',
      'PURCHASE_UPGRADE',
      'ADJUST_RESOURCE',
      'ONBOARD_CLIENT',
      'EVICT_CLIENT',
      'PROCESS_FACILITY_TICK',
      'UPGRADE_FACILITY_TIER',
      'PURCHASE_FACILITY_UPGRADE',
      'PAUSE_SESSION',
      'RESUME_SESSION',
      'ABANDON_SESSION',
    ];

    for (const actionType of actionTypes) {
      const state = createTestState({ sequenceNumber: 0 });
      const action = { type: actionType };

      const result = reduce(state, action);

      if (result.success) {
        expect(result.newState.sequenceNumber).toBe(1);
      }
    }
  });
});

describe('reduce with dispatch map - shallow copy semantics', () => {
  it('should not mutate original state', () => {
    const state = createTestState({
      sequenceNumber: 0,
      funds: 1000,
      currentPhase: DAY_PHASES.PHASE_DAY_START,
    });

    const _originalState = { ...state };
    const action = { type: 'ACK_DAY_START' as const };

    reduce(state, action);

    expect(state.sequenceNumber).toBe(0);
    expect(state.funds).toBe(1000);
    expect(state.currentPhase).toBe(DAY_PHASES.PHASE_DAY_START);
  });

  it('should return new state object with updatedAt modified', () => {
    const state = createTestState({
      updatedAt: '2024-01-01T00:00:00.000Z',
    });

    const action = { type: 'ACK_DAY_START' as const };

    const result = reduce(state, action);

    expect(result.newState.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('reduce with dispatch map - handler delegation', () => {
  it('should delegate to handleAckDayStart for ACK_DAY_START action', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_START,
      sequenceNumber: 0,
    });

    const action = { type: 'ACK_DAY_START' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentPhase).toBe(DAY_PHASES.PHASE_EMAIL_INTAKE);
    expect(result.newState.sequenceNumber).toBe(1);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('should delegate to handleAdvanceDay for ADVANCE_DAY action', () => {
    const state = createTestState({
      currentPhase: DAY_PHASES.PHASE_DAY_END,
      currentDay: 5,
      sequenceNumber: 0,
    });

    const action = { type: 'ADVANCE_DAY' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentDay).toBe(6);
    expect(result.newState.sequenceNumber).toBe(1);
  });

  it('should delegate to handlePauseSession for PAUSE_SESSION action', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
      sequenceNumber: 0,
    });

    const action = { type: 'PAUSE_SESSION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_PAUSED);
    expect(result.newState.sequenceNumber).toBe(1);
  });

  it('should delegate to handleResumeSession for RESUME_SESSION action', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_PAUSED,
      sequenceNumber: 0,
    });

    const action = { type: 'RESUME_SESSION' as const };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ACTIVE);
    expect(result.newState.sequenceNumber).toBe(1);
  });

  it('should delegate to handleAbandonSession for ABANDON_SESSION action', () => {
    const state = createTestState({
      currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
      sequenceNumber: 0,
    });

    const action = { type: 'ABANDON_SESSION' as const, reason: 'User quit' };

    const result = reduce(state, action);

    expect(result.success).toBe(true);
    expect(result.newState.currentMacroState).toBe(SESSION_MACRO_STATES.SESSION_ABANDONED);
    expect(result.newState.sequenceNumber).toBe(1);
  });
});
