import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { EnvironmentVariableType } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { applyEnvironmentVariables, applyRuntimeArgs } from '../deployUtils';
import { extractEnvironmentVariables } from '../hardware';
import type { KServeDeployment } from '../types';

describe('applyEnvironmentVariables', () => {
  const baseInferenceService = {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: { name: 'test', namespace: 'test' },
    spec: {
      predictor: {
        model: {
          modelFormat: { name: 'vLLM' },
        },
      },
    },
  } as InferenceServiceKind;

  it('should apply value-type environment variables', () => {
    const result = applyEnvironmentVariables(baseInferenceService, {
      enabled: true,
      variables: [{ type: EnvironmentVariableType.Value, name: 'MY_VAR', value: 'hello' }],
    });

    expect(result.spec.predictor.model?.env).toEqual([{ name: 'MY_VAR', value: 'hello' }]);
  });

  it('should apply secret-type environment variables', () => {
    const result = applyEnvironmentVariables(baseInferenceService, {
      enabled: true,
      variables: [
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: 'hf-secret',
          secretKey: 'HF_TOKEN',
        },
      ],
    });

    expect(result.spec.predictor.model?.env).toEqual([
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

  it('should delete env when environment variables are disabled', () => {
    const withEnv = {
      ...baseInferenceService,
      spec: {
        predictor: {
          model: {
            modelFormat: { name: 'vLLM' },
            env: [{ name: 'OLD', value: 'val' }],
          },
        },
      },
    } as InferenceServiceKind;

    const result = applyEnvironmentVariables(withEnv, { enabled: false, variables: [] });
    expect(result.spec.predictor.model?.env).toBeUndefined();
  });
});

describe('extractEnvironmentVariables', () => {
  it('should extract value and secret environment variables', () => {
    const deployment = {
      model: {
        spec: {
          predictor: {
            model: {
              env: [
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
              ],
            },
          },
        },
      },
    } as KServeDeployment;

    expect(extractEnvironmentVariables(deployment)).toEqual({
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
  });
});

describe('applyRuntimeArgs', () => {
  const baseInferenceService = {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: { name: 'test', namespace: 'test' },
    spec: {
      predictor: {
        model: {
          modelFormat: { name: 'vLLM' },
        },
      },
    },
  } as InferenceServiceKind;

  it('should apply runtime args and strip comment headers', () => {
    const result = applyRuntimeArgs(baseInferenceService, {
      enabled: true,
      args: [
        '# Validated arguments for Tool calling',
        '--enable-auto-tool-choice',
        '--tool-call-parser hermes',
      ],
    });

    expect(result.spec.predictor.model?.args).toEqual([
      '--enable-auto-tool-choice',
      '--tool-call-parser hermes',
    ]);
  });

  it('should delete args when only comment lines remain', () => {
    const result = applyRuntimeArgs(baseInferenceService, {
      enabled: true,
      args: ['# Validated arguments for Tool calling', ''],
    });

    expect(result.spec.predictor.model?.args).toBeUndefined();
  });

  it('should delete args when runtime args are disabled', () => {
    const withArgs = {
      ...baseInferenceService,
      spec: {
        predictor: {
          model: {
            modelFormat: { name: 'vLLM' },
            args: ['--existing'],
          },
        },
      },
    } as InferenceServiceKind;

    const result = applyRuntimeArgs(withArgs, { enabled: false, args: ['--existing'] });
    expect(result.spec.predictor.model?.args).toBeUndefined();
  });
});
