/* eslint-disable camelcase */
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';

type MockResourceConfigType = {
  name?: string;
  id?: string;
};

export const mockPipelineKF = ({
  name = 'test-pipeline',
  id = 'test-pipeline',
}: MockResourceConfigType): PipelineKF => ({
  pipeline_id: id,
  created_at: '2023-11-23T17:16:37Z',
  display_name: name,
  description:
    '[source code](https://github.com/opendatahub-io/data-science-pipelines/tree/master/samples/flip-coin) A conditional pipeline to flip coins based on a random number generator.',
});
