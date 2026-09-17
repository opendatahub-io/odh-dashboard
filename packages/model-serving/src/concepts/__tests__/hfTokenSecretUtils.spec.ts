import type { SecretKind } from '@odh-dashboard/k8s-core';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { patchHfTokenSecretOwnerReference } from '../hfTokenSecretUtils';

const makeSecret = (name: string, labels?: Record<string, string>): SecretKind =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: 'test-project', labels },
    data: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const makeOps = (): jest.Mocked<SecretOps> =>
  ({
    createSecret: jest.fn(),
    getSecret: jest.fn((_project: string, name: string) =>
      Promise.resolve(makeSecret(name, { 'opendatahub.io/dashboard': 'true' })),
    ),
    deleteSecret: jest.fn(() => Promise.resolve()),
    patchSecretWithOwnerReference: jest.fn(() => Promise.resolve()),
    patchSecretWithProtocolAnnotation: jest.fn(() => Promise.resolve()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

describe('hfTokenSecretUtils', () => {
  let ops: jest.Mocked<SecretOps>;

  beforeEach(() => {
    jest.clearAllMocks();
    ops = makeOps();
  });

  it('should patch HF token secret owner reference after deploy', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.uid = 'deployment-uid';

    await patchHfTokenSecretOwnerReference(
      ops,
      'test-project',
      deployment,
      'hf-secret',
      'deployment-uid',
    );

    expect(ops.getSecret).toHaveBeenCalledWith('test-project', 'hf-secret');
    expect(ops.patchSecretWithOwnerReference).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'hf-secret',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
        }),
      }),
      deployment,
      'deployment-uid',
    );
  });

  it('should skip owner reference patch for secrets not managed by the dashboard', async () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.uid = 'deployment-uid';
    ops.getSecret.mockResolvedValue(makeSecret('shared-secret'));

    await patchHfTokenSecretOwnerReference(
      ops,
      'test-project',
      deployment,
      'shared-secret',
      'deployment-uid',
    );

    expect(ops.patchSecretWithOwnerReference).not.toHaveBeenCalled();
  });

  it('should skip owner reference patch when secret name is missing', async () => {
    const deployment = mockInferenceServiceK8sResource({});

    await patchHfTokenSecretOwnerReference(
      ops,
      'test-project',
      deployment,
      undefined,
      'deployment-uid',
    );

    expect(ops.getSecret).not.toHaveBeenCalled();
    expect(ops.patchSecretWithOwnerReference).not.toHaveBeenCalled();
  });
});
