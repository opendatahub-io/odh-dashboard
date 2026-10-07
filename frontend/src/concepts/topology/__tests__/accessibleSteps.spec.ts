import { RunStatus, DEFAULT_TASK_NODE_TYPE } from '@patternfly/react-topology';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import {
  buildAccessibleStepList,
  buildStatusAnnouncement,
  formatFailureSummary,
  hasFailedOrCancelledSteps,
  normalizeRunStatus,
} from '#~/concepts/topology/accessibleSteps';
import { ICON_TASK_NODE_TYPE } from '#~/concepts/topology/utils';
import { PipelineNodeModelExpanded } from '#~/concepts/topology/types';

const createStepNode = (
  id: string,
  label: string,
  runStatus: RunStatus,
  runAfterTasks?: string[],
  overrides: Partial<PipelineNodeModelExpanded> = {},
): PipelineNodeModelExpanded => ({
  id,
  label,
  type: DEFAULT_TASK_NODE_TYPE,
  width: 130,
  height: 35,
  runAfterTasks,
  data: {
    pipelineTask: {
      name: label,
      type: 'task',
    },
    runStatus,
  },
  ...overrides,
});

describe('accessibleSteps', () => {
  describe('normalizeRunStatus', () => {
    it('normalizes failed-to-start to failed', () => {
      expect(normalizeRunStatus(RunStatus.FailedToStart)).toBe(RunStatus.Failed);
    });
  });

  describe('buildAccessibleStepList', () => {
    it('excludes group and spacer nodes', () => {
      const nodes: PipelineNodeModelExpanded[] = [
        createStepNode('a', 'task-a', RunStatus.Succeeded),
        {
          id: 'group-1',
          label: 'group',
          type: DEFAULT_TASK_NODE_TYPE,
          group: true,
          width: 130,
          height: 35,
          data: { pipelineTask: { name: 'group', type: 'task' }, runStatus: RunStatus.Failed },
        },
      ];
      expect(buildAccessibleStepList(nodes)).toHaveLength(1);
      expect(buildAccessibleStepList(nodes)[0].id).toBe('a');
    });

    it('includes artifact nodes with run status', () => {
      const nodes: PipelineNodeModelExpanded[] = [
        {
          id: 'artifact-1',
          label: 'metrics',
          type: ICON_TASK_NODE_TYPE,
          width: 44,
          height: 35,
          data: {
            pipelineTask: { name: 'metrics', type: 'artifact' },
            runStatus: RunStatus.Succeeded,
          },
        },
      ];
      expect(buildAccessibleStepList(nodes)).toHaveLength(1);
    });

    it('sorts steps in topological order', () => {
      const nodes = [
        createStepNode('b', 'task-b', RunStatus.Succeeded, ['a']),
        createStepNode('a', 'task-a', RunStatus.Succeeded),
      ];
      const steps = buildAccessibleStepList(nodes);
      expect(steps.map((step) => step.id)).toEqual(['a', 'b']);
    });

    it('includes execution state in status label', () => {
      const nodes = [
        createStepNode('a', 'task-a', RunStatus.Succeeded, undefined, {
          data: {
            pipelineTask: {
              name: 'task-a',
              type: 'task',
              status: { state: ExecutionStateKF.CACHED },
            },
            runStatus: RunStatus.Succeeded,
          },
        }),
      ];
      expect(buildAccessibleStepList(nodes)[0].statusLabel).toBe('Cached');
    });
  });

  describe('hasFailedOrCancelledSteps', () => {
    it('returns true when a failed step exists', () => {
      const steps = buildAccessibleStepList([createStepNode('a', 'task-a', RunStatus.Failed)]);
      expect(hasFailedOrCancelledSteps(steps)).toBe(true);
    });
  });

  describe('formatFailureSummary', () => {
    it('counts failed and canceled steps separately', () => {
      const steps = buildAccessibleStepList([
        createStepNode('a', 'build-image', RunStatus.Failed),
        createStepNode('b', 'stop-run', RunStatus.Cancelled),
      ]);
      expect(formatFailureSummary(steps)).toBe('1 failed, 1 canceled');
    });
  });

  describe('buildStatusAnnouncement', () => {
    it('announces failed step names', () => {
      const steps = buildAccessibleStepList([createStepNode('a', 'build-image', RunStatus.Failed)]);
      expect(buildStatusAnnouncement(steps)).toContain('build-image');
    });

    it('returns empty string when no failures', () => {
      const steps = buildAccessibleStepList([createStepNode('a', 'task-a', RunStatus.Succeeded)]);
      expect(buildStatusAnnouncement(steps)).toBe('');
    });
  });
});
