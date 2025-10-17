import { FastifyRequest } from 'fastify';
import * as _ from 'lodash';
import {
  DEV_IMPERSONATE_USER,
  USER_ACCESS_TOKEN,
  DEV_MODE,
  KUBE_RBAC_USER_HEADER,
} from './constants';
import { createCustomError } from './requestUtils';
import { errorHandler, isHttpError } from '../utils';
import { KubeFastifyInstance } from '../types';
import { isImpersonating } from '../devFlags';
import { getUsernameFromToken } from './jwtUtils';

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
 * Get user information with fallback strategies for different auth environments:
 * 1. kube-rbac-proxy headers (BYO OIDC with 4.19+)
 * 2. User API with token (traditional OpenShift, dev-sandbox)
 * 3. SelfSubjectReview with token (fallback using Kubernetes API)
 * 4. JWT token parsing (if token available but APIs fail)
 * 5. Dev mode service account (local development)
 */
export const getUserInfo = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ userName: string; userID: string | undefined }> => {
  const { currentUser } = fastify.kube;
  const accessToken = request.headers[USER_ACCESS_TOKEN] as string;

  // Strategy 1: Try kube-rbac-proxy header (primary for 4.19+)
  const rbacUsername = request.headers[KUBE_RBAC_USER_HEADER] as string;
  if (rbacUsername) {
    fastify.log.debug(`Username extracted from kube-rbac-proxy header: ${rbacUsername}`);
    return { userName: rbacUsername, userID: undefined };
  }

  // Strategy 2: Try User API with token (traditional OpenShift, dev-sandbox)
  if (accessToken) {
    try {
      const userOauth = await getUser(fastify, request);
      const userName = userOauth.metadata.name;
      const userID = userOauth.metadata.annotations?.['toolchain.dev.openshift.com/sso-user-id'];

      fastify.log.debug(`Username extracted from User API: ${userName}`);
      return { userName, userID };
    } catch (e) {
      // User API not available or failed - this is expected in BYO OIDC
      fastify.log.debug(`User API unavailable: ${errorHandler(e)}`);
    }

    // Strategy 3: Try SelfSubjectReview with token (Kubernetes standard API)
    try {
      const userName = await getUsernameFromSelfSubjectReview(fastify, accessToken);
      if (userName) {
        fastify.log.debug(`Username extracted from SelfSubjectReview: ${userName}`);
        return { userName, userID: undefined };
      }
    } catch (e) {
      fastify.log.debug(`SelfSubjectReview unavailable: ${errorHandler(e)}`);
    }

    // Strategy 4: Try JWT token parsing (fallback when APIs don't work)
    const jwtUsername = getUsernameFromToken(request);
    if (jwtUsername) {
      fastify.log.debug(`Username extracted from JWT token: ${jwtUsername}`);
      return { userName: jwtUsername, userID: undefined };
    }
  }

  // Strategy 5: Dev mode fallback
  if (DEV_MODE) {
    if (isImpersonating()) {
      fastify.log.debug(`Using impersonated user: ${DEV_IMPERSONATE_USER}`);
      return { userName: DEV_IMPERSONATE_USER ?? '', userID: undefined };
    }

    const devUsername = (currentUser.username || currentUser.name).split('/')[0];
    fastify.log.debug(`Using dev mode service account: ${devUsername}`);
    return { userName: devUsername, userID: undefined };
  }

  // All strategies failed
  fastify.log.error('Failed to retrieve username from any source');
  const error = createCustomError(
    'Unauthorized',
    'Failed to determine user identity. No valid authentication information found.',
    401,
  );
  throw error;
};

/**
 * Gets username using Kubernetes SelfSubjectReview API.
 * This is equivalent to `kubectl auth whoami` and works with any valid token.
 *
 * @param fastify - Fastify instance with Kubernetes client
 * @param accessToken - The user's access token
 * @returns The username or null if the call fails
 */
export const getUsernameFromSelfSubjectReview = async (
  fastify: KubeFastifyInstance,
  accessToken: string,
): Promise<string | null> => {
  try {
    const authApi = _.cloneDeep(fastify.kube.customObjectsApi);
    authApi.setApiKey(0, `Bearer ${accessToken}`);

    // Create SelfSubjectReview request
    const response = await authApi.createClusterCustomObject(
      'authentication.k8s.io',
      'v1',
      'selfsubjectreviews',
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'SelfSubjectReview',
        metadata: {},
      },
    );

    const username = (response.body as any)?.status?.userInfo?.username;
    return username || null;
  } catch (e) {
    fastify.log.debug(`SelfSubjectReview failed: ${errorHandler(e)}`);
    return null;
  }
};
