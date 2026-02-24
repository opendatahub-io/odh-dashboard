/* eslint-disable camelcase -- mock data mirrors KFP API response structure */
import { PipelineRunKF, RuntimeStateKF } from '~/app/types/pipeline';

export const mockPipelineRun: PipelineRunKF = {
  experiment_id: 'e77f84f2-9cef-41cf-ba36-ca7521b89954',
  run_id: '9f877f61-ed15-4c2d-beb1-b7198b364372',
  display_name: 'run 1',
  storage_state: 'AVAILABLE',
  pipeline_version_reference: {
    pipeline_id: 'bae9b70e-01a9-4e8b-b3b7-0cd161a31939',
    pipeline_version_id: 'c0042a44-41d2-4a83-9342-9ec9305371ed',
  },
  runtime_config: {
    parameters: {
      bucket_name: 'mybucket',
      file_key: 'sample_dataset.csv',
      problem_type: 'binary',
      target_column: 'churned',
      top_n: 3,
    },
  },
  service_account: 'pipeline-runner-dspa',
  created_at: '2026-02-12T03:15:56Z',
  scheduled_at: '2026-02-12T03:15:56Z',
  finished_at: '2026-02-12T03:23:17Z',
  state: RuntimeStateKF.SUCCEEDED,
  run_details: {
    task_details: [
      {
        run_id: '9f877f61-ed15-4c2d-beb1-b7198b364372',
        task_id: '74f66c67-8f8c-4feb-a10c-627222978420',
        display_name: 'automl-data-loader',
        create_time: '2026-02-12T03:15:56Z',
        start_time: '2026-02-12T03:16:16Z',
        end_time: '2026-02-12T03:16:44Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: '9f877f61-ed15-4c2d-beb1-b7198b364372',
        task_id: 'ad97ade4-f1b0-48cc-9446-8dac6654a446',
        display_name: 'train-test-split',
        create_time: '2026-02-12T03:16:54Z',
        start_time: '2026-02-12T03:16:54Z',
        end_time: '2026-02-12T03:17:28Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: '9f877f61-ed15-4c2d-beb1-b7198b364372',
        task_id: '3739fa11-dbd5-4efd-b142-cebf5c7e2720',
        display_name: 'models-selection',
        create_time: '2026-02-12T03:17:38Z',
        start_time: '2026-02-12T03:17:38Z',
        end_time: '2026-02-12T03:21:08Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: '9f877f61-ed15-4c2d-beb1-b7198b364372',
        task_id: 'fe3fda78-66e8-46c8-8a64-16b16529cae4',
        display_name: 'for-loop-1',
        create_time: '2026-02-12T03:21:08Z',
        start_time: '2026-02-12T03:21:08Z',
        end_time: '2026-02-12T03:22:47Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: '9f877f61-ed15-4c2d-beb1-b7198b364372',
        task_id: '9198d8cb-bf07-4fe9-9521-0da2edd804d6',
        display_name: 'leaderboard-evaluation',
        create_time: '2026-02-12T03:22:57Z',
        start_time: '2026-02-12T03:22:57Z',
        end_time: '2026-02-12T03:23:17Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
    ],
  },
  state_history: [
    { update_time: '2026-02-12T03:15:56Z', state: 'PENDING' },
    { update_time: '2026-02-12T03:15:57Z', state: 'RUNNING' },
    { update_time: '2026-02-12T03:23:18Z', state: 'SUCCEEDED' },
  ],
};

/** Run 2: Failed at models-selection */
export const mockPipelineRunFailed: PipelineRunKF = {
  experiment_id: 'e77f84f2-9cef-41cf-ba36-ca7521b89954',
  run_id: 'a1b2c3d4-dead-beef-cafe-111111111111',
  display_name: 'run 2 - failed',
  description: 'Run failed during models-selection due to OOM',
  storage_state: 'AVAILABLE',
  pipeline_version_reference: {
    pipeline_id: 'bae9b70e-01a9-4e8b-b3b7-0cd161a31939',
    pipeline_version_id: 'c0042a44-41d2-4a83-9342-9ec9305371ed',
  },
  runtime_config: {
    parameters: {
      bucket_name: 'mybucket',
      file_key: 'large_dataset.csv',
      problem_type: 'multiclass',
      target_column: 'category',
      top_n: 5,
    },
  },
  service_account: 'pipeline-runner-dspa',
  created_at: '2026-02-13T10:00:00Z',
  scheduled_at: '2026-02-13T10:00:00Z',
  finished_at: '2026-02-13T10:12:45Z',
  state: RuntimeStateKF.FAILED,
  run_details: {
    task_details: [
      {
        run_id: 'a1b2c3d4-dead-beef-cafe-111111111111',
        task_id: 'f001-0001',
        display_name: 'automl-data-loader',
        create_time: '2026-02-13T10:00:00Z',
        start_time: '2026-02-13T10:00:10Z',
        end_time: '2026-02-13T10:01:30Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: 'a1b2c3d4-dead-beef-cafe-111111111111',
        task_id: 'f001-0002',
        display_name: 'train-test-split',
        create_time: '2026-02-13T10:01:30Z',
        start_time: '2026-02-13T10:01:35Z',
        end_time: '2026-02-13T10:02:15Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: 'a1b2c3d4-dead-beef-cafe-111111111111',
        task_id: 'f001-0003',
        display_name: 'models-selection',
        create_time: '2026-02-13T10:02:15Z',
        start_time: '2026-02-13T10:02:20Z',
        end_time: '2026-02-13T10:12:45Z',
        state: RuntimeStateKF.FAILED,
      },
      {
        run_id: 'a1b2c3d4-dead-beef-cafe-111111111111',
        task_id: 'f001-0004',
        display_name: 'for-loop-1',
        create_time: '',
        start_time: '',
        end_time: '',
      },
      {
        run_id: 'a1b2c3d4-dead-beef-cafe-111111111111',
        task_id: 'f001-0005',
        display_name: 'leaderboard-evaluation',
        create_time: '',
        start_time: '',
        end_time: '',
      },
    ],
  },
  state_history: [
    { update_time: '2026-02-13T10:00:00Z', state: 'PENDING' },
    { update_time: '2026-02-13T10:00:01Z', state: 'RUNNING' },
    { update_time: '2026-02-13T10:12:45Z', state: 'FAILED' },
  ],
};

/** Run 3: Long-running, currently stuck at models-selection (sleeping) */
export const mockPipelineRunLong: PipelineRunKF = {
  experiment_id: 'e77f84f2-9cef-41cf-ba36-ca7521b89954',
  run_id: 'b5e6f7a8-slow-run0-cafe-222222222222',
  display_name: 'run 3 - long running',
  description: 'Long-running pipeline with large dataset, still executing',
  storage_state: 'AVAILABLE',
  pipeline_version_reference: {
    pipeline_id: 'bae9b70e-01a9-4e8b-b3b7-0cd161a31939',
    pipeline_version_id: 'c0042a44-41d2-4a83-9342-9ec9305371ed',
  },
  runtime_config: {
    parameters: {
      bucket_name: 'mybucket',
      file_key: 'huge_dataset.csv',
      problem_type: 'regression',
      target_column: 'price',
      top_n: 10,
    },
  },
  service_account: 'pipeline-runner-dspa',
  created_at: '2026-02-14T08:00:00Z',
  scheduled_at: '2026-02-14T08:00:00Z',
  finished_at: '',
  state: RuntimeStateKF.RUNNING,
  run_details: {
    task_details: [
      {
        run_id: 'b5e6f7a8-slow-run0-cafe-222222222222',
        task_id: 'l001-0001',
        display_name: 'automl-data-loader',
        create_time: '2026-02-14T08:00:00Z',
        start_time: '2026-02-14T08:00:15Z',
        end_time: '2026-02-14T08:05:00Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: 'b5e6f7a8-slow-run0-cafe-222222222222',
        task_id: 'l001-0002',
        display_name: 'train-test-split',
        create_time: '2026-02-14T08:05:00Z',
        start_time: '2026-02-14T08:05:05Z',
        end_time: '2026-02-14T08:06:30Z',
        state: RuntimeStateKF.SUCCEEDED,
      },
      {
        run_id: 'b5e6f7a8-slow-run0-cafe-222222222222',
        task_id: 'l001-0003',
        display_name: 'models-selection',
        create_time: '2026-02-14T08:06:30Z',
        start_time: '2026-02-14T08:06:35Z',
        end_time: '',
        state: RuntimeStateKF.RUNNING,
      },
      {
        run_id: 'b5e6f7a8-slow-run0-cafe-222222222222',
        task_id: 'l001-0004',
        display_name: 'for-loop-1',
        create_time: '',
        start_time: '',
        end_time: '',
        state: RuntimeStateKF.PENDING,
      },
      {
        run_id: 'b5e6f7a8-slow-run0-cafe-222222222222',
        task_id: 'l001-0005',
        display_name: 'leaderboard-evaluation',
        create_time: '',
        start_time: '',
        end_time: '',
        state: RuntimeStateKF.PENDING,
      },
    ],
  },
  state_history: [
    { update_time: '2026-02-14T08:00:00Z', state: 'PENDING' },
    { update_time: '2026-02-14T08:00:01Z', state: 'RUNNING' },
  ],
};

/** Mock runs list for the table view */
export const mockPipelineRuns: PipelineRunKF[] = [
  mockPipelineRun,
  mockPipelineRunFailed,
  mockPipelineRunLong,
];
