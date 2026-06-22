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
        makeComponent('test_data_loader', [
          makeStage('validate_inputs'),
          makeStage('download_and_sample'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe('test_data_loader__validate_inputs');
      expect(nodes[0].label).toBe('Validate inputs');
      expect(nodes[0].runAfterTasks).toEqual([]);
      expect(nodes[1].id).toBe('test_data_loader__download_and_sample');
      expect(nodes[1].label).toBe('Download and sample');
      expect(nodes[1].runAfterTasks).toEqual(['test_data_loader__validate_inputs']);
    });

    it('should chain across multiple components', () => {
      const stageMap = makeStageMap([
        makeComponent('test_data_loader', [makeStage('validate_inputs')]),
        makeComponent('documents_discovery', [makeStage('list_and_sample')]),
      ]);

      const nodes = buildStageMapTopology(stageMap);

      expect(nodes).toHaveLength(2);
      expect(nodes[1].runAfterTasks).toEqual(['test_data_loader__validate_inputs']);
    });
  });

  describe('branching stages', () => {
    const branchingComponent = makeComponent('rag_optimization', [
      makeStage('validate_inputs'),
      makeStage('optimize_templates', { selected_patterns: ['pattern_a', 'pattern_b'] }),
      makeStage('run_optimization'),
      makeStage('write_patterns'),
      makeStage('build_leaderboard'),
    ]);

    it('should create pre-branch, branch, and post-branch nodes', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const nodeIds = nodes.map((n) => n.id);

      // Pre-branch: validate_inputs, optimize_templates
      expect(nodeIds).toContain('rag_optimization__validate_inputs');
      expect(nodeIds).toContain('rag_optimization__optimize_templates');

      // Branch pattern name nodes
      expect(nodeIds).toContain('rag_optimization__pattern__branch-0');
      expect(nodeIds).toContain('rag_optimization__pattern__branch-1');

      // Post-branch (linear, not per-branch)
      expect(nodeIds).toContain('rag_optimization__run_optimization');
      expect(nodeIds).toContain('rag_optimization__write_patterns');
      expect(nodeIds).toContain('rag_optimization__build_leaderboard');
    });

    it('should use real pattern names as labels', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const patternNodes = nodes.filter(
        (n) => n.id.includes('__pattern__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(patternNodes[0].label).toBe('pattern_a');
      expect(patternNodes[1].label).toBe('pattern_b');
    });

    it('should fan out from optimize_templates node', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const patternNodes = nodes.filter(
        (n) => n.id.includes('__pattern__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(patternNodes[0].runAfterTasks).toEqual(['rag_optimization__optimize_templates']);
      expect(patternNodes[1].runAfterTasks).toEqual(['rag_optimization__optimize_templates']);
    });

    it('should insert convergence spacer before post-branch stages', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const spacer = nodes.find((n) => n.type === 'DEFAULT_SPACER_NODE');
      expect(spacer).toBeDefined();

      const optimizeNode = nodes.find((n) => n.id === 'rag_optimization__run_optimization');
      expect(optimizeNode?.runAfterTasks).toEqual([spacer!.id]);
    });

    it('should use post-branch stage labels', () => {
      const stageMap = makeStageMap([branchingComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const optimizeNode = nodes.find((n) => n.id === 'rag_optimization__run_optimization');
      expect(optimizeNode?.label).toBe('Run optimization');

      const writePatternsNode = nodes.find((n) => n.id === 'rag_optimization__write_patterns');
      expect(writePatternsNode?.label).toBe('Write patterns');
    });
  });

  describe('branching with steps', () => {
    const branchingWithSteps = makeComponent('rag_optimization', [
      makeStage('validate_inputs'),
      makeStage('optimize_templates', {
        selected_patterns: ['pattern_a', 'pattern_b'],
        steps: ['chunking', 'embedding', 'retrieval'],
      }),
      makeStage('run_optimization'),
    ]);

    it('should emit step nodes in each branch before the pattern name', () => {
      const stageMap = makeStageMap([branchingWithSteps]);
      const nodes = buildStageMapTopology(stageMap);

      const nodeIds = nodes.map((n) => n.id);

      expect(nodeIds).toContain('rag_optimization__step__chunking__branch-0');
      expect(nodeIds).toContain('rag_optimization__step__embedding__branch-0');
      expect(nodeIds).toContain('rag_optimization__step__retrieval__branch-0');

      expect(nodeIds).toContain('rag_optimization__step__chunking__branch-1');
      expect(nodeIds).toContain('rag_optimization__step__embedding__branch-1');
      expect(nodeIds).toContain('rag_optimization__step__retrieval__branch-1');
    });

    it('should chain steps → pattern within each branch', () => {
      const stageMap = makeStageMap([branchingWithSteps]);
      const nodes = buildStageMapTopology(stageMap);

      const step1 = nodes.find((n) => n.id === 'rag_optimization__step__chunking__branch-0');
      const step2 = nodes.find((n) => n.id === 'rag_optimization__step__embedding__branch-0');
      const step3 = nodes.find((n) => n.id === 'rag_optimization__step__retrieval__branch-0');
      const pattern = nodes.find((n) => n.id === 'rag_optimization__pattern__branch-0');

      expect(step1?.runAfterTasks).toEqual(['rag_optimization__optimize_templates']);
      expect(step2?.runAfterTasks).toEqual([step1!.id]);
      expect(step3?.runAfterTasks).toEqual([step2!.id]);
      expect(pattern?.runAfterTasks).toEqual([step3!.id]);
    });

    it('should use step display names', () => {
      const stageMap = makeStageMap([branchingWithSteps]);
      const nodes = buildStageMapTopology(stageMap);

      const step1 = nodes.find((n) => n.id === 'rag_optimization__step__chunking__branch-0');
      const step2 = nodes.find((n) => n.id === 'rag_optimization__step__embedding__branch-0');
      const step3 = nodes.find((n) => n.id === 'rag_optimization__step__retrieval__branch-0');

      expect(step1?.label).toBe('Chunking');
      expect(step2?.label).toBe('Embedding');
      expect(step3?.label).toBe('Retrieval');
    });

    it('should use fallback label for unknown step IDs', () => {
      const comp = makeComponent('rag_optimization', [
        makeStage('optimize_templates', {
          selected_patterns: ['p1'],
          steps: ['some_custom_step'],
        }),
        makeStage('run_optimization'),
      ]);
      const stageMap = makeStageMap([comp]);
      const nodes = buildStageMapTopology(stageMap);

      const stepNode = nodes.find((n) => n.id.includes('__step__some_custom_step'));
      expect(stepNode?.label).toBe('Some custom step');
    });
  });

  describe('placeholder patterns', () => {
    const noPatternsComponent = makeComponent('rag_optimization', [
      makeStage('validate_inputs'),
      makeStage('optimize_templates'),
      makeStage('run_optimization'),
      makeStage('write_patterns'),
      makeStage('build_leaderboard'),
    ]);

    it('should generate placeholder pattern nodes defaulting to 3', () => {
      const stageMap = makeStageMap([noPatternsComponent]);
      const nodes = buildStageMapTopology(stageMap);

      const patternNodes = nodes.filter(
        (n) => n.id.includes('__pattern__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(patternNodes).toHaveLength(3);
      expect(patternNodes[0].label).toBe('Pattern 1');
      expect(patternNodes[1].label).toBe('Pattern 2');
      expect(patternNodes[2].label).toBe('Pattern 3');
    });

    it('should use maxPatterns parameter for placeholder count', () => {
      const stageMap = makeStageMap([noPatternsComponent]);
      const nodes = buildStageMapTopology(stageMap, undefined, undefined, 5);

      const patternNodes = nodes.filter(
        (n) => n.id.includes('__pattern__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      expect(patternNodes).toHaveLength(5);
    });
  });

  describe('skipped components', () => {
    it('should skip publish_component_stage_map component', () => {
      const stageMap = makeStageMap([
        makeComponent('publish_component_stage_map', [makeStage('write_output')]),
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
          makeStage('download_and_sample'),
          makeStage('extract_documents'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      expect(nodes[0].label).toBe('Validate inputs');
      expect(nodes[1].label).toBe('Download and sample');
      expect(nodes[2].label).toBe('Extract documents');
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
      const stageMap = makeStageMap([
        makeComponent('test_data_loader', [makeStage('validate_inputs')]),
      ]);
      const runDetails = makeRunDetails([{ display_name: 'test-data-loader', state: 'RUNNING' }]);

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
        makeComponent('rag_optimization', [
          makeStage('optimize_templates', { selected_patterns: ['pattern_a'] }),
          makeStage('run_optimization'),
          makeStage('build_leaderboard'),
        ]),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      const spacers = nodes.filter((n) => n.type === 'DEFAULT_SPACER_NODE');
      expect(spacers).toHaveLength(0);
    });
  });

  describe('placeholder branch status', () => {
    it('should show InProgress for placeholder patterns when component succeeded', () => {
      const stageMap = makeStageMap([
        makeComponent(
          'rag_optimization',
          [makeStage('optimize_templates'), makeStage('run_optimization')],
          { completed_at: '2025-01-01T01:00:00Z' },
        ),
      ]);

      const nodes = buildStageMapTopology(stageMap);
      const patternNodes = nodes.filter(
        (n) => n.id.includes('__pattern__') && n.type !== 'DEFAULT_SPACER_NODE',
      );
      patternNodes.forEach((n) => {
        expect(n.data?.runStatus).toBe(RunStatus.InProgress);
      });
    });
  });
});
