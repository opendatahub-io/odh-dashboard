import { checkAccess as checkResourceAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { checkAccess } from '#~/api/checkAccess';

jest.mock('@odh-dashboard/k8s-core/api/accessReview', () => ({
  checkAccess: jest.fn(),
}));

const checkResourceAccessMock = jest.mocked(checkResourceAccess);

describe('checkAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use the project name as the access review namespace', async () => {
    checkResourceAccessMock.mockResolvedValue(true);

    await checkAccess({
      group: 'project.openshift.io',
      resource: 'projects',
      subresource: '',
      verb: 'get',
      name: 'my-project',
      namespace: 'ignored-namespace',
    });

    expect(checkResourceAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'my-project' }),
      expect.any(Object),
    );
  });

  it('should log access review failures', async () => {
    checkResourceAccessMock.mockResolvedValue(true);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const error = new Error('network error');

    await checkAccess({
      group: 'apps',
      resource: 'deployments',
      subresource: '',
      verb: 'get',
      name: '',
      namespace: 'test-ns',
    });

    const options = checkResourceAccessMock.mock.calls[0][1];
    options?.onError?.(error);

    expect(consoleSpy).toHaveBeenCalledWith('SelfSubjectAccessReview failed', error);
    consoleSpy.mockRestore();
  });
});
