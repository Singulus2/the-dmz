/* eslint-disable max-lines */
import { GAME_EVENT_TYPES } from '@the-dmz/shared';

import type { DomainEvent } from '../../../../shared/events/event-types.js';

export const GAME_ENGINE_EVENTS = {
  SESSION_STARTED: GAME_EVENT_TYPES.SESSION_STARTED,
  SESSION_ENDED: GAME_EVENT_TYPES.SESSION_ENDED,
  SESSION_PAUSED: GAME_EVENT_TYPES.SESSION_PAUSED,
  SESSION_RESUMED: GAME_EVENT_TYPES.SESSION_RESUMED,
  SESSION_COMPLETED: GAME_EVENT_TYPES.SESSION_COMPLETED,
  SESSION_ABANDONED: GAME_EVENT_TYPES.SESSION_ABANDONED,
  SESSION_BREACH_RECOVERY: GAME_EVENT_TYPES.SESSION_BREACH_RECOVERY,
  DAY_STARTED: GAME_EVENT_TYPES.DAY_STARTED,
  DAY_PHASE_CHANGED: GAME_EVENT_TYPES.DAY_PHASE_CHANGED,
  DAY_ENDED: GAME_EVENT_TYPES.DAY_ENDED,
  INBOX_LOADED: GAME_EVENT_TYPES.INBOX_LOADED,
  EMAIL_RECEIVED: GAME_EVENT_TYPES.EMAIL_RECEIVED,
  EMAIL_OPENED: GAME_EVENT_TYPES.EMAIL_OPENED,
  EMAIL_INDICATOR_MARKED: GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED,
  EMAIL_HEADER_VIEWED: GAME_EVENT_TYPES.EMAIL_HEADER_VIEWED,
  EMAIL_URL_HOVERED: GAME_EVENT_TYPES.EMAIL_URL_HOVERED,
  EMAIL_ATTACHMENT_PREVIEWED: GAME_EVENT_TYPES.EMAIL_ATTACHMENT_PREVIEWED,
  EMAIL_VERIFICATION_REQUESTED: GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED,
  EMAIL_DECISION_SUBMITTED: GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED,
  EMAIL_DECISION_RESOLVED: GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED,
  EMAIL_DECISION_EVALUATED: GAME_EVENT_TYPES.EMAIL_DECISION_EVALUATED,
  DECISION_APPROVED: GAME_EVENT_TYPES.DECISION_APPROVED,
  DECISION_DENIED: GAME_EVENT_TYPES.DECISION_DENIED,
  DECISION_FLAGGED: GAME_EVENT_TYPES.DECISION_FLAGGED,
  DECISION_VERIFICATION_REQUESTED: GAME_EVENT_TYPES.DECISION_VERIFICATION_REQUESTED,
  VERIFICATION_PACKET_OPENED: GAME_EVENT_TYPES.VERIFICATION_PACKET_OPENED,
  VERIFICATION_PACKET_GENERATED: GAME_EVENT_TYPES.VERIFICATION_PACKET_GENERATED,
  VERIFICATION_OUT_OF_BAND_INITIATED: GAME_EVENT_TYPES.VERIFICATION_OUT_OF_BAND_INITIATED,
  VERIFICATION_RESULT: GAME_EVENT_TYPES.VERIFICATION_RESULT,
  VERIFICATION_DISCREPANCY_FLAGGED: GAME_EVENT_TYPES.VERIFICATION_DISCREPANCY_FLAGGED,
  CONSEQUENCES_APPLIED: GAME_EVENT_TYPES.CONSEQUENCES_APPLIED,
  THREATS_GENERATED: GAME_EVENT_TYPES.THREATS_GENERATED,
  THREAT_ATTACK_LAUNCHED: GAME_EVENT_TYPES.THREAT_ATTACK_LAUNCHED,
  THREAT_ATTACK_MITIGATED: GAME_EVENT_TYPES.THREAT_ATTACK_MITIGATED,
  THREAT_ATTACK_SUCCEEDED: GAME_EVENT_TYPES.THREAT_ATTACK_SUCCEEDED,
  THREAT_BREACH_OCCURRED: GAME_EVENT_TYPES.THREAT_BREACH_OCCURRED,
  THREAT_LEVEL_CHANGED: GAME_EVENT_TYPES.THREAT_LEVEL_CHANGED,
  INCIDENT_CREATED: GAME_EVENT_TYPES.INCIDENT_CREATED,
  INCIDENT_RESOLVED: GAME_EVENT_TYPES.INCIDENT_RESOLVED,
  INCIDENT_RESPONSE_ACTION_TAKEN: GAME_EVENT_TYPES.INCIDENT_RESPONSE_ACTION_TAKEN,
  BREACH_OCCURRED: GAME_EVENT_TYPES.BREACH_OCCURRED,
  BREACH_RANSOM_DISPLAYED: GAME_EVENT_TYPES.BREACH_RANSOM_DISPLAYED,
  BREACH_RANSOM_PAID: GAME_EVENT_TYPES.BREACH_RANSOM_PAID,
  BREACH_RANSOM_REFUSED: GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED,
  BREACH_RECOVERY_STARTED: GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED,
  BREACH_RECOVERY_COMPLETED: GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED,
  BREACH_POST_EFFECTS_STARTED: GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED,
  SESSION_GAME_OVER: GAME_EVENT_TYPES.GAME_OVER,
  UPGRADE_PURCHASED: GAME_EVENT_TYPES.UPGRADE_PURCHASED,
  RESOURCE_ADJUSTED: GAME_EVENT_TYPES.RESOURCE_ADJUSTED,
  CREDITS_CHANGED: GAME_EVENT_TYPES.FUNDS_MODIFIED,
  TRUST_CHANGED: GAME_EVENT_TYPES.TRUST_MODIFIED,
  INTEL_CHANGED: GAME_EVENT_TYPES.INTEL_CHANGED,
  LEVEL_UP: GAME_EVENT_TYPES.LEVEL_UP,
  FACILITY_CLIENT_ONBOARDED: GAME_EVENT_TYPES.FACILITY_CLIENT_ONBOARDED,
  FACILITY_CLIENT_EVICTED: GAME_EVENT_TYPES.FACILITY_CLIENT_EVICTED,
  FACILITY_RESOURCE_CRITICAL: GAME_EVENT_TYPES.FACILITY_RESOURCE_CRITICAL,
  FACILITY_TICK_PROCESSED: GAME_EVENT_TYPES.FACILITY_TICK_PROCESSED,
  FACILITY_TIER_UPGRADED: GAME_EVENT_TYPES.FACILITY_TIER_UPGRADED,
  FACILITY_UPGRADE_PURCHASED: GAME_EVENT_TYPES.FACILITY_UPGRADE_PURCHASED,
  FACILITY_UPGRADE_COMPLETED: GAME_EVENT_TYPES.FACILITY_UPGRADE_COMPLETED,
} as const satisfies Record<string, string>;

