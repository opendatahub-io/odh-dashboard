/* eslint-disable camelcase */
import {
  ArtifactType,
  InputDefinitionParameterType,
  PipelineSpecVariable,
} from '#~/concepts/pipelines/kfTypes';

/**
 * Minimal pipeline spec with a single ParallelFor loop containing one task.
 *
 * Structure:
 *   root
 *     └── for-loop-2 (sub-DAG — detected as ParallelFor via MLMD iteration_count)
 *           └── simple-task (per iteration)
 *
 * Note: `parameterIterator` is not part of the TypeScript types — the frontend
 * detects ParallelFor via MLMD execution metadata (iteration_count), not the spec.
 */
export const mockParallelForPipelineSpec: PipelineSpecVariable = {
  components: {
    'comp-for-loop-2': {
      dag: {
        tasks: {
          'simple-task': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-simple-task' },
            inputs: {
              parameters: {
                item: {
                  componentInputParameter: 'pipelinechannel--loop-item-param-1',
                },
              },
            },
            taskInfo: { name: 'simple-task' },
          },
        },
      },
      inputDefinitions: {
        parameters: {
          'pipelinechannel--loop-item-param-1': {
            parameterType: InputDefinitionParameterType.STRING,
          },
        },
      },
    },
    'comp-simple-task': {
      executorLabel: 'exec-simple-task',
      inputDefinitions: {
        parameters: {
          item: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: {
          Output: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
  },
  deploymentSpec: {
    executors: {
      'exec-simple-task': {
        container: {
          image: 'python:3.11',
          args: ['--executor_input', '{{$}}'],
          command: ['python3'],
        },
      },
    },
  },
  pipelineInfo: { name: 'test-parallel-for' },
  root: {
    dag: {
      tasks: {
        'for-loop-2': {
          componentRef: { name: 'comp-for-loop-2' },
          taskInfo: { name: 'for-loop-2' },
        },
      },
    },
  },
  schemaVersion: '2.1.0',
  sdkVersion: 'kfp-2.15.2',
};

/**
 * Pipeline spec with a ParallelFor sub-DAG containing tasks connected by artifact edges.
 *
 * Structure:
 *   root
 *     └── for-loop-2 (sub-DAG)
 *           ├── create-features (produces Dataset artifact)
 *           └── train-model (depends on create-features, consumes features artifact)
 */
export const mockParallelForWithArtifactsPipelineSpec: PipelineSpecVariable = {
  components: {
    'comp-for-loop-2': {
      dag: {
        tasks: {
          'create-features': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-create-features' },
            inputs: {
              parameters: {
                dataset_name: {
                  componentInputParameter: 'pipelinechannel--loop-item-param-1',
                },
              },
            },
            taskInfo: { name: 'create-features' },
          },
          'train-model': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-train-model' },
            dependentTasks: ['create-features'],
            inputs: {
              artifacts: {
                features: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'features',
                    producerTask: 'create-features',
                  },
                },
              },
              parameters: {
                dataset_name: {
                  componentInputParameter: 'pipelinechannel--loop-item-param-1',
                },
              },
            },
            taskInfo: { name: 'train-model' },
          },
        },
      },
      inputDefinitions: {
        parameters: {
          'pipelinechannel--loop-item-param-1': {
            parameterType: InputDefinitionParameterType.STRING,
          },
        },
      },
    },
    'comp-create-features': {
      executorLabel: 'exec-create-features',
      inputDefinitions: {
        parameters: {
          dataset_name: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          features: {
            artifactType: {
              schemaTitle: ArtifactType.DATASET,
              schemaVersion: '0.0.1',
            },
          },
        },
      },
    },
    'comp-train-model': {
      executorLabel: 'exec-train-model',
      inputDefinitions: {
        artifacts: {
          features: {
            artifactType: {
              schemaTitle: ArtifactType.DATASET,
              schemaVersion: '0.0.1',
            },
          },
        },
        parameters: {
          dataset_name: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
  },
  deploymentSpec: {
    executors: {
      'exec-create-features': {
        container: {
          image: 'python:3.11',
          args: ['--executor_input', '{{$}}'],
          command: ['python3'],
        },
      },
      'exec-train-model': {
        container: {
          image: 'python:3.11',
          args: ['--executor_input', '{{$}}'],
          command: ['python3'],
        },
      },
    },
  },
  pipelineInfo: { name: 'test-parallel-for-with-artifacts' },
  root: {
    dag: {
      tasks: {
        'for-loop-2': {
          componentRef: { name: 'comp-for-loop-2' },
          taskInfo: { name: 'for-loop-2' },
        },
      },
    },
  },
  schemaVersion: '2.1.0',
  sdkVersion: 'kfp-2.15.2',
};
