import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { DEV_IMPERSONATE_USER, USER_ACCESS_TOKEN, DEV_MODE } from './constants';
import { createCustomError } from './requestUtils';
import { errorHandler, isHttpError } from '../utils';
import { KubeFastifyInstance } from '../types';
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
    annotations?: {
      'toolchain.dev.openshift.com/sso-user-id': string;
    };
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
    throw new Error(`Error retrieving user, ${errorHandler(e)}`);
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
      errorHandler(e),
      `Error getting Oauth Info for user, ${errorHandler(e)}`,
      (isHttpError(e) && e.statusCode) || 401,
    );
    throw error;
  }
};

export const getUserInfo = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ userName: string; userID: string }> => {
  const { currentUser } = fastify.kube;

  try {
    const userOauth = await getUser(fastify, request);
    return {
      userName: userOauth.metadata.name,
      userID: userOauth.metadata.annotations?.['toolchain.dev.openshift.com/sso-user-id'],
    };
  } catch (e) {
    if (DEV_MODE) {
      if (isImpersonating()) {
        return { userName: DEV_IMPERSONATE_USER ?? '', userID: undefined };
      }
      return {
        userName: (currentUser.username || currentUser.name).split('/')[0],
        userID: undefined,
      };
    }
    fastify.log.error(`Failed to retrieve username: ${errorHandler(e)}`);
    const error = createCustomError(
      'Unauthorized',
      `Failed to retrieve username: ${errorHandler(e)}`,
      (isHttpError(e) && e.statusCode) || 500,
    );
    throw error;
  }
};
