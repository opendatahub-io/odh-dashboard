/* eslint-disable no-restricted-properties */
// Disabling no-restricted-properties for this test file as we need Buffer.toString()
// for base64url encoding to create test JWT tokens
import { extractUsernameFromJWT, getUsernameFromToken } from '../utils/jwtUtils';
import { FastifyRequest } from 'fastify';

// Helper function to create base64url encoded JWT tokens for testing
const createTestToken = (payload: object): string => {
  const payloadString = JSON.stringify(payload);
  const base64 = Buffer.from(payloadString).toString('base64');
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64url}.signature`;
};

describe('JWT Username Extraction', () => {
  describe('extractUsernameFromJWT', () => {
    it('should extract username from preferred_username claim', () => {
      const token = createTestToken({
        preferred_username: 'testuser',
        sub: 'some-uuid',
      });

      const username = extractUsernameFromJWT(token);
      expect(username).toBe('testuser');
    });

    it('should fallback to username claim', () => {
      const token = createTestToken({
        username: 'testuser',
        sub: 'some-uuid',
      });

      const username = extractUsernameFromJWT(token);
      expect(username).toBe('testuser');
    });

    it('should fallback to sub claim', () => {
      const token = createTestToken({
        sub: 'user@example.com',
      });

      const username = extractUsernameFromJWT(token);
      expect(username).toBe('user@example.com');
    });

    it('should fallback to email claim (before @)', () => {
      const token = createTestToken({
        email: 'testuser@example.com',
      });

      const username = extractUsernameFromJWT(token);
      expect(username).toBe('testuser');
    });

    it('should handle invalid tokens gracefully', () => {
      const username = extractUsernameFromJWT('invalid-token');
      expect(username).toBeNull();
    });

    it('should handle malformed tokens gracefully', () => {
      const username = extractUsernameFromJWT('header.payload');
      expect(username).toBeNull();
    });

    it('should handle invalid JSON in payload', () => {
      // Manually create an invalid token with non-JSON payload
      const invalidPayload = 'not-json';
      const base64 = Buffer.from(invalidPayload).toString('base64');
      const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const token = `header.${base64url}.signature`;

      const username = extractUsernameFromJWT(token);
      expect(username).toBeNull();
    });

    it('should return null if no username claims present', () => {
      const token = createTestToken({
        iss: 'https://issuer.example.com',
        aud: 'my-app',
      });

      const username = extractUsernameFromJWT(token);
      expect(username).toBeNull();
    });
  });

  describe('getUsernameFromToken', () => {
    it('should extract username from request headers', () => {
      const token = createTestToken({
        preferred_username: 'testuser',
      });

      const mockRequest = {
        headers: {
          'x-forwarded-access-token': token,
        },
      } as unknown as FastifyRequest;

      const username = getUsernameFromToken(mockRequest);
      expect(username).toBe('testuser');
    });

    it('should return null if token header is missing', () => {
      const mockRequest = {
        headers: {},
      } as FastifyRequest;

      const username = getUsernameFromToken(mockRequest);
      expect(username).toBeNull();
    });

    it('should return null if token is invalid', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-access-token': 'invalid-token',
        },
      } as unknown as FastifyRequest;

      const username = getUsernameFromToken(mockRequest);
      expect(username).toBeNull();
    });
  });
});
