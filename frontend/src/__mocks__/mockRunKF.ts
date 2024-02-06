/* eslint-disable camelcase */
import { PipelineRunKFv2, RunStorageStateKFv2, RuntimeStateKF } from '~/concepts/pipelines/kfTypes';

export const buildMockRunKF = (run?: Partial<PipelineRunKFv2>): PipelineRunKFv2 => ({
  experiment_id: 'a9947051-ead5-480c-acca-fd26ae14b81b',
  run_id: 'test-run-id',
  display_name: 'Test run',
  storage_state: RunStorageStateKFv2.AVAILABLE,
  pipeline_version_reference: {
    pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef0921',
    pipeline_version_id: 'version-id',
  },
  runtime_config: {
    parameters: {
      min_max_scaler: false,
      neighbors: 0,
      standard_scaler: true,
    },
    pipeline_root: '',
  },
  service_account: 'pipeline-runner-dspa',
  created_at: '2024-02-05T14:44:39Z',
  scheduled_at: '2024-02-05T14:44:39Z',
  finished_at: '1970-01-01T00:00:00Z',
  state: RuntimeStateKF.SUCCEEDED,
  run_details: {
    pipeline_context_id: '',
    pipeline_run_context_id: '',
    task_details: [
      {
        run_id: 'test-run-id',
        task_id: '89f9bfb3-4b81-4bf1-9891-440009a6c9bc',
        display_name: 'iris-training-pipeline-wp8fl',
        create_time: '2024-02-05T14:44:39Z',
        start_time: '2024-02-05T14:44:39Z',
        end_time: '0001-01-01T00:00:00Z',
        state: 'RUNNING',
        state_history: [
          {
            update_time: '2024-02-05T14:44:40Z',
            state: 'RUNNING',
          },
        ],
        child_tasks: [
          {
            pod_name: 'iris-training-pipeline-wp8fl-637531629',
          },
        ],
      },
      {
        run_id: 'test-run-id',
        task_id: 'c5487b92-5368-4d61-8d32-f2e237fc9e8b',
        display_name: 'root-driver',
        create_time: '2024-02-05T14:44:39Z',
        start_time: '2024-02-05T14:44:39Z',
        end_time: '0001-01-01T00:00:00Z',
        state: 'PENDING',
        state_history: [
          {
            update_time: '2024-02-05T14:44:40Z',
            state: 'PENDING',
          },
        ],
      },
    ],
  },
  state_history: [
    {
      update_time: '2024-02-05T14:44:39Z',
      state: 'PENDING',
    },
    {
      update_time: '2024-02-05T14:44:40Z',
      state: 'RUNNING',
    },
  ],
  ...run,
});
