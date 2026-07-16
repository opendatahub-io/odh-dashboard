import { RunStatus } from '@patternfly/react-topology';
import type {
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import type { RunDetailsKF } from '~/app/types/pipeline';
import {
  getComponentRunStatus,
  hasExplicitComponentFailureEvidence,
  hasPreBranchInlineFailure,
  isInlineStageFailure,
  resolveComponentStatus,
  resolveSequentialStageRunStatuses,
  resolveStageRunStatus,
  translateStageStatus,
} from '~/app/topology/stageMapStatus';

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
  id: 'test_data_loader',
  description: 'Load and sample test data',
  stages: [{ id: 'validate_inputs', description: 'Validate pipeline inputs' }],
  ...overrides,
});

const makeRunDetails = (taskState?: string): RunDetailsKF =>
  ({
    task_details: [
      {
        run_id: 'run-1',
        task_id: 'test-data-loader',
        display_name: 'test-data-loader',
        create_time: '2025-01-01T00:00:00Z',
        start_time: '2025-01-01T00:00:00Z',
        end_time: '2025-01-01T01:00:00Z',
        state: taskState,
      },
    ],
  }) as RunDetailsKF;

describe('translateStageStatus', () => {
  it.each([
    ['completed', RunStatus.Succeeded],
    ['started', RunStatus.InProgress],
    ['failed', RunStatus.Failed],
    ['skipped', RunStatus.Skipped],
  ])('should map %s to %s', (status, expected) => {
    expect(translateStageStatus(status)).toBe(expected);
  });

  it.each([
    [' FAILED ', RunStatus.Failed],
    ['COMPLETED', RunStatus.Succeeded],
    ['  Started  ', RunStatus.InProgress],
    ['SKIPPED', RunStatus.Skipped],
  ])('should normalize uppercase/whitespace-padded %j', (status, expected) => {
    expect(translateStageStatus(status)).toBe(expected);
  });

  it('should return undefined for unrecognized or empty values', () => {
    expect(translateStageStatus(undefined)).toBeUndefined();
    expect(translateStageStatus('')).toBeUndefined();
    expect(translateStageStatus('   ')).toBeUndefined();
    expect(translateStageStatus('unknown')).toBeUndefined();
  });
});

describe('inline stage failure evidence', () => {
  it('should treat casing/whitespace variants of failed as inline failures', () => {
    expect(isInlineStageFailure({ id: 'a', description: 'A', status: 'failed' })).toBe(true);
    expect(isInlineStageFailure({ id: 'a', description: 'A', status: 'FAILED' })).toBe(true);
    expect(isInlineStageFailure({ id: 'a', description: 'A', status: ' failed ' })).toBe(true);
    expect(isInlineStageFailure({ id: 'a', description: 'A', status: 'completed' })).toBe(false);
    expect(isInlineStageFailure({ id: 'a', description: 'A', status: 'unknown' })).toBe(false);
  });

  it('should detect pre-branch inline failures with normalized status values', () => {
    expect(
      hasPreBranchInlineFailure([
        { id: 'validate_inputs', description: 'Validate', status: 'FAILED' },
        { id: 'optimize_templates', description: 'Optimize', status: 'started' },
      ]),
    ).toBe(true);
  });

  it('should count normalized FAILED stages as explicit pipeline failure evidence', () => {
    expect(
      hasExplicitComponentFailureEvidence([
        makeComponent({
          stages: [{ id: 'validate_inputs', description: 'Validate', status: ' FAILED ' }],
        }),
      ]),
    ).toBe(true);
  });

  it('should not let unknown non-null stage status suppress terminal run failure fallback', () => {
    const component = makeComponent({
      stages: [{ id: 'validate_inputs', description: 'Validate', status: 'unknown' }],
    });

    expect(hasExplicitComponentFailureEvidence([component])).toBe(false);
    expect(resolveComponentStatus(component, undefined, 'FAILED', false)).toBe(RunStatus.Failed);
  });

  it('should keep terminal fallback when only some stages have recognized inline status', () => {
    const component = makeComponent({
      stages: [
        { id: 'validate_inputs', description: 'Validate', status: 'completed' },
        { id: 'download_and_sample', description: 'Download and sample' },
      ],
    });

    expect(resolveComponentStatus(component, undefined, 'FAILED', false)).toBe(RunStatus.Failed);
  });

  it('should suppress terminal fallback when every stage has recognized inline status', () => {
    const component = makeComponent({
      stages: [
        { id: 'validate_inputs', description: 'Validate', status: 'completed' },
        { id: 'download_and_sample', description: 'Download and sample', status: 'failed' },
      ],
    });

    expect(resolveComponentStatus(component, undefined, 'FAILED', false)).toBeUndefined();
  });
});

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

