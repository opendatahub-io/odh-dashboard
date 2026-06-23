/* eslint-disable camelcase */
jest.mock('@patternfly/react-topology', () => ({
  DEFAULT_TASK_NODE_TYPE: 'DEFAULT_TASK_NODE',
  DEFAULT_SPACER_NODE_TYPE: 'DEFAULT_SPACER_NODE',
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    InProgress: 'InProgress',
    Pending: 'Pending',
    Cancelled: 'Cancelled',
    Skipped: 'Skipped',
  },
}));

jest.mock('~/app/topology/utils', () => ({
  createNode: (
    id: string,
    label: string,
    pipelineTask: unknown,
    runAfterTasks?: string[],
    runStatus?: string,
  ) => ({
    id,
    label,
    type: 'DEFAULT_TASK_NODE',
    width: 100,
    height: 30,
    runAfterTasks,
    data: { pipelineTask, runStatus },
  }),
}));

// eslint-disable-next-line import/first
import { RunStatus } from '@patternfly/react-topology';
// eslint-disable-next-line import/first
import {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
// eslint-disable-next-line import/first
import { RunDetailsKF } from '~/app/types/pipeline';
// eslint-disable-next-line import/first
import { buildStageMapTopology } from '~/app/topology/buildStageMapTopology';

const makeStage = (
  id: string,
  overrides?: Partial<ComponentStageMapStage>,
): ComponentStageMapStage => ({
  id,
  description: `${id} stage`,
  ...overrides,
});

const makeComponent = (
  id: string,
  stages: ComponentStageMapStage[],
  overrides?: Partial<ComponentStageMapComponent>,
): ComponentStageMapComponent => ({
  id,
  description: `${id} component`,
  stages,
  ...overrides,
});

const makeStageMap = (components: ComponentStageMapComponent[]): ComponentStageMap => ({
  pipeline_id: 'pipeline-1',
  description: 'test',
  components,
  kfp_run_id: 'run-1',
  published_at: '2025-01-01T00:00:00Z',
});

const makeRunDetails = (
  tasks: { display_name: string; state: string; task_id?: string }[],
): RunDetailsKF =>
  ({
    task_details: tasks.map((t) => ({
      display_name: t.display_name,
      task_id: t.task_id ?? t.display_name,
      state: t.state,
      start_time: '',
      end_time: '',
    })),
  }) as unknown as RunDetailsKF;

describe('buildStageMapTopology', () => {
  describe('linear stages (no branching)', () => {
    it('should create nodes chained linearly', () => {
      const stageMap = makeStageMap([
        makeComponent('data_prep', [makeStage('validate_inputs'), makeStage('cleanse')]),
      ]);

      const nodes = buildStageMapTopology(stageMap);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe('data_prep__validate_inputs');
      expect(nodes[0].label).toBe('Validate inputs');
      expect(nodes[0].runAfterTasks).toEqual([]);
      expect(nodes[1].id).toBe('data_prep__cleanse');
      expect(nodes[1].label).toBe('Cleanse data');
      expect(nodes[1].runAfterTasks).toEqual(['data_prep__validate_inputs']);
    });

    it('should chain across multiple components', () => {
      const stageMap = makeStageMap([
        makeComponent('comp_a', [makeStage('validate_inputs')]),
        makeComponent('comp_b', [makeStage('load_data')]),
      ]);

      const nodes = buildStageMapTopology(stageMap);

      expect(nodes).toHaveLength(2);
      expect(nodes[1].runAfterTasks).toEqual(['comp_a__validate_inputs']);
    });
  });

  describe('branching stages', () => {
    const branchingComponent = makeComponent('training', [
      makeStage('load_data'),
      makeStage('model_selection', { selected_models: ['xgboost', 'lightgbm'] }),
      makeStage('refit_full'),
      makeStage('evaluate_models'),
      makeStage('build_leaderboard'),
    ]);

    it('should create pre-branch, branch, and post-branch nodes', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const nodeIds = nodes.map((n) => n.id);

      // Pre-branch: load_data, model_selection
      expect(nodeIds).toContain('training__load_data');
      expect(nodeIds).toContain('training__model_selection');

      // Branch model name nodes
      expect(nodeIds).toContain('training__model__branch-0');
      expect(nodeIds).toContain('training__model__branch-1');

      // Post-branch (linear, not per-branch)
      expect(nodeIds).toContain('training__refit_full');
      expect(nodeIds).toContain('training__evaluate_models');
      expect(nodeIds).toContain('training__build_leaderboard');
    });

    it('should use real model names as labels', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes[0].label).toBe('xgboost');
      expect(modelNodes[1].label).toBe('lightgbm');
    });

    it('should fan out from model_selection node', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes[0].runAfterTasks).toEqual(['training__model_selection']);
      expect(modelNodes[1].runAfterTasks).toEqual(['training__model_selection']);
    });

    it('should insert convergence spacer before post-branch stages', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const spacer = nodes.find((n) => n.type === 'DEFAULT_SPACER_NODE');
      expect(spacer).toBeDefined();

      const refitNode = nodes.find((n) => n.id === 'training__refit_full');
      expect(refitNode?.runAfterTasks).toEqual([spacer!.id]);
    });

    it('should use plural labels for post-branch stages', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const refitNode = nodes.find((n) => n.id === 'training__refit_full');
      expect(refitNode?.label).toBe('Refit models');

      const evalNode = nodes.find((n) => n.id === 'training__evaluate_models');
      expect(evalNode?.label).toBe('Evaluate models');
    });
  });

  describe('branching with steps', () => {
    const branchingWithSteps = makeComponent('training', [
      makeStage('load_data'),
      makeStage('model_selection', {
        selected_models: ['xgboost', 'lightgbm'],
        steps: ['feature_engineering', 'model_training', 'stacking'],
      }),
      makeStage('refit_full'),
    ]);

    it('should emit step nodes in each branch before the model name', () => {
      const stageMap = makeStageMap([branchingWithSteps]);
      const nodes = buildStageMapTopology(stageMap);

      const nodeIds = nodes.map((n) => n.id);

      // Steps in branch-0
      expect(nodeIds).toContain('training__step__feature_engineering__branch-0');
      expect(nodeIds).toContain('training__step__model_training__branch-0');
      expect(nodeIds).toContain('training__step__stacking__branch-0');

      // Steps in branch-1
      expect(nodeIds).toContain('training__step__feature_engineering__branch-1');
      expect(nodeIds).toContain('training__step__model_training__branch-1');
      expect(nodeIds).toContain('training__step__stacking__branch-1');
    });

    it('should chain steps → model within each branch', () => {
      const stageMap = makeStageMap([branchingWithSteps]);
      const nodes = buildStageMapTopology(stageMap);

      const step1 = nodes.find((n) => n.id === 'training__step__feature_engineering__branch-0');
      const step2 = nodes.find((n) => n.id === 'training__step__model_training__branch-0');
      const step3 = nodes.find((n) => n.id === 'training__step__stacking__branch-0');
      const model = nodes.find((n) => n.id === 'training__model__branch-0');

      expect(step1?.runAfterTasks).toEqual(['training__model_selection']);
      expect(step2?.runAfterTasks).toEqual([step1!.id]);
      expect(step3?.runAfterTasks).toEqual([step2!.id]);
      expect(model?.runAfterTasks).toEqual([step3!.id]);
    });

    it('should use step display names', () => {
      const stageMap = makeStageMap([branchingWithSteps]);
      const nodes = buildStageMapTopology(stageMap);

      const step1 = nodes.find((n) => n.id === 'training__step__feature_engineering__branch-0');
      const step2 = nodes.find((n) => n.id === 'training__step__model_training__branch-0');
      const step3 = nodes.find((n) => n.id === 'training__step__stacking__branch-0');

      expect(step1?.label).toBe('Feature engineering');
      expect(step2?.label).toBe('Model training');
      expect(step3?.label).toBe('Stacking');
    });

    it('should use fallback label for unknown step IDs', () => {
      const comp = makeComponent('training', [
        makeStage('model_selection', {
          selected_models: ['m1'],
          steps: ['some_custom_step'],
        }),
        makeStage('refit_full'),
      ]);
      const stageMap = makeStageMap([comp]);
      const nodes = buildStageMapTopology(stageMap);

      const stepNode = nodes.find((n) => n.id.includes('__step__some_custom_step'));
      expect(stepNode?.label).toBe('Some custom step');
    });
  });

  describe('placeholder models', () => {
    const noModelsComponent = makeComponent('training', [
      makeStage('load_data'),
      makeStage('model_selection'),
      makeStage('refit_full'),
      makeStage('evaluate_models'),
      makeStage('build_leaderboard'),
    ]);

    it('should generate placeholder model nodes defaulting to 3', () => {
      const stageMap = makeStageMap([noModelsComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(3);
      expect(modelNodes[0].label).toBe('Model 1');
      expect(modelNodes[1].label).toBe('Model 2');
      expect(modelNodes[2].label).toBe('Model 3');
    });

    it('should use topN parameter for placeholder count', () => {
      const stageMap = makeStageMap([noModelsComponent]);
      const nodes = buildStageMapTopology(stageMap, undefined, undefined, 5);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(5);
    });
  });

  describe('skipped components', () => {
    it('should skip publish_component_stage_map component', () => {
      const stageMap = makeStageMap([
        makeComponent('publish_component_stage_map', [makeStage('write_outputs')]),
        makeComponent('real_component', [makeStage('validate_inputs')]),
      ]);

      const nodes = buildStageMapTopology(stageMap);

      expect(nodes.every((n) => !n.id.startsWith('publish_component_stage_map'))).toBe(true);
      expect(nodes).toHaveLength(1);
    });
  });

  describe('stage display names', () => {
    it('should map known stage IDs to display names', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [
          makeStage('validate_inputs'),
          makeStage('read_and_sample'),
          makeStage('split'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].label).toBe('Validate inputs');
      expect(nodes[1].label).toBe('Read and sample data');
      expect(nodes[2].label).toBe('Split data');
    });

    it('should use fallback label for unknown stage IDs', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('some_unknown_stage')])]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].label).toBe('Some unknown stage');
    });
  });

  describe('run status resolution', () => {
    it('should use inline stage status when available', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [makeStage('validate_inputs', { status: 'completed' })]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Succeeded);
    });

    it('should translate started status to InProgress', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [makeStage('validate_inputs', { status: 'started' })]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.InProgress);
    });

    it('should translate failed status', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [makeStage('validate_inputs', { status: 'failed' })]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Failed);
    });

    it('should translate skipped status', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [makeStage('validate_inputs', { status: 'skipped' })]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Skipped);
    });

    it('should fall back to component run status from runDetails', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('validate_inputs')])]);
      const runDetails = makeRunDetails([{ display_name: 'comp', state: 'SUCCEEDED' }]);

      const nodes = buildStageMapTopology(stageMap, runDetails);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Succeeded);
    });

    it('should fall back to terminal run state', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('validate_inputs')])]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Failed);
    });

    it('should not apply terminal fallback for non-terminal states', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('validate_inputs')])]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'RUNNING');
      expect(nodes[0].data?.runStatus).toBeUndefined();
    });
  });

  describe('component run status from runDetails', () => {
    it('should match task by display_name with underscore-to-dash conversion', () => {
      const stageMap = makeStageMap([makeComponent('data_prep', [makeStage('validate_inputs')])]);
      const runDetails = makeRunDetails([{ display_name: 'data-prep', state: 'RUNNING' }]);

      const nodes = buildStageMapTopology(stageMap, runDetails);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.InProgress);
    });

    it('should fall back to component started_at/completed_at timestamps', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [makeStage('validate_inputs')], {
          completed_at: '2025-01-01T01:00:00Z',
        }),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Succeeded);
    });

    it('should show InProgress when component has started_at but no completed_at', () => {
      const stageMap = makeStageMap([
        makeComponent('comp', [makeStage('validate_inputs')], {
          started_at: '2025-01-01T00:00:00Z',
        }),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.InProgress);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty components', () => {
      const stageMap = makeStageMap([]);
      expect(buildStageMapTopology(stageMap)).toEqual([]);
    });

    it('should handle component with no stages', () => {
      const stageMap = makeStageMap([makeComponent('empty', [])]);
      expect(buildStageMapTopology(stageMap)).toEqual([]);
    });

    it('should handle undefined runDetails and runState', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('validate_inputs')])]);

      const nodes = buildStageMapTopology(stageMap, undefined, undefined);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].data?.runStatus).toBeUndefined();
    });

    it('should not insert spacer when only one branch', () => {
      const stageMap = makeStageMap([
        makeComponent('training', [
          makeStage('model_selection', { selected_models: ['xgboost'] }),
          makeStage('refit_full'),
          makeStage('build_leaderboard'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      const spacers = nodes.filter((n) => n.type === 'DEFAULT_SPACER_NODE');
      expect(spacers).toHaveLength(0);
    });
  });

  describe('placeholder branch status', () => {
    it('should show InProgress for placeholder models when component succeeded', () => {
      const stageMap = makeStageMap([
        makeComponent('training', [makeStage('model_selection'), makeStage('refit_full')], {
          completed_at: '2025-01-01T01:00:00Z',
        }),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      modelNodes.forEach((n) => {
        expect(n.data?.runStatus).toBe(RunStatus.InProgress);
      });
    });
  });
});
