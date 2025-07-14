/* eslint-disable camelcase */
import { PipelineRunKF, RuntimeStateKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';

export const buildMockRunKF = (run?: Partial<PipelineRunKF>): PipelineRunKF => ({
  experiment_id: '1a1a1e71-25b6-46b6-a9eb-6ff1d8518be9',
  run_id: '17577391-357e-489f-b88a-f0f8895d5376',
  display_name: 'Test run',
  storage_state: StorageStateKF.AVAILABLE,
  pipeline_version_reference: {
    pipeline_id: 'f962f8b4-8a56-4499-9907-1eb7c407a8ff',
    pipeline_version_id: '90f05f62-36e6-4fb3-a769-da977a468273',
  },
  runtime_config: { parameters: { min_max_scaler: false, neighbors: 1, standard_scaler: false } },
  service_account: 'pipeline-runner-dspa',
  created_at: '2024-03-15T17:59:35Z',
  scheduled_at: '2024-03-15T17:59:35Z',
  finished_at: '2024-03-15T18:00:25Z',
  state: RuntimeStateKF.SUCCEEDED,
  run_details: {
    task_details: [
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '0891c2b7-7ea6-4c75-8254-24f9c736e837',
        display_name: 'train-model',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:25Z',
        end_time: '2024-03-15T18:00:25Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [{ update_time: '2024-03-15T18:00:26Z', state: RuntimeStateKF.SUCCEEDED }],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-4001010741' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '141d6424-59db-4d9d-86e9-98e1a811e453',
        display_name: 'executor',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:05Z',
        end_time: '2024-03-15T18:00:05Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [{ update_time: '2024-03-15T18:00:06Z', state: RuntimeStateKF.SKIPPED }],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-3692705603' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '16123c45-5b1b-458c-b4d9-afa6dc3e4887',
        display_name: 'normalize-dataset-driver',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:05Z',
        end_time: '2024-03-15T18:00:10Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-03-15T18:00:06Z', state: RuntimeStateKF.PENDING },
          { update_time: '2024-03-15T18:00:16Z', state: RuntimeStateKF.SUCCEEDED },
        ],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-928724422' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '1d62e55b-ea12-4f27-8b60-b35b007a7812',
        display_name: 'train-model-driver',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:15Z',
        end_time: '2024-03-15T18:00:20Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-03-15T18:00:16Z', state: RuntimeStateKF.PENDING },
          { update_time: '2024-03-15T18:00:26Z', state: RuntimeStateKF.SUCCEEDED },
        ],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-3775069846' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '4dd95b59-bd8f-4562-bfc3-e52fffe0c560',
        display_name: 'iris-training-pipeline-v4zp7',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T17:59:35Z',
        end_time: '2024-03-15T18:00:25Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-03-15T17:59:36Z', state: RuntimeStateKF.RUNNING },
          { update_time: '2024-03-15T18:00:26Z', state: RuntimeStateKF.SUCCEEDED },
        ],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-2780559103' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '5e9ea183-6817-432c-9ee3-bd27013ae3fa',
        display_name: 'executor',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:15Z',
        end_time: '2024-03-15T18:00:15Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [{ update_time: '2024-03-15T18:00:16Z', state: RuntimeStateKF.SKIPPED }],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-4101678931' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '6c5d570a-7b88-4053-80d8-add0463d7bf8',
        display_name: 'executor',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:25Z',
        end_time: '2024-03-15T18:00:25Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [{ update_time: '2024-03-15T18:00:26Z', state: RuntimeStateKF.SKIPPED }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: '877af71a-07f6-4d15-b3a2-c771b2876996',
        display_name: 'root',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T17:59:55Z',
        end_time: '2024-03-15T18:00:25Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-03-15T17:59:56Z', state: RuntimeStateKF.RUNNING },
          { update_time: '2024-03-15T18:00:26Z', state: RuntimeStateKF.SUCCEEDED },
        ],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-3569115838' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: 'a65b8683-0fb7-4103-83ca-0a5f16641ebc',
        display_name: 'create-dataset',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:05Z',
        end_time: '2024-03-15T18:00:05Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [{ update_time: '2024-03-15T18:00:06Z', state: RuntimeStateKF.SUCCEEDED }],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-2757091352' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: 'b0873f0c-8435-4bb3-a9d0-27ac1668d562',
        display_name: 'create-dataset-driver',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T17:59:55Z',
        end_time: '2024-03-15T17:59:59Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-03-15T17:59:56Z', state: RuntimeStateKF.PENDING },
          { update_time: '2024-03-15T18:00:06Z', state: RuntimeStateKF.SUCCEEDED },
        ],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-3312624493' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: 'c1b54b9c-9cfd-449d-b425-792849564f72',
        display_name: 'root-driver',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T17:59:35Z',
        end_time: '2024-03-15T17:59:42Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          { update_time: '2024-03-15T17:59:36Z', state: RuntimeStateKF.PENDING },
          { update_time: '2024-03-15T17:59:46Z', state: RuntimeStateKF.RUNNING },
          { update_time: '2024-03-15T17:59:56Z', state: RuntimeStateKF.SUCCEEDED },
        ],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-1033443722' }],
      },
      {
        run_id: '17577391-357e-489f-b88a-f0f8895d5376',
        task_id: 'e94ce91f-ba15-45d6-9d00-6be83ab36ce7',
        display_name: 'normalize-dataset',
        create_time: '2024-03-15T17:59:35Z',
        start_time: '2024-03-15T18:00:15Z',
        end_time: '2024-03-15T18:00:15Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [{ update_time: '2024-03-15T18:00:16Z', state: RuntimeStateKF.SUCCEEDED }],
        child_tasks: [{ pod_name: 'iris-training-pipeline-v4zp7-2244644869' }],
      },
    ],
  },
  state_history: [
    { update_time: '2024-03-15T17:59:35Z', state: 'PENDING' },
    { update_time: '2024-03-15T17:59:36Z', state: 'RUNNING' },
    { update_time: '2024-03-15T18:00:26Z', state: 'SUCCEEDED' },
  ],
  ...run,
});

