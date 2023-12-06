import { mockEdgePipelineRun } from '~/__mocks__/mockEdgePipelineRun';
import { getEdgeModelRunContainerImage } from '~/concepts/edge/utils';

describe('getEdgeModelRunContainerImage', () => {
  it('should return the container image value when it exists in the results', () => {
    const run = mockEdgePipelineRun({
      containerImageUrl: 'image1',
    });
    const result = getEdgeModelRunContainerImage(run);

    expect(result).toEqual('image1');
  });

  it('should return undefined when the container image value does not exist in the results', () => {
    const run = mockEdgePipelineRun({ containerImageUrl: undefined });

    const result = getEdgeModelRunContainerImage(run);

    expect(result).toBeTruthy();
  });
});
