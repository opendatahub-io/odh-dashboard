import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { MaaSModel } from '~/app/types/maas-models';

/** GET /api/v1/models - Fetch the list of models that have been registred with MaaS */
export const getMaaSModelsList =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSModel[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/models`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<MaaSModel[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
