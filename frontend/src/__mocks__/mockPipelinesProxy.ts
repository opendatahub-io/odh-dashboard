/* eslint-disable camelcase */
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';

export const mockPipelinesProxy: { pipelines: PipelineKF[]; total_size: number } = {
  pipelines: [
    {
      pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef0921-0',
      display_name: 'v2 pipeline 0 ',
      created_at: '2024-01-31T20:47:58Z',
    },
    {
      pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef0921-1',
      display_name: 'v2 pipeline 1',
      created_at: '2024-01-31T20:47:58Z',
    },
    {
      pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef0921-2',
      display_name: 'v2 pipeline 2',
      created_at: '2024-01-31T20:47:58Z',
    },
    {
      pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef0921-3',
      display_name: 'v2 pipeline 3',
      created_at: '2024-01-31T20:47:58Z',
    },
    {
      pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef092-4',
      display_name: 'v2 pipeline 4',
      created_at: '2024-01-31T20:47:58Z',
    },
  ],
  total_size: 5,
};

export const buildMockPipeline = (pipeline?: Partial<PipelineKF>): PipelineKF => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const display_name = pipeline?.display_name || 'Test pipeline';
  const name = pipeline?.name;
  const pipeline_id = display_name.replace(/ /g, '-').toLowerCase();

  return {
    pipeline_id,
    display_name,
    name,
    created_at: '2023-11-30T22:55:17Z',
    description: 'some pipeline description',
    ...pipeline,
  };
};

export const buildMockPipelines = (
  pipelines: PipelineKF[] = mockPipelinesProxy.pipelines,
  totalSize?: number,
  nextPageToken?: string,
): {
  total_size?: number | undefined;
  next_page_token?: string | undefined;
  pipelines: PipelineKF[];
} => ({
  pipelines,
  total_size: totalSize || pipelines.length,
  next_page_token: nextPageToken,
});
