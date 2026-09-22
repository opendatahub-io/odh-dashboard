import {
  HF_TOKEN_ENV_NAME,
  HF_TOKEN_SECRET_ANNOTATION,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { mockLLMInferenceServiceK8sResource } from '../__mocks__/mockLLMInferenceServiceK8sResource';
import { applyHfTokenServiceAccount, extractHuggingFaceApiKey } from '../hfTokenSecret';

describe('llmd hfTokenSecret', () => {
  it('should apply template.serviceAccountName and secret annotation', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});

    const result = applyHfTokenServiceAccount(deployment, 'hf-secret', 'test-model-hf-sa');

    expect(result.spec.template?.serviceAccountName).toBe('test-model-hf-sa');
    expect(result.metadata.annotations?.[HF_TOKEN_SECRET_ANNOTATION]).toBe('hf-secret');
    expect(
      result.spec.template?.containers
        ?.find((container) => container.name === 'main')
        ?.env?.find((env) => env.name === HF_TOKEN_ENV_NAME),
    ).toBeUndefined();
  });

  it('should strip a legacy HF_TOKEN env var when applying the ServiceAccount', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});
    deployment.spec.template = {
      containers: [
        {
          name: 'main',
          env: [
            {
              name: HF_TOKEN_ENV_NAME,
              valueFrom: {
                secretKeyRef: {
                  name: 'old-secret',
                  key: HF_TOKEN_ENV_NAME,
                },
              },
            },
            { name: 'OTHER', value: 'value' },
          ],
        },
      ],
    };

    const result = applyHfTokenServiceAccount(deployment, 'new-secret', 'test-model-hf-sa');
    const mainEnv = result.spec.template?.containers?.find(
      (container) => container.name === 'main',
    )?.env;

    expect(result.spec.template?.serviceAccountName).toBe('test-model-hf-sa');
    expect(mainEnv).toEqual([{ name: 'OTHER', value: 'value' }]);
  });

  it('should extract configured HF token from the secret annotation', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});
    deployment.metadata.annotations = {
      ...deployment.metadata.annotations,
      [HF_TOKEN_SECRET_ANNOTATION]: 'hf-secret',
    };

    expect(extractHuggingFaceApiKey(deployment)).toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
  });

  it('should fall back to legacy env extract when annotation is missing', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});
    deployment.spec.template = {
      containers: [
        {
          name: 'main',
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
        },
      ],
    };

    expect(extractHuggingFaceApiKey(deployment)).toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
  });
});
