import { PipelineKF, RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';

/* eslint-disable camelcase */
export const mockPipelinesProxy: { pipelines: PipelineKF[]; total_size: number } = {
  pipelines: [
    {
      id: '9b6f1770-7a8a-47c3-bf55-328f7bfa98e1',
      created_at: '2023-12-05T13:56:16Z',
      name: 'no version pipeline',
    },
    {
      id: 'f7d735ef-d47f-4d05-93b9-8a26eb6d4563',
      created_at: '2023-11-30T22:55:17Z',
      name: 'flip coin 2',
      description: 'this is copy flip coin',
      default_version: {
        id: 'f7d735ef-d47f-4d05-93b9-8a26eb6d4563',
        name: 'flip coin 2',
        created_at: '2023-11-30T22:55:17Z',
        resource_references: [
          {
            key: {
              type: ResourceTypeKF.PIPELINE,
              id: 'f7d735ef-d47f-4d05-93b9-8a26eb6d4563',
            },
            relationship: RelationshipKF.OWNER,
          },
        ],
      },
    },
    {
      id: 'dd1b49de-9d27-4431-be6f-6432b741c6d0',
      created_at: '2023-10-03T19:14:50Z',
      name: 'dedup-ray-pipeline',
      parameters: [
        {
          name: 'content',
          value: 'contents',
        },
        {
          name: 'hash_cpu',
          value: '.5',
        },
        {
          name: 'image',
          value: 'quay.io/ibmdpdev/dedup-exact-ray:2.5.1-py310',
        },
        {
          name: 'input_path',
          value: 'cos-optimal-llm-pile/blue-pile/0_internet/2_commoncrawl/ete=v0.2',
        },
        {
          name: 'max_files',
          value: '100',
        },
        {
          name: 'n_sample',
          value: '5',
        },
        {
          name: 'name',
          value: 'kfp-ray-dedup',
        },
        {
          name: 'num_workers',
          value: '8',
        },
        {
          name: 'output_path',
          value: 'cos-optimal-llm-pile/boris_test/',
        },
        {
          name: 'print_tmout',
          value: '1',
        },
        {
          name: 'processor_cpu',
          value: '.75',
        },
        {
          name: 'template_cm',
          value: 'ray-dedup-template',
        },
        {
          name: 'wait_ready_retries',
          value: '100',
        },
        {
          name: 'wait_ready_tmout',
          value: '1',
        },
        {
          name: 'worker_cpu',
          value: '8',
        },
        {
          name: 'worker_gpu',
          value: '0',
        },
        {
          name: 'worker_memory',
          value: '32',
        },
      ],
      default_version: {
        id: 'dd1b49de-9d27-4431-be6f-6432b741c6d0',
        name: 'dedup-ray-pipeline',
        created_at: '2023-10-03T19:14:50Z',
        parameters: [
          {
            name: 'content',
            value: 'contents',
          },
          {
            name: 'hash_cpu',
            value: '.5',
          },
          {
            name: 'image',
            value: 'quay.io/ibmdpdev/dedup-exact-ray:2.5.1-py310',
          },
          {
            name: 'input_path',
            value: 'cos-optimal-llm-pile/blue-pile/0_internet/2_commoncrawl/ete=v0.2',
          },
          {
            name: 'max_files',
            value: '100',
          },
          {
            name: 'n_sample',
            value: '5',
          },
          {
            name: 'name',
            value: 'kfp-ray-dedup',
          },
          {
            name: 'num_workers',
            value: '8',
          },
          {
            name: 'output_path',
            value: 'cos-optimal-llm-pile/boris_test/',
          },
          {
            name: 'print_tmout',
            value: '1',
          },
          {
            name: 'processor_cpu',
            value: '.75',
          },
          {
            name: 'template_cm',
            value: 'ray-dedup-template',
          },
          {
            name: 'wait_ready_retries',
            value: '100',
          },
          {
            name: 'wait_ready_tmout',
            value: '1',
          },
          {
            name: 'worker_cpu',
            value: '8',
          },
          {
            name: 'worker_gpu',
            value: '0',
          },
          {
            name: 'worker_memory',
            value: '32',
          },
        ],
        resource_references: [
          {
            key: {
              type: ResourceTypeKF.PIPELINE,
              id: 'dd1b49de-9d27-4431-be6f-6432b741c6d0',
            },
            relationship: RelationshipKF.OWNER,
          },
        ],
      },
    },
    {
      id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
      created_at: '2023-10-03T15:37:54Z',
      name: 'filp coin',
      default_version: {
        id: 'bf7c5ee8-031a-4717-804d-828adde2f7d6',
        name: 'filp coin_version_at_2023-12-06T16:09:52.153Z',
        created_at: '2023-12-06T16:10:01Z',
        resource_references: [
          {
            key: {
              type: ResourceTypeKF.PIPELINE,
              id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
            },
            relationship: RelationshipKF.OWNER,
          },
        ],
      },
    },
    {
      id: 'e850325b-bc05-417b-9d47-e99c5926bc3f',
      created_at: '2023-09-18T18:57:05Z',
      name: 'abc',
      default_version: {
        id: 'e850325b-bc05-417b-9d47-e99c5926bc3f',
        name: 'abc',
        created_at: '2023-09-18T18:57:05Z',
        resource_references: [
          {
            key: {
              type: ResourceTypeKF.PIPELINE,
              id: 'e850325b-bc05-417b-9d47-e99c5926bc3f',
            },
            relationship: RelationshipKF.OWNER,
          },
        ],
      },
    },
  ],
  total_size: 5,
};

export const buildMockPipeline = (pipeline?: Partial<PipelineKF>): PipelineKF => {
  const id = pipeline?.name?.replace(/ /g, '-').toLowerCase() || 'test-pipeline-1';

  return {
    id,
    created_at: '2023-11-30T22:55:17Z',
    name: 'Test pipeline',
    description: 'some pipeline description',
    default_version: {
      id: `${id}-version`,
      name: `${pipeline?.name} version`,
      created_at: '2023-11-30T22:55:17Z',
      resource_references: [
        {
          key: {
            id,
            type: ResourceTypeKF.PIPELINE,
          },
          relationship: RelationshipKF.OWNER,
        },
      ],
    },
    ...pipeline,
  };
};

type APIResult = {
  total_size?: number | undefined;
  next_page_token?: string | undefined;
  pipelines: PipelineKF[];
};

export const buildMockPipelines = (
  pipelines: PipelineKF[] = mockPipelinesProxy.pipelines,
  totalSize?: number,
  nextPageToken?: string,
): APIResult => ({
  pipelines,
  total_size: totalSize || pipelines.length,
  next_page_token: nextPageToken,
});
