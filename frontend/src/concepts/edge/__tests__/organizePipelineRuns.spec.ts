import { mockEdgePipelineRun } from '~/__mocks__/mockEdgePipelineRun';
import { organizePipelineRuns } from '~/concepts/edge/utils';

describe('organizePipelineRuns', () => {
  it('should have latest details for each model', () => {
    const modelA = Array.from({ length: 100 }, (_, i) =>
      mockEdgePipelineRun({
        name: `test-run-a-${i}`,
        modelName: 'model-a',
        version: Math.floor(i / 10).toString(),
        creationTimestamp: new Date(2020, 0, 1 + i).toISOString(),
      }),
    );
    const modelB = Array.from({ length: 100 }, (_, i) =>
      mockEdgePipelineRun({
        name: `test-run-b-${i}`,
        modelName: 'model-b',
        version: Math.floor(i / 10).toString(),
        creationTimestamp: new Date(2020, 0, 1 + i).toISOString(),
      }),
    );

    const models = organizePipelineRuns([...modelA, ...modelB]);

    expect(models['model-a']).not.toBeUndefined();
    expect(models['model-a'].params.modelName).toBe('model-a');
    expect(models['model-a'].params.modelVersion).toBe('9');
    expect(models['model-a'].versions['9']).not.toBeUndefined();
    expect(models['model-b']).not.toBeUndefined();
    expect(models['model-b'].params.modelName).toBe('model-b');
    expect(models['model-b'].params.modelVersion).toBe('9');
    expect(models['model-b'].versions['9']).not.toBeUndefined();
  });
});
