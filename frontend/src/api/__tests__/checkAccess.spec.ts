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
    );
  });
});
