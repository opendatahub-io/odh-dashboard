import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { DEV_IMPERSONATE_USER, USER_ACCESS_TOKEN } from './constants';
import { KubeFastifyInstance } from '../types';
import { DEV_MODE } from './constants';
import { createCustomError } from './requestUtils';
import { isImpersonating } from '../devFlags';

export const usernameTranslate = (username: string): string => {
  const encodedUsername = encodeURIComponent(username);
  return encodedUsername
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a')
    .replace(/-/g, '%2d')
    .replace(/\./g, '%2e')
    .replace(/_/g, '%5f')
    .replace(/~/g, '%7f')
    .replace(/%/g, '-')
    .toLowerCase();
};

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

export const getOpenshiftUser = async (
  fastify: KubeFastifyInstance,
  username: string,
): Promise<OpenShiftUser> => {
  try {
    const userResponse = await fastify.kube.customObjectsApi.getClusterCustomObject(
      'user.openshift.io',
      'v1',
      'users',
      username,
    );
    return userResponse.body as OpenShiftUser;
  } catch (e) {
    throw new Error(`Error retrieving user, ${e.response?.body?.message || e.message}`);
  }
};

export const getUser = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OpenShiftUser> => {
  const accessToken = request.headers[USER_ACCESS_TOKEN] as string;
  if (!accessToken) {
    const error = createCustomError(
      'Unauthorized',
      `Error, missing x-forwarded-access-token header`,
      401,
    );
    throw error;
  }
  try {
    const customObjectApiNoAuth = _.cloneDeep(fastify.kube.customObjectsApi);
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
    const error = createCustomError(
      e.message,
      `Error getting Oauth Info for user, ${e.response?.body?.message || e.message}`,
      e.statusCode,
    );
    throw error;
  }
};

export const getUserName = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<string> => {
  const { currentUser } = fastify.kube;

  try {
    const userOauth = await getUser(fastify, request);
    return userOauth.metadata.name;
  } catch (e) {
    if (DEV_MODE) {
      if (isImpersonating()) {
        return DEV_IMPERSONATE_USER;
      }
      return (currentUser.username || currentUser.name)?.split('/')[0];
    }
    fastify.log.error(`Failed to retrieve username: ${e.response?.body?.message || e.message}`);
    const error = createCustomError(
      'Unauthorized',
      `Failed to retrieve username: ${e.response?.body?.message || e.message}`,
      e.statusCode || 500,
    );
    throw error;
  }
};
