import type { V1ResourceAttributes, V1SelfSubjectAccessReview } from '@kubernetes/client-node';
import type { AuthKind, KubeFastifyInstance, OauthFastifyRequest } from '../../types';
import { AUTH_SINGLETON_NAME } from '../constants';
import { createSelfSubjectAccessReview } from '../authUtils';
import { getAuth } from '../resourceUtils';
import { ResourceWatcher } from '../resourceWatcher';
import { isUserAdmin, isUserAllowed } from '../adminUtils';

jest.mock('../authUtils');
jest.mock('../resourceUtils');

const mockCreateSSAR = jest.mocked(createSelfSubjectAccessReview);
const mockGetAuth = jest.mocked(getAuth);

const fastify = {} as KubeFastifyInstance;
const request = {} as OauthFastifyRequest;

const authWith = (allowedGroups: string[]): AuthKind =>
  ({ spec: { adminGroups: ['odh-admins'], allowedGroups } } as AuthKind);

const ssarResult = (allowed: boolean): V1SelfSubjectAccessReview => ({
  apiVersion: 'authorization.k8s.io/v1',
  kind: 'SelfSubjectAccessReview',
  spec: {},
  status: { allowed },
});

const lastResourceAttributes = (): V1ResourceAttributes =>
  mockCreateSSAR.mock.calls[0][2] as V1ResourceAttributes;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateSSAR.mockResolvedValue(ssarResult(true));
  // No escape hatch, so isUserAllowed is forced down the SSAR path.
  mockGetAuth.mockReturnValue(authWith(['some-group']));
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

    const [adminCall, allowedCall] = mockCreateSSAR.mock.calls;
    expect((adminCall[2] as V1ResourceAttributes).name).toBe(
      (allowedCall[2] as V1ResourceAttributes).name,
    );
  });

  it('should skip the SSAR when system:authenticated is in allowedGroups', async () => {
    mockGetAuth.mockReturnValue(authWith(['system:authenticated']));

    await expect(isUserAllowed(fastify, request)).resolves.toBe(true);
    expect(mockCreateSSAR).not.toHaveBeenCalled();
  });

  it('should deny admin when the SSAR is not allowed', async () => {
    mockCreateSSAR.mockResolvedValue(ssarResult(false));

    await expect(isUserAdmin(fastify, request)).resolves.toBe(false);
  });

  it('should deny allowed when the SSAR is not allowed', async () => {
    mockCreateSSAR.mockResolvedValue(ssarResult(false));

    await expect(isUserAllowed(fastify, request)).resolves.toBe(false);
  });

  it('should fail closed when the SSAR rejects', async () => {
    mockCreateSSAR.mockRejectedValue(new Error('api server unreachable'));

    await expect(isUserAdmin(fastify, request)).resolves.toBe(false);
    await expect(isUserAllowed(fastify, request)).resolves.toBe(false);
  });
});

/**
 * The other half of the invariant: the SSAR above is only correct if the CR read uses the
 * same name. Asserting one side alone would still permit the two to drift apart, which is
 * precisely the bug this guards against.
 */
describe('resourceUtils reads the Auth CR by the same name', () => {
  it('should GET the singleton named AUTH_SINGLETON_NAME', async () => {
    const getClusterCustomObject = jest
      .fn()
      .mockResolvedValue({ body: { spec: { adminGroups: [], allowedGroups: [] } } });

    const authFastify = {
      kube: { customObjectsApi: { getClusterCustomObject } },
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    } as unknown as KubeFastifyInstance;

    // fetchAuthKind is private; it reaches the API as a ResourceWatcher getter. Stubbing
    // the watcher captures every registered getter without starting any watch timers, so
    // the genuine fetchAuthKind can then be invoked directly.
    const getters: ((fastify: KubeFastifyInstance) => Promise<unknown>)[] = [];
    const watcherSpy = jest
      .spyOn(ResourceWatcher.prototype, 'startWatching')
      .mockImplementation(function captureGetter(this: { getter: never }) {
        getters.push(this.getter);
      });

    try {
      const { initializeWatchedResources } =
        jest.requireActual<typeof import('../resourceUtils')>('../resourceUtils');
      initializeWatchedResources(authFastify);

      await Promise.allSettled(getters.map((getter) => getter(authFastify)));
    } finally {
      watcherSpy.mockRestore();
    }

    const authCall = getClusterCustomObject.mock.calls.find((call) => call[2] === 'auths');
    expect(authCall).toBeDefined();
    expect(authCall?.[3]).toBe(AUTH_SINGLETON_NAME);
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
