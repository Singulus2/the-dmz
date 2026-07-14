import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

type ApiCallResult<T> = {
  data?: T;
  error?: CategorizedApiError;
  requestId?: string;
};

type DataExtractorResult<T> = T | { error: CategorizedApiError };

export async function apiCall<T, R = T>(
  apiCallFn: () => Promise<ApiCallResult<T>>,
  dataExtractor?: (data: NonNullable<ApiCallResult<T>['data']>) => DataExtractorResult<R>,
): Promise<{ data?: R; error?: CategorizedApiError }> {
  const result = await apiCallFn();

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  if (dataExtractor) {
    const extracted = dataExtractor(result.data);
    if (extracted !== null && typeof extracted === 'object' && 'error' in extracted) {
      return extracted;
    }
    return { data: extracted };
  }

  return { data: result.data as unknown as R };
}
