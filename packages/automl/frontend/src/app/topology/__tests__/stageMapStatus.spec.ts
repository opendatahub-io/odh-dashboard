import { RunStatus } from '@patternfly/react-topology';
import type { ComponentStageMapComponent } from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import { getComponentRunStatus } from '~/app/topology/stageMapStatus';

/* eslint-disable camelcase */

jest.mock('@patternfly/react-topology', () => ({
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    InProgress: 'InProgress',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped',
  },
}));

const makeComponent = (
  overrides?: Partial<ComponentStageMapComponent>,
): ComponentStageMapComponent => ({
  id: 'automl_data_loader',
  description: 'Load tabular data',
  stages: [{ id: 'validate_inputs', description: 'Validate pipeline inputs' }],
  ...overrides,
});

const makeRunDetails = (taskState?: string): RunDetailsKF =>
  ({
    task_details: [
      {
        run_id: 'run-1',
        task_id: 'automl-data-loader',
        display_name: 'automl-data-loader',
        create_time: '2025-01-01T00:00:00Z',
        start_time: '2025-01-01T00:00:00Z',
        end_time: '2025-01-01T01:00:00Z',
        state: taskState,
      },
    ],
  }) as RunDetailsKF;

describe('getComponentRunStatus', () => {
  it('should return translated status for recognized task states', () => {
    const component = makeComponent();
    const runDetails = makeRunDetails('SUCCEEDED');

    expect(getComponentRunStatus(component, runDetails)).toBe(RunStatus.Succeeded);
  });

  it('should fall back to completed_at when task state is unrecognized', () => {
    const component = makeComponent({ completed_at: '2025-01-01T01:00:00Z' });
    const runDetails = makeRunDetails('UNKNOWN');

    expect(getComponentRunStatus(component, runDetails)).toBe(RunStatus.Succeeded);
  });

  it('should fall back to started_at when task state is unrecognized and component is not complete', () => {
    const component = makeComponent({ started_at: '2025-01-01T00:00:00Z' });
    const runDetails = makeRunDetails('UNKNOWN');

    expect(getComponentRunStatus(component, runDetails)).toBe(RunStatus.InProgress);
  });

  it('should use completed_at and started_at fallbacks when task data is missing', () => {
    const component = makeComponent({
      started_at: '2025-01-01T00:00:00Z',
      completed_at: '2025-01-01T01:00:00Z',
    });

    expect(getComponentRunStatus(component, undefined)).toBe(RunStatus.Succeeded);
  });
});
