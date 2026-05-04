import { describe, expect, it, vi } from 'vitest';

import { apiCall } from './api-call.js';

import type { CategorizedApiError } from './types.js';

type ApiCallResult<T> = {
  data?: T;
  error?: CategorizedApiError;
  requestId?: string;
};

describe('apiCall', () => {
  it('should return data when api call succeeds with data', async () => {
    const mockData = { id: '123', name: 'Test' };
    const apiCallFn = vi.fn().mockResolvedValue({ data: mockData });

    const result = await apiCall<typeof mockData>(apiCallFn);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeUndefined();
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should return error when api call returns error', async () => {
    const mockError: CategorizedApiError = {
      category: 'network',
      code: 'NETWORK_ERROR',
      message: 'Connection failed',
      status: 0,
      retryable: true,
    };
    const apiCallFn = vi.fn().mockResolvedValue({ error: mockError });

    const result = await apiCall<{ id: string }>(apiCallFn);

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual(mockError);
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should return INVALID_RESPONSE error when api call returns no data', async () => {
    const apiCallFn = vi.fn().mockResolvedValue({ data: undefined });

    const result = await apiCall<{ id: string }>(apiCallFn);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('INVALID_RESPONSE');
    expect(result.error?.category).toBe('server');
    expect(result.error?.message).toBe('Invalid response from server');
    expect(result.error?.status).toBe(500);
    expect(result.error?.retryable).toBe(false);
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should return INVALID_RESPONSE error when api call returns null data', async () => {
    const apiCallFn = vi.fn().mockResolvedValue({ data: null } as ApiCallResult<{ id: string }>);

    const result = await apiCall<{ id: string }>(apiCallFn);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('INVALID_RESPONSE');
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should use dataExtractor to transform data when provided', async () => {
    const envelope = { providers: [{ id: '1', name: 'Provider 1' }] };
    const apiCallFn = vi.fn().mockResolvedValue({ data: envelope });

    const result = await apiCall(apiCallFn, (data) => data.providers);

    expect(result.data).toEqual([{ id: '1', name: 'Provider 1' }]);
    expect(result.error).toBeUndefined();
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should return INVALID_RESPONSE error when dataExtractor is provided but data is undefined', async () => {
    const apiCallFn = vi.fn().mockResolvedValue({ data: undefined });

    const result = await apiCall(apiCallFn, (data) => data.providers);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('INVALID_RESPONSE');
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should return error from api call even when dataExtractor is provided', async () => {
    const mockError: CategorizedApiError = {
      category: 'auth',
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
      status: 401,
      retryable: false,
    };
    const apiCallFn = vi.fn().mockResolvedValue({ error: mockError });

    const result = await apiCall(apiCallFn, (data) => data.providers);

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual(mockError);
    expect(apiCallFn).toHaveBeenCalledOnce();
  });

  it('should work with nested data extraction (tokens)', async () => {
    const envelope = {
      tokens: [
        { id: 'token-1', name: 'SCIM Token 1' },
        { id: 'token-2', name: 'SCIM Token 2' },
      ],
    };
    const apiCallFn = vi.fn().mockResolvedValue({ data: envelope });

    const result = await apiCall(apiCallFn, (data) => data.tokens);

    expect(result.data).toHaveLength(2);
    expect(result.data).toEqual(envelope.tokens);
    expect(result.error).toBeUndefined();
  });

  it('should work with boolean data extraction (success field)', async () => {
    const envelope = { success: true };
    const apiCallFn = vi.fn().mockResolvedValue({ data: envelope });

    const result = await apiCall(apiCallFn, (data) => data.success);

    expect(result.data).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should propagate requestId from api call error', async () => {
    const mockError: CategorizedApiError = {
      category: 'server',
      code: 'SERVER_ERROR',
      message: 'Internal error',
      status: 500,
      retryable: false,
      requestId: 'req-123',
    };
    const apiCallFn = vi.fn().mockResolvedValue({ error: mockError });

    const result = await apiCall<{ id: string }>(apiCallFn);

    expect(result.error?.requestId).toBe('req-123');
  });

  it('should not include requestId when error has no requestId', async () => {
    const mockError: CategorizedApiError = {
      category: 'server',
      code: 'SERVER_ERROR',
      message: 'Internal error',
      status: 500,
      retryable: false,
    };
    const apiCallFn = vi.fn().mockResolvedValue({ error: mockError });

    const result = await apiCall<{ id: string }>(apiCallFn);

    expect(result.error?.requestId).toBeUndefined();
  });

  it('should return error when dataExtractor throws', async () => {
    const mockError: CategorizedApiError = {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'Invalid response from server',
      status: 500,
      retryable: false,
    };
    const envelope = { providers: [{ id: '1', name: 'Provider 1' }] };
    const apiCallFn = vi.fn().mockResolvedValue({ data: envelope });
    const dataExtractor = vi.fn().mockImplementation(() => {
      throw mockError;
    });

    const result = await apiCall(apiCallFn, dataExtractor);

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual(mockError);
    expect(apiCallFn).toHaveBeenCalledOnce();
    expect(dataExtractor).toHaveBeenCalledOnce();
  });
});
