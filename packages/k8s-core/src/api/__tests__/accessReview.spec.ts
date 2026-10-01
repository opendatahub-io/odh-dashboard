import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { checkAccessStrict, verbModelAccess } from '../accessReview';
import { SecretModel } from '../models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({ k8sCreateResource: jest.fn() }));
const create = jest.mocked(k8sCreateResource);

describe('strict access reviews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should build both namespaced and cluster-scoped attributes', () => {
    expect(verbModelAccess('create', SecretModel, 'project-a')).toEqual({
      group: '',
      resource: 'secrets',
      verb: 'create',
      namespace: 'project-a',
    });
    expect(
      verbModelAccess('list', {
        apiGroup: 'example.io',
        apiVersion: 'v1',
        plural: 'configs',
        kind: 'Config',
      }),
    ).toEqual({ group: 'example.io', resource: 'configs', verb: 'list' });
  });

  it('should send every attribute unchanged and forward cancellation', async () => {
    create.mockResolvedValue({ status: { allowed: true } });
    const attrs = {
      group: 'example.io',
      resource: 'configs',
      subresource: 'status' as const,
      name: 'config-a',
      namespace: 'project-a',
      verb: 'patch' as const,
    };
    const { signal } = new AbortController();
    await expect(checkAccessStrict(attrs, { signal })).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: {
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          spec: { resourceAttributes: attrs },
        },
        fetchOptions: { requestInit: { signal } },
      }),
    );
  });

  it.each([{ allowed: false }, { allowed: true, denied: true }])(
    'should fail closed for denial %p',
    async (status) => {
      create.mockResolvedValue({ status });
      await expect(checkAccessStrict({ verb: 'list', resource: 'secrets' })).resolves.toBe(false);
    },
  );

  it.each([{}, { allowed: true, evaluationError: 'RBAC unavailable' }])(
    'should reject incomplete or failed evaluations %p',
    async (status) => {
      create.mockResolvedValue({ status });
      await expect(checkAccessStrict({ verb: 'list' })).rejects.toThrow();
    },
  );

  it('should propagate SSAR transport failures and cancellation', async () => {
    for (const error of [new Error('SSAR failed'), new DOMException('Aborted', 'AbortError')]) {
      create.mockRejectedValueOnce(error);
      await expect(checkAccessStrict({ verb: 'get' })).rejects.toBe(error);
    }
  });
});
