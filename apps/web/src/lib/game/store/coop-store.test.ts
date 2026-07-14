import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

import type { CoopDecisionProposal } from '@the-dmz/shared/schemas';
import type {
  CoopRoleAssignedPayload,
  CoopAuthorityTransferredPayload,
  CoopDayAdvancedPayload,
} from '$lib/game/services/coop-events.types';

import { coopStore } from './coop-store';

const initialTestState = {
  isLoading: false,
  isInitialized: false,
  error: null,
  session: null,
  currentPlayerId: null,
  currentPlayerRole: null,
  isAuthority: false,
  proposals: [],
  lastSyncAt: null,
};

function createMockSession(
  overrides: Partial<{
    sessionId: string;
    dayNumber: number;
    authorityPlayerId: string;
    roles: Array<{ playerId: string; role: string; isAuthority: boolean }>;
  }> = {},
) {
  return {
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    dayNumber: 1,
    authorityPlayerId: 'player-authority',
    partyId: 'party-123',
    roles: [
      { playerId: 'player-1', role: 'triage_lead', isAuthority: true },
      { playerId: 'player-2', role: 'verification_lead', isAuthority: false },
    ],
    ...overrides,
  };
}

describe('coopStore', () => {
  beforeEach(() => {
    coopStore.reset();
    vi.clearAllMocks();
  });

  describe('handleSessionEvent', () => {
    describe('coop.session.role_assigned', () => {
      it('should update session roles and currentPlayerRole when player is in session', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-1', 'triage_lead', true);

        const payload: CoopRoleAssignedPayload = {
          sessionId: session.sessionId,
          roles: [
            { playerId: 'player-1', role: 'verification_lead', isAuthority: false },
            { playerId: 'player-2', role: 'triage_lead', isAuthority: true },
          ],
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.role_assigned',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.session?.roles).toEqual(payload.roles);
        expect(state.currentPlayerRole).toBe('verification_lead');
        expect(state.isAuthority).toBe(false);
      });

      it('should update isAuthority based on current player role', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-2', 'verification_lead', false);

        const payload: CoopRoleAssignedPayload = {
          sessionId: session.sessionId,
          roles: [
            { playerId: 'player-1', role: 'triage_lead', isAuthority: true },
            { playerId: 'player-2', role: 'verification_lead', isAuthority: false },
          ],
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.role_assigned',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.currentPlayerRole).toBe('verification_lead');
        expect(state.isAuthority).toBe(false);
      });

      it('should not update state when session is null', () => {
        const payload: CoopRoleAssignedPayload = {
          sessionId: 'some-session',
          roles: [{ playerId: 'player-1', role: 'triage_lead', isAuthority: true }],
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.role_assigned',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.session).toBeNull();
        expect(state.currentPlayerRole).toBeNull();
        expect(state.isAuthority).toBe(false);
      });
    });

    describe('coop.session.authority_transferred', () => {
      it('should update isAuthority flag for the new authority player', () => {
        const session = createMockSession({ authorityPlayerId: 'player-1' });
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-1', 'triage_lead', true);

        const payload: CoopAuthorityTransferredPayload = {
          sessionId: session.sessionId,
          previousAuthorityPlayerId: 'player-1',
          newAuthorityPlayerId: 'player-2',
          transferredBy: 'player-1',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.authority_transferred',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.session?.roles.find((r) => r.playerId === 'player-2')?.isAuthority).toBe(true);
        expect(state.session?.roles.find((r) => r.playerId === 'player-1')?.isAuthority).toBe(
          false,
        );
        expect(state.isAuthority).toBe(false);
      });

      it('should set isAuthority to true when current player becomes authority', () => {
        const session = createMockSession({ authorityPlayerId: 'player-1' });
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-2', 'verification_lead', false);

        const payload: CoopAuthorityTransferredPayload = {
          sessionId: session.sessionId,
          previousAuthorityPlayerId: 'player-1',
          newAuthorityPlayerId: 'player-2',
          transferredBy: 'player-1',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.authority_transferred',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.isAuthority).toBe(true);
      });

      it('should not update state when session is null', () => {
        const payload: CoopAuthorityTransferredPayload = {
          sessionId: 'some-session',
          previousAuthorityPlayerId: 'player-1',
          newAuthorityPlayerId: 'player-2',
          transferredBy: 'player-1',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.authority_transferred',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.session).toBeNull();
      });
    });

    describe('coop.session.proposal_submitted', () => {
      it('should add proposal via addOrUpdateProposal', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);

        const proposal: CoopDecisionProposal = {
          proposalId: '11111111-1111-1111-1111-111111111111',
          sessionId: session.sessionId,
          playerId: 'player-1',
          role: 'triage_lead',
          emailId: '22222222-2222-2222-2222-222222222222',
          action: 'approve',
          status: 'proposed',
          authorityAction: null,
          conflictFlag: false,
          conflictReason: null,
          rationale: 'This looks legitimate',
          proposedAt: '2026-01-01T00:00:00.000Z',
          resolvedAt: null,
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.proposal_submitted',
          payload: proposal as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.proposals).toHaveLength(1);
        expect(state.proposals[0]).toEqual(proposal);
      });
    });

    describe('coop.session.proposal_confirmed', () => {
      it('should update existing proposal via addOrUpdateProposal', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);

        const initialProposal: CoopDecisionProposal = {
          proposalId: '11111111-1111-1111-1111-111111111111',
          sessionId: session.sessionId,
          playerId: 'player-1',
          role: 'triage_lead',
          emailId: '22222222-2222-2222-2222-222222222222',
          action: 'approve',
          status: 'proposed',
          authorityAction: null,
          conflictFlag: false,
          conflictReason: null,
          rationale: 'This looks legitimate',
          proposedAt: '2026-01-01T00:00:00.000Z',
          resolvedAt: null,
        };

        const confirmedProposal: CoopDecisionProposal = {
          ...initialProposal,
          status: 'confirmed',
          authorityAction: 'confirm',
          resolvedAt: '2026-01-01T00:01:00.000Z',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.proposal_submitted',
          payload: initialProposal as unknown as Record<string, unknown>,
        });

        coopStore.handleSessionEvent({
          type: 'coop.session.proposal_confirmed',
          payload: confirmedProposal as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.proposals).toHaveLength(1);
        expect(state.proposals[0]?.status).toBe('confirmed');
        expect(state.proposals[0]?.authorityAction).toBe('confirm');
      });
    });

    describe('coop.session.proposal_overridden', () => {
      it('should update proposal with override via addOrUpdateProposal', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);

        const proposal: CoopDecisionProposal = {
          proposalId: '11111111-1111-1111-1111-111111111111',
          sessionId: session.sessionId,
          playerId: 'player-1',
          role: 'triage_lead',
          emailId: '22222222-2222-2222-2222-222222222222',
          action: 'approve',
          status: 'proposed',
          authorityAction: null,
          conflictFlag: false,
          conflictReason: null,
          rationale: 'This looks legitimate',
          proposedAt: '2026-01-01T00:00:00.000Z',
          resolvedAt: null,
        };

        const overriddenProposal: CoopDecisionProposal = {
          ...proposal,
          status: 'overridden',
          authorityAction: 'override',
          conflictFlag: true,
          conflictReason: 'policy_conflict',
          resolvedAt: '2026-01-01T00:01:00.000Z',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.proposal_overridden',
          payload: overriddenProposal as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.proposals).toHaveLength(1);
        expect(state.proposals[0]?.status).toBe('overridden');
        expect(state.proposals[0]?.authorityAction).toBe('override');
        expect(state.proposals[0]?.conflictFlag).toBe(true);
        expect(state.proposals[0]?.conflictReason).toBe('policy_conflict');
      });
    });

    describe('coop.session.day_advanced', () => {
      it('should update dayNumber and roles when session exists', () => {
        const session = createMockSession({ authorityPlayerId: 'player-1', dayNumber: 1 });
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-1', 'triage_lead', true);

        const payload: CoopDayAdvancedPayload = {
          sessionId: session.sessionId,
          dayNumber: 2,
          previousAuthorityPlayerId: 'player-1',
          newAuthorityPlayerId: 'player-2',
          advancedBy: 'player-1',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.day_advanced',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.session?.dayNumber).toBe(2);
        expect(state.session?.roles.find((r) => r.playerId === 'player-2')?.isAuthority).toBe(true);
        expect(state.session?.roles.find((r) => r.playerId === 'player-1')?.isAuthority).toBe(
          false,
        );
        expect(state.isAuthority).toBe(false);
      });

      it('should set isAuthority to true when current player becomes new authority on day advance', () => {
        const session = createMockSession({ authorityPlayerId: 'player-1', dayNumber: 1 });
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-2', 'verification_lead', false);

        const payload: CoopDayAdvancedPayload = {
          sessionId: session.sessionId,
          dayNumber: 2,
          previousAuthorityPlayerId: 'player-1',
          newAuthorityPlayerId: 'player-2',
          advancedBy: 'player-1',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.day_advanced',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.isAuthority).toBe(true);
      });

      it('should not update state when session is null', () => {
        const payload: CoopDayAdvancedPayload = {
          sessionId: 'some-session',
          dayNumber: 2,
          previousAuthorityPlayerId: 'player-1',
          newAuthorityPlayerId: 'player-2',
          advancedBy: 'player-1',
        };

        coopStore.handleSessionEvent({
          type: 'coop.session.day_advanced',
          payload: payload as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state.session).toBeNull();
      });
    });

    describe('coop.session.ended', () => {
      it('should reset store to initial state', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-1', 'triage_lead', true);

        coopStore.handleSessionEvent({
          type: 'coop.session.ended',
          payload: {
            sessionId: session.sessionId,
            partyId: 'party-123',
            endedBy: 'player-1',
            status: 'completed',
          } as unknown as Record<string, unknown>,
        });

        const state = get(coopStore);
        expect(state).toEqual(initialTestState);
      });
    });

    describe('unknown event types', () => {
      it('should silently ignore unknown event types', () => {
        const session = createMockSession();
        coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
        coopStore.setCurrentPlayer('player-1', 'triage_lead', true);

        expect(() => {
          coopStore.handleSessionEvent({
            type: 'unknown.event.type',
            payload: { some: 'data' },
          });
        }).not.toThrow();

        const state = get(coopStore);
        expect(state.session).toBeTruthy();
        expect(state.currentPlayerRole).toBe('triage_lead');
      });
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const session = createMockSession();
      coopStore.applySessionState(session as Parameters<typeof coopStore.applySessionState>[0]);
      coopStore.setCurrentPlayer('player-1', 'triage_lead', true);

      coopStore.reset();

      const state = get(coopStore);
      expect(state).toEqual(initialTestState);
    });
  });
});