describe('resolveStageRunStatus', () => {
  const stage = (overrides?: Partial<ComponentStageMapStage>): ComponentStageMapStage => ({
    id: 'validate_inputs',
    description: 'Validate pipeline inputs',
    ...overrides,
  });

  it('should preserve inline started as InProgress on non-terminal runs', () => {
    expect(resolveStageRunStatus(stage({ status: 'started' }), RunStatus.InProgress)).toBe(
      RunStatus.InProgress,
    );
  });

  it('should map stale inline started to failed when the run failed without explicit component failure', () => {
    expect(
      resolveStageRunStatus(stage({ status: 'started' }), RunStatus.InProgress, 'FAILED', false),
    ).toBe(RunStatus.Failed);
  });

  it('should map stale inline started to cancelled when the run was canceled', () => {
    expect(
      resolveStageRunStatus(stage({ status: 'started' }), RunStatus.InProgress, 'CANCELED', false),
    ).toBe(RunStatus.Cancelled);
  });

  it('should preserve inline started when another component failed explicitly', () => {
    expect(
      resolveStageRunStatus(stage({ status: 'started' }), RunStatus.InProgress, 'FAILED', true),
    ).toBe(RunStatus.InProgress);
  });

  it('should preserve explicit inline completed, failed, and skipped on terminal runs', () => {
    expect(resolveStageRunStatus(stage({ status: 'completed' }), undefined, 'FAILED')).toBe(
      RunStatus.Succeeded,
    );
    expect(resolveStageRunStatus(stage({ status: 'failed' }), undefined, 'FAILED')).toBe(
      RunStatus.Failed,
    );
    expect(resolveStageRunStatus(stage({ status: 'skipped' }), undefined, 'CANCELED')).toBe(
      RunStatus.Skipped,
    );
  });

  it('should map stale component InProgress to terminal run failure when no inline status exists', () => {
    expect(resolveStageRunStatus(stage(), RunStatus.InProgress, 'FAILED', false)).toBe(
      RunStatus.Failed,
    );
  });
});

describe('resolveSequentialStageRunStatuses', () => {
  const stages = [
    { id: 'validate_inputs', description: 'Validate pipeline inputs' },
    { id: 'download_and_sample', description: 'Download and sample' },
  ] satisfies ComponentStageMapStage[];

  it('should not leave started_at-backed stages active on a failed run', () => {
    const component = makeComponent({ started_at: '2025-01-01T00:00:00Z' });
    const componentStatus = getComponentRunStatus(component, undefined);

    expect(componentStatus).toBe(RunStatus.InProgress);

    const statuses = resolveSequentialStageRunStatuses(stages, componentStatus, 'FAILED', false);

    expect(statuses.get('validate_inputs')).toBe(RunStatus.Failed);
    expect(statuses.get('download_and_sample')).toBe(RunStatus.Failed);
  });

  it('should not leave running-task-backed stages active on a canceled run', () => {
    const component = makeComponent();
    const runDetails = makeRunDetails('RUNNING');
    const componentStatus = getComponentRunStatus(component, runDetails);

    expect(componentStatus).toBe(RunStatus.InProgress);

    const statuses = resolveSequentialStageRunStatuses(stages, componentStatus, 'CANCELED', false);

    expect(statuses.get('validate_inputs')).toBe(RunStatus.Cancelled);
    expect(statuses.get('download_and_sample')).toBe(RunStatus.Cancelled);
  });

  it('should not leave inline started stages active on a failed run', () => {
    const statuses = resolveSequentialStageRunStatuses(
      [{ id: 'validate_inputs', description: 'Validate', status: 'started' }, stages[1]],
      RunStatus.InProgress,
      'FAILED',
      false,
    );

    expect(statuses.get('validate_inputs')).toBe(RunStatus.Failed);
    expect(statuses.get('download_and_sample')).toBe(RunStatus.Failed);
  });

  it('should mark unresolved stages failed when a partial inline map uses terminal run fallback', () => {
    const partialStages = [
      { id: 'validate_inputs', description: 'Validate', status: 'completed' },
      { id: 'download_and_sample', description: 'Download and sample' },
    ] satisfies ComponentStageMapStage[];
    const component = makeComponent({ stages: partialStages });
    const componentStatus = resolveComponentStatus(component, undefined, 'FAILED', false);

    expect(componentStatus).toBe(RunStatus.Failed);

    const statuses = resolveSequentialStageRunStatuses(
      partialStages,
      componentStatus,
      'FAILED',
      false,
    );

    expect(statuses.get('validate_inputs')).toBe(RunStatus.Succeeded);
    expect(statuses.get('download_and_sample')).toBe(RunStatus.Failed);
  });
});
