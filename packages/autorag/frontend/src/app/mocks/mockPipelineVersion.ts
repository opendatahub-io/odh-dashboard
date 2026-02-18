/* eslint-disable camelcase -- mock data mirrors KFP API response structure */
import { PipelineVersionKF } from '~/app/types/pipeline';

export const mockPipelineVersion: PipelineVersionKF = {
  pipeline_id: 'bae9b70e-01a9-4e8b-b3b7-0cd161a31939',
  pipeline_version_id: 'c0042a44-41d2-4a83-9342-9ec9305371ed',
  display_name: 'test-pipeline',
  name: 'test-pipeline',
  created_at: '2026-02-12T03:15:40Z',
  pipeline_spec: {
    pipeline_spec: {
      components: {
        'comp-autogluon-models-full-refit': {
          executorLabel: 'exec-autogluon-models-full-refit',
          inputDefinitions: {
            artifacts: {
              full_dataset: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
              predictor_artifact: {
                artifactType: { schemaTitle: 'system.Model', schemaVersion: '0.0.1' },
              },
            },
            parameters: {
              model_name: { parameterType: 'STRING' },
            },
          },
          outputDefinitions: {
            artifacts: {
              model_artifact: {
                artifactType: { schemaTitle: 'system.Model', schemaVersion: '0.0.1' },
              },
            },
          },
        },
        'comp-automl-data-loader': {
          executorLabel: 'exec-automl-data-loader',
          inputDefinitions: {
            parameters: {
              bucket_name: { parameterType: 'STRING' },
              file_key: { parameterType: 'STRING' },
            },
          },
          outputDefinitions: {
            artifacts: {
              full_dataset: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
            },
          },
        },
        'comp-for-loop-1': {
          dag: {
            tasks: {
              'autogluon-models-full-refit': {
                cachingOptions: { enableCache: true },
                componentRef: { name: 'comp-autogluon-models-full-refit' },
                inputs: {
                  artifacts: {
                    full_dataset: {
                      componentInputArtifact: 'pipelinechannel--automl-data-loader-full_dataset',
                    },
                    predictor_artifact: {
                      componentInputArtifact: 'pipelinechannel--models-selection-model_artifact',
                    },
                  },
                  parameters: {
                    model_name: {
                      componentInputParameter:
                        'pipelinechannel--models-selection-top_models-loop-item',
                    },
                  },
                },
                taskInfo: { name: 'autogluon-models-full-refit' },
              },
            },
          },
          inputDefinitions: {
            artifacts: {
              'pipelinechannel--automl-data-loader-full_dataset': {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
              'pipelinechannel--models-selection-model_artifact': {
                artifactType: { schemaTitle: 'system.Model', schemaVersion: '0.0.1' },
              },
            },
            parameters: {
              'pipelinechannel--models-selection-top_models': { parameterType: 'LIST' },
              'pipelinechannel--models-selection-top_models-loop-item': {
                parameterType: 'STRING',
              },
            },
          },
          outputDefinitions: {
            artifacts: {
              'pipelinechannel--autogluon-models-full-refit-model_artifact': {
                artifactType: { schemaTitle: 'system.Model', schemaVersion: '0.0.1' },
              },
            },
          },
        },
        'comp-leaderboard-evaluation': {
          executorLabel: 'exec-leaderboard-evaluation',
          inputDefinitions: {
            artifacts: {
              full_dataset: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
              models: {
                artifactType: { schemaTitle: 'system.Model', schemaVersion: '0.0.1' },
              },
            },
            parameters: {
              eval_metric: { parameterType: 'STRING' },
            },
          },
          outputDefinitions: {
            artifacts: {
              html_artifact: {
                artifactType: { schemaTitle: 'system.Markdown', schemaVersion: '0.0.1' },
              },
            },
          },
        },
        'comp-models-selection': {
          executorLabel: 'exec-models-selection',
          inputDefinitions: {
            artifacts: {
              test_data: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
              train_data: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
            },
            parameters: {
              problem_type: { parameterType: 'STRING' },
              target_column: { parameterType: 'STRING' },
              top_n: { parameterType: 'NUMBER_INTEGER' },
            },
          },
          outputDefinitions: {
            artifacts: {
              model_artifact: {
                artifactType: { schemaTitle: 'system.Model', schemaVersion: '0.0.1' },
              },
            },
            parameters: {
              eval_metric: { parameterType: 'STRING' },
              top_models: { parameterType: 'LIST' },
            },
          },
        },
        'comp-train-test-split': {
          executorLabel: 'exec-train-test-split',
          inputDefinitions: {
            artifacts: {
              dataset: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
            },
            parameters: {
              test_size: { parameterType: 'NUMBER_DOUBLE' },
            },
          },
          outputDefinitions: {
            artifacts: {
              sampled_test_dataset: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
              sampled_train_dataset: {
                artifactType: { schemaTitle: 'system.Dataset', schemaVersion: '0.0.1' },
              },
            },
          },
        },
      },
      deploymentSpec: {
        executors: {
          'exec-autogluon-models-full-refit': {
            container: {
              image: 'autogluon/autogluon:1.3.1-cpu-framework-ubuntu22.04-py3.11',
              command: ['sh', '-c'],
              args: [
                '--executor_input',
                '{{$}}',
                '--function_to_execute',
                'autogluon_models_full_refit',
              ],
            },
          },
          'exec-automl-data-loader': {
            container: {
              image: 'registry.access.redhat.com/ubi9/python-311',
              command: ['sh', '-c'],
              args: ['--executor_input', '{{$}}', '--function_to_execute', 'automl_data_loader'],
            },
          },
          'exec-leaderboard-evaluation': {
            container: {
              image: 'autogluon/autogluon:1.3.1-cpu-framework-ubuntu22.04-py3.11',
              command: ['sh', '-c'],
              args: [
                '--executor_input',
                '{{$}}',
                '--function_to_execute',
                'leaderboard_evaluation',
              ],
            },
          },
          'exec-models-selection': {
            container: {
              image: 'autogluon/autogluon:1.3.1-cpu-framework-ubuntu22.04-py3.11',
              command: ['sh', '-c'],
              args: ['--executor_input', '{{$}}', '--function_to_execute', 'models_selection'],
            },
          },
          'exec-train-test-split': {
            container: {
              image: 'registry.access.redhat.com/ubi9/python-311',
              command: ['sh', '-c'],
              args: ['--executor_input', '{{$}}', '--function_to_execute', 'train_test_split'],
            },
          },
        },
      },
      pipelineInfo: {
        name: 'autogluon-tabular-training-pipeline',
        description:
          'End-to-end AutoGluon tabular training pipeline implementing a two-stage approach: first builds and selects top-performing models on sampled data, then refits them on the full dataset.',
      },
      root: {
        dag: {
          tasks: {
            'automl-data-loader': {
              cachingOptions: { enableCache: true },
              componentRef: { name: 'comp-automl-data-loader' },
              inputs: {
                parameters: {
                  bucket_name: { componentInputParameter: 'bucket_name' },
                  file_key: { componentInputParameter: 'file_key' },
                },
              },
              taskInfo: { name: 'automl-data-loader' },
            },
            'for-loop-1': {
              componentRef: { name: 'comp-for-loop-1' },
              dependentTasks: ['automl-data-loader', 'models-selection'],
              inputs: {
                artifacts: {
                  'pipelinechannel--automl-data-loader-full_dataset': {
                    taskOutputArtifact: {
                      outputArtifactKey: 'full_dataset',
                      producerTask: 'automl-data-loader',
                    },
                  },
                  'pipelinechannel--models-selection-model_artifact': {
                    taskOutputArtifact: {
                      outputArtifactKey: 'model_artifact',
                      producerTask: 'models-selection',
                    },
                  },
                },
                parameters: {
                  'pipelinechannel--models-selection-top_models': {
                    taskOutputParameter: {
                      outputParameterKey: 'top_models',
                      producerTask: 'models-selection',
                    },
                  },
                },
              },
              iteratorPolicy: { parallelismLimit: 2 },
              parameterIterator: {
                itemInput: 'pipelinechannel--models-selection-top_models-loop-item',
                items: { inputParameter: 'pipelinechannel--models-selection-top_models' },
              },
              taskInfo: { name: 'for-loop-1' },
            },
            'leaderboard-evaluation': {
              cachingOptions: { enableCache: true },
              componentRef: { name: 'comp-leaderboard-evaluation' },
              dependentTasks: ['automl-data-loader', 'for-loop-1', 'models-selection'],
              inputs: {
                artifacts: {
                  full_dataset: {
                    taskOutputArtifact: {
                      outputArtifactKey: 'full_dataset',
                      producerTask: 'automl-data-loader',
                    },
                  },
                  models: {
                    taskOutputArtifact: {
                      outputArtifactKey:
                        'pipelinechannel--autogluon-models-full-refit-model_artifact',
                      producerTask: 'for-loop-1',
                    },
                  },
                },
                parameters: {
                  eval_metric: {
                    taskOutputParameter: {
                      outputParameterKey: 'eval_metric',
                      producerTask: 'models-selection',
                    },
                  },
                },
              },
              taskInfo: { name: 'leaderboard-evaluation' },
            },
            'models-selection': {
              cachingOptions: { enableCache: true },
              componentRef: { name: 'comp-models-selection' },
              dependentTasks: ['train-test-split'],
              inputs: {
                artifacts: {
                  test_data: {
                    taskOutputArtifact: {
                      outputArtifactKey: 'sampled_test_dataset',
                      producerTask: 'train-test-split',
                    },
                  },
                  train_data: {
                    taskOutputArtifact: {
                      outputArtifactKey: 'sampled_train_dataset',
                      producerTask: 'train-test-split',
                    },
                  },
                },
                parameters: {
                  problem_type: { componentInputParameter: 'problem_type' },
                  target_column: { componentInputParameter: 'target_column' },
                  top_n: { componentInputParameter: 'top_n' },
                },
              },
              taskInfo: { name: 'models-selection' },
            },
            'train-test-split': {
              cachingOptions: { enableCache: true },
              componentRef: { name: 'comp-train-test-split' },
              dependentTasks: ['automl-data-loader'],
              inputs: {
                artifacts: {
                  dataset: {
                    taskOutputArtifact: {
                      outputArtifactKey: 'full_dataset',
                      producerTask: 'automl-data-loader',
                    },
                  },
                },
                parameters: {
                  test_size: { runtimeValue: { constant: 0.2 } },
                },
              },
              taskInfo: { name: 'train-test-split' },
            },
          },
        },
        inputDefinitions: {
          parameters: {
            bucket_name: { parameterType: 'STRING' },
            file_key: { parameterType: 'STRING' },
            problem_type: { parameterType: 'STRING' },
            target_column: { parameterType: 'STRING' },
            top_n: { parameterType: 'NUMBER_INTEGER' },
          },
        },
      },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.15.2',
    },
    platform_spec: {
      platforms: {
        kubernetes: {
          deploymentSpec: {
            executors: {
              'exec-automl-data-loader': {
                secretAsEnv: [
                  {
                    keyToEnv: [
                      { envVar: 'AWS_ACCESS_KEY_ID', secretKey: 'minio_root_user' },
                      { envVar: 'AWS_SECRET_ACCESS_KEY', secretKey: 'minio_root_password' },
                    ],
                    secretName: 'minio-secret',
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
};
