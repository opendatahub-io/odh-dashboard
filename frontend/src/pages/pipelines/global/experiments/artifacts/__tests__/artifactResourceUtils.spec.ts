/* eslint-disable camelcase */
import { PipelinesFilterOp } from '#~/concepts/pipelines/kfTypes';
import { getArtifactsFilter } from '#~/pages/pipelines/global/experiments/artifacts/artifactResourceUtils';

describe('getArtifactsFilter', () => {
  it('should use KFP predicates for name, string ID, and artifact type', () => {
    expect(getArtifactsFilter({ name: "model's", id: 'uuid-1', type: '2' })).toEqual(
      JSON.stringify({
        predicates: [
          { key: 'name', operation: PipelinesFilterOp.IS_SUBSTRING, string_value: "model's" },
          { key: 'artifact_id', operation: PipelinesFilterOp.EQUALS, string_value: 'uuid-1' },
          { key: 'type', operation: PipelinesFilterOp.EQUALS, int_value: 2 },
        ],
      }),
    );
  });

  it('should omit the filter when there are no active selections', () => {
    expect(getArtifactsFilter({ name: '', id: '', type: undefined })).toBeUndefined();
  });
});
