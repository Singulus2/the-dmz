import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  GAME_ACTIONS,
  type GameState,
  type GameActionPayload,
  type GameActionType,
  createInitialBreachState,
} from '@the-dmz/shared';

import {
  handleAckDayStart,
  handleLoadInbox,
  handleOpenEmail,
  handleMarkIndicator,
  handleRequestVerification,
  handleSubmitDecision,
  handleProcessThreats,
  handleResolveIncident,
  handleTriggerBreach,
  handlePayRansom,
  handleRefuseRansom,
  handleAdvanceRecovery,
  handlePurchaseUpgrade,
  handleAdjustResource,
  handleOnboardClient,
  handleEvictClient,
  handleProcessFacilityTick,
  handleUpgradeFacilityTier,
  handlePurchaseFacilityUpgrade,
  handlePauseSession,
  handleResumeSession,
  handleAbandonSession,
  handleAdvanceDay,
  handleFlagDiscrepancy,
  type DomainEvent,
} from './reducer-handlers.js';
import {
  canTransitionMacroState,
  canTransitionPhase,
  GameStateMachineError,
  type DayPhase,
  type SessionMacroState,
} from './state-machine.js';

export interface ActionResult {
  success: boolean;
  newState: GameState;
  events: DomainEvent[];
  error?: GameStateMachineError;
}

const createInitialState = (
  sessionId: string,
  userId: string,
  tenantId: string,
  seed: number,
): GameState => ({
  sessionId,
  userId,
  tenantId,
  seed,
  currentDay: 1,
  currentMacroState: SESSION_MACRO_STATES.SESSION_INIT,
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
});

export const createInitialGameState = (
  sessionId: string,
  userId: string,
  tenantId: string,
  seed?: number,
): GameState => {
  const gameSeed = seed ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return createInitialState(sessionId, userId, tenantId, gameSeed);
};

type GameActionHandler<K extends GameActionType = GameActionType> = (
  state: GameState,
  action: Extract<GameActionPayload, { type: K }>,
  events: DomainEvent[],
) => void;

const noopHandler = (): void => {};

export const ACTION_HANDLERS: { [K in GameActionType]: GameActionHandler<K> } = {
  [GAME_ACTIONS.ACK_DAY_START]: handleAckDayStart,
  [GAME_ACTIONS.LOAD_INBOX]: handleLoadInbox,
  [GAME_ACTIONS.OPEN_EMAIL]: handleOpenEmail,
  [GAME_ACTIONS.MARK_INDICATOR]: handleMarkIndicator,
  [GAME_ACTIONS.REQUEST_VERIFICATION]: handleRequestVerification,
  [GAME_ACTIONS.SUBMIT_DECISION]: handleSubmitDecision,
  [GAME_ACTIONS.PROCESS_THREATS]: handleProcessThreats,
  [GAME_ACTIONS.RESOLVE_INCIDENT]: handleResolveIncident,
  [GAME_ACTIONS.TRIGGER_BREACH]: handleTriggerBreach,
  [GAME_ACTIONS.PAY_RANSOM]: handlePayRansom,
  [GAME_ACTIONS.REFUSE_RANSOM]: handleRefuseRansom,
  [GAME_ACTIONS.ADVANCE_RECOVERY]: handleAdvanceRecovery,
  [GAME_ACTIONS.PURCHASE_UPGRADE]: handlePurchaseUpgrade,
  [GAME_ACTIONS.ADJUST_RESOURCE]: handleAdjustResource,
  [GAME_ACTIONS.ONBOARD_CLIENT]: handleOnboardClient,
  [GAME_ACTIONS.EVICT_CLIENT]: handleEvictClient,
  [GAME_ACTIONS.PROCESS_FACILITY_TICK]: handleProcessFacilityTick,
  [GAME_ACTIONS.UPGRADE_FACILITY_TIER]: handleUpgradeFacilityTier,
  [GAME_ACTIONS.PURCHASE_FACILITY_UPGRADE]: handlePurchaseFacilityUpgrade,
  [GAME_ACTIONS.PAUSE_SESSION]: handlePauseSession,
  [GAME_ACTIONS.RESUME_SESSION]: handleResumeSession,
  [GAME_ACTIONS.ABANDON_SESSION]: handleAbandonSession,
  [GAME_ACTIONS.ADVANCE_DAY]: handleAdvanceDay,
  [GAME_ACTIONS.APPLY_CONSEQUENCES]: noopHandler,
  [GAME_ACTIONS.CLOSE_VERIFICATION]: noopHandler,
  [GAME_ACTIONS.OPEN_VERIFICATION]: noopHandler,
  [GAME_ACTIONS.FLAG_DISCREPANCY]: handleFlagDiscrepancy,
};

export const reduce = (state: GameState, action: GameActionPayload): ActionResult => {
  const events: DomainEvent[] = [];
  const newState = { ...state, updatedAt: new Date().toISOString() };

  try {
    // ACTION_HANDLERS pairs each action type with its own payload type; the
    // dynamic lookup cannot carry that correspondence, so widen at the call.
    const handler = ACTION_HANDLERS[action.type] as
      | ((state: GameState, action: GameActionPayload, events: DomainEvent[]) => void)
      | undefined;
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }
    handler(newState, action, events);

    newState.sequenceNumber++;
    return { success: true, newState, events };
  } catch (error) {
    return {
      success: false,
      newState,
      events: [],
      error:
        error instanceof GameStateMachineError
          ? error
          : new GameStateMachineError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
            ),
    };
  }
};

export const transitionPhase = (state: GameState, newPhase: DayPhase): ActionResult => {
  if (!canTransitionPhase(state.currentPhase, newPhase)) {
    return {
      success: false,
      newState: state,
      events: [],
      error: new GameStateMachineError(
        `Invalid phase transition from ${state.currentPhase} to ${newPhase}`,
        'INVALID_PHASE_TRANSITION',
      ),
    };
  }

  const newState = { ...state, currentPhase: newPhase, updatedAt: new Date().toISOString() };
  return { success: true, newState, events: [] };
};

export const transitionMacroState = (
  state: GameState,
  newMacroState: SessionMacroState,
): ActionResult => {
  if (!canTransitionMacroState(state.currentMacroState, newMacroState)) {
    return {
      success: false,
      newState: state,
      events: [],
      error: new GameStateMachineError(
        `Invalid macro state transition from ${state.currentMacroState} to ${newMacroState}`,
        'INVALID_MACRO_TRANSITION',
      ),
    };
  }

  const newState = {
    ...state,
    currentMacroState: newMacroState,
    updatedAt: new Date().toISOString(),
  };
  return { success: true, newState, events: [] };
};
