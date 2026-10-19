import type { CustomObjectsApi } from '@kubernetes/client-node';
import { GroupObjResponse } from '../types';

/** @deprecated -- no new functionality should use this; don't rely on reading groups */
export const getGroup = async (
  customObjectsApi: CustomObjectsApi,
  adminGroup: string,
): Promise<string[]> => {
  try {
    const adminGroupResponse = await customObjectsApi.getClusterCustomObject({
      group: 'user.openshift.io',
      version: 'v1',
      plural: 'groups',
      name: adminGroup,
    });
    return (adminGroupResponse as GroupObjResponse).users || [];
  } catch (e) {
    // Silence fetch errors -- Group API is disabled in BYO OIDC clusters
    // This is expected behavior in OpenShift 4.19+ with external auth providers
    // No action needed - returning empty array is correct behavior
    return [];
  }
};
