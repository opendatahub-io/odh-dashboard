import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, API_URL_PREFIX } from '~/app/utilities/const';
import { MAAS_ORGS_CLAIM, type MaaSMe } from '~/app/types/me';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isMaaSMe = (v: unknown): v is MaaSMe =>
  isRecord(v) &&
  typeof v.sub === 'string' &&
  (v.email === undefined || typeof v.email === 'string') &&
  (v.name === undefined || typeof v.name === 'string') &&
  Array.isArray(v[MAAS_ORGS_CLAIM]) &&
  v[MAAS_ORGS_CLAIM].every(
    (org) =>
      isRecord(org) &&
      typeof org.organization_id === 'string' &&
      (org.organization_name === undefined || typeof org.organization_name === 'string') &&
      Array.isArray(org.roles) &&
      org.roles.every((role) => typeof role === 'string'),
  );

export const getMaaSMe =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSMe> =>
    handleRestFailures(
      restGET(hostPath, `${API_URL_PREFIX}/api/${BFF_API_VERSION}/me`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSMe(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
