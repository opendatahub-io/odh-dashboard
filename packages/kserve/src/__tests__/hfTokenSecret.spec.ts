import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { HF_TOKEN_ENV_NAME } from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { applyHfTokenEnvVar, extractHuggingFaceApiKeyFromEnv } from '../hfTokenSecret';

describe('hfTokenSecret', () => {
  it('should apply HF_TOKEN secretKeyRef env var', () => {
    const inferenceService = mockInferenceServiceK8sResource({});
    const result = applyHfTokenEnvVar(inferenceService, 'hf-secret');

    expect(result.spec.predictor.model?.env).toEqual([
      {
        name: HF_TOKEN_ENV_NAME,
        valueFrom: {
          secretKeyRef: {
            name: 'hf-secret',
            key: HF_TOKEN_ENV_NAME,
          },
        },
      },
    ]);
  });

  it('should replace an existing HF_TOKEN env var', () => {
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

    const result = applyHfTokenEnvVar(inferenceService, 'new-secret');

    expect(result.spec.predictor.model?.env).toEqual([
      { name: 'OTHER', value: 'value' },
      {
        name: HF_TOKEN_ENV_NAME,
        valueFrom: {
          secretKeyRef: {
            name: 'new-secret',
            key: HF_TOKEN_ENV_NAME,
          },
        },
      },
    ]);
  });

  it('should extract configured HF token reference from deployment env', () => {
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

    expect(extractHuggingFaceApiKeyFromEnv(deployment)).toEqual({
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

    expect(extractHuggingFaceApiKeyFromEnv(deployment)).toBeNull();
  });
});
