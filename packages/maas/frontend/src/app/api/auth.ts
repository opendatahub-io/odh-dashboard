import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { type GroupsList } from '~/app/types/auth-groups';

/** GET /api/v1/groups - List OpenShift Groups the user has access to */
export const getGroups =
  (hostPath = '') =>
  (opts: APIOptions): Promise<GroupsList> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/groups`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<GroupsList>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
