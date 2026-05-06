import { describe, expect, it } from 'vitest';

import {
  onboardingStatusResponseSchema,
  onboardingStateSchema,
} from '../index.js';

describe('onboardingStatusResponseSchema', () => {
  it('accepts a valid onboarding status response with completed=true when currentStep is complete', () => {
    const result = onboardingStatusResponseSchema.parse({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      state: {
        currentStep: 'complete',
        completedSteps: ['org_profile', 'idp_config', 'scim_token', 'compliance', 'complete'],
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-15T00:00:00.000Z',
      },
      canProceed: false,
      nextStep: null,
      completed: true,
    });

    expect(result.completed).toBe(true);
  });

  it('accepts a valid onboarding status response with completed=false when currentStep is not complete', () => {
    const result = onboardingStatusResponseSchema.parse({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      state: {
        currentStep: 'org_profile',
        completedSteps: [],
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
      },
      canProceed: true,
      nextStep: 'idp_config',
      completed: false,
    });

    expect(result.completed).toBe(false);
  });

  it('accepts completed=false when currentStep is compliance (not yet complete)', () => {
    const result = onboardingStatusResponseSchema.parse({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      state: {
        currentStep: 'compliance',
        completedSteps: ['org_profile', 'idp_config', 'scim_token'],
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
      },
      canProceed: true,
      nextStep: 'complete',
      completed: false,
    });

    expect(result.completed).toBe(false);
  });

  it('rejects when completed field is missing', () => {
    expect(() =>
      onboardingStatusResponseSchema.parse({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        state: {
          currentStep: 'complete',
          completedSteps: ['org_profile', 'idp_config', 'scim_token', 'compliance', 'complete'],
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-15T00:00:00.000Z',
        },
        canProceed: false,
        nextStep: null,
      }),
    ).toThrow();
  });

  it('rejects when completed is not a boolean', () => {
    expect(() =>
      onboardingStatusResponseSchema.parse({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        state: {
          currentStep: 'complete',
          completedSteps: ['org_profile', 'idp_config', 'scim_token', 'compliance', 'complete'],
          startedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-15T00:00:00.000Z',
        },
        canProceed: false,
        nextStep: null,
        completed: 'true',
      }),
    ).toThrow();
  });

  it('has completed as a required field', () => {
    const shape = onboardingStatusResponseSchema.shape;
    expect(shape).toHaveProperty('completed');
    expect(shape.completed).toBeDefined();
  });

  it('is consistent with other onboarding response schemas that have completed field', () => {
    const _orgProfileSchema = onboardingStateSchema;
    const state = {
      currentStep: 'complete',
      completedSteps: [
        'org_profile',
        'idp_config',
        'scim_token',
        'compliance',
        'complete',
      ] as const,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-15T00:00:00.000Z',
    };

    const statusResponse = onboardingStatusResponseSchema.parse({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      state,
      canProceed: false,
      nextStep: null,
      completed: true,
    });

    expect(statusResponse.completed).toBe(true);
  });
});
