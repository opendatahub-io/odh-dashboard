import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { checkAccess } from '../accessReview';
import { SelfSubjectAccessReviewModel } from '../models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
}));

const k8sCreateResourceMock = jest.mocked(k8sCreateResource);

describe('checkAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a SelfSubjectAccessReview with the requested attributes', async () => {
    k8sCreateResourceMock.mockResolvedValue({ status: { allowed: true } });
    const attributes = {
      group: 'monitoring.coreos.com',
      resource: 'prometheuses',
      subresource: 'api',
      verb: 'get',
      namespace: 'openshift-monitoring',
      name: 'k8s',
    } as const;

    await expect(checkAccess(attributes)).resolves.toBe(true);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: SelfSubjectAccessReviewModel,
        resource: {
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          spec: { resourceAttributes: attributes },
        },
      }),
    );
  });

  it.each([{}, { status: {} }])(
    'should preserve the allow fallback for an inconclusive review: %j',
    async (response) => {
      k8sCreateResourceMock.mockResolvedValue(response);

      await expect(checkAccess({ verb: 'get' })).resolves.toBe(true);
    },
  );

  it.each([{}, { status: {} }])(
    'should deny an inconclusive review when opted in: %j',
    async (response) => {
      k8sCreateResourceMock.mockResolvedValue(response);

      await expect(checkAccess({ verb: 'get' }, { failureMode: 'reject' })).resolves.toBe(false);
    },
  );

  it.each([undefined, 'allow', 'reject'] as const)(
    'should preserve an explicit denial with failure mode %s',
    async (failureMode) => {
      k8sCreateResourceMock.mockResolvedValue({ status: { allowed: false } });

      await expect(checkAccess({ verb: 'get' }, { failureMode })).resolves.toBe(false);
    },
  );

  it('should preserve the allow fallback and warn when the access review fails', async () => {
    const error = new Error('network unavailable');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    k8sCreateResourceMock.mockRejectedValue(error);

    await expect(checkAccess({ verb: 'get' })).resolves.toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('SelfSubjectAccessReview failed', error);
    consoleSpy.mockRestore();
  });

  it('should reject and warn when the access review fails and rejection is opted in', async () => {
    const error = new Error('network unavailable');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    k8sCreateResourceMock.mockRejectedValue(error);

    await expect(checkAccess({ verb: 'get' }, { failureMode: 'reject' })).rejects.toBe(error);
    expect(consoleSpy).toHaveBeenCalledWith('SelfSubjectAccessReview failed', error);
    consoleSpy.mockRestore();
  });
});
