import { mockEdgePipelineRun } from '~/__mocks__/mockEdgePipelineRun';
import { EdgeModelVersion } from '~/concepts/edge/types';
import { isPipelineRunOutputOverridden } from '~/concepts/edge/utils';

describe('isPipelineRunOutputOverridden', () => {
  it('should return false if there is only one run', () => {
    const run = {
      run: mockEdgePipelineRun({
        creationTimestamp: '2022-01-01T00:00:00Z',
        name: 'run1',
        containerImageUrl: 'image1',
      }),
      modelName: 'test-model',
      version: '1',
    };
    const versions: EdgeModelVersion = {
      version: '1',
      modelName: 'test-model',
      latestSuccessfulImageUrl: 'image1',
      runs: [run],
    };

    const result = isPipelineRunOutputOverridden(versions, run);

    expect(result).toBe(false);
  });

  it('should return true if the latest successful run is different from the current run', () => {
    const runA = {
      run: mockEdgePipelineRun({
        creationTimestamp: '2022-01-01T00:00:00Z',
        name: 'runA',
        containerImageUrl: 'image1',
      }),
      modelName: 'test-model',
      version: '1',
    };
    const runB = {
      run: mockEdgePipelineRun({
        creationTimestamp: '2022-01-02T00:00:00Z', // later date
        name: 'runB',
        containerImageUrl: 'image1',
      }),
      modelName: 'test-model',
      version: '1',
    };
    const versions: EdgeModelVersion = {
      version: '1',
      modelName: 'test-model',
      latestSuccessfulImageUrl: 'image1',
      runs: [runA, runB],
    };

    const result = isPipelineRunOutputOverridden(versions, runB);

    expect(result).toBe(true);
  });
});
