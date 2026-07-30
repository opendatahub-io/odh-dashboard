/* eslint-disable camelcase */
import { RunStatus } from '@patternfly/react-topology';
import {
  ComponentStageMap,
  ComponentStageMapComponent,
  ComponentStageMapStage,
} from '~/app/hooks/useComponentStageMap';
import { RunDetailsKF } from '~/app/types/pipeline';
import { buildStageMapTopology } from '~/app/topology/buildStageMapTopology';
import { MAX_MODEL_SELECTION_STEPS } from '~/app/topology/stageMapConstants';
import { MAX_CONFIGURE_TOP_N } from '~/app/topology/stageMapStatus';

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
  createNode: ({
    id,
    label,
    pipelineTask,
    runAfterTasks,
    runStatus,
    activeIconVariant,
  }: {
    id: string;
    label: string;
    pipelineTask: unknown;
    runAfterTasks?: string[];
    runStatus?: string;
    activeIconVariant?: string;
  }) => ({
    id,
    label,
    type: 'DEFAULT_TASK_NODE',
    width: 100,
    height: 30,
    runAfterTasks,
    data: { pipelineTask, runStatus, activeIconVariant },
  }),
}));

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
  tasks: { display_name?: string; state: string; task_id?: string }[],
): RunDetailsKF =>
  ({
    task_details: tasks.map((t) => {
      const taskId = t.task_id ?? t.display_name ?? 'unknown-task';
      return {
        display_name: t.display_name ?? taskId,
        task_id: taskId,
        state: t.state,
        start_time: '',
        end_time: '',
      };
    }),
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

    it('should cap branch step expansion to MAX_MODEL_SELECTION_STEPS', () => {
      const oversizedSteps = Array.from(
        { length: MAX_MODEL_SELECTION_STEPS + 5 },
        (_, index) => `custom_step_${index}`,
      );
      const component = makeComponent('training', [
        makeStage('load_data'),
        makeStage('model_selection', {
          selected_models: ['xgboost'],
          steps: oversizedSteps,
        }),
        makeStage('refit_full'),
      ]);
      const nodes = buildStageMapTopology(makeStageMap([component]));
      const branchStepNodes = nodes.filter((node) => node.id.includes('__step__'));

      expect(branchStepNodes).toHaveLength(MAX_MODEL_SELECTION_STEPS);
      expect(branchStepNodes.map((node) => node.id)).toEqual(
        oversizedSteps
          .slice(0, MAX_MODEL_SELECTION_STEPS)
          .map((stepId) => `training__step__${stepId}__branch-0`),
      );
    });

    it('should dedupe repeated step IDs while preserving first-seen order', () => {
      const component = makeComponent('training', [
        makeStage('load_data'),
        makeStage('model_selection', {
          selected_models: ['xgboost', 'lightgbm'],
          steps: ['feature_engineering', 'model_training', 'model_training', 'stacking'],
        }),
        makeStage('refit_full'),
      ]);
      const nodes = buildStageMapTopology(makeStageMap([component]));
      const branchStepIds = nodes
        .filter((node) => node.id.includes('__step__'))
        .map((node) => node.id);

      expect(branchStepIds.filter((id) => id.endsWith('__branch-0'))).toEqual([
        'training__step__feature_engineering__branch-0',
        'training__step__model_training__branch-0',
        'training__step__stacking__branch-0',
      ]);
      expect(branchStepIds.filter((id) => id.endsWith('__branch-1'))).toEqual([
        'training__step__feature_engineering__branch-1',
        'training__step__model_training__branch-1',
        'training__step__stacking__branch-1',
      ]);
      expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
    });

    it('should assign sync only to the first in-progress mapped stage across branches', () => {
      const comp = makeComponent(
        'training',
        [
          makeStage('load_data', { status: 'started' }),
          makeStage('model_selection', {
            selected_models: ['m1', 'm2'],
            steps: ['feature_engineering', 'model_training'],
          }),
          makeStage('refit_full'),
          makeStage('evaluate_models'),
        ],
        { started_at: '2025-01-01T00:00:00Z' },
      );
      const stageMap = makeStageMap([comp]);
      const nodes = buildStageMapTopology(stageMap);

      const syncNodes = nodes.filter((n) => n.data?.activeIconVariant === 'sync');
      expect(syncNodes).toHaveLength(1);
      expect(syncNodes[0]?.id).toBe('training__load_data');

      // Without explicit model_selection stage status, post-branch follows the coarse
      // component-level RUNNING state instead of staying pending.
      const refitNode = nodes.find((n) => n.id === 'training__refit_full');
      const evalNode = nodes.find((n) => n.id === 'training__evaluate_models');
      expect(refitNode?.data?.runStatus).toBe(RunStatus.InProgress);
      expect(evalNode?.data?.runStatus).toBe(RunStatus.InProgress);
    });

    it('should pulse branch steps while model selection runs and succeed model nodes when it completes', () => {
      const comp = makeComponent(
        'training',
        [
          makeStage('load_data', { status: 'completed' }),
          makeStage('model_selection', {
            status: 'started',
            selected_models: ['m1', 'm2'],
            steps: ['feature_engineering', 'model_training'],
          }),
          makeStage('refit_full'),
          makeStage('build_leaderboard'),
        ],
        { started_at: '2025-01-01T00:00:00Z' },
      );
      const stageMap = makeStageMap([comp]);
      const nodes = buildStageMapTopology(stageMap);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      modelNodes.forEach((node) => {
        expect(node.data?.runStatus).toBe(RunStatus.InProgress);
      });

      // model_selection is the sole sync; every in-progress branch child/model must pulse
      const syncNodes = nodes.filter((n) => n.data?.activeIconVariant === 'sync');
      expect(syncNodes).toHaveLength(1);
      expect(syncNodes[0]?.id).toBe('training__model_selection');

      const branchChildren = nodes.filter(
        (n) =>
          (n.id.includes('__step__') || n.id.includes('__model__')) &&
          n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(branchChildren.length).toBeGreaterThan(0);
      branchChildren.forEach((node) => {
        expect(node.data?.activeIconVariant).toBe('pulse');
      });

      // Explicit model_selection stage status lets us keep post-branch pending until the
      // branch phase finishes.
      const buildNode = nodes.find((n) => n.id === 'training__build_leaderboard');
      expect(buildNode?.data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should mark placeholder model nodes succeeded once model selection completes', () => {
      const comp = makeComponent(
        'training',
        [
          makeStage('load_data', { status: 'completed' }),
          makeStage('model_selection', { status: 'completed' }),
          makeStage('refit_full', { status: 'started' }),
          makeStage('build_leaderboard'),
        ],
        { started_at: '2025-01-01T00:00:00Z' },
      );
      const stageMap = makeStageMap([comp]);
      const nodes = buildStageMapTopology(stageMap);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      modelNodes.forEach((node) => {
        expect(node.data?.runStatus).toBe(RunStatus.Succeeded);
      });

      const refitNode = nodes.find((n) => n.id === 'training__refit_full');
      const buildNode = nodes.find((n) => n.id === 'training__build_leaderboard');
      expect(refitNode?.data?.runStatus).toBe(RunStatus.InProgress);
      // Only the current post-branch frontier runs; later stages stay pending.
      expect(buildNode?.data?.runStatus).toBe(RunStatus.Pending);
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

    it('should retain branch connectivity when topN is zero or invalid', () => {
      const stageMap = makeStageMap([noModelsComponent]);

      const nodesForZero = buildStageMapTopology(stageMap, undefined, undefined, 0);
      const modelNodesForZero = nodesForZero.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodesForZero).toHaveLength(1);

      const postBranchNode = nodesForZero.find((n) => n.id.includes('__refit_full'));
      expect(postBranchNode?.runAfterTasks).toEqual([modelNodesForZero[0].id]);

      const nodesForNaN = buildStageMapTopology(stageMap, undefined, undefined, Number.NaN);
      const modelNodesForNaN = nodesForNaN.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodesForNaN).toHaveLength(3);
    });

    it('should clamp topN to the configure UI maximum', () => {
      const stageMap = makeStageMap([noModelsComponent]);
      const nodes = buildStageMapTopology(stageMap, undefined, undefined, MAX_CONFIGURE_TOP_N + 5);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(MAX_CONFIGURE_TOP_N);
    });

    it('should clamp API-derived selected_models to the configure UI maximum', () => {
      const oversizedSelectedModels = Array.from(
        { length: MAX_CONFIGURE_TOP_N + 5 },
        (_, i) => `Model_${i + 1}`,
      );
      const componentWithOversizedSelectedModels = makeComponent('training', [
        makeStage('load_data'),
        { ...makeStage('model_selection'), selected_models: oversizedSelectedModels },
        makeStage('refit_full'),
      ]);
      const stageMap = makeStageMap([componentWithOversizedSelectedModels]);
      const nodes = buildStageMapTopology(stageMap, undefined, undefined, MAX_CONFIGURE_TOP_N + 5);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(MAX_CONFIGURE_TOP_N);
      expect(modelNodes[0].label).toBe(oversizedSelectedModels[0]);
      expect(modelNodes[MAX_CONFIGURE_TOP_N - 1].label).toBe(
        oversizedSelectedModels[MAX_CONFIGURE_TOP_N - 1],
      );
    });

    it('should dedupe selected_models before clamping to the configure UI maximum', () => {
      const uniqueSurvivingModel = 'UniqueSurvivingModel';
      const selectedModelsWithDuplicates = [
        ...Array.from({ length: MAX_CONFIGURE_TOP_N }, () => 'DuplicateModel'),
        uniqueSurvivingModel,
        ...Array.from({ length: MAX_CONFIGURE_TOP_N - 2 }, (_, i) => `ExtraModel_${i + 1}`),
      ];
      const componentWithDuplicateSelectedModels = makeComponent('training', [
        makeStage('load_data'),
        { ...makeStage('model_selection'), selected_models: selectedModelsWithDuplicates },
        makeStage('refit_full'),
      ]);
      const stageMap = makeStageMap([componentWithDuplicateSelectedModels]);
      const nodes = buildStageMapTopology(stageMap, undefined, undefined, MAX_CONFIGURE_TOP_N + 5);

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(MAX_CONFIGURE_TOP_N);
      expect(modelNodes.map((node) => node.label)).toContain(uniqueSurvivingModel);
      expect(modelNodes[0].label).toBe('DuplicateModel');
      expect(modelNodes[1].label).toBe(uniqueSurvivingModel);
    });

    it('should clamp oversized leaderboard model names to the configure UI maximum', () => {
      const oversizedLeaderboardNames = Array.from(
        { length: MAX_CONFIGURE_TOP_N + 5 },
        (_, i) => `LeaderboardModel_${i + 1}`,
      );
      const stageMap = makeStageMap([noModelsComponent]);
      const nodes = buildStageMapTopology(
        stageMap,
        undefined,
        undefined,
        MAX_CONFIGURE_TOP_N + 5,
        oversizedLeaderboardNames,
      );

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(MAX_CONFIGURE_TOP_N);
      expect(modelNodes[0].label).toBe(oversizedLeaderboardNames[0]);
      expect(modelNodes[MAX_CONFIGURE_TOP_N - 1].label).toBe(
        oversizedLeaderboardNames[MAX_CONFIGURE_TOP_N - 1],
      );
    });

    it('should dedupe leaderboard model names before clamping to the configure UI maximum', () => {
      const uniqueSurvivingModel = 'UniqueLeaderboardModel';
      const leaderboardNamesWithDuplicates = [
        ...Array.from({ length: MAX_CONFIGURE_TOP_N }, () => 'DuplicateLeaderboardModel'),
        uniqueSurvivingModel,
        ...Array.from(
          { length: MAX_CONFIGURE_TOP_N - 2 },
          (_, i) => `ExtraLeaderboardModel_${i + 1}`,
        ),
      ];
      const stageMap = makeStageMap([noModelsComponent]);
      const nodes = buildStageMapTopology(
        stageMap,
        undefined,
        undefined,
        MAX_CONFIGURE_TOP_N + 5,
        leaderboardNamesWithDuplicates,
      );

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(MAX_CONFIGURE_TOP_N);
      expect(modelNodes.map((node) => node.label)).toContain(uniqueSurvivingModel);
      expect(modelNodes[0].label).toBe('DuplicateLeaderboardModel');
      expect(modelNodes[1].label).toBe(uniqueSurvivingModel);
    });

    it('should use leaderboard model names when selected_models is absent', () => {
      const stageMap = makeStageMap([noModelsComponent]);
      const leaderboardNames = ['RecursiveTabular_FULL', 'Theta_FULL', 'WeightedEnsemble_FULL'];
      const nodes = buildStageMapTopology(
        stageMap,
        undefined,
        undefined,
        undefined,
        leaderboardNames,
      );

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(3);
      expect(modelNodes[0].label).toBe('RecursiveTabular_FULL');
      expect(modelNodes[1].label).toBe('Theta_FULL');
      expect(modelNodes[2].label).toBe('WeightedEnsemble_FULL');
    });

    it('should prefer selected_models over leaderboard model names', () => {
      const componentWithSelectedModels = makeComponent('training', [
        makeStage('load_data'),
        { ...makeStage('model_selection'), selected_models: ['ModelA', 'ModelB'] },
        makeStage('refit_full'),
      ]);
      const stageMap = makeStageMap([componentWithSelectedModels]);
      const leaderboardNames = ['RecursiveTabular_FULL', 'Theta_FULL'];
      const nodes = buildStageMapTopology(
        stageMap,
        undefined,
        undefined,
        undefined,
        leaderboardNames,
      );

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(2);
      expect(modelNodes[0].label).toBe('ModelA');
      expect(modelNodes[1].label).toBe('ModelB');
    });

    it('should show terminal status on placeholder model nodes when run is cancelled', () => {
      const stageMap = makeStageMap([noModelsComponent]);
      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');

      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(modelNodes).toHaveLength(3);
      modelNodes.forEach((node) => {
        expect(node.data?.runStatus).toBe(RunStatus.Failed);
      });
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

    it('should mark unreached stages failed when the run failed without granular status', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('validate_inputs')])]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Failed);
    });

    it('should mark only the failed stage and keep later stages pending within a component', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'data_prep',
          [
            makeStage('validate_inputs', { status: 'failed' }),
            makeStage('read_and_sample'),
            makeStage('split'),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Failed);
      expect(nodes[1].data?.runStatus).toBe(RunStatus.Pending);
      expect(nodes[2].data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should honor explicit failed status on stages after an earlier failure', () => {
      const stageMap = makeStageMap([
        makeComponent('data_prep', [
          makeStage('validate_inputs', { status: 'failed', timestamp: '2025-01-01T00:00:00Z' }),
          makeStage('split', { status: 'failed', timestamp: '2025-01-01T00:00:21Z' }),
          makeStage('write_outputs'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Failed);
      expect(nodes[1].data?.runStatus).toBe(RunStatus.Failed);
      expect(nodes[2].data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should keep later components pending after an early component failure', () => {
      const stageMap = makeStageMap([
        makeComponent('data_prep', [makeStage('validate_inputs', { status: 'failed' })]),
        makeComponent(
          'training',
          [
            makeStage('load_data'),
            makeStage('model_selection', {
              steps: ['feature_engineering', 'model_training'],
            }),
            makeStage('refit_full'),
            makeStage('build_leaderboard'),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

      expect(byId.data_prep__validate_inputs.data?.runStatus).toBe(RunStatus.Failed);
      expect(byId.training__load_data.data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__model_selection.data?.runStatus).toBe(RunStatus.Pending);
      expect(byId['training__step__feature_engineering__branch-0'].data?.runStatus).toBe(
        RunStatus.Pending,
      );
      expect(byId['training__model__branch-0'].data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__refit_full.data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__build_leaderboard.data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should keep branch and post-branch stages pending when model selection fails', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'training',
          [
            makeStage('load_data', { status: 'completed' }),
            makeStage('model_selection', {
              status: 'failed',
              steps: ['feature_engineering', 'model_training'],
            }),
            makeStage('refit_full'),
            makeStage('build_leaderboard'),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

      expect(byId.training__load_data.data?.runStatus).toBe(RunStatus.Succeeded);
      expect(byId.training__model_selection.data?.runStatus).toBe(RunStatus.Failed);
      expect(byId['training__step__feature_engineering__branch-0'].data?.runStatus).toBe(
        RunStatus.Pending,
      );
      expect(byId['training__model__branch-0'].data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__refit_full.data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__build_leaderboard.data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should keep branch and post-branch stages pending when a pre-branch stage fails inline', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'training',
          [
            makeStage('load_data', { status: 'failed' }),
            makeStage('model_selection', {
              steps: ['feature_engineering', 'model_training'],
            }),
            makeStage('refit_full'),
            makeStage('build_leaderboard'),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'FAILED');
      const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

      expect(byId.training__load_data.data?.runStatus).toBe(RunStatus.Failed);
      expect(byId.training__model_selection.data?.runStatus).toBe(RunStatus.Pending);
      expect(byId['training__step__feature_engineering__branch-0'].data?.runStatus).toBe(
        RunStatus.Pending,
      );
      expect(byId['training__model__branch-0'].data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__refit_full.data?.runStatus).toBe(RunStatus.Pending);
      expect(byId.training__build_leaderboard.data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should mark all stages in a failed component when no inline stage status exists', () => {
      const stageMap = makeStageMap([
        makeComponent('automl_data_loader', [
          makeStage('prepare_data'),
          makeStage('split_and_export'),
        ]),
        makeComponent('autogluon_models_training', [
          makeStage('load_data'),
          makeStage('model_selection', {
            steps: ['feature_engineering', 'model_training'],
          }),
          makeStage('refit_full'),
        ]),
        makeComponent('leaderboard_evaluation', [makeStage('build_leaderboard')]),
      ]);
      const runDetails = makeRunDetails([
        { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
        { task_id: 'autogluon-models-training-2', state: 'FAILED' },
      ]);

      const nodes = buildStageMapTopology(stageMap, runDetails, 'FAILED');
      const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

      expect(byId.automl_data_loader__prepare_data.data?.runStatus).toBe(RunStatus.Succeeded);
      expect(byId.autogluon_models_training__load_data.data?.runStatus).toBe(RunStatus.Failed);
      expect(byId.autogluon_models_training__model_selection.data?.runStatus).toBe(
        RunStatus.Failed,
      );
      expect(
        byId['autogluon_models_training__step__feature_engineering__branch-0'].data?.runStatus,
      ).toBe(RunStatus.Failed);
      expect(byId['autogluon_models_training__model__branch-0'].data?.runStatus).toBe(
        RunStatus.Failed,
      );
      expect(byId.autogluon_models_training__refit_full.data?.runStatus).toBe(RunStatus.Failed);
      expect(byId.leaderboard_evaluation__build_leaderboard.data?.runStatus).toBe(
        RunStatus.Pending,
      );
    });

    it('should mark canceled component stages and keep downstream components pending', () => {
      const stageMap = makeStageMap([
        makeComponent('automl_data_loader', [
          makeStage('prepare_data'),
          makeStage('split_and_export'),
        ]),
        makeComponent('autogluon_models_training', [
          makeStage('load_data'),
          makeStage('model_selection', {
            steps: ['feature_engineering', 'model_training'],
          }),
          makeStage('refit_full'),
        ]),
        makeComponent('leaderboard_evaluation', [makeStage('build_leaderboard')]),
      ]);
      const runDetails = makeRunDetails([
        { task_id: 'automl-data-loader', state: 'SUCCEEDED' },
        { task_id: 'autogluon-models-training-2', state: 'CANCELED' },
      ]);

      const nodes = buildStageMapTopology(stageMap, runDetails, 'CANCELED');
      const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

      expect(byId.automl_data_loader__prepare_data.data?.runStatus).toBe(RunStatus.Succeeded);
      expect(byId.autogluon_models_training__load_data.data?.runStatus).toBe(RunStatus.Cancelled);
      expect(byId.autogluon_models_training__model_selection.data?.runStatus).toBe(
        RunStatus.Cancelled,
      );
      expect(
        byId['autogluon_models_training__step__feature_engineering__branch-0'].data?.runStatus,
      ).toBe(RunStatus.Cancelled);
      expect(byId['autogluon_models_training__model__branch-0'].data?.runStatus).toBe(
        RunStatus.Cancelled,
      );
      expect(byId.autogluon_models_training__refit_full.data?.runStatus).toBe(RunStatus.Cancelled);
      expect(byId.leaderboard_evaluation__build_leaderboard.data?.runStatus).toBe(
        RunStatus.Pending,
      );
    });

    it('should keep unreached stages pending for non-terminal runs', () => {
      const stageMap = makeStageMap([makeComponent('comp', [makeStage('validate_inputs')])]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'RUNNING');
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should promote remaining stages within the current component after a completed predecessor', () => {
      const stageMap = makeStageMap([
        makeComponent('data_prep', [
          makeStage('validate_inputs', { status: 'completed' }),
          makeStage('cleanse'),
          makeStage('split_data'),
        ]),
        makeComponent('training', [makeStage('load_data')]),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'RUNNING');
      const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

      expect(byId.data_prep__validate_inputs.data?.runStatus).toBe(RunStatus.Succeeded);
      expect(byId.data_prep__cleanse.data?.runStatus).toBe(RunStatus.InProgress);
      expect(byId.data_prep__cleanse.data?.activeIconVariant).toBe('sync');
      expect(byId.data_prep__split_data.data?.runStatus).toBe(RunStatus.InProgress);
      expect(byId.data_prep__split_data.data?.activeIconVariant).toBe('pulse');
      // Later components stay pending until this component finishes.
      expect(byId.training__load_data.data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should promote all stages of the next component after the previous component completes', () => {
      const stageMap = makeStageMap([
        makeComponent('data_prep', [makeStage('validate_inputs', { status: 'completed' })], {
          completed_at: '2025-01-01T01:00:00Z',
        }),
        makeComponent('training', [
          makeStage('load_data'),
          makeStage('model_selection', {
            selected_models: ['m1'],
            steps: ['feature_engineering'],
          }),
          makeStage('refit_full'),
          makeStage('build_leaderboard'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap, undefined, 'RUNNING');
      const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

      expect(byId.data_prep__validate_inputs.data?.runStatus).toBe(RunStatus.Succeeded);
      expect(byId.training__load_data.data?.runStatus).toBe(RunStatus.InProgress);
      expect(byId.training__load_data.data?.activeIconVariant).toBe('sync');
      expect(byId.training__model_selection.data?.runStatus).toBe(RunStatus.InProgress);
      expect(byId['training__step__feature_engineering__branch-0'].data?.runStatus).toBe(
        RunStatus.InProgress,
      );
      expect(byId['training__model__branch-0'].data?.runStatus).toBe(RunStatus.InProgress);
      expect(byId.training__refit_full.data?.runStatus).toBe(RunStatus.InProgress);
      expect(byId.training__build_leaderboard.data?.runStatus).toBe(RunStatus.InProgress);
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

    it('should assign sync only to the first in-progress mapped stage', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'comp',
          [makeStage('validate_inputs'), makeStage('load_data'), makeStage('split_data')],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes).toHaveLength(3);
      expect(nodes[0].data?.runStatus).toBe(RunStatus.InProgress);
      expect(nodes[0].data?.activeIconVariant).toBe('sync');
      expect(nodes[1].data?.runStatus).toBe(RunStatus.InProgress);
      expect(nodes[2].data?.runStatus).toBe(RunStatus.InProgress);
    });

    it('should keep later stages pending when an earlier stage is explicitly started', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'comp',
          [
            makeStage('validate_inputs', { status: 'completed' }),
            makeStage('load_data', { status: 'started' }),
            makeStage('split_data'),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].data?.activeIconVariant).toBeUndefined();
      expect(nodes[1].data?.activeIconVariant).toBe('sync');
      expect(nodes[2].data?.runStatus).toBe(RunStatus.Pending);
    });

    it('should assign sync only once when multiple stages report inline started status', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'comp',
          [
            makeStage('validate_inputs', { status: 'started' }),
            makeStage('load_data', { status: 'started' }),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      const syncNodes = nodes.filter((n) => n.data?.activeIconVariant === 'sync');

      expect(syncNodes).toHaveLength(1);
      expect(syncNodes[0]?.id).toBe('comp__validate_inputs');
      expect(nodes.find((n) => n.id === 'comp__load_data')?.data?.activeIconVariant).toBe('pulse');
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
      expect(nodes[0].data?.runStatus).toBe(RunStatus.Pending);
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
    it('should mirror model selection status for placeholder model nodes', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'training',
          [
            makeStage('model_selection', { status: 'completed' }),
            makeStage('refit_full', { status: 'started' }),
          ],
          { started_at: '2025-01-01T00:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      const modelNodes = nodes.filter(
        (n) => n.id.includes('__model__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      modelNodes.forEach((n) => {
        expect(n.data?.runStatus).toBe(RunStatus.Succeeded);
      });
    });
  });
});
