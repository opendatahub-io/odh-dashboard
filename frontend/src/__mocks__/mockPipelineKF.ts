/* eslint-disable camelcase */
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

type MockResourceConfigType = {
  name?: string;
  id?: string;
};

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
