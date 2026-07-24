import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { checkAccess } from '#~/api/checkAccess';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
}));

const k8sCreateResourceMock = jest.mocked(k8sCreateResource);

describe('checkAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when access is allowed', async () => {
    k8sCreateResourceMock.mockResolvedValue({
      status: { allowed: true },
    });

    const result = await checkAccess({
      group: 'apps',
      resource: 'deployments',
      subresource: '',
      verb: 'create',
      name: '',
      namespace: 'test-ns',
    });

    expect(result).toBe(true);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: 'test-ns',
            }),
          }),
        }),
      }),
    );
  });

  it('should return false when access is denied', async () => {
    k8sCreateResourceMock.mockResolvedValue({
      status: { allowed: false },
    });

    const result = await checkAccess({
      group: 'apps',
      resource: 'deployments',
      subresource: '',
      verb: 'create',
      name: '',
      namespace: 'test-ns',
    });

    expect(result).toBe(false);
  });

  it('should default to true when status.allowed is undefined', async () => {
    k8sCreateResourceMock.mockResolvedValue({
      status: {},
    });

    const result = await checkAccess({
      group: 'apps',
      resource: 'deployments',
      subresource: '',
      verb: 'get',
      name: '',
      namespace: 'test-ns',
    });

    expect(result).toBe(true);
  });

  it('should use name as namespace for Project resources', async () => {
    k8sCreateResourceMock.mockResolvedValue({
      status: { allowed: true },
    });

    await checkAccess({
      group: 'project.openshift.io',
      resource: 'projects',
      subresource: '',
      verb: 'get',
      name: 'my-project',
      namespace: 'should-be-ignored',
    });

    expect(k8sCreateResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: 'my-project',
            }),
          }),
        }),
      }),
    );
  });

  it('should use provided namespace for non-Project resources', async () => {
    k8sCreateResourceMock.mockResolvedValue({
      status: { allowed: true },
    });

    await checkAccess({
      group: 'apps',
      resource: 'deployments',
      subresource: '',
      verb: 'list',
      name: 'my-deploy',
      namespace: 'target-ns',
    });

    expect(k8sCreateResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          spec: expect.objectContaining({
            resourceAttributes: expect.objectContaining({
              namespace: 'target-ns',
            }),
          }),
        }),
      }),
    );
  });

  it('should return true and log warning on API failure', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    k8sCreateResourceMock.mockRejectedValue(new Error('network error'));

    const result = await checkAccess({
      group: 'apps',
      resource: 'deployments',
      subresource: '',
      verb: 'create',
      name: '',
      namespace: 'test-ns',
    });

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('SelfSubjectAccessReview failed', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