export type GameEngineEventType = (typeof GAME_ENGINE_EVENTS)[keyof typeof GAME_ENGINE_EVENTS];

export interface GameEngineEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export type GameEngineDomainEvent<T extends GameEngineEventType = GameEngineEventType> =
  DomainEvent<GameEngineEventPayloadMap[T]>;

export interface SessionStartedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  day: number;
  seed: number;
  difficultyTier?: string;
}

export interface SessionEndedPayload {
  sessionId: string;
  userId: string;
  reason: string;
  durationMs: number;
}

export interface SessionPausedPayload {
  sessionId: string;
  userId: string;
}

export interface SessionResumedPayload {
  sessionId: string;
  userId: string;
}

export interface SessionCompletedPayload {
  sessionId: string;
  userId: string;
  reason: string;
}

export interface SessionAbandonedPayload {
  sessionId: string;
  userId: string;
  reason?: string;
}

export interface SessionBreachRecoveryPayload {
  sessionId: string;
  userId: string;
  recoveryDays: number;
}

export interface DayStartedPayload {
  sessionId: string;
  day: number;
  deferredEmailsCarried?: number;
}

export interface DayPhaseChangedPayload {
  sessionId: string;
  day: number;
  oldPhase: string;
  newPhase: string;
}

export interface DayEndedPayload {
  sessionId: string;
  day: number;
  emailsProcessed?: number;
  emailsDeferred?: number;
}

