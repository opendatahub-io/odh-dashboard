import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { API_URL_PREFIX } from '~/app/utilities/const';

export const getCurrentUser = (opts: APIOptions = {}): Promise<{ userId: string }> =>
  handleRestFailures(restGET(API_URL_PREFIX, '/api/v1/user', {}, opts)).then((response) => {
    if (isModArchResponse<{ userId: string }>(response)) {
      return response.data;
    }
    throw new Error('Invalid response format');
  });
