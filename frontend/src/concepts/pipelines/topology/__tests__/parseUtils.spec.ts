/* eslint-disable camelcase */
import { RunStatus } from '@patternfly/react-topology';
import {
  parseInputOutput,
  parseRuntimeInfo,
  translateStatusForNode,
  lowestProgress,
  parseComponentsForArtifactRelationship,
  parseTasksForArtifactRelationship,
} from '~/concepts/pipelines/topology/parseUtils';
import {
  ArtifactType,
  InputDefinitionParameterType,
  PipelineComponentsKF,
  RunDetailsKF,
  RuntimeStateKF,
  TaskDetailKF,
  TaskKF,
  TriggerStrategy,
} from '~/concepts/pipelines/kfTypes';

describe('pipeline topology parseUtils', () => {
  describe('parseInputOutput', () => {
    it('returns undefined when no definition is provided', () => {
      const result = parseInputOutput();
      expect(result).toBeUndefined();
    });

    it('returns data with params when the definition includes parameters', () => {
      const testDefinition = {
        parameters: { 'some-string-param': { parameterType: InputDefinitionParameterType.STRING } },
      };

      const result = parseInputOutput(testDefinition);
      expect(result).toEqual({ params: [{ label: 'some-string-param', type: 'STRING' }] });
    });

    it('returns data with artifacts when the definition includes artifacts', async () => {
      const testDefinition = {
        artifacts: {
          'some-artifact': {
            artifactType: {
              schemaTitle: ArtifactType.ARTIFACT,
              schemaVersion: 'v1',
            },
          },
        },
      };

      const result = parseInputOutput(testDefinition);
      expect(result).toEqual({
        artifacts: [{ label: 'some-artifact', type: 'system.Artifact (v1)' }],
      });
    });
  });

  describe('parseRuntimeInfo', () => {
    const testTaskId = 'test-task-id';

    it('returns undefined when runDetails are not provided', () => {
      const result = parseRuntimeInfo(testTaskId);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no task details are empty', () => {
      const testRunDetails: RunDetailsKF = {
        pipeline_context_id: 'pipeline-context-id',
        pipeline_run_context_id: 'pipeline-run-context-id',
        task_details: [],
      };

      const result = parseRuntimeInfo(testTaskId, testRunDetails);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no task details have no matching display name or execution ID', () => {
      const testRunDetails: RunDetailsKF = {
        pipeline_context_id: 'pipeline-context-id',
        pipeline_run_context_id: 'pipeline-run-context-id',
        task_details: [
          {
            run_id: 'test-run-id',
            task_id: testTaskId,
            create_time: '2024-01-01T00:00:00Z',
            start_time: '2024-01-02T00:00:00Z',
            end_time: '2024-01-03T00:00:00Z',
            state: RuntimeStateKF.FAILED,
          },
        ],
      };

      const result = parseRuntimeInfo(testTaskId, testRunDetails);
      expect(result).toBeUndefined();
    });

    it('returns task run status data when task details exist', () => {
      const testRunDetails: RunDetailsKF = {
        pipeline_context_id: 'pipeline-context-id',
        pipeline_run_context_id: 'pipeline-run-context-id',
        task_details: [
          {
            run_id: 'test-run-id',
            task_id: testTaskId,
            create_time: '2024-01-01T00:00:00Z',
            start_time: '2024-01-02T00:00:00Z',
            end_time: '2024-01-03T00:00:00Z',
            display_name: testTaskId,
            state: RuntimeStateKF.RUNNING,
            child_tasks: [
              {
                task_id: testTaskId,
                pod_name: 'Some pod name',
              },
            ],
          },
        ],
      };

      const result = parseRuntimeInfo(testTaskId, testRunDetails);
      expect(result).toEqual({
        completeTime: '2024-01-03T00:00:00Z',
        podName: 'Some pod name',
        startTime: '2024-01-02T00:00:00Z',
        state: 'RUNNING',
        taskId: 'test-task-id',
      });
    });

    it('returns task run status data based on task details execution ID', () => {
      const testRunDetails: RunDetailsKF = {
        pipeline_context_id: 'pipeline-context-id',
        pipeline_run_context_id: 'pipeline-run-context-id',
        task_details: [
          {
            run_id: 'test-run-id',
            task_id: testTaskId,
            create_time: '2024-01-01T00:00:00Z',
            start_time: '2024-01-02T00:00:00Z',
            end_time: '2024-01-03T00:00:00Z',
            state: RuntimeStateKF.RUNNING,
            execution_id: `${testTaskId}-driver`,
          },
        ],
      };

      const result = parseRuntimeInfo(testTaskId, testRunDetails);
      expect(result).toEqual({
        completeTime: '2024-01-03T00:00:00Z',
        podName: undefined,
        startTime: '2024-01-02T00:00:00Z',
        state: 'RUNNING',
        taskId: 'test-task-id',
      });
    });
  });

  describe('translateStatusForNode', () => {
    it('returns undefined when state is not provided', () => {
      const result = translateStatusForNode();
      expect(result).toBeUndefined();
    });

    it('returns undefined when state does not have a corresponding status', () => {
      const result = translateStatusForNode('some-unknown-state' as RuntimeStateKF);
      expect(result).toBeUndefined();
    });

    it('returns undefined when state is "RUNTIME_STATE_UNSPECIFIED"', () => {
      const result = translateStatusForNode(RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED);
      expect(result).toBeUndefined();
    });

    [
      { state: RuntimeStateKF.CANCELED, status: RunStatus.Cancelled },
      { state: RuntimeStateKF.CANCELING, status: RunStatus.Cancelled },
      { state: RuntimeStateKF.PAUSED, status: RunStatus.Pending },
      { state: RuntimeStateKF.FAILED, status: RunStatus.Failed },
      { state: RuntimeStateKF.PENDING, status: RunStatus.Pending },
      { state: RuntimeStateKF.RUNNING, status: RunStatus.InProgress },
      { state: RuntimeStateKF.SKIPPED, status: RunStatus.Skipped },
      { state: RuntimeStateKF.SUCCEEDED, status: RunStatus.Succeeded },
    ].forEach(({ state, status }) => {
      it(`returns "${status}" with a provided "${state}" state`, () => {
        const result = translateStatusForNode(state);
        expect(result).toBe(status);
      });
    });
  });

  describe('lowestProgress', () => {
    const testTaskId = 'test-task-id';
    const testTaskDetail: TaskDetailKF = {
      run_id: 'test-run-id',
      task_id: testTaskId,
      create_time: '2024-01-01T00:00:00Z',
      start_time: '2024-01-02T00:00:00Z',
      end_time: '2024-01-03T00:00:00Z',
      display_name: testTaskId,
      child_tasks: [
        {
          task_id: testTaskId,
          pod_name: 'Some pod name',
        },
      ],
    };

    it('returns the highest valued state, "FAILED", when task details has all possible states', () => {
      const testTaskDetails = Object.values(RuntimeStateKF).map((state) => ({
        ...testTaskDetail,
        state,
      }));

      const result = lowestProgress(testTaskDetails);
      expect(result).toEqual('FAILED');
    });
  });

  describe('parseComponentsForArtifactRelationship', () => {
    const testComponents: PipelineComponentsKF = {
      'some-component': {
        dag: {
          tasks: {},
        },
        outputDefinitions: {
          artifacts: {
            'artifact-1': {
              artifactType: {
                schemaTitle: ArtifactType.ARTIFACT,
                schemaVersion: 'v1',
              },
            },
            'artifact-2': {
              artifactType: {
                schemaTitle: ArtifactType.DATASET,
                schemaVersion: 'v2',
              },
            },
          },
        },
      },
    };

    it('returns empty object when no component artifacts exist', () => {
      const result = parseComponentsForArtifactRelationship({
        ...testComponents,
        'some-component': {
          ...testComponents['some-component'],
          outputDefinitions: {},
          executorLabel: '',
          dag: undefined,
        },
      });

      expect(result).toEqual({});
    });

    it('returns component artifact map when artifacts are provided', () => {
      const result = parseComponentsForArtifactRelationship(testComponents);

      expect(result).toEqual({
        'some-component': {
          'artifact-1': {
            schemaTitle: 'system.Artifact',
            schemaVersion: 'v1',
          },
          'artifact-2': {
            schemaTitle: 'system.Dataset',
            schemaVersion: 'v2',
          },
        },
      });
    });
  });

  describe('parseTasksForArtifactRelationship', () => {
    const testTasks: Record<string, TaskKF> = {
      'task-1': {
        componentRef: { name: 'comp-task-1' },
        inputs: {
          artifacts: {
            'task-1-artifact-1': {
              taskOutputArtifact: {
                outputArtifactKey: 'task-1-artifact-name',
                producerTask: 'some-dag-task-2',
              },
            },
          },
        },
        taskInfo: { name: 'task-1' },
      },
      'task-2': {
        cachingOptions: { enableCache: true },
        componentRef: { name: 'comp-task-2' },
        dependentTasks: ['task-1'],
        inputs: {
          artifacts: {
            'task-2-artifact-2': {
              taskOutputArtifact: {
                outputArtifactKey: 'task-2-artifact-name',
                producerTask: 'some-dag-task-1',
              },
            },
          },
        },
        taskInfo: { name: 'task-2' },
        triggerPolicy: { strategy: TriggerStrategy.ALL_UPSTREAM_TASKS_SUCCEEDED },
      },
    };
    const consoleWarnSpy = jest.spyOn(global.console, 'warn');

    it('returns empty object when no task artifacts exist', () => {
      const result = parseTasksForArtifactRelationship({
        'task-1': { ...testTasks['task-1'], inputs: {} },
        'task-2': { ...testTasks['task-2'], inputs: {} },
      });
      expect(result).toEqual({});
    });

    it('returns task artifact map when artifacts are provided', () => {
      const result = parseTasksForArtifactRelationship(testTasks);

      expect(result).toEqual({
        'some-dag-task-2': [
          { outputArtifactKey: 'task-1-artifact-name', artifactId: 'task-1-artifact-1' },
        ],
        'some-dag-task-1': [
          { outputArtifactKey: 'task-2-artifact-name', artifactId: 'task-2-artifact-2' },
        ],
      });
    });

    describe('returns warning with unmapped artifact for a task when', () => {
      it('no producerTask is found', () => {
        const result = parseTasksForArtifactRelationship({
          ...testTasks,
          'task-2': {
            ...testTasks['task-2'],
            inputs: {
              artifacts: {
                'task-2-artifact-2': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'task-2-artifact-name',
                    producerTask: '',
                  },
                },
              },
            },
          },
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith('Issue constructing artifact node', {
          taskOutputArtifact: { outputArtifactKey: 'task-2-artifact-name', producerTask: '' },
        });
        expect(result).toEqual({
          'some-dag-task-2': [
            {
              artifactId: 'task-1-artifact-1',
              outputArtifactKey: 'task-1-artifact-name',
            },
          ],
        });
      });

      it('no outputArtifactKey is found', () => {
        const result = parseTasksForArtifactRelationship({
          ...testTasks,
          'task-2': {
            ...testTasks['task-2'],
            inputs: {
              artifacts: {
                'task-2-artifact-2': {
                  taskOutputArtifact: {
                    outputArtifactKey: '',
                    producerTask: 'some-dag-task-1',
                  },
                },
              },
            },
          },
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith('Issue constructing artifact node', {
          taskOutputArtifact: { outputArtifactKey: '', producerTask: 'some-dag-task-1' },
        });
        expect(result).toEqual({
          'some-dag-task-2': [
            {
              artifactId: 'task-1-artifact-1',
              outputArtifactKey: 'task-1-artifact-name',
            },
          ],
        });
      });

      it('no taskOutputArtifact is found', () => {
        const result = parseTasksForArtifactRelationship({
          'task-1': {
            ...testTasks['task-1'],
            inputs: {
              artifacts: {
                'task-1-artifact-1': {},
              },
            },
          },
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith('Issue constructing artifact node', {});
        expect(result).toEqual({});
      });
    });
  });
});
