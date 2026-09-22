import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import {
  HF_TOKEN_ENV_NAME,
  HF_TOKEN_SECRET_ANNOTATION,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { applyHfTokenServiceAccount, extractHuggingFaceApiKey } from '../hfTokenSecret';

describe('hfTokenSecret', () => {
  it('should apply serviceAccountName and secret annotation (Option 1)', () => {
    const inferenceService = mockInferenceServiceK8sResource({});
    const result = applyHfTokenServiceAccount(inferenceService, 'hf-secret', 'test-model-hf-sa');

    expect(result.spec.predictor.serviceAccountName).toBe('test-model-hf-sa');
    expect(result.metadata.annotations?.[HF_TOKEN_SECRET_ANNOTATION]).toBe('hf-secret');
    expect(result.spec.predictor.model?.env?.find((env) => env.name === HF_TOKEN_ENV_NAME)).toBe(
      undefined,
    );
  });

  it('should strip a legacy HF_TOKEN env var when applying the ServiceAccount', () => {
    const inferenceService = mockInferenceServiceK8sResource({
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
    });

    const result = applyHfTokenServiceAccount(inferenceService, 'new-secret', 'test-model-hf-sa');

    expect(result.spec.predictor.serviceAccountName).toBe('test-model-hf-sa');
    expect(result.spec.predictor.model?.env).toEqual([{ name: 'OTHER', value: 'value' }]);
  });

  it('should extract configured HF token from the secret annotation', () => {
    const deployment = mockInferenceServiceK8sResource({});
    deployment.metadata.annotations = {
      ...deployment.metadata.annotations,
      [HF_TOKEN_SECRET_ANNOTATION]: 'hf-secret',
    };
    deployment.spec.predictor.serviceAccountName = 'test-model-hf-sa';

    expect(extractHuggingFaceApiKey(deployment)).toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
  });

  it('should fall back to legacy env extract when annotation is missing', () => {
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

    expect(extractHuggingFaceApiKey(deployment)).toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
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

    expect(extractHuggingFaceApiKey(deployment)).toBeNull();
  });
});
