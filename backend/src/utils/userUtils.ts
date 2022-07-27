import { CustomObjectsApi } from '@kubernetes/client-node';
import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';

const USER_ACCESS_TOKEN = 'x-forwarded-access-token';

export type OpenShiftUser = {
  kind: string;
  apiVersion: string;
  metadata: {
    name: string;
    uid: string;
    resourceVersion: string;
  };
  fullName: string;
  identities: string[];
  groups: string[];
};

export const getUser = async (
  request: FastifyRequest,
  customObjectApi: CustomObjectsApi,
): Promise<OpenShiftUser> => {
  try {
    const accessToken = request.headers[USER_ACCESS_TOKEN] as string;
    if (!accessToken) {
      throw new Error(`missing x-forwarded-access-token header`);
    }
    const customObjectApiNoAuth = _.cloneDeep(customObjectApi);
    customObjectApiNoAuth.setApiKey(0, `Bearer ${accessToken}`);
    const userResponse = await customObjectApiNoAuth.getClusterCustomObject(
      'user.openshift.io',
      'v1',
      'users',
      '~',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return userResponse.body as OpenShiftUser;
  } catch (e) {
    throw new Error(`Error getting Oauth Info for user, ${e.toString()}`);
  }
};
