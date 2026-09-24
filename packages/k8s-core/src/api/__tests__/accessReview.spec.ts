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

  it('should use the configured default when the review is inconclusive', async () => {
    k8sCreateResourceMock.mockResolvedValue({});

    await expect(checkAccess({ verb: 'get' })).resolves.toBe(true);
    await expect(checkAccess({ verb: 'get' }, { defaultAllowed: false })).resolves.toBe(false);
  });

  it('should use the configured default and report failures', async () => {
    const error = new Error('network unavailable');
    const onError = jest.fn();
    k8sCreateResourceMock.mockRejectedValue(error);

    await expect(checkAccess({ verb: 'get' }, { defaultAllowed: false, onError })).resolves.toBe(
      false,
    );
    expect(onError).toHaveBeenCalledWith(error);
  });
});
