import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind, ServiceAccountKind } from '@odh-dashboard/k8s-core';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import { getServiceAccount } from '@odh-dashboard/k8s-core/api/serviceAccounts';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { HF_TOKEN_ENV_NAME } from '../../shared/hfTokenConstants';
import {
  patchHfTokenSecretOwnerReference,
  patchHfTokenServiceAccountOwnerReference,
} from '../hfTokenSecretUtils';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sPatchResource: jest.fn(),
}));

jest.mock('@odh-dashboard/k8s-core/api/serviceAccounts', () => ({
  getServiceAccount: jest.fn(),
}));

const mockGetServiceAccount = jest.mocked(getServiceAccount);
const mockK8sPatchResource = jest.mocked(k8sPatchResource);

const makeSecret = (name: string, labels?: Record<string, string>): SecretKind =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: 'test-project', labels },
    data:
      labels?.['opendatahub.io/dashboard'] === 'true' ? { [HF_TOKEN_ENV_NAME]: 'dG9rZW4=' } : {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const makeServiceAccount = (name: string, labels?: Record<string, string>): ServiceAccountKind => ({
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  metadata: { name, namespace: 'test-project', labels },
  secrets: [{ name: 'hf-secret' }],
});

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

  it('should patch HF ServiceAccount owner reference after deploy', async () => {
    const deployment = mockInferenceServiceK8sResource({ name: 'my-model' });
    deployment.metadata.uid = 'deployment-uid';
    mockGetServiceAccount.mockResolvedValue(
      makeServiceAccount('my-model-hf-sa', { 'opendatahub.io/dashboard': 'true' }),
    );
    mockK8sPatchResource.mockResolvedValue(
      makeServiceAccount('my-model-hf-sa', { 'opendatahub.io/dashboard': 'true' }),
    );

    await patchHfTokenServiceAccountOwnerReference(
      'test-project',
      deployment,
      'my-model-hf-sa',
      'deployment-uid',
    );

    expect(mockGetServiceAccount).toHaveBeenCalledWith('my-model-hf-sa', 'test-project');
    expect(mockK8sPatchResource).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOptions: { name: 'my-model-hf-sa', ns: 'test-project' },
        patches: [
          expect.objectContaining({
            op: 'add',
            path: '/metadata/ownerReferences',
            value: [
              expect.objectContaining({
                uid: 'deployment-uid',
                name: 'my-model',
                kind: 'InferenceService',
              }),
            ],
          }),
        ],
      }),
    );
  });

  it('should skip ServiceAccount owner patch when the SA is not dashboard-managed', async () => {
    const deployment = mockInferenceServiceK8sResource({ name: 'my-model' });
    deployment.metadata.uid = 'deployment-uid';
    mockGetServiceAccount.mockResolvedValue(makeServiceAccount('my-model-hf-sa'));

    await patchHfTokenServiceAccountOwnerReference(
      'test-project',
      deployment,
      'my-model-hf-sa',
      'deployment-uid',
    );

    expect(mockK8sPatchResource).not.toHaveBeenCalled();
  });
});
