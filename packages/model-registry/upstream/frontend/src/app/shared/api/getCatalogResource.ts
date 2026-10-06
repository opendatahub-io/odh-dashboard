import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';

export const getCatalogResource = <T>(
  hostPath: string,
  path: string,
  queryParams: Record<string, unknown>,
  opts: APIOptions,
): Promise<T> =>
  handleRestFailures(restGET(hostPath, path, queryParams, opts)).then((response) => {
    if (isModArchResponse<T>(response)) {
      return response.data;
    }
    throw new Error('Invalid response format');
  });
