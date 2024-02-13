/* eslint-disable camelcase */
import {
  PipelineKF,
  PipelineKFv2,
  RelationshipKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';

type MockResourceConfigType = {
  name?: string;
  id?: string;
};

/**
 * @deprecated use buildMockPipelineV2 instead
 */
export const mockPipelineKF = ({
  name = 'test-pipeline',
  id = 'test-pipeline',
}: MockResourceConfigType): PipelineKF => ({
  id,
  created_at: '2023-11-23T17:16:37Z',
  name,
  description:
    '[source code](https://github.com/opendatahub-io/data-science-pipelines/tree/master/samples/flip-coin) A conditional pipeline to flip coins based on a random number generator.',
  default_version: {
    id,
    name,
    created_at: '2023-11-23T17:16:37Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: name,
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
});

export const mockPipelineKFv2 = ({
  name = 'test-pipeline',
  id = 'test-pipeline',
}: MockResourceConfigType): PipelineKFv2 => ({
  pipeline_id: id,
  created_at: '2023-11-23T17:16:37Z',
  display_name: name,
  description:
    '[source code](https://github.com/opendatahub-io/data-science-pipelines/tree/master/samples/flip-coin) A conditional pipeline to flip coins based on a random number generator.',
});