export interface InboxLoadedPayload {
  sessionId: string;
  day: number;
  emailCount: number;
}

export interface EmailReceivedPayload {
  sessionId: string;
  emailId: string;
  difficultyTier?: string;
  scenarioId?: string;
  contentVersion?: string;
  competencyTags?: string[];
}

export interface EmailOpenedPayload {
  sessionId: string;
  emailId: string;
  viewMode?: string;
}

export interface EmailIndicatorMarkedPayload {
  sessionId: string;
  emailId: string;
  indicatorType: string;
  location?: string;
}

export interface EmailHeaderViewedPayload {
  sessionId: string;
  emailId: string;
  headerName: string;
}

export interface EmailUrlHoveredPayload {
  sessionId: string;
  emailId: string;
  url: string;
}

export interface EmailAttachmentPreviewedPayload {
  sessionId: string;
  emailId: string;
  attachmentId: string;
  attachmentName: string;
}

export interface EmailVerificationRequestedPayload {
  sessionId: string;
  emailId: string;
}

export interface EmailDecisionSubmittedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeSpentMs: number;
  outcome?: string;
  competencyTags?: string[];
}

export interface EmailDecisionResolvedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
}

export interface EmailDecisionEvaluatedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  isCorrect: boolean;
  trustImpact: number;
  fundsImpact: number;
  factionImpact: number;
  threatImpact: number;
  explanation: string;
  indicatorsFound: string[];
  indicatorsMissed: string[];
}

export interface DecisionApprovedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeToDecisionMs: number;
  outcome: string;
  competencyTags?: string[];
}

export interface DecisionDeniedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeToDecisionMs: number;
  outcome: string;
  competencyTags?: string[];
}

export interface DecisionFlaggedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeToDecisionMs: number;
  outcome: string;
  competencyTags?: string[];
}

export interface DecisionVerificationRequestedPayload {
  sessionId: string;
  emailId: string;
  reason: string;
}

export interface VerificationPacketOpenedPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
}

export interface VerificationPacketGeneratedPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
  artifactCount: number;
  hasIntelligenceBrief: boolean;
}

export interface VerificationOutOfBandInitiatedPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
  method: string;
}

export interface VerificationResultPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
  result: string;
  isValid: boolean;
}

export interface ConsequencesAppliedPayload {
  sessionId: string;
  day: number;
  fundsDelta: number;
  trustScoreDelta: number;
}

export interface ThreatsGeneratedPayload {
  sessionId: string;
  day: number;
  attacks: unknown[];
}

export interface ThreatAttackLaunchedPayload {
  sessionId: string;
  attackId: string;
  threatTier: string;
  attackType: string;
}

export interface ThreatAttackMitigatedPayload {
  sessionId: string;
  attackId: string;
  threatTier: string;
  mitigationMethod: string;
}

export interface ThreatAttackSucceededPayload {
  sessionId: string;
  attackId: string;
  threatTier: string;
  impact: number;
}

export interface ThreatLevelChangedPayload {
  sessionId: string;
  previousLevel: string;
  newLevel: string;
  reason: string;
}

export interface IncidentCreatedPayload {
  sessionId: string;
  incidentId: string;
  severity: number;
  type: string;
}

export interface IncidentResolvedPayload {
  sessionId: string;
  incidentId: string;
  responseActions: string[];
}

export interface IncidentResponseActionTakenPayload {
  sessionId: string;
  incidentId: string;
  actionType: string;
  actionResult: string;
  competencyTags?: string[];
}

export interface BreachOccurredPayload {
  sessionId: string;
  userId: string;
  severity: number;
  triggerType?: string;
  isBreach?: boolean;
  trustPenalty?: number;
  ransomCost?: number;
}

