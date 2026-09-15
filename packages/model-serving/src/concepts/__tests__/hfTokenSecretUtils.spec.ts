import type { SecretKind } from '@odh-dashboard/k8s-core';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { HF_TOKEN_ENV_NAME } from '../../shared/hfTokenConstants';
import {
  getHfTokenSecretNameFromDeployment,
  patchHfTokenSecretOwnerReference,
} from '../hfTokenSecretUtils';

const makeSecret = (name: string): SecretKind =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name, namespace: 'test-project' },
    data: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const makeOps = (): jest.Mocked<SecretOps> =>
  ({
    createSecret: jest.fn(),
    getSecret: jest.fn((_project: string, name: string) => Promise.resolve(makeSecret(name))),
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

  it('should extract HF token secret name when env uses matching secretKeyRef key', () => {
    const deployment = mockInferenceServiceK8sResource({
      env: [
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'hf-secret',
              key: HF_TOKEN_ENV_NAME,
            },
          },
        },
      ],
    });

    expect(getHfTokenSecretNameFromDeployment(deployment)).toBe('hf-secret');
  });

  it('should ignore HF_TOKEN env vars with mismatched secretKeyRef key', () => {
    const deployment = mockInferenceServiceK8sResource({
      env: [
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'hf-secret',
              key: 'token',
            },
          },
        },
      ],
    });

    expect(getHfTokenSecretNameFromDeployment(deployment)).toBeUndefined();
  });

  it('should patch HF token secret owner reference after deploy', async () => {
    const deployment = mockInferenceServiceK8sResource({
      env: [
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'hf-secret',
              key: HF_TOKEN_ENV_NAME,
            },
          },
        },
      ],
    });
    deployment.metadata.uid = 'deployment-uid';

    await patchHfTokenSecretOwnerReference(ops, deployment, 'deployment-uid');

    expect(ops.getSecret).toHaveBeenCalledWith('test-project', 'hf-secret');
    expect(ops.patchSecretWithOwnerReference).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { name: 'hf-secret', namespace: 'test-project' },
      }),
      deployment,
      'deployment-uid',
    );
  });

  it('should skip owner reference patch when deployment has no HF token env', async () => {
    const deployment = mockInferenceServiceK8sResource({});

    await patchHfTokenSecretOwnerReference(ops, deployment, 'deployment-uid');

    expect(ops.getSecret).not.toHaveBeenCalled();
    expect(ops.patchSecretWithOwnerReference).not.toHaveBeenCalled();
  });
});
