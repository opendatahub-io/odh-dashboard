import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import { DEV_IMPERSONATE_USER, USER_ACCESS_TOKEN, DEV_MODE, BYOIDC_USER_HEADER, BYOIDC_GROUPS_HEADER, BYOIDC_EMAIL_HEADER, BYOIDC_EXTRACT_USERNAME } from './constants';
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

/**
 * Extract user information from BYOIDC headers
 * @param request FastifyRequest containing headers
 * @returns User info object with userName and userID
 */
export const getUserInfoFromHeaders = (request: FastifyRequest): { userName: string; userID: string } => {
  const userHeader = request.headers[BYOIDC_USER_HEADER] as string;
  const groupsHeader = request.headers[BYOIDC_GROUPS_HEADER] as string;
  const emailHeader = request.headers[BYOIDC_EMAIL_HEADER] as string;

  if (!userHeader) {
    throw new Error('Missing X-Auth-Request-User header');
  }

  // Extract username from the full identifier (e.g., extract "kubeadmin" from "https://keycloak.tannerjc.net/realms/ocp-byoidc-realm#kubeadmin")
  let userName: string;
  if (BYOIDC_EXTRACT_USERNAME && userHeader.includes('#')) {
    userName = userHeader.split('#')[1];
  } else {
    userName = userHeader;
  }

  // Use email as userID if available, otherwise fall back to extracted username
  const userID = emailHeader || userName;

  return {
    userName,
    userID,
  };
};

/**
 * Check if BYOIDC headers are present in the request
 * @param request FastifyRequest containing headers
 * @returns true if BYOIDC headers are present
 */
export const isBYOIDCMode = (request: FastifyRequest): boolean => {
  return !!(request.headers[BYOIDC_USER_HEADER] as string);
};

export const getUserInfo = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ userName: string; userID: string }> => {
  const { currentUser } = fastify.kube;

  // Check if BYOIDC headers are present
  if (isBYOIDCMode(request)) {
    try {
      fastify.log.debug('Using BYOIDC header-based authentication');
      return getUserInfoFromHeaders(request);
    } catch (e) {
      fastify.log.warn(`BYOIDC header-based auth failed, falling back to OpenShift API: ${errorHandler(e)}`);
      // Fall through to OpenShift API fallback
    }
  }

  // Fallback to traditional OpenShift OAuth
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
