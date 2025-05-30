/* eslint-disable camelcase */
import { RunStatus } from '@patternfly/react-topology';
import {
  parseInputOutput,
  translateStatusForNode,
  lowestProgress,
  parseComponentsForArtifactRelationship,
  parseTasksForArtifactRelationship,
  parseRuntimeInfoFromRunDetails,
  getResourceStateText,
  ResourceType,
  parseRuntimeInfoFromExecutions,
  parseVolumeMounts,
  getExecutionLinkedArtifactMap,
} from '#~/concepts/pipelines/topology/parseUtils';
import {
  ArtifactStateKF,
  ArtifactType,
  ExecutionStateKF,
  InputDefinitionParameterType,
  PipelineComponentsKF,
  PlatformSpec,
  RunDetailsKF,
  RuntimeStateKF,
  TaskDetailKF,
  TaskKF,
  TriggerStrategy,
} from '#~/concepts/pipelines/kfTypes';
import { Artifact, Execution, Value, Event } from '#~/third_party/mlmd';

describe('pipeline topology parseUtils', () => {
  describe('parseInputOutput', () => {
    it('returns data with params when the definition includes parameters', () => {
      const testDefinition = {
        parameters: { 'some-string-param': { parameterType: InputDefinitionParameterType.STRING } },
      };

      const result = parseInputOutput(testDefinition, []);
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

      const result = parseInputOutput(testDefinition, []);
      expect(result).toEqual({
        artifacts: [{ label: 'some-artifact', type: 'system.Artifact (v1)' }],
      });
    });
  });

  describe('parseRuntimeInfo', () => {
    const testTaskId = 'test-task-id';

    it('returns undefined when runDetails are not provided', () => {
      const result = parseRuntimeInfoFromRunDetails(testTaskId);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no task details are empty', () => {
      const testRunDetails: RunDetailsKF = {
        pipeline_context_id: 'pipeline-context-id',
        pipeline_run_context_id: 'pipeline-run-context-id',
        task_details: [],
      };

      const result = parseRuntimeInfoFromRunDetails(testTaskId, testRunDetails);
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

      const result = parseRuntimeInfoFromRunDetails(testTaskId, testRunDetails);
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

      const result = parseRuntimeInfoFromRunDetails(testTaskId, testRunDetails);
      expect(result).toEqual({
        completeTime: '2024-01-03T00:00:00Z',
        podName: 'Some pod name',
        startTime: '2024-01-02T00:00:00Z',
        state: 'RUNNING',
        taskId: 'task.test-task-id',
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

      const result = parseRuntimeInfoFromRunDetails(testTaskId, testRunDetails);
      expect(result).toEqual({
        completeTime: '2024-01-03T00:00:00Z',
        podName: undefined,
        startTime: '2024-01-02T00:00:00Z',
        state: 'RUNNING',
        taskId: 'task.test-task-id',
      });
    });
  });

  describe('parseRuntimeInfoFromExecutions', () => {
    const testTaskId = 'test-task-id';

    it('returns undefined when executions are not provided', () => {
      const result = parseRuntimeInfoFromExecutions(testTaskId, testTaskId);
      expect(result).toBeUndefined();
    });

    it('returns undefined when executions is null', () => {
      const result = parseRuntimeInfoFromExecutions(testTaskId, testTaskId, null);
      expect(result).toBeUndefined();
    });

    it('returns undefined when executions are empty', () => {
      const result = parseRuntimeInfoFromExecutions(testTaskId, testTaskId, []);
      expect(result).toBeUndefined();
    });

    it('returns undefined when there are no match executions', () => {
      const mockExecution = new Execution();
      const result = parseRuntimeInfoFromExecutions(testTaskId, testTaskId, [mockExecution]);
      expect(result).toBeUndefined();
    });

    it('returns runtime info when execution id matches', () => {
      const mockExecution = new Execution();
      const value = new Value();
      mockExecution.getCustomPropertiesMap().set('task_name', value.setStringValue(testTaskId));
      mockExecution.setCreateTimeSinceEpoch(1713285296322);
      mockExecution.setLastUpdateTimeSinceEpoch(1713285296524);
      mockExecution.setLastKnownState(Execution.State.COMPLETE);
      const result = parseRuntimeInfoFromExecutions(testTaskId, testTaskId, [mockExecution]);
      expect(result).toStrictEqual({
        completeTime: '2024-04-16T16:34:56.524Z',
        podName: undefined,
        startTime: '2024-04-16T16:34:56.322Z',
        state: 'Complete',
        taskId: 'task.test-task-id',
      });
    });
  });

  describe('getResourceStateText', () => {
    it('returns undefined when state is not provided', () => {
      const mockExecution = new Execution();
      const result = getResourceStateText({
        resourceType: ResourceType.EXECUTION,
        resource: mockExecution,
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined when state is "UNKNOWN"', () => {
      const mockExecution = new Execution();
      mockExecution.setLastKnownState(Execution.State.UNKNOWN);
      const result = getResourceStateText({
        resourceType: ResourceType.EXECUTION,
        resource: mockExecution,
      });
      expect(result).toBeUndefined();
    });

    [
      { state: Execution.State.CACHED, status: ExecutionStateKF.CACHED },
      { state: Execution.State.CANCELED, status: ExecutionStateKF.CANCELED },
      { state: Execution.State.COMPLETE, status: ExecutionStateKF.COMPLETE },
      { state: Execution.State.FAILED, status: ExecutionStateKF.FAILED },
      { state: Execution.State.NEW, status: ExecutionStateKF.NEW },
      { state: Execution.State.RUNNING, status: ExecutionStateKF.RUNNING },
    ].forEach(({ state, status }) => {
      it(`returns "${status}" with a provided "${state}" MLMD execution state`, () => {
        const mockExecution = new Execution();
        mockExecution.setLastKnownState(state);
        const result = getResourceStateText({
          resourceType: ResourceType.EXECUTION,
          resource: mockExecution,
        });
        expect(result).toBe(status);
      });
    });

    [
      { state: Artifact.State.LIVE, status: ArtifactStateKF.LIVE },
      { state: Artifact.State.DELETED, status: ArtifactStateKF.DELETED },
      { state: Artifact.State.MARKED_FOR_DELETION, status: ArtifactStateKF.MARKED_FOR_DELETION },
      { state: Artifact.State.PENDING, status: ArtifactStateKF.PENDING },
    ].forEach(({ state, status }) => {
      it(`returns "${status}" with a provided "${state}" MLMD artifact state`, () => {
        const mockArtifact = new Artifact();
        mockArtifact.setState(state);
        const result = getResourceStateText({
          resourceType: ResourceType.ARTIFACT,
          resource: mockArtifact,
        });
        expect(result).toBe(status);
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
      { state: ExecutionStateKF.CANCELED, status: RunStatus.Cancelled },
      { state: ExecutionStateKF.CACHED, status: RunStatus.Skipped },
      { state: ExecutionStateKF.COMPLETE, status: RunStatus.Succeeded },
      { state: ExecutionStateKF.FAILED, status: RunStatus.Failed },
      { state: ExecutionStateKF.RUNNING, status: RunStatus.Running },
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
      'task-3': {
        cachingOptions: { enableCache: true },
        componentRef: { name: 'comp-task-3' },
        dependentTasks: [],
        inputs: {
          artifacts: {
            'task-3-artifact-3': {
              componentInputArtifact: 'test-artifact',
            },
          },
        },
        taskInfo: { name: 'task-3' },
        triggerPolicy: { strategy: TriggerStrategy.ALL_UPSTREAM_TASKS_SUCCEEDED },
      },
    };
    const consoleWarnSpy = jest.spyOn(global.console, 'warn');

    it('returns empty object when no task artifacts exist', () => {
      const result = parseTasksForArtifactRelationship('root', {
        'task-1': { ...testTasks['task-1'], inputs: {} },
        'task-2': { ...testTasks['task-2'], inputs: {} },
      });
      expect(result).toEqual({});
    });

    it('returns task artifact map when artifacts are provided', () => {
      const result = parseTasksForArtifactRelationship('root', testTasks);

      expect(result).toEqual({
        'task-1': [{ artifactNodeId: 'GROUP.root.ARTIFACT.some-dag-task-2.task-1-artifact-name' }],
        'task-2': [{ artifactNodeId: 'GROUP.root.ARTIFACT.some-dag-task-1.task-2-artifact-name' }],
        'task-3': [{ artifactNodeId: 'GROUP.root.ARTIFACT..test-artifact' }],
      });
    });

    describe('returns warning with unmapped artifact for a task when', () => {
      it('no producerTask is found', () => {
        const result = parseTasksForArtifactRelationship('root', {
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
          'task-1': [
            {
              artifactNodeId: 'GROUP.root.ARTIFACT.some-dag-task-2.task-1-artifact-name',
            },
          ],
          'task-3': [{ artifactNodeId: 'GROUP.root.ARTIFACT..test-artifact' }],
        });
      });

      it('no outputArtifactKey is found', () => {
        const result = parseTasksForArtifactRelationship('root', {
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
          'task-1': [
            {
              artifactNodeId: 'GROUP.root.ARTIFACT.some-dag-task-2.task-1-artifact-name',
            },
          ],
          'task-3': [{ artifactNodeId: 'GROUP.root.ARTIFACT..test-artifact' }],
        });
      });

      it('no taskOutputArtifact is found', () => {
        const result = parseTasksForArtifactRelationship('root', {
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

  describe('parseVolumeMounts', () => {
    it('returns empty when no params passed', () => {
      const result = parseVolumeMounts();
      expect(result).toEqual([]);
    });

    it('returns empty when no platform.kubernetes', () => {
      const testPlatformSpec: PlatformSpec = { platforms: {} };
      const result = parseVolumeMounts(testPlatformSpec, 'test-executor-label');
      expect(result).toEqual([]);
    });

    it('returns empty when no executor label', () => {
      const testExecutorLabel = 'test-executor-label';
      const testPlatformSpec: PlatformSpec = {
        platforms: {
          kubernetes: {
            deploymentSpec: {
              executors: {
                [testExecutorLabel]: {
                  container: { image: 'test-image' },
                  pvcMount: [{ mountPath: 'path-1' }],
                },
              },
            },
          },
        },
      };
      const result = parseVolumeMounts(testPlatformSpec);
      expect(result).toEqual([]);
    });

    it('returns empty when executor label does not match the platform spec', () => {
      const testExecutorLabel = 'test-executor-label';
      const testPlatformSpec: PlatformSpec = {
        platforms: {
          kubernetes: {
            deploymentSpec: {
              executors: {
                [`${testExecutorLabel}-not-match`]: {
                  container: { image: 'test-image' },
                  pvcMount: [{ mountPath: 'path-1' }],
                },
              },
            },
          },
        },
      };
      const result = parseVolumeMounts(testPlatformSpec, testExecutorLabel);
      expect(result).toEqual([]);
    });

    it('returns the correct result when executor label matches the platform spec', () => {
      const testExecutorLabel = 'test-executor-label';
      const testPlatformSpec: PlatformSpec = {
        platforms: {
          kubernetes: {
            deploymentSpec: {
              executors: {
                [testExecutorLabel]: {
                  container: { image: 'test-image' },
                  pvcMount: [
                    {
                      mountPath: 'path-1',
                      taskOutputParameter: {
                        outputParameterKey: 'test-key',
                        producerTask: 'test-task-1',
                      },
                    },
                    {
                      mountPath: 'path-2',
                      constant: 'test-constant-value',
                    },
                  ],
                },
              },
            },
          },
        },
      };
      const result = parseVolumeMounts(testPlatformSpec, testExecutorLabel);
      expect(result).toEqual([
        { mountPath: 'path-1', name: 'test-task-1' },
        { mountPath: 'path-2', name: 'test-constant-value' },
      ]);
    });
  });
});

describe('getExecutionLinkedArtifactMap', () => {
  it('returns an empty object when artifacts or events are not provided', () => {
    const result = getExecutionLinkedArtifactMap(undefined, undefined);
    expect(result).toEqual({});
  });

  it('returns an empty object when artifacts or events are empty', () => {
    const result = getExecutionLinkedArtifactMap([], []);
    expect(result).toEqual({});
  });

  it('returns the correct linked artifact map', () => {
    const artifacts = [new Artifact().setId(1), new Artifact().setId(2), new Artifact().setId(3)];
    const events = [
      new Event().setArtifactId(1).setExecutionId(1),
      new Event().setArtifactId(2).setExecutionId(1),
      new Event().setArtifactId(3).setExecutionId(2),
      new Event().setArtifactId(1).setExecutionId(2),
    ];

    const result = getExecutionLinkedArtifactMap(artifacts, events);

    expect(result).toEqual({
      1: [
        { event: events[0], artifact: artifacts[0] },
        { event: events[1], artifact: artifacts[1] },
      ],
      2: [
        { event: events[2], artifact: artifacts[2] },
        { event: events[3], artifact: artifacts[0] },
      ],
    });
  });
});
