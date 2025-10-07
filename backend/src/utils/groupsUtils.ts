import { CustomObjectsApi } from '@kubernetes/client-node';
import { GroupObjResponse } from '../types';

/** @deprecated -- no new functionality should use this; don't rely on reading groups */
export const getGroup = async (
  customObjectsApi: CustomObjectsApi,
  adminGroup: string,
): Promise<string[]> => {
  try {
    const adminGroupResponse = await customObjectsApi.getClusterCustomObject(
      'user.openshift.io',
      'v1',
      'groups',
      adminGroup,
    );
    return (adminGroupResponse.body as GroupObjResponse).users || [];
  } catch (e) {
    // TODO: Silence fetch errors -- Group API might be disabled on cluster
    return [];
  }
};
