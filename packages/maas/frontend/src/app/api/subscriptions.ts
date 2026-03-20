import { handleRestFailures, isModArchResponse, APIOptions, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '../utilities/const';
import { MaaSSubscription } from '../types/subscriptions';

/** GET /api/v1/all-subscriptions - List all subscriptions */
export const listSubscriptions =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSSubscription[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/all-subscriptions`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<MaaSSubscription[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
