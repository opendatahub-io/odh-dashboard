import { FastifyRequest } from 'fastify';
import { createHash } from 'crypto';
import { KubeFastifyInstance } from '../types';
import { getUser } from './userUtils';
import { USER_ACCESS_TOKEN } from './constants';
import { errorHandler } from '../utils';

/**
 * Get a stable user identifier for segment tracking.
 * Priority:
 * 1. Dev-sandbox SSO user ID (if User API available)
 * 2. Hash of username from JWT sub claim
 * 3. Hash of username from any source
 *
 * @param fastify - Fastify instance with kube context
 * @param request - Fastify request object
 * @param username - Username already extracted
 * @returns A stable user ID or undefined
 */
export const getSegmentUserId = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
  username: string,
): Promise<string | undefined> => {
  // Try to get dev-sandbox user ID from User API
  try {
    const user = await getUser(fastify, request);
    const ssoUserId = user.metadata.annotations?.['toolchain.dev.openshift.com/sso-user-id'];
    if (ssoUserId) {
      fastify.log.debug(`Using dev-sandbox SSO user ID for segment: ${ssoUserId}`);
      return ssoUserId;
    }
  } catch (e) {
    // User API not available - expected in BYO OIDC
    fastify.log.debug(`User API not available for segment ID extraction: ${errorHandler(e)}`);
  }

  // Try to get stable ID from JWT token 'sub' claim
  const token = request.headers[USER_ACCESS_TOKEN] as string;
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadBuffer = Buffer.from(parts[1], 'base64url');
        const payload = String(payloadBuffer);
        const decoded = JSON.parse(payload);

        if (decoded.sub) {
          // Hash the 'sub' claim for privacy
          const hashedSub = createHash('sha256').update(decoded.sub).digest('hex');
          fastify.log.debug(`Using hashed JWT sub for segment: ${hashedSub.substring(0, 8)}...`);
          return hashedSub;
        }
      }
    } catch (e) {
      fastify.log.debug(`Could not extract sub from JWT token: ${errorHandler(e)}`);
    }
  }

  // Fallback: hash the username
  if (username) {
    const hashedUsername = createHash('sha256').update(username).digest('hex');
    fastify.log.debug(`Using hashed username for segment: ${hashedUsername.substring(0, 8)}...`);
    return hashedUsername;
  }

  return undefined;
};
