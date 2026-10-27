/* eslint-disable no-relative-import-paths/no-relative-import-paths -- Portal TS checks this exported API across package boundaries. */
import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, API_URL_PREFIX } from '../utilities/const';
import { type MaaSWhoAmI } from '../types/whoami';

export { getMaaSWhoAmIDisplayName } from '../utilities/whoami';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isMaaSWhoAmI = (v: unknown): v is MaaSWhoAmI =>
  isRecord(v) &&
  typeof v.sub === 'string' &&
  (v.email === undefined || typeof v.email === 'string') &&
  (v.name === undefined || typeof v.name === 'string') &&
  typeof v.isAdmin === 'boolean';

export const getMaaSWhoAmI =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSWhoAmI> =>
    handleRestFailures(
      restGET(hostPath, `${API_URL_PREFIX}/api/${BFF_API_VERSION}/whoami`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSWhoAmI(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