export interface BreachRansomDisplayedPayload {
  severity: number;
  currentFunds: number;
  ransomAmount: number;
}

export interface BreachRansomPaidPayload {
  amount: number;
  remainingFunds: number;
}

export interface BreachRansomRefusedPayload {
  severity: number;
}

export interface BreachRecoveryStartedPayload {
  recoveryDays: number;
}

export interface BreachRecoveryCompletedPayload {
  daysInRecovery: number;
}

export interface BreachPostEffectsStartedPayload {
  revenueDepressionDays: number;
  increasedScrutinyDays: number;
  reputationImpactDays: number;
}

export interface SessionGameOverPayload {
  reason: string;
  daysSurvived: number;
  totalEarnings: number;
  breaches: number;
}

export interface UpgradePurchasedPayload {
  sessionId: string;
  upgradeId: string;
  cost: number;
}

export interface ResourceAdjustedPayload {
  sessionId: string;
  resourceId: string;
  delta: number;
}

export interface CreditsChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
  relatedEntityId?: string;
}

export interface TrustChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
}

export interface IntelChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
}

export interface LevelUpPayload {
  sessionId: string;
  previousLevel: number;
  newLevel: number;
  xpRequired: number;
  xpAwarded: number;
}

export interface VerificationDiscrepancyFlaggedPayload {
  emailId: string;
  packetId: string;
  artifactId: string;
  documentType: string;
  reason: string;
}

export interface FacilityClientOnboardedPayload {
  clientId: string;
  clientName: string;
  organization: string;
  resources: {
    rackUnitsU: number;
    powerKw: number;
    coolingTons: number;
    bandwidthMbps: number;
  };
  dailyRate: number;
}

export interface FacilityClientEvictedPayload {
  clientId: string;
  reason: string;
}

export interface FacilityResourceCriticalPayload {
  utilizationPercent: number;
  maintenanceDebt: number;
  facilityHealth: number;
}

export interface FacilityTickProcessedPayload {
  dayNumber: number;
  revenue: number;
  operatingCost: number;
  baseOperatingCost: number;
  securityToolOpEx: number;
  utilizationPercent: number;
  maintenanceDebt: number;
  facilityHealth: number;
}

export interface FacilityTierUpgradedPayload {
  fromTier: string;
  toTier: string;
  cost: number;
}

export interface FacilityUpgradePurchasedPayload {
  upgradeType: string;
  category: string;
  cost: number;
  installationDays: number;
  completesDay: number;
}

export interface FacilityUpgradeCompletedPayload {
  upgradeType: string;
  category: string;
  tierLevel?: number;
  cost?: number;
}

export function createGameEngineEvent<T extends GameEngineEventType>(
  eventType: T,
  params: GameEngineEventParams,
  payload: GameEngineEventPayloadMap[T],
): GameEngineDomainEvent<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload,
  };
}

