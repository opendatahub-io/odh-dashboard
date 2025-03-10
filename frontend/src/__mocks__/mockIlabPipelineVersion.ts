/* eslint-disable camelcase */
import {
  ArtifactType,
  InputDefinitionParameterType,
  PipelineVersionKF,
} from '~/concepts/pipelines/kfTypes';

export const mockIlabPipelineVersion: PipelineVersionKF = {
  pipeline_id: 'instructlab',
  pipeline_version_id: 'f8e618b7-63b3-4143-bf42-500d59e219b3',
  display_name: 'instructlab',
  created_at: '2025-02-28T15:03:39Z',
  pipeline_spec: {
    pipeline_spec: {
      components: {
        'comp-sdg-to-artifact-op': {
          executorLabel: 'exec-sdg-to-artifact-op',
          inputDefinitions: {
            parameters: {
              pvc_path: {
                defaultValue: '/data/sdg',
                isOptional: true,
                parameterType: InputDefinitionParameterType.STRING,
              },
            },
          },
          outputDefinitions: {
            artifacts: {
              sdg: {
                artifactType: {
                  schemaTitle: ArtifactType.DATASET,
                  schemaVersion: '0.0.1',
                },
              },
            },
          },
        },
      },
      deploymentSpec: {
        executors: {
          'exec-createpvc': {
            container: {
              image: 'argostub/createpvc',
            },
          },
          'exec-createpvc-2': {
            container: {
              image: 'argostub/createpvc',
            },
          },
          'exec-createpvc-3': {
            container: {
              image: 'argostub/createpvc',
            },
          },
        },
      },
      pipelineInfo: {
        name: 'instructlab',
      },
      root: {
        dag: {
          outputs: {
            artifacts: {
              'generate-metrics-report-op-metrics': {
                artifactSelectors: [
                  {
                    outputArtifactKey: 'metrics',
                    producerSubtask: 'generate-metrics-report-op',
                  },
                ],
              },
            },
          },
          tasks: {
            'createpvc-2': {
              cachingOptions: {
                enableCache: true,
              },
              componentRef: {
                name: 'comp-createpvc-2',
              },
              inputs: {
                parameters: {
                  access_modes: {},
                  pvc_name_suffix: {
                    runtimeValue: {
                      constant: '-model-cache',
                    },
                  },
                  size: {
                    runtimeValue: {
                      constant: '100Gi',
                    },
                  },
                  storage_class_name: {
                    componentInputParameter: 'k8s_storage_class_name',
                  },
                },
              },
              taskInfo: {
                name: 'createpvc-2',
              },
            },
            'pvc-to-mmlu-branch-op': {
              componentRef: {
                name: 'comp-pvc-to-mmlu-branch-op',
              },
              dependentTasks: ['createpvc-3', 'run-final-eval-op'],
              inputs: {
                parameters: {
                  pvc_path: {
                    runtimeValue: {
                      constant: '/output/mmlu_branch/mmlu_branch_data.json',
                    },
                  },
                },
              },
              taskInfo: {
                name: 'pvc-to-mmlu-branch-op',
              },
            },
            'pvc-to-model-op': {
              componentRef: {
                name: 'comp-pvc-to-model-op',
              },
              dependentTasks: ['createpvc-3', 'run-mt-bench-op'],
              inputs: {
                parameters: {
                  pvc_path: {
                    runtimeValue: {
                      constant: '/output/phase_2/model/hf_format/candidate_model',
                    },
                  },
                },
              },
              taskInfo: {
                name: 'pvc-to-model-op',
              },
            },

            'pytorch-job-launcher-op': {
              componentRef: {
                name: 'comp-pytorch-job-launcher-op',
              },
              dependentTasks: [
                'createpvc',
                'createpvc-2',
                'createpvc-3',
                'data-processing-op',
                'model-to-pvc-op',
              ],
              taskInfo: {
                name: 'pytorch-job-launcher-op',
              },
            },
          },
        },
        inputDefinitions: {
          parameters: {
            eval_gpu_identifier: {
              defaultValue: 'nvidia.com/gpu',
              description:
                'General evaluation parameter. The GPU type used for training pods, e.g. nvidia.com/gpu',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            eval_judge_secret: {
              defaultValue: 'judge-secret',
              description:
                'General evaluation parameter: The name of the k8s secret key holding access credentials to the judge server.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            final_eval_batch_size: {
              defaultValue: 'auto',
              description:
                "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            final_eval_few_shots: {
              defaultValue: 5,
              description:
                'Final model evaluation parameter for MMLU. Number of question-answer pairs provided in the context preceding the question used for evaluation.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            final_eval_max_workers: {
              defaultValue: 'auto',
              description:
                "Final model evaluation parameter for MT Bench Branch. Number of workers to use for evaluation with mt_bench or mt_bench_branch. Must be a positive integer or 'auto'.",
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            final_eval_merge_system_user_message: {
              defaultValue: false,
              description:
                'Final model evaluation parameter for MT Bench Branch. Boolean indicating whether to merge system and user messages (required for Mistral based judges)',
              isOptional: true,
              parameterType: InputDefinitionParameterType.BOOLEAN,
            },
            input_model_uri: {
              description: 'URI pointing to a model in an OCI or S3 registry.',
              parameterType: InputDefinitionParameterType.STRING,
            },
            k8s_storage_class_name: {
              defaultValue: 'standard',
              description:
                'A Kubernetes StorageClass name for persistent volumes. Selected StorageClass must support RWX PersistentVolumes.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            mt_bench_max_workers: {
              defaultValue: 'auto',
              description:
                "MT Bench parameter. Number of workers to use for evaluation with mt_bench or mt_bench_branch. Must be a positive integer or 'auto'.",
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            mt_bench_merge_system_user_message: {
              defaultValue: false,
              description:
                'MT Bench parameter. Boolean indicating whether to merge system and user messages (required for Mistral based judges)',
              isOptional: true,
              parameterType: InputDefinitionParameterType.BOOLEAN,
            },
            output_model_name: {
              description:
                ' Model Registration parameter. The name of the model used during model registration.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            output_model_registry_name: {
              description:
                'Model Registration parameter. The name of the model registry used for model registration.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            output_model_registry_namespace: {
              defaultValue: 'rhoai-model-registries',
              description:
                'Model Registration parameter. The namespace of the model used during model registration.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            output_model_version_name: {
              description:
                'Model Registration parameter. The version of the model used during model registration.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            output_modelcar_base_image: {
              defaultValue: 'registry.access.redhat.com/ubi9-micro:latest',
              description: 'The base image used for output model.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            output_oci_model_uri: {
              defaultValue: '',
              description: 'The URI path to the OCI registry where the output model is pushed to.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            output_oci_registry_secret: {
              description: 'The secret key to use for OCI output registry.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            sdg_base_model: {
              description:
                'SDG parameter. LLM model used to generate the synthetic dataset. E.g. "s3://\u003cBUCKET\u003e/\u003cPATH_TO_MODEL\u003e"',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            sdg_max_batch_len: {
              defaultValue: 5000,
              description:
                'SDG parameter. Maximum tokens per gpu for each batch that will be handled in a single step.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            sdg_pipeline: {
              defaultValue: '/usr/share/instructlab/sdg/pipelines/agentic',
              description:
                "SDG parameter. Data generation pipeline to use. Available: 'simple', 'full', or a valid path to a directory of pipeline workflow YAML files. Note that 'full' requires a larger teacher model, Mixtral-8x7b.",
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            sdg_repo_branch: {
              description:
                'SDG parameter. Points to a branch within the taxonomy git repository. If set, has priority over sdg_repo_pr',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            sdg_repo_pr: {
              description:
                'SDG parameter. Points to a pull request against the taxonomy git repository',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            sdg_repo_secret: {
              defaultValue: 'taxonomy-repo-secret',
              description:
                'SDG parameter. The name of the k8s secret holding access credentials to the sdg_repo_url.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            sdg_repo_url: {
              description:
                'SDG parameter. Points to a taxonomy git repository. E.g. "https://github.com/instructlab/taxonomy.git"',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            sdg_sample_size: {
              defaultValue: 1,
              description:
                'SDG parameter. Represents the sdg skills recipe sampling size as percentage in decimal form.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.DOUBLE,
            },
            sdg_scale_factor: {
              defaultValue: 30,
              description: 'SDG parameter. The total number of instructions to be generated.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            sdg_teacher_secret: {
              defaultValue: 'teacher-secret',
              description:
                'SDG parameter. The name of the k8s secret key holding access credentials to the teacher server.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            train_cpu_per_worker: {
              defaultValue: '2',
              description:
                'Training parameter. Number of CPUs per each node/worker to use for training.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            train_effective_batch_size_phase_1: {
              defaultValue: 128,
              description:
                'Training parameter for in Phase 1. The number of samples in a batch that the model should see before its parameters are updated.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_effective_batch_size_phase_2: {
              defaultValue: 3840,
              description:
                'Training parameter for in Phase 2. The number of samples in a batch that the model should see before its parameters are updated.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_gpu_identifier: {
              defaultValue: 'nvidia.com/gpu',
              description:
                'Training parameter. The GPU type used for training pods, e.g. nvidia.com/gpu',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            train_gpu_per_worker: {
              defaultValue: 2,
              description:
                'Training parameter. Number of GPUs per each node/worker to use for training.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_learning_rate_phase_1: {
              defaultValue: 0.00002,
              description:
                "Training parameter for in Phase 1. How fast we optimize the weights during gradient descent. Higher values may lead to unstable learning performance. It's generally recommended to have a low learning rate with a high effective batch size.",
              isOptional: true,
              parameterType: InputDefinitionParameterType.DOUBLE,
            },
            train_learning_rate_phase_2: {
              defaultValue: 0.000006,
              description:
                "Training parameter for in Phase 2. How fast we optimize the weights during gradient descent. Higher values may lead to unstable learning performance. It's generally recommended to have a low learning rate with a high effective batch size.",
              isOptional: true,
              parameterType: InputDefinitionParameterType.DOUBLE,
            },
            train_max_batch_len: {
              defaultValue: 5000,
              description:
                'Training parameter. Maximum tokens per gpu for each batch that will be handled in a single step.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_memory_per_worker: {
              defaultValue: '2Gi',
              description:
                'Training parameter. Memory per GPU per each node/worker to use for training.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRING,
            },
            train_node_selectors: {
              description:
                'Training parameter. A JSON containing node selectors applied to training pods.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.STRUCT,
            },
            train_num_epochs_phase_1: {
              defaultValue: 7,
              description: 'Training parameter for in Phase 1. Number of epochs to run training.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_num_epochs_phase_2: {
              defaultValue: 10,
              description: 'Training parameter for in Phase 2. Number of epochs to run training.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_num_warmup_steps_phase_1: {
              defaultValue: 1000,
              description:
                'Training parameter for in Phase 1. The number of steps a model should go through before reaching the full learning rate. We start at 0 and linearly climb up to train_learning_rate.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_num_warmup_steps_phase_2: {
              defaultValue: 1000,
              description:
                'Training parameter for in Phase 2. The number of steps a model should go through before reaching the full learning rate. We start at 0 and linearly climb up to train_learning_rate.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_num_workers: {
              defaultValue: 2,
              description: 'Training parameter. Number of nodes/workers to train on.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_save_samples: {
              defaultValue: 250000,
              description:
                'Training parameter. Number of samples the model should see before saving a checkpoint.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_seed: {
              defaultValue: 42,
              description: 'Training parameter. Random seed for initializing training.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            train_tolerations: {
              description: 'Training parameter. List of tolerations applied to training pods.',
              isOptional: true,
              parameterType: InputDefinitionParameterType.LIST,
            },
          },
        },
        outputDefinitions: {
          artifacts: {
            'generate-metrics-report-op-metrics': {
              artifactType: {
                schemaTitle: ArtifactType.METRICS,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.9.0',
    },
    platform_spec: {
      platforms: {
        kubernetes: {
          deploymentSpec: {
            executors: {
              'exec-taxonomy-to-artifact-op': {
                container: { image: '' },
                pvcMount: [
                  {
                    mountPath: '/data',
                    taskOutputParameter: {
                      outputParameterKey: 'name',
                      producerTask: 'createpvc',
                    },
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
