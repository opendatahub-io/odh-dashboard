import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, API_URL_PREFIX } from '~/app/utilities/const';
import type { MaaSGatewayURL } from '~/app/types/maas-model';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isMaaSGatewayURL = (v: unknown): v is MaaSGatewayURL =>
  isRecord(v) && typeof v.url === 'string';

/** GET /api/v1/gateway-url - Externally reachable MaaS API base URL */
export const getMaaSGatewayUrl =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSGatewayURL> =>
    handleRestFailures(
      restGET(hostPath, `${API_URL_PREFIX}/api/${BFF_API_VERSION}/gateway-url`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSGatewayURL(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