export type GameEngineEventPayloadMap = {
  [GAME_ENGINE_EVENTS.SESSION_STARTED]: SessionStartedPayload;
  [GAME_ENGINE_EVENTS.SESSION_ENDED]: SessionEndedPayload;
  [GAME_ENGINE_EVENTS.SESSION_PAUSED]: SessionPausedPayload;
  [GAME_ENGINE_EVENTS.SESSION_RESUMED]: SessionResumedPayload;
  [GAME_ENGINE_EVENTS.SESSION_COMPLETED]: SessionCompletedPayload;
  [GAME_ENGINE_EVENTS.SESSION_ABANDONED]: SessionAbandonedPayload;
  [GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY]: SessionBreachRecoveryPayload;
  [GAME_ENGINE_EVENTS.DAY_STARTED]: DayStartedPayload;
  [GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED]: DayPhaseChangedPayload;
  [GAME_ENGINE_EVENTS.DAY_ENDED]: DayEndedPayload;
  [GAME_ENGINE_EVENTS.INBOX_LOADED]: InboxLoadedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_RECEIVED]: EmailReceivedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_OPENED]: EmailOpenedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED]: EmailIndicatorMarkedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED]: EmailHeaderViewedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED]: EmailUrlHoveredPayload;
  [GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED]: EmailAttachmentPreviewedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED]: EmailVerificationRequestedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED]: EmailDecisionSubmittedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED]: EmailDecisionResolvedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED]: EmailDecisionEvaluatedPayload;
  [GAME_ENGINE_EVENTS.DECISION_APPROVED]: DecisionApprovedPayload;
  [GAME_ENGINE_EVENTS.DECISION_DENIED]: DecisionDeniedPayload;
  [GAME_ENGINE_EVENTS.DECISION_FLAGGED]: DecisionFlaggedPayload;
  [GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED]: DecisionVerificationRequestedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED]: VerificationPacketOpenedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED]: VerificationPacketGeneratedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED]: VerificationOutOfBandInitiatedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_RESULT]: VerificationResultPayload;
  [GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED]: ConsequencesAppliedPayload;
  [GAME_ENGINE_EVENTS.THREATS_GENERATED]: ThreatsGeneratedPayload;
  [GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED]: ThreatAttackLaunchedPayload;
  [GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED]: ThreatAttackMitigatedPayload;
  [GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED]: ThreatAttackSucceededPayload;
  [GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED]: BreachOccurredPayload;
  [GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED]: ThreatLevelChangedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_CREATED]: IncidentCreatedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_RESOLVED]: IncidentResolvedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN]: IncidentResponseActionTakenPayload;
  [GAME_ENGINE_EVENTS.BREACH_OCCURRED]: BreachOccurredPayload;
  [GAME_ENGINE_EVENTS.BREACH_RANSOM_DISPLAYED]: BreachRansomDisplayedPayload;
  [GAME_ENGINE_EVENTS.BREACH_RANSOM_PAID]: BreachRansomPaidPayload;
  [GAME_ENGINE_EVENTS.BREACH_RANSOM_REFUSED]: BreachRansomRefusedPayload;
  [GAME_ENGINE_EVENTS.BREACH_RECOVERY_STARTED]: BreachRecoveryStartedPayload;
  [GAME_ENGINE_EVENTS.BREACH_RECOVERY_COMPLETED]: BreachRecoveryCompletedPayload;
  [GAME_ENGINE_EVENTS.BREACH_POST_EFFECTS_STARTED]: BreachPostEffectsStartedPayload;
  [GAME_ENGINE_EVENTS.SESSION_GAME_OVER]: SessionGameOverPayload;
  [GAME_ENGINE_EVENTS.UPGRADE_PURCHASED]: UpgradePurchasedPayload;
  [GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED]: ResourceAdjustedPayload;
  [GAME_ENGINE_EVENTS.CREDITS_CHANGED]: CreditsChangedPayload;
  [GAME_ENGINE_EVENTS.TRUST_CHANGED]: TrustChangedPayload;
  [GAME_ENGINE_EVENTS.INTEL_CHANGED]: IntelChangedPayload;
  [GAME_ENGINE_EVENTS.LEVEL_UP]: LevelUpPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_DISCREPANCY_FLAGGED]: VerificationDiscrepancyFlaggedPayload;
  [GAME_ENGINE_EVENTS.FACILITY_CLIENT_ONBOARDED]: FacilityClientOnboardedPayload;
  [GAME_ENGINE_EVENTS.FACILITY_CLIENT_EVICTED]: FacilityClientEvictedPayload;
  [GAME_ENGINE_EVENTS.FACILITY_RESOURCE_CRITICAL]: FacilityResourceCriticalPayload;
  [GAME_ENGINE_EVENTS.FACILITY_TICK_PROCESSED]: FacilityTickProcessedPayload;
  [GAME_ENGINE_EVENTS.FACILITY_TIER_UPGRADED]: FacilityTierUpgradedPayload;
  [GAME_ENGINE_EVENTS.FACILITY_UPGRADE_PURCHASED]: FacilityUpgradePurchasedPayload;
  [GAME_ENGINE_EVENTS.FACILITY_UPGRADE_COMPLETED]: FacilityUpgradeCompletedPayload;
};
