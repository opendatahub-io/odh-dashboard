import { HF_TOKEN_ENV_NAME } from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { mockLLMInferenceServiceK8sResource } from '../__mocks__/mockLLMInferenceServiceK8sResource';
import { applyHfTokenEnvVar, extractHuggingFaceApiKeyFromEnv } from '../hfTokenSecret';

describe('llmd hfTokenSecret', () => {
  it('should apply HF_TOKEN secretKeyRef on the main container env', () => {
    const deployment = mockLLMInferenceServiceK8sResource({});

    const result = applyHfTokenEnvVar(deployment, 'hf-secret');

    expect(result.spec.template?.containers?.[0]?.env).toEqual(
      expect.arrayContaining([
        {
          name: HF_TOKEN_ENV_NAME,
          valueFrom: {
            secretKeyRef: {
              name: 'hf-secret',
              key: HF_TOKEN_ENV_NAME,
            },
          },
        },
      ]),
    );
  });

  it('should replace an existing HF_TOKEN env var', () => {
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
          ],
        },
      ],
    };

    const result = applyHfTokenEnvVar(deployment, 'new-secret');
    const hfEnv = result.spec.template?.containers?.[0]?.env?.find(
      (envVar) => envVar.name === HF_TOKEN_ENV_NAME,
    );

    expect(hfEnv?.valueFrom?.secretKeyRef).toEqual({
      name: 'new-secret',
      key: HF_TOKEN_ENV_NAME,
    });
  });

  it('should extract configured HF token secret name from main container env', () => {
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

    expect(extractHuggingFaceApiKeyFromEnv(deployment)).toEqual({
      token: '',
      configuredSecretName: 'hf-secret',
    });
  });

  it('should ignore HF_TOKEN env vars with mismatched secretKeyRef key', () => {
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
                  key: 'token',
                },
              },
            },
          ],
        },
      ],
    };

    expect(extractHuggingFaceApiKeyFromEnv(deployment)).toBeNull();
  });
});