export const mockMetricsVisualizationRun: PipelineRunKF = {
  experiment_id: '337b4750-40fa-4593-8c07-f80c542cbb7d',
  run_id: 'test-metrics-pipeline-run',
  display_name: 'test',
  storage_state: StorageStateKF.AVAILABLE,
  pipeline_version_reference: {
    pipeline_id: 'metrics-pipeline',
    pipeline_version_id: 'metrics-pipeline-version',
  },
  service_account: 'pipeline-runner-dspa',
  created_at: '2024-06-19T11:28:32Z',
  scheduled_at: '2024-06-19T11:28:32Z',
  finished_at: '2024-06-19T11:29:03Z',
  state: RuntimeStateKF.SUCCEEDED,
  run_details: {
    task_details: [
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '0eca1834-a6cc-4dd5-b872-d3aa7b3ff6e8',
        display_name: 'root-driver',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:32Z',
        end_time: '2024-06-19T11:28:43Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:33Z',
            state: RuntimeStateKF.PENDING,
          },
          {
            update_time: '2024-06-19T11:28:43Z',
            state: RuntimeStateKF.RUNNING,
          },
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-2493393560',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '19bd4da0-0550-4c94-b664-6c926dce8001',
        display_name: 'iris-sgdclassifier',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-4194317718',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '37cd492c-a01d-4fa2-898b-7eb0e8b30419',
        display_name: 'executor',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SKIPPED,
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '3e119baf-3c52-450d-b4cc-2ab2bc4de10b',
        display_name: 'digit-classification',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-1101486161',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '41252b5a-ac35-4a16-9450-6df59de90af1',
        display_name: 'html-visualization-driver',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:53Z',
        end_time: '2024-06-19T11:28:59Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.PENDING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-1024349010',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '42a1b696-462e-4d04-a1d8-42a78f32a3d4',
        display_name: 'iris-sgdclassifier-driver',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:53Z',
        end_time: '2024-06-19T11:28:57Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.PENDING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-2388146295',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '46877f5d-bc58-4a3f-bd16-142c89bb3472',
        display_name: 'executor',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SKIPPED,
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '7809de66-7d83-44f4-ac27-6c1a49a1fe9a',
        display_name: 'executor',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SKIPPED,
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '9d9b708d-7c6e-43a3-9d47-037ee35d07ec',
        display_name: 'metrics-visualization-pipeline-wbfhf',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:32Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:33Z',
            state: RuntimeStateKF.RUNNING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-2043659685',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: '9f3c7a93-3b9c-4830-9ec6-968a470c61ac',
        display_name: 'wine-classification-driver',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:53Z',
        end_time: '2024-06-19T11:28:59Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.PENDING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-232158710',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'a1920cb4-cf8c-4d2b-8ec5-b92ac29d732f',
        display_name: 'markdown-visualization-driver',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:53Z',
        end_time: '2024-06-19T11:28:59Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.PENDING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-2636276234',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'a2b45cc2-d999-4af3-b4f8-f7213f7c7b7d',
        display_name: 'markdown-visualization',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-522038993',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'cb3c1755-25ee-4772-bfda-60524dfeafea',
        display_name: 'executor',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SKIPPED,
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'cff9af15-9a73-4cc7-acc1-41be78f6cf2f',
        display_name: 'root',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:53Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.RUNNING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-3563862527',
          },
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-1985932151',
          },
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-3374311824',
          },
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-3118730367',
          },
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-1337836723',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'd7851ef9-d74d-4c54-899d-5a2f7b787347',
        display_name: 'html-visualization',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-378883961',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'de0741cd-b2b6-4876-b819-31bcd7ead154',
        display_name: 'digit-classification-driver',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:28:53Z',
        end_time: '2024-06-19T11:28:57Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:28:54Z',
            state: RuntimeStateKF.PENDING,
          },
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-1495298698',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'e1b44a5c-37c8-478b-a6bc-9f788d3c2027',
        display_name: 'wine-classification',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SUCCEEDED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SUCCEEDED,
          },
        ],
        child_tasks: [
          {
            pod_name: 'metrics-visualization-pipeline-wbfhf-1000874645',
          },
        ],
      },
      {
        run_id: 'test-metrics-pipeline-run',
        task_id: 'f06409c9-0305-4187-a878-ba4996ffc5ca',
        display_name: 'executor',
        create_time: '2024-06-19T11:28:32Z',
        start_time: '2024-06-19T11:29:03Z',
        end_time: '2024-06-19T11:29:03Z',
        state: RuntimeStateKF.SKIPPED,
        state_history: [
          {
            update_time: '2024-06-19T11:29:04Z',
            state: RuntimeStateKF.SKIPPED,
          },
        ],
      },
    ],
  },
  state_history: [
    {
      update_time: '2024-06-19T11:28:32Z',
      state: RuntimeStateKF.PENDING,
    },
    {
      update_time: '2024-06-19T11:28:33Z',
      state: RuntimeStateKF.RUNNING,
    },
    {
      update_time: '2024-06-19T11:29:04Z',
      state: RuntimeStateKF.SUCCEEDED,
    },
  ],
};
