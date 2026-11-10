import type { V1ResourceAttributes } from '@kubernetes/client-node';
import type { KubeFastifyInstance, OauthFastifyRequest } from '../../types';
import { AUTH_SINGLETON_NAME } from '../constants';

const createSelfSubjectAccessReview = jest.fn();
const getAuth = jest.fn();

jest.mock('../authUtils', () => ({
  createSelfSubjectAccessReview: (...args: unknown[]) => createSelfSubjectAccessReview(...args),
}));

jest.mock('../resourceUtils', () => ({
  getAuth: () => getAuth(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isUserAdmin, isUserAllowed } = require('../adminUtils');

const fastify = {} as KubeFastifyInstance;
const request = {} as OauthFastifyRequest;

const lastResourceAttributes = (): V1ResourceAttributes =>
  createSelfSubjectAccessReview.mock.calls[0][2];

beforeEach(() => {
  jest.clearAllMocks();
  createSelfSubjectAccessReview.mockResolvedValue({ status: { allowed: true } });
  // No escape hatch, so isUserAllowed is forced down the SSAR path.
  getAuth.mockReturnValue({ spec: { adminGroups: ['odh-admins'], allowedGroups: ['some-group'] } });
});

/**
 * Regression guard for RHOAIENG-103340.
 *
 * The admin/allowed SSARs previously named `default-auth` while the CR was read as `auth`.
 * The mismatch was invisible because the shipped ClusterRole grants `auths` with no
 * `resourceNames`, so Kubernetes authorized against the resource type and never compared
 * the name. Scoping that rule would have silently denied every admin.
 *
 * These assert against `AUTH_SINGLETON_NAME` -- the same constant `resourceUtils.fetchAuthKind`
 * uses to read the CR -- rather than a hardcoded string. Asserting the literal is exactly
 * what let the original bug survive review.
 */
describe('adminUtils SSAR targets the Auth singleton', () => {
  it('should issue the admin SSAR against the name used to read the CR', async () => {
    await isUserAdmin(fastify, request);

    const attributes = lastResourceAttributes();
    expect(attributes.name).toBe(AUTH_SINGLETON_NAME);
    expect(attributes.group).toBe('services.platform.opendatahub.io');
    expect(attributes.resource).toBe('auths');
    expect(attributes.verb).toBe('patch');
  });

  it('should issue the allowed SSAR against the name used to read the CR', async () => {
    await isUserAllowed(fastify, request);

    const attributes = lastResourceAttributes();
    expect(attributes.name).toBe(AUTH_SINGLETON_NAME);
    expect(attributes.group).toBe('services.platform.opendatahub.io');
    expect(attributes.resource).toBe('auths');
    expect(attributes.verb).toBe('get');
  });

  it('should use the identical resource name for both checks', async () => {
    await isUserAdmin(fastify, request);
    await isUserAllowed(fastify, request);

    const [adminCall, allowedCall] = createSelfSubjectAccessReview.mock.calls;
    expect(adminCall[2].name).toBe(allowedCall[2].name);
  });

  it('should skip the SSAR when system:authenticated is in allowedGroups', async () => {
    getAuth.mockReturnValue({
      spec: { adminGroups: ['odh-admins'], allowedGroups: ['system:authenticated'] },
    });

    await expect(isUserAllowed(fastify, request)).resolves.toBe(true);
    expect(createSelfSubjectAccessReview).not.toHaveBeenCalled();
  });
});

/**
 * The Auth CRD enforces `self.metadata.name == 'auth'` ("Auth name must be auth"), so the
 * API server rejects any other name at admission. This is the one place a literal belongs:
 * it encodes an external contract owned by the operator, not a local naming choice.
 *
 * Source: opendatahub-operator api/services/v1alpha1/auth_types.go
 */
describe('AUTH_SINGLETON_NAME', () => {
  it('should match the value the Auth CRD admits', () => {
    expect(AUTH_SINGLETON_NAME).toBe('auth');
  });
});
