import { FastifyRequest } from 'fastify';
import { USER_ACCESS_TOKEN } from './constants';

interface JWTPayload {
  sub?: string;
  username?: string;
  preferred_username?: string;
  email?: string;
  name?: string;
}

/**
 * Extracts username from JWT token without full verification.
 * This is safe because kube-rbac-proxy has already validated the token.
 *
 * @param token - The JWT token string
 * @returns The extracted username or null if extraction fails
 */
export const extractUsernameFromJWT = (token: string): string | null => {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (base64url)
    const payloadBuffer = Buffer.from(parts[1], 'base64url');
    const payloadString = String.fromCharCode(...payloadBuffer);
    const decoded: JWTPayload = JSON.parse(payloadString);

    // Try various standard claims for username
    return (
      decoded.preferred_username ||
      decoded.username ||
      decoded.sub ||
      decoded.email?.split('@')[0] ||
      null
    );
  } catch (e) {
    return null;
  }
};

/**
 * Gets username from JWT token in the request headers.
 *
 * @param request - Fastify request object
 * @returns The extracted username or null if token is missing or invalid
 */
export const getUsernameFromToken = (request: FastifyRequest): string | null => {
  const token = request.headers[USER_ACCESS_TOKEN] as string;
  if (!token) {
    return null;
  }
  return extractUsernameFromJWT(token);
};
