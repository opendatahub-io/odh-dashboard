/* eslint-disable camelcase */
import {
  PipelineRecurringRunKF,
  RecurringRunMode,
  RecurringRunStatus,
} from '#~/concepts/pipelines/kfTypes';

export const buildMockRecurringRunKF = (
  recurringRun?: Partial<PipelineRecurringRunKF>,
): PipelineRecurringRunKF => ({
  recurring_run_id: 'test-recurring-run',
  display_name: 'Test recurring run',
  pipeline_version_reference: {
    pipeline_id: '3195ec84-69d1-4c10-b8ac-6e2334319444',
    pipeline_version_id: '29d12191-3a34-4e2a-b05f-6224b6fa7de8',
  },
  runtime_config: {
    parameters: {
      min_max_scaler: false,
      neighbors: 0,
      standard_scaler: 'yes',
    },
  },
  service_account: 'pipeline-runner-pipelines-definition',
  max_concurrency: '10',
  trigger: {
    periodic_schedule: {
      start_time: '2024-02-08T14:56:00Z',
      end_time: '2024-02-08T15:00:00Z',
      interval_second: '60',
    },
  },
  mode: RecurringRunMode.ENABLE,
  created_at: '2024-02-08T14:57:15Z',
  updated_at: '2024-02-08T15:00:01Z',
  status: RecurringRunStatus.ENABLED,
  namespace: 'jps-fun-world',
  experiment_id: 'f1353050-6b31-424d-859e-1fd95feb2cb8',
  ...recurringRun,
});
