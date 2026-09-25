import { EnvironmentVariableType } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import type { LLMdDeployment } from '../../types';
import { applyModelEnvVarsAndArgs, extractEnvironmentVariables } from '../model';

const getMainContainerEnv = (svc: ReturnType<typeof mockLLMInferenceServiceK8sResource>) =>
  svc.spec.template?.containers?.find((container) => container.name === 'main')?.env;

describe('applyModelEnvVarsAndArgs', () => {
  it('should apply value and secretKeyRef environment variables', () => {
    const svc = mockLLMInferenceServiceK8sResource({});

    const result = applyModelEnvVarsAndArgs(svc, {
      enabled: true,
      variables: [
        { type: EnvironmentVariableType.Value, name: 'MY_VAR', value: 'hello' },
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: 'hf-secret',
          secretKey: 'HF_TOKEN',
        },
      ],
    });

    expect(getMainContainerEnv(result)).toEqual([
      { name: 'MY_VAR', value: 'hello' },
      {
        name: 'HF_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'hf-secret',
            key: 'HF_TOKEN',
          },
        },
      },
    ]);
  });

  it('should remove env when environment variables are disabled', () => {
    const svc = mockLLMInferenceServiceK8sResource({});
    svc.spec.template = {
      containers: [
        {
          name: 'main',
          image: 'test-image',
          env: [{ name: 'MY_VAR', value: 'hello' }],
        },
      ],
    };

    const result = applyModelEnvVarsAndArgs(svc, { enabled: false, variables: [] });

    expect(getMainContainerEnv(result)).toBeUndefined();
  });
});

describe('extractEnvironmentVariables', () => {
  it('should extract value and secretKeyRef environment variables', () => {
    const model = mockLLMInferenceServiceK8sResource({});
    model.spec.template = {
      containers: [
        {
          name: 'main',
          image: 'test-image',
          env: [
            { name: 'MY_VAR', value: 'hello' },
            {
              name: 'API_KEY',
              valueFrom: {
                secretKeyRef: {
                  name: 'api-secret',
                  key: 'API_KEY',
                },
              },
            },
            {
              name: 'HF_TOKEN',
              valueFrom: {
                secretKeyRef: {
                  name: 'hf-secret',
                  key: 'HF_TOKEN',
                },
              },
            },
          ],
        },
      ],
    };

    const deployment = { model } as LLMdDeployment;

    expect(extractEnvironmentVariables(deployment)).toEqual({
      enabled: true,
      variables: [
        { type: EnvironmentVariableType.Value, name: 'MY_VAR', value: 'hello' },
        {
          type: EnvironmentVariableType.Secret,
          name: 'API_KEY',
          secretName: 'api-secret',
          secretKey: 'API_KEY',
        },
      ],
    });
  });
});
