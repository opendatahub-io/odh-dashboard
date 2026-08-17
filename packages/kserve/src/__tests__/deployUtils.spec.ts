import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { applyRuntimeArgs } from '../deployUtils';

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
