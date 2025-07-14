/* eslint-disable camelcase */
import {
  ArtifactType,
  InputDefinitionParameterType,
  PipelineSpecVariable,
  TriggerStrategy,
} from '#~/concepts/pipelines/kfTypes';

export const mockLargePipelineSpec: PipelineSpecVariable = {
  components: {
    'comp-automl-forecasting-ensemble': {
      executorLabel: 'exec-automl-forecasting-ensemble',
      inputDefinitions: {
        artifacts: {
          instance_baseline: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          instance_schema_path: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metadata: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          transform_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          tuning_result_input: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: { parameterType: InputDefinitionParameterType.STRING },
          prediction_image_uri: { parameterType: InputDefinitionParameterType.STRING },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          example_instance: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          explanation_metadata_artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          model_architecture: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          explanation_metadata: { parameterType: InputDefinitionParameterType.STRUCT },
          explanation_parameters: { parameterType: InputDefinitionParameterType.STRUCT },
          gcp_resources: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-automl-forecasting-ensemble-2': {
      executorLabel: 'exec-automl-forecasting-ensemble-2',
      inputDefinitions: {
        artifacts: {
          instance_baseline: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          instance_schema_path: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metadata: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          transform_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          tuning_result_input: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: { parameterType: InputDefinitionParameterType.STRING },
          prediction_image_uri: { parameterType: InputDefinitionParameterType.STRING },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          example_instance: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          explanation_metadata_artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          model_architecture: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          explanation_metadata: { parameterType: InputDefinitionParameterType.STRUCT },
          explanation_parameters: { parameterType: InputDefinitionParameterType.STRUCT },
          gcp_resources: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-automl-forecasting-stage-1-tuner': {
      executorLabel: 'exec-automl-forecasting-stage-1-tuner',
      inputDefinitions: {
        artifacts: {
          materialized_eval_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          materialized_train_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metadata: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          transform_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          deadline_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: { parameterType: InputDefinitionParameterType.STRING },
          num_parallel_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          num_selected_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          project: { parameterType: InputDefinitionParameterType.STRING },
          reduce_search_space_mode: {
            defaultValue: 'regular',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
          single_run_max_secs: { parameterType: InputDefinitionParameterType.INTEGER },
          study_spec_parameters_override: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          worker_pool_specs_override_json: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          tuning_result_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-automl-forecasting-stage-2-tuner': {
      executorLabel: 'exec-automl-forecasting-stage-2-tuner',
      inputDefinitions: {
        artifacts: {
          materialized_eval_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          materialized_train_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metadata: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          transform_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          tuning_result_input_path: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          deadline_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: { parameterType: InputDefinitionParameterType.STRING },
          num_parallel_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          num_selected_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
          single_run_max_secs: { parameterType: InputDefinitionParameterType.INTEGER },
          worker_pool_specs_override_json: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          tuning_result_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-automl-tabular-finalizer': {
      executorLabel: 'exec-automl-tabular-finalizer',
      inputDefinitions: {
        parameters: {
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: { parameterType: InputDefinitionParameterType.STRING },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-calculate-training-parameters': {
      executorLabel: 'exec-calculate-training-parameters',
      inputDefinitions: {
        parameters: {
          fast_testing: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          is_skip_architecture_search: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          selected_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          stage_1_num_parallel_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          stage_2_num_parallel_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          train_budget_milli_node_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
        },
      },
      outputDefinitions: {
        parameters: {
          stage_1_deadline_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
          stage_1_single_run_max_secs: { parameterType: InputDefinitionParameterType.INTEGER },
          stage_2_deadline_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
          stage_2_single_run_max_secs: { parameterType: InputDefinitionParameterType.INTEGER },
        },
      },
    },
    'comp-calculate-training-parameters-2': {
      executorLabel: 'exec-calculate-training-parameters-2',
      inputDefinitions: {
        parameters: {
          fast_testing: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          is_skip_architecture_search: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          selected_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          stage_1_num_parallel_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          stage_2_num_parallel_trials: { parameterType: InputDefinitionParameterType.INTEGER },
          train_budget_milli_node_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
        },
      },
      outputDefinitions: {
        parameters: {
          stage_1_deadline_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
          stage_1_single_run_max_secs: { parameterType: InputDefinitionParameterType.INTEGER },
          stage_2_deadline_hours: { parameterType: InputDefinitionParameterType.DOUBLE },
          stage_2_single_run_max_secs: { parameterType: InputDefinitionParameterType.INTEGER },
        },
      },
    },
    'comp-condition-2': {
      dag: {
        tasks: {
          'automl-forecasting-ensemble': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-automl-forecasting-ensemble' },
            dependentTasks: ['automl-forecasting-stage-2-tuner', 'get-prediction-image-uri'],
            inputs: {
              artifacts: {
                instance_baseline: {},
                instance_schema_path: {},
                metadata: {},
                transform_output: {},
                tuning_result_input: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'tuning_result_output',
                    producerTask: 'automl-forecasting-stage-2-tuner',
                  },
                },
              },
              parameters: {
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                prediction_image_uri: {},
                project: { componentInputParameter: 'pipelinechannel--project' },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
              },
            },
            taskInfo: { name: 'automl-forecasting-ensemble' },
          },
          'automl-forecasting-stage-2-tuner': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-automl-forecasting-stage-2-tuner' },
            dependentTasks: ['calculate-training-parameters', 'importer'],
            inputs: {
              artifacts: {
                materialized_eval_split: {},
                materialized_train_split: {},
                metadata: {},
                transform_output: {},
                tuning_result_input_path: {
                  taskOutputArtifact: { outputArtifactKey: 'artifact', producerTask: 'importer' },
                },
              },
              parameters: {
                deadline_hours: {},
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                num_parallel_trials: {
                  componentInputParameter: 'pipelinechannel--stage_2_num_parallel_trials',
                },
                num_selected_trials: {
                  componentInputParameter: 'pipelinechannel--num_selected_trials',
                },
                project: { componentInputParameter: 'pipelinechannel--project' },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
                single_run_max_secs: {},
                worker_pool_specs_override_json: {
                  componentInputParameter:
                    'pipelinechannel--stage_2_trainer_worker_pool_specs_override',
                },
              },
            },
            taskInfo: { name: 'automl-forecasting-stage-2-tuner' },
          },
          'calculate-training-parameters': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-calculate-training-parameters' },
            inputs: {
              parameters: {
                fast_testing: { componentInputParameter: 'pipelinechannel--fast_testing' },
                is_skip_architecture_search: { runtimeValue: { constant: 'true' } },
                selected_trials: {
                  componentInputParameter: 'pipelinechannel--num_selected_trials',
                },
                stage_1_num_parallel_trials: {
                  componentInputParameter: 'pipelinechannel--stage_1_num_parallel_trials',
                },
                stage_2_num_parallel_trials: {
                  componentInputParameter: 'pipelinechannel--stage_2_num_parallel_trials',
                },
                train_budget_milli_node_hours: {
                  componentInputParameter: 'pipelinechannel--train_budget_milli_node_hours',
                },
              },
            },
            taskInfo: { name: 'calculate-training-parameters' },
          },
          'condition-3': {
            componentRef: { name: 'comp-condition-3' },
            dependentTasks: ['automl-forecasting-ensemble', 'model-upload'],
            inputs: {
              artifacts: {
                'pipelinechannel--automl-forecasting-ensemble-explanation_metadata_artifact': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'explanation_metadata_artifact',
                    producerTask: 'automl-forecasting-ensemble',
                  },
                },
                'pipelinechannel--automl-forecasting-ensemble-unmanaged_container_model': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'unmanaged_container_model',
                    producerTask: 'automl-forecasting-ensemble',
                  },
                },
                'pipelinechannel--model-upload-model': {
                  taskOutputArtifact: { outputArtifactKey: 'model', producerTask: 'model-upload' },
                },
              },
              parameters: {
                'pipelinechannel--automl-forecasting-ensemble-explanation_parameters': {},
                'pipelinechannel--dataflow_service_account': {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                'pipelinechannel--dataflow_subnetwork': {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                'pipelinechannel--dataflow_use_public_ips': {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                'pipelinechannel--encryption_spec_key_name': {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                'pipelinechannel--evaluated_examples_bigquery_path': {
                  componentInputParameter: 'pipelinechannel--evaluated_examples_bigquery_path',
                },
                'pipelinechannel--evaluation_batch_explain_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_explain_machine_type',
                },
                'pipelinechannel--evaluation_batch_explain_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_starting_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_predict_machine_type',
                },
                'pipelinechannel--evaluation_batch_predict_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_starting_replica_count',
                },
                'pipelinechannel--evaluation_dataflow_disk_size_gb': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                'pipelinechannel--evaluation_dataflow_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                'pipelinechannel--evaluation_dataflow_max_num_workers': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                'pipelinechannel--evaluation_dataflow_starting_num_workers': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_dataflow_starting_num_workers',
                },
                'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri',
                },
                'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_test_split_uri',
                },
                'pipelinechannel--location': {
                  componentInputParameter: 'pipelinechannel--location',
                },
                'pipelinechannel--project': { componentInputParameter: 'pipelinechannel--project' },
                'pipelinechannel--quantiles': {
                  componentInputParameter: 'pipelinechannel--quantiles',
                },
                'pipelinechannel--root_dir': {
                  componentInputParameter: 'pipelinechannel--root_dir',
                },
                'pipelinechannel--run_evaluation': {
                  componentInputParameter: 'pipelinechannel--run_evaluation',
                },
                'pipelinechannel--string-not-empty-Output': {
                  componentInputParameter: 'pipelinechannel--string-not-empty-Output',
                },
                'pipelinechannel--target_column': {
                  componentInputParameter: 'pipelinechannel--target_column',
                },
              },
            },
            taskInfo: { name: 'should_run_model_evaluation' },
            triggerPolicy: {
              strategy: TriggerStrategy.TRIGGER_STRATEGY_UNSPECIFIED,
            },
          },
          'get-or-create-model-description': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-get-or-create-model-description' },
            inputs: {
              parameters: {
                location: { componentInputParameter: 'pipelinechannel--location' },
                original_description: {
                  componentInputParameter: 'pipelinechannel--model_description',
                },
                project: { componentInputParameter: 'pipelinechannel--project' },
              },
            },
            taskInfo: { name: 'get-or-create-model-description' },
          },
          'get-prediction-image-uri': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-get-prediction-image-uri' },
            inputs: { parameters: { model_type: { runtimeValue: { constant: 'tide' } } } },
            taskInfo: { name: 'get-prediction-image-uri' },
          },
          importer: {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-importer' },
            inputs: {
              parameters: {
                uri: {
                  componentInputParameter: 'pipelinechannel--stage_1_tuning_result_artifact_uri',
                },
              },
            },
            taskInfo: { name: 'get-hyperparameter-tuning-results' },
          },
          'model-upload': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-upload' },
            dependentTasks: ['automl-forecasting-ensemble', 'get-or-create-model-description'],
            inputs: {
              artifacts: {
                explanation_metadata_artifact: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'explanation_metadata_artifact',
                    producerTask: 'automl-forecasting-ensemble',
                  },
                },
                parent_model: {},
                unmanaged_container_model: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'unmanaged_container_model',
                    producerTask: 'automl-forecasting-ensemble',
                  },
                },
              },
              parameters: {
                description: {},
                display_name: { componentInputParameter: 'pipelinechannel--model_display_name' },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                explanation_parameters: {},
                location: { componentInputParameter: 'pipelinechannel--location' },
                project: { componentInputParameter: 'pipelinechannel--project' },
              },
            },
            taskInfo: { name: 'model-upload' },
          },
        },
      },
      inputDefinitions: {
        artifacts: {
          'pipelinechannel--feature-transform-engine-instance_schema': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--feature-transform-engine-transform_output': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--parent_model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--split-materialized-data-materialized_eval_split': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--split-materialized-data-materialized_train_split': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--training-configurator-and-validator-instance_baseline': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--training-configurator-and-validator-metadata': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          'pipelinechannel--dataflow_service_account': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_subnetwork': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_use_public_ips': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--encryption_spec_key_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluated_examples_bigquery_path': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_predict_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_disk_size_gb': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_dataflow_max_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_starting_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--fast_testing': { parameterType: InputDefinitionParameterType.BOOLEAN },
          'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--location': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--model_description': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--model_display_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--num_selected_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--project': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--quantiles': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--root_dir': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--run_evaluation': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--stage_1_num_parallel_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--stage_1_tuning_result_artifact_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--stage_2_num_parallel_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--stage_2_trainer_worker_pool_specs_override': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--string-not-empty-Output': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--target_column': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--train_budget_milli_node_hours': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          'feature-attribution-feature_attributions': {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-condition-3': {
      dag: {
        tasks: {
          'feature-attribution': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-feature-attribution' },
            dependentTasks: ['model-batch-explanation'],
            inputs: {
              artifacts: {
                predictions_gcs_source: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'gcs_output_directory',
                    producerTask: 'model-batch-explanation',
                  },
                },
              },
              parameters: {
                dataflow_disk_size_gb: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                dataflow_machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                dataflow_max_workers_num: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                dataflow_service_account: {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                dataflow_subnetwork: {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                dataflow_use_public_ips: {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                dataflow_workers_num: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_dataflow_starting_num_workers',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                force_runner_mode: { runtimeValue: { constant: 'Dataflow' } },
                location: { componentInputParameter: 'pipelinechannel--location' },
                predictions_format: { runtimeValue: { constant: 'jsonl' } },
                problem_type: { runtimeValue: { constant: 'forecasting' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
              },
            },
            taskInfo: { name: 'feature-attribution' },
          },
          'finalize-eval-quantile-parameters': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-finalize-eval-quantile-parameters' },
            inputs: {
              parameters: { quantiles: { componentInputParameter: 'pipelinechannel--quantiles' } },
            },
            taskInfo: { name: 'finalize-eval-quantile-parameters' },
          },
          'get-predictions-column': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-get-predictions-column' },
            dependentTasks: ['finalize-eval-quantile-parameters'],
            inputs: {
              parameters: {
                forecasting_type: {},
                target_column: { componentInputParameter: 'pipelinechannel--target_column' },
              },
            },
            taskInfo: { name: 'get-predictions-column' },
          },
          'model-batch-explanation': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-batch-explanation' },
            inputs: {
              artifacts: {
                explanation_metadata_artifact: {},
                unmanaged_container_model: {},
              },
              parameters: {
                bigquery_source_input_uri: {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                explanation_parameters: {
                  componentInputParameter:
                    'pipelinechannel--automl-forecasting-ensemble-explanation_parameters',
                },
                gcs_destination_output_uri_prefix: {
                  componentInputParameter: 'pipelinechannel--root_dir',
                },
                generate_explanation: { runtimeValue: { constant: 'true' } },
                instances_format: { runtimeValue: { constant: 'bigquery' } },
                job_display_name: {
                  runtimeValue: {
                    constant:
                      'batch-explain-forecasting-evaluation-{{$.pipeline_job_uuid}}-{{$.pipeline_task_uuid}}',
                  },
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_explain_machine_type',
                },
                max_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_max_replica_count',
                },
                predictions_format: { runtimeValue: { constant: 'jsonl' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                starting_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_starting_replica_count',
                },
              },
            },
            taskInfo: { name: 'model-batch-explanation' },
          },
          'model-batch-predict': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-batch-predict' },
            inputs: {
              artifacts: {
                unmanaged_container_model: {},
              },
              parameters: {
                bigquery_destination_output_uri: {
                  componentInputParameter: 'pipelinechannel--evaluated_examples_bigquery_path',
                },
                bigquery_source_input_uri: {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_test_split_uri',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                generate_explanation: { runtimeValue: { constant: 'false' } },
                instances_format: { runtimeValue: { constant: 'bigquery' } },
                job_display_name: {
                  runtimeValue: {
                    constant:
                      'batch-predict-forecasting-evaluation-{{$.pipeline_job_uuid}}-{{$.pipeline_task_uuid}}',
                  },
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_predict_machine_type',
                },
                max_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_max_replica_count',
                },
                predictions_format: { runtimeValue: { constant: 'bigquery' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                starting_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_starting_replica_count',
                },
              },
            },
            taskInfo: { name: 'model-batch-predict' },
          },
          'model-evaluation-forecasting': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-evaluation-forecasting' },
            dependentTasks: [
              'finalize-eval-quantile-parameters',
              'get-predictions-column',
              'model-batch-predict',
              'table-to-uri',
            ],
            inputs: {
              artifacts: {
                predictions_bigquery_source: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'bigquery_output_table',
                    producerTask: 'model-batch-predict',
                  },
                },
              },
              parameters: {
                dataflow_disk_size: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                dataflow_machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                dataflow_max_workers_num: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                dataflow_service_account: {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                dataflow_subnetwork: {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                dataflow_use_public_ips: {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                forecasting_quantiles: {},
                forecasting_type: {},
                ground_truth_bigquery_source: {},
                ground_truth_format: { runtimeValue: { constant: 'bigquery' } },
                ground_truth_gcs_source: { runtimeValue: { constant: '[]' } },
                location: { componentInputParameter: 'pipelinechannel--location' },
                'pipelinechannel--target_column': {
                  componentInputParameter: 'pipelinechannel--target_column',
                },
                prediction_score_column: {},
                predictions_format: { runtimeValue: { constant: 'bigquery' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
                target_field_name: {
                  runtimeValue: {
                    constant: "HORIZON__{{$.inputs.parameters['pipelinechannel--target_column']}}",
                  },
                },
              },
            },
            taskInfo: { name: 'model-evaluation-forecasting' },
          },
          'model-evaluation-import': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-evaluation-import' },
            dependentTasks: ['feature-attribution', 'model-evaluation-forecasting'],
            inputs: {
              artifacts: {
                feature_attributions: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'feature_attributions',
                    producerTask: 'feature-attribution',
                  },
                },
                forecasting_metrics: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'evaluation_metrics',
                    producerTask: 'model-evaluation-forecasting',
                  },
                },
                model: {},
              },
              parameters: {
                dataset_path: {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_test_split_uri',
                },
                dataset_type: { runtimeValue: { constant: 'bigquery' } },
                display_name: { runtimeValue: { constant: 'Vertex Forecasting pipeline' } },
                problem_type: { runtimeValue: { constant: 'forecasting' } },
              },
            },
            taskInfo: { name: 'model-evaluation-import' },
          },
          'table-to-uri': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-table-to-uri' },
            dependentTasks: ['model-batch-predict'],
            inputs: {
              artifacts: {
                table: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'bigquery_output_table',
                    producerTask: 'model-batch-predict',
                  },
                },
              },
              parameters: { use_bq_prefix: { runtimeValue: { constant: 'true' } } },
            },
            taskInfo: { name: 'table-to-uri' },
          },
        },
      },
      inputDefinitions: {
        artifacts: {
          'pipelinechannel--automl-forecasting-ensemble-explanation_metadata_artifact': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--automl-forecasting-ensemble-unmanaged_container_model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--model-upload-model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          'pipelinechannel--automl-forecasting-ensemble-explanation_parameters': {
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          'pipelinechannel--dataflow_service_account': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_subnetwork': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_use_public_ips': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--encryption_spec_key_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluated_examples_bigquery_path': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_predict_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_disk_size_gb': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_dataflow_max_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_starting_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--location': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--project': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--quantiles': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--root_dir': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--run_evaluation': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--string-not-empty-Output': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--target_column': { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          'feature-attribution-feature_attributions': {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-condition-4': {
      dag: {
        tasks: {
          'automl-forecasting-ensemble-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-automl-forecasting-ensemble-2' },
            dependentTasks: ['automl-forecasting-stage-1-tuner', 'get-prediction-image-uri-2'],
            inputs: {
              artifacts: {
                instance_baseline: {},
                instance_schema_path: {},
                metadata: {},
                transform_output: {},
                tuning_result_input: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'tuning_result_output',
                    producerTask: 'automl-forecasting-stage-1-tuner',
                  },
                },
              },
              parameters: {
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                prediction_image_uri: {},
                project: { componentInputParameter: 'pipelinechannel--project' },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
              },
            },
            taskInfo: { name: 'automl-forecasting-ensemble-2' },
          },
          'automl-forecasting-stage-1-tuner': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-automl-forecasting-stage-1-tuner' },
            dependentTasks: ['calculate-training-parameters-2'],
            inputs: {
              artifacts: {
                materialized_eval_split: {},
                materialized_train_split: {},
                metadata: {},
                transform_output: {},
              },
              parameters: {
                deadline_hours: {},
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                num_parallel_trials: {
                  componentInputParameter: 'pipelinechannel--stage_1_num_parallel_trials',
                },
                num_selected_trials: {
                  componentInputParameter: 'pipelinechannel--num_selected_trials',
                },
                project: { componentInputParameter: 'pipelinechannel--project' },
                reduce_search_space_mode: { runtimeValue: { constant: 'full' } },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
                single_run_max_secs: {},
                study_spec_parameters_override: {
                  componentInputParameter: 'pipelinechannel--study_spec_parameters_override',
                },
                worker_pool_specs_override_json: {
                  componentInputParameter:
                    'pipelinechannel--stage_1_tuner_worker_pool_specs_override',
                },
              },
            },
            taskInfo: { name: 'automl-forecasting-stage-1-tuner' },
          },
          'calculate-training-parameters-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-calculate-training-parameters-2' },
            inputs: {
              parameters: {
                fast_testing: { componentInputParameter: 'pipelinechannel--fast_testing' },
                is_skip_architecture_search: { runtimeValue: { constant: 'false' } },
                selected_trials: {
                  componentInputParameter: 'pipelinechannel--num_selected_trials',
                },
                stage_1_num_parallel_trials: {
                  componentInputParameter: 'pipelinechannel--stage_1_num_parallel_trials',
                },
                stage_2_num_parallel_trials: {
                  componentInputParameter: 'pipelinechannel--stage_2_num_parallel_trials',
                },
                train_budget_milli_node_hours: {
                  componentInputParameter: 'pipelinechannel--train_budget_milli_node_hours',
                },
              },
            },
            taskInfo: { name: 'calculate-training-parameters-2' },
          },
          'condition-5': {
            componentRef: { name: 'comp-condition-5' },
            dependentTasks: ['automl-forecasting-ensemble-2', 'model-upload-2'],
            inputs: {
              artifacts: {
                'pipelinechannel--automl-forecasting-ensemble-2-explanation_metadata_artifact': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'explanation_metadata_artifact',
                    producerTask: 'automl-forecasting-ensemble-2',
                  },
                },
                'pipelinechannel--automl-forecasting-ensemble-2-unmanaged_container_model': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'unmanaged_container_model',
                    producerTask: 'automl-forecasting-ensemble-2',
                  },
                },
                'pipelinechannel--model-upload-2-model': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'model',
                    producerTask: 'model-upload-2',
                  },
                },
              },
              parameters: {
                'pipelinechannel--automl-forecasting-ensemble-2-explanation_parameters': {},
                'pipelinechannel--dataflow_service_account': {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                'pipelinechannel--dataflow_subnetwork': {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                'pipelinechannel--dataflow_use_public_ips': {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                'pipelinechannel--encryption_spec_key_name': {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                'pipelinechannel--evaluated_examples_bigquery_path': {
                  componentInputParameter: 'pipelinechannel--evaluated_examples_bigquery_path',
                },
                'pipelinechannel--evaluation_batch_explain_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_explain_machine_type',
                },
                'pipelinechannel--evaluation_batch_explain_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_starting_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_predict_machine_type',
                },
                'pipelinechannel--evaluation_batch_predict_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_starting_replica_count',
                },
                'pipelinechannel--evaluation_dataflow_disk_size_gb': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                'pipelinechannel--evaluation_dataflow_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                'pipelinechannel--evaluation_dataflow_max_num_workers': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                'pipelinechannel--evaluation_dataflow_starting_num_workers': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_dataflow_starting_num_workers',
                },
                'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri',
                },
                'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_test_split_uri',
                },
                'pipelinechannel--location': {
                  componentInputParameter: 'pipelinechannel--location',
                },
                'pipelinechannel--project': { componentInputParameter: 'pipelinechannel--project' },
                'pipelinechannel--quantiles': {
                  componentInputParameter: 'pipelinechannel--quantiles',
                },
                'pipelinechannel--root_dir': {
                  componentInputParameter: 'pipelinechannel--root_dir',
                },
                'pipelinechannel--run_evaluation': {
                  componentInputParameter: 'pipelinechannel--run_evaluation',
                },
                'pipelinechannel--string-not-empty-Output': {
                  componentInputParameter: 'pipelinechannel--string-not-empty-Output',
                },
                'pipelinechannel--target_column': {
                  componentInputParameter: 'pipelinechannel--target_column',
                },
              },
            },
            taskInfo: { name: 'should_run_model_evaluation' },
            triggerPolicy: {
              strategy: TriggerStrategy.TRIGGER_STRATEGY_UNSPECIFIED,
            },
          },
          'get-or-create-model-description-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-get-or-create-model-description-2' },
            inputs: {
              parameters: {
                location: { componentInputParameter: 'pipelinechannel--location' },
                original_description: {
                  componentInputParameter: 'pipelinechannel--model_description',
                },
                project: { componentInputParameter: 'pipelinechannel--project' },
              },
            },
            taskInfo: { name: 'get-or-create-model-description-2' },
          },
          'get-prediction-image-uri-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-get-prediction-image-uri-2' },
            inputs: { parameters: { model_type: { runtimeValue: { constant: 'tide' } } } },
            taskInfo: { name: 'get-prediction-image-uri-2' },
          },
          'model-upload-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-upload-2' },
            dependentTasks: ['automl-forecasting-ensemble-2', 'get-or-create-model-description-2'],
            inputs: {
              artifacts: {
                explanation_metadata_artifact: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'explanation_metadata_artifact',
                    producerTask: 'automl-forecasting-ensemble-2',
                  },
                },
                parent_model: {},
                unmanaged_container_model: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'unmanaged_container_model',
                    producerTask: 'automl-forecasting-ensemble-2',
                  },
                },
              },
              parameters: {
                description: {},
                display_name: { componentInputParameter: 'pipelinechannel--model_display_name' },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                explanation_parameters: {},
                location: { componentInputParameter: 'pipelinechannel--location' },
                project: { componentInputParameter: 'pipelinechannel--project' },
              },
            },
            taskInfo: { name: 'model-upload-2' },
          },
        },
      },
      inputDefinitions: {
        artifacts: {
          'pipelinechannel--feature-transform-engine-instance_schema': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--feature-transform-engine-transform_output': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--parent_model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--split-materialized-data-materialized_eval_split': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--split-materialized-data-materialized_train_split': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--training-configurator-and-validator-instance_baseline': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--training-configurator-and-validator-metadata': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          'pipelinechannel--dataflow_service_account': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_subnetwork': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_use_public_ips': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--encryption_spec_key_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluated_examples_bigquery_path': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_predict_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_disk_size_gb': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_dataflow_max_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_starting_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--fast_testing': { parameterType: InputDefinitionParameterType.BOOLEAN },
          'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--location': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--model_description': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--model_display_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--num_selected_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--project': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--quantiles': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--root_dir': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--run_evaluation': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--stage_1_num_parallel_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--stage_1_tuner_worker_pool_specs_override': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--stage_2_num_parallel_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--string-not-empty-Output': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--study_spec_parameters_override': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--target_column': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--train_budget_milli_node_hours': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          'feature-attribution-2-feature_attributions': {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-condition-5': {
      dag: {
        tasks: {
          'feature-attribution-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-feature-attribution-2' },
            dependentTasks: ['model-batch-explanation-2'],
            inputs: {
              artifacts: {
                predictions_gcs_source: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'gcs_output_directory',
                    producerTask: 'model-batch-explanation-2',
                  },
                },
              },
              parameters: {
                dataflow_disk_size_gb: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                dataflow_machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                dataflow_max_workers_num: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                dataflow_service_account: {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                dataflow_subnetwork: {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                dataflow_use_public_ips: {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                dataflow_workers_num: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_dataflow_starting_num_workers',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                force_runner_mode: { runtimeValue: { constant: 'Dataflow' } },
                location: { componentInputParameter: 'pipelinechannel--location' },
                predictions_format: { runtimeValue: { constant: 'jsonl' } },
                problem_type: { runtimeValue: { constant: 'forecasting' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
              },
            },
            taskInfo: { name: 'feature-attribution-2' },
          },
          'finalize-eval-quantile-parameters-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-finalize-eval-quantile-parameters-2' },
            inputs: {
              parameters: { quantiles: { componentInputParameter: 'pipelinechannel--quantiles' } },
            },
            taskInfo: { name: 'finalize-eval-quantile-parameters-2' },
          },
          'get-predictions-column-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-get-predictions-column-2' },
            dependentTasks: ['finalize-eval-quantile-parameters-2'],
            inputs: {
              parameters: {
                forecasting_type: {},
                target_column: { componentInputParameter: 'pipelinechannel--target_column' },
              },
            },
            taskInfo: { name: 'get-predictions-column-2' },
          },
          'model-batch-explanation-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-batch-explanation-2' },
            inputs: {
              artifacts: {
                explanation_metadata_artifact: {},
                unmanaged_container_model: {},
              },
              parameters: {
                bigquery_source_input_uri: {},
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                explanation_parameters: {
                  componentInputParameter:
                    'pipelinechannel--automl-forecasting-ensemble-2-explanation_parameters',
                },
                gcs_destination_output_uri_prefix: {
                  componentInputParameter: 'pipelinechannel--root_dir',
                },
                generate_explanation: { runtimeValue: { constant: 'true' } },
                instances_format: { runtimeValue: { constant: 'bigquery' } },
                job_display_name: {
                  runtimeValue: {
                    constant:
                      'batch-explain-forecasting-evaluation-{{$.pipeline_job_uuid}}-{{$.pipeline_task_uuid}}',
                  },
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_explain_machine_type',
                },
                max_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_max_replica_count',
                },
                predictions_format: { runtimeValue: { constant: 'jsonl' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                starting_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_starting_replica_count',
                },
              },
            },
            taskInfo: { name: 'model-batch-explanation-2' },
          },
          'model-batch-predict-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-batch-predict-2' },
            inputs: {
              artifacts: {
                unmanaged_container_model: {},
              },
              parameters: {
                bigquery_destination_output_uri: {
                  componentInputParameter: 'pipelinechannel--evaluated_examples_bigquery_path',
                },
                bigquery_source_input_uri: {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_test_split_uri',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                generate_explanation: { runtimeValue: { constant: 'false' } },
                instances_format: { runtimeValue: { constant: 'bigquery' } },
                job_display_name: {
                  runtimeValue: {
                    constant:
                      'batch-predict-forecasting-evaluation-{{$.pipeline_job_uuid}}-{{$.pipeline_task_uuid}}',
                  },
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_predict_machine_type',
                },
                max_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_max_replica_count',
                },
                predictions_format: { runtimeValue: { constant: 'bigquery' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                starting_replica_count: {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_starting_replica_count',
                },
              },
            },
            taskInfo: { name: 'model-batch-predict-2' },
          },
          'model-evaluation-forecasting-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-evaluation-forecasting-2' },
            dependentTasks: [
              'finalize-eval-quantile-parameters-2',
              'get-predictions-column-2',
              'model-batch-predict-2',
              'table-to-uri-2',
            ],
            inputs: {
              artifacts: {
                predictions_bigquery_source: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'bigquery_output_table',
                    producerTask: 'model-batch-predict-2',
                  },
                },
              },
              parameters: {
                dataflow_disk_size: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                dataflow_machine_type: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                dataflow_max_workers_num: {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                dataflow_service_account: {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                dataflow_subnetwork: {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                dataflow_use_public_ips: {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                forecasting_quantiles: {},
                forecasting_type: {},
                ground_truth_bigquery_source: {},
                ground_truth_format: { runtimeValue: { constant: 'bigquery' } },
                ground_truth_gcs_source: { runtimeValue: { constant: '[]' } },
                location: { componentInputParameter: 'pipelinechannel--location' },
                'pipelinechannel--target_column': {
                  componentInputParameter: 'pipelinechannel--target_column',
                },
                prediction_score_column: {},
                predictions_format: { runtimeValue: { constant: 'bigquery' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
                target_field_name: {
                  runtimeValue: {
                    constant: "HORIZON__{{$.inputs.parameters['pipelinechannel--target_column']}}",
                  },
                },
              },
            },
            taskInfo: { name: 'model-evaluation-forecasting-2' },
          },
          'model-evaluation-import-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-model-evaluation-import-2' },
            dependentTasks: ['feature-attribution-2', 'model-evaluation-forecasting-2'],
            inputs: {
              artifacts: {
                feature_attributions: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'feature_attributions',
                    producerTask: 'feature-attribution-2',
                  },
                },
                forecasting_metrics: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'evaluation_metrics',
                    producerTask: 'model-evaluation-forecasting-2',
                  },
                },
                model: {},
              },
              parameters: {
                dataset_path: {
                  componentInputParameter:
                    'pipelinechannel--feature-transform-engine-bigquery_test_split_uri',
                },
                dataset_type: { runtimeValue: { constant: 'bigquery' } },
                display_name: { runtimeValue: { constant: 'Vertex Forecasting pipeline' } },
                problem_type: { runtimeValue: { constant: 'forecasting' } },
              },
            },
            taskInfo: { name: 'model-evaluation-import-2' },
          },
          'table-to-uri-2': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-table-to-uri-2' },
            dependentTasks: ['model-batch-predict-2'],
            inputs: {
              artifacts: {
                table: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'bigquery_output_table',
                    producerTask: 'model-batch-predict-2',
                  },
                },
              },
              parameters: { use_bq_prefix: { runtimeValue: { constant: 'true' } } },
            },
            taskInfo: { name: 'table-to-uri-2' },
          },
        },
      },
      inputDefinitions: {
        artifacts: {
          'pipelinechannel--automl-forecasting-ensemble-2-explanation_metadata_artifact': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--automl-forecasting-ensemble-2-unmanaged_container_model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          'pipelinechannel--model-upload-2-model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          'pipelinechannel--automl-forecasting-ensemble-2-explanation_parameters': {
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          'pipelinechannel--dataflow_service_account': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_subnetwork': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_use_public_ips': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--encryption_spec_key_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluated_examples_bigquery_path': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_predict_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_disk_size_gb': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_dataflow_max_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_starting_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--location': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--project': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--quantiles': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--root_dir': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--run_evaluation': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--string-not-empty-Output': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--target_column': { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          'feature-attribution-2-feature_attributions': {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-exit-handler-1': {
      dag: {
        tasks: {
          'condition-2': {
            componentRef: { name: 'comp-condition-2' },
            dependentTasks: [
              'feature-transform-engine',
              'split-materialized-data',
              'string-not-empty',
              'training-configurator-and-validator',
            ],
            inputs: {
              artifacts: {
                'pipelinechannel--feature-transform-engine-instance_schema': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'instance_schema',
                    producerTask: 'feature-transform-engine',
                  },
                },
                'pipelinechannel--feature-transform-engine-transform_output': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'transform_output',
                    producerTask: 'feature-transform-engine',
                  },
                },
                'pipelinechannel--parent_model': {},
                'pipelinechannel--split-materialized-data-materialized_eval_split': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'materialized_eval_split',
                    producerTask: 'split-materialized-data',
                  },
                },
                'pipelinechannel--split-materialized-data-materialized_train_split': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'materialized_train_split',
                    producerTask: 'split-materialized-data',
                  },
                },
                'pipelinechannel--training-configurator-and-validator-instance_baseline': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'instance_baseline',
                    producerTask: 'training-configurator-and-validator',
                  },
                },
                'pipelinechannel--training-configurator-and-validator-metadata': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'metadata',
                    producerTask: 'training-configurator-and-validator',
                  },
                },
              },
              parameters: {
                'pipelinechannel--dataflow_service_account': {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                'pipelinechannel--dataflow_subnetwork': {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                'pipelinechannel--dataflow_use_public_ips': {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                'pipelinechannel--encryption_spec_key_name': {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                'pipelinechannel--evaluated_examples_bigquery_path': {
                  componentInputParameter: 'pipelinechannel--evaluated_examples_bigquery_path',
                },
                'pipelinechannel--evaluation_batch_explain_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_explain_machine_type',
                },
                'pipelinechannel--evaluation_batch_explain_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_starting_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_predict_machine_type',
                },
                'pipelinechannel--evaluation_batch_predict_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_starting_replica_count',
                },
                'pipelinechannel--evaluation_dataflow_disk_size_gb': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                'pipelinechannel--evaluation_dataflow_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                'pipelinechannel--evaluation_dataflow_max_num_workers': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                'pipelinechannel--evaluation_dataflow_starting_num_workers': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_dataflow_starting_num_workers',
                },
                'pipelinechannel--fast_testing': {
                  componentInputParameter: 'pipelinechannel--fast_testing',
                },
                'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {},
                'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {},
                'pipelinechannel--location': {
                  componentInputParameter: 'pipelinechannel--location',
                },
                'pipelinechannel--model_description': {
                  componentInputParameter: 'pipelinechannel--model_description',
                },
                'pipelinechannel--model_display_name': {
                  componentInputParameter: 'pipelinechannel--model_display_name',
                },
                'pipelinechannel--num_selected_trials': {
                  componentInputParameter: 'pipelinechannel--num_selected_trials',
                },
                'pipelinechannel--project': { componentInputParameter: 'pipelinechannel--project' },
                'pipelinechannel--quantiles': {
                  componentInputParameter: 'pipelinechannel--quantiles',
                },
                'pipelinechannel--root_dir': {
                  componentInputParameter: 'pipelinechannel--root_dir',
                },
                'pipelinechannel--run_evaluation': {
                  componentInputParameter: 'pipelinechannel--run_evaluation',
                },
                'pipelinechannel--stage_1_num_parallel_trials': {
                  componentInputParameter: 'pipelinechannel--stage_1_num_parallel_trials',
                },
                'pipelinechannel--stage_1_tuning_result_artifact_uri': {
                  componentInputParameter: 'pipelinechannel--stage_1_tuning_result_artifact_uri',
                },
                'pipelinechannel--stage_2_num_parallel_trials': {
                  componentInputParameter: 'pipelinechannel--stage_2_num_parallel_trials',
                },
                'pipelinechannel--stage_2_trainer_worker_pool_specs_override': {
                  componentInputParameter:
                    'pipelinechannel--stage_2_trainer_worker_pool_specs_override',
                },
                'pipelinechannel--string-not-empty-Output': {},
                'pipelinechannel--target_column': {
                  componentInputParameter: 'pipelinechannel--target_column',
                },
                'pipelinechannel--train_budget_milli_node_hours': {
                  componentInputParameter: 'pipelinechannel--train_budget_milli_node_hours',
                },
              },
            },
            taskInfo: { name: 'stage_1_tuning_result_artifact_uri_not_empty' },
            triggerPolicy: {
              strategy: TriggerStrategy.TRIGGER_STRATEGY_UNSPECIFIED,
            },
          },
          'condition-4': {
            componentRef: { name: 'comp-condition-4' },
            dependentTasks: [
              'feature-transform-engine',
              'split-materialized-data',
              'string-not-empty',
              'training-configurator-and-validator',
            ],
            inputs: {
              artifacts: {
                'pipelinechannel--feature-transform-engine-instance_schema': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'instance_schema',
                    producerTask: 'feature-transform-engine',
                  },
                },
                'pipelinechannel--feature-transform-engine-transform_output': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'transform_output',
                    producerTask: 'feature-transform-engine',
                  },
                },
                'pipelinechannel--parent_model': {},
                'pipelinechannel--split-materialized-data-materialized_eval_split': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'materialized_eval_split',
                    producerTask: 'split-materialized-data',
                  },
                },
                'pipelinechannel--split-materialized-data-materialized_train_split': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'materialized_train_split',
                    producerTask: 'split-materialized-data',
                  },
                },
                'pipelinechannel--training-configurator-and-validator-instance_baseline': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'instance_baseline',
                    producerTask: 'training-configurator-and-validator',
                  },
                },
                'pipelinechannel--training-configurator-and-validator-metadata': {
                  taskOutputArtifact: {
                    outputArtifactKey: 'metadata',
                    producerTask: 'training-configurator-and-validator',
                  },
                },
              },
              parameters: {
                'pipelinechannel--dataflow_service_account': {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                'pipelinechannel--dataflow_subnetwork': {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                'pipelinechannel--dataflow_use_public_ips': {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                'pipelinechannel--encryption_spec_key_name': {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                'pipelinechannel--evaluated_examples_bigquery_path': {
                  componentInputParameter: 'pipelinechannel--evaluated_examples_bigquery_path',
                },
                'pipelinechannel--evaluation_batch_explain_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_explain_machine_type',
                },
                'pipelinechannel--evaluation_batch_explain_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_explain_starting_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_batch_predict_machine_type',
                },
                'pipelinechannel--evaluation_batch_predict_max_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_max_replica_count',
                },
                'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_batch_predict_starting_replica_count',
                },
                'pipelinechannel--evaluation_dataflow_disk_size_gb': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_disk_size_gb',
                },
                'pipelinechannel--evaluation_dataflow_machine_type': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_machine_type',
                },
                'pipelinechannel--evaluation_dataflow_max_num_workers': {
                  componentInputParameter: 'pipelinechannel--evaluation_dataflow_max_num_workers',
                },
                'pipelinechannel--evaluation_dataflow_starting_num_workers': {
                  componentInputParameter:
                    'pipelinechannel--evaluation_dataflow_starting_num_workers',
                },
                'pipelinechannel--fast_testing': {
                  componentInputParameter: 'pipelinechannel--fast_testing',
                },
                'pipelinechannel--feature-transform-engine-bigquery_downsampled_test_split_uri': {},
                'pipelinechannel--feature-transform-engine-bigquery_test_split_uri': {},
                'pipelinechannel--location': {
                  componentInputParameter: 'pipelinechannel--location',
                },
                'pipelinechannel--model_description': {
                  componentInputParameter: 'pipelinechannel--model_description',
                },
                'pipelinechannel--model_display_name': {
                  componentInputParameter: 'pipelinechannel--model_display_name',
                },
                'pipelinechannel--num_selected_trials': {
                  componentInputParameter: 'pipelinechannel--num_selected_trials',
                },
                'pipelinechannel--project': { componentInputParameter: 'pipelinechannel--project' },
                'pipelinechannel--quantiles': {
                  componentInputParameter: 'pipelinechannel--quantiles',
                },
                'pipelinechannel--root_dir': {
                  componentInputParameter: 'pipelinechannel--root_dir',
                },
                'pipelinechannel--run_evaluation': {
                  componentInputParameter: 'pipelinechannel--run_evaluation',
                },
                'pipelinechannel--stage_1_num_parallel_trials': {
                  componentInputParameter: 'pipelinechannel--stage_1_num_parallel_trials',
                },
                'pipelinechannel--stage_1_tuner_worker_pool_specs_override': {
                  componentInputParameter:
                    'pipelinechannel--stage_1_tuner_worker_pool_specs_override',
                },
                'pipelinechannel--stage_2_num_parallel_trials': {
                  componentInputParameter: 'pipelinechannel--stage_2_num_parallel_trials',
                },
                'pipelinechannel--string-not-empty-Output': {},
                'pipelinechannel--study_spec_parameters_override': {
                  componentInputParameter: 'pipelinechannel--study_spec_parameters_override',
                },
                'pipelinechannel--target_column': {
                  componentInputParameter: 'pipelinechannel--target_column',
                },
                'pipelinechannel--train_budget_milli_node_hours': {
                  componentInputParameter: 'pipelinechannel--train_budget_milli_node_hours',
                },
              },
            },
            taskInfo: { name: 'stage_1_tuning_result_artifact_uri_empty' },
            triggerPolicy: {
              strategy: TriggerStrategy.TRIGGER_STRATEGY_UNSPECIFIED,
            },
          },
          'feature-transform-engine': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-feature-transform-engine' },
            inputs: {
              parameters: {
                bigquery_staging_full_dataset_id: {
                  componentInputParameter:
                    'pipelinechannel--feature_transform_engine_bigquery_staging_full_dataset_id',
                },
                data_source_bigquery_table_path: {
                  componentInputParameter:
                    'pipelinechannel--set-optional-inputs-data_source_bigquery_table_path',
                },
                data_source_csv_filenames: {
                  componentInputParameter:
                    'pipelinechannel--set-optional-inputs-data_source_csv_filenames',
                },
                dataflow_disk_size_gb: {
                  componentInputParameter:
                    'pipelinechannel--feature_transform_engine_dataflow_disk_size_gb',
                },
                dataflow_machine_type: {
                  componentInputParameter:
                    'pipelinechannel--feature_transform_engine_dataflow_machine_type',
                },
                dataflow_max_num_workers: {
                  componentInputParameter:
                    'pipelinechannel--feature_transform_engine_dataflow_max_num_workers',
                },
                dataflow_service_account: {
                  componentInputParameter: 'pipelinechannel--dataflow_service_account',
                },
                dataflow_subnetwork: {
                  componentInputParameter: 'pipelinechannel--dataflow_subnetwork',
                },
                dataflow_use_public_ips: {
                  componentInputParameter: 'pipelinechannel--dataflow_use_public_ips',
                },
                encryption_spec_key_name: {
                  componentInputParameter: 'pipelinechannel--encryption_spec_key_name',
                },
                forecasting_available_at_forecast_columns: {
                  componentInputParameter: 'pipelinechannel--available_at_forecast_columns',
                },
                forecasting_context_window: {
                  componentInputParameter: 'pipelinechannel--context_window',
                },
                forecasting_forecast_horizon: {
                  componentInputParameter: 'pipelinechannel--forecast_horizon',
                },
                forecasting_holiday_regions: {
                  componentInputParameter: 'pipelinechannel--holiday_regions',
                },
                forecasting_predefined_window_column: {
                  componentInputParameter: 'pipelinechannel--window_predefined_column',
                },
                forecasting_time_column: {
                  componentInputParameter: 'pipelinechannel--time_column',
                },
                forecasting_time_series_attribute_columns: {
                  componentInputParameter: 'pipelinechannel--time_series_attribute_columns',
                },
                forecasting_time_series_identifier_columns: {
                  componentInputParameter: 'pipelinechannel--time_series_identifier_columns',
                },
                forecasting_unavailable_at_forecast_columns: {
                  componentInputParameter: 'pipelinechannel--unavailable_at_forecast_columns',
                },
                forecasting_window_max_count: {
                  componentInputParameter: 'pipelinechannel--window_max_count',
                },
                forecasting_window_stride_length: {
                  componentInputParameter: 'pipelinechannel--window_stride_length',
                },
                group_columns: { componentInputParameter: 'pipelinechannel--group_columns' },
                group_temporal_total_weight: {
                  componentInputParameter: 'pipelinechannel--group_temporal_total_weight',
                },
                group_total_weight: {
                  componentInputParameter: 'pipelinechannel--group_total_weight',
                },
                location: { componentInputParameter: 'pipelinechannel--location' },
                model_type: { runtimeValue: { constant: 'tide' } },
                predefined_split_key: {
                  componentInputParameter: 'pipelinechannel--predefined_split_key',
                },
                prediction_type: { runtimeValue: { constant: 'time_series' } },
                project: { componentInputParameter: 'pipelinechannel--project' },
                root_dir: { componentInputParameter: 'pipelinechannel--root_dir' },
                stats_gen_execution_engine: { runtimeValue: { constant: 'bigquery' } },
                target_column: { componentInputParameter: 'pipelinechannel--target_column' },
                temporal_total_weight: {
                  componentInputParameter: 'pipelinechannel--temporal_total_weight',
                },
                test_fraction: { componentInputParameter: 'pipelinechannel--test_fraction' },
                tf_auto_transform_features: {
                  componentInputParameter: 'pipelinechannel--transformations',
                },
                timestamp_split_key: {
                  componentInputParameter: 'pipelinechannel--timestamp_split_key',
                },
                training_fraction: {
                  componentInputParameter: 'pipelinechannel--training_fraction',
                },
                validation_fraction: {
                  componentInputParameter: 'pipelinechannel--validation_fraction',
                },
                weight_column: { componentInputParameter: 'pipelinechannel--weight_column' },
              },
            },
            taskInfo: { name: 'feature-transform-engine' },
          },
          'split-materialized-data': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-split-materialized-data' },
            dependentTasks: ['feature-transform-engine'],
            inputs: {
              artifacts: {
                materialized_data: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'materialized_data',
                    producerTask: 'feature-transform-engine',
                  },
                },
              },
            },
            taskInfo: { name: 'split-materialized-data' },
          },
          'string-not-empty': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-string-not-empty' },
            inputs: {
              parameters: {
                value: {
                  componentInputParameter: 'pipelinechannel--stage_1_tuning_result_artifact_uri',
                },
              },
            },
            taskInfo: { name: 'check-if-hyperparameter-tuning-results-are-supplied-by-user' },
          },
          'training-configurator-and-validator': {
            cachingOptions: { enableCache: true },
            componentRef: { name: 'comp-training-configurator-and-validator' },
            dependentTasks: ['feature-transform-engine'],
            inputs: {
              artifacts: {
                dataset_stats: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'dataset_stats',
                    producerTask: 'feature-transform-engine',
                  },
                },
                instance_schema: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'instance_schema',
                    producerTask: 'feature-transform-engine',
                  },
                },
                training_schema: {
                  taskOutputArtifact: {
                    outputArtifactKey: 'training_schema',
                    producerTask: 'feature-transform-engine',
                  },
                },
              },
              parameters: {
                available_at_forecast_columns: {
                  componentInputParameter: 'pipelinechannel--available_at_forecast_columns',
                },
                context_window: { componentInputParameter: 'pipelinechannel--context_window' },
                enable_probabilistic_inference: {
                  componentInputParameter: 'pipelinechannel--enable_probabilistic_inference',
                },
                forecast_horizon: { componentInputParameter: 'pipelinechannel--forecast_horizon' },
                forecasting_model_type: { runtimeValue: { constant: 'tide' } },
                forecasting_transformations: {
                  componentInputParameter: 'pipelinechannel--set-optional-inputs-transformations',
                },
                group_columns: { componentInputParameter: 'pipelinechannel--group_columns' },
                group_temporal_total_weight: {
                  componentInputParameter: 'pipelinechannel--group_temporal_total_weight',
                },
                group_total_weight: {
                  componentInputParameter: 'pipelinechannel--group_total_weight',
                },
                optimization_objective: {
                  componentInputParameter: 'pipelinechannel--optimization_objective',
                },
                prediction_type: { runtimeValue: { constant: 'time_series' } },
                quantiles: { componentInputParameter: 'pipelinechannel--quantiles' },
                split_example_counts: {},
                target_column: { componentInputParameter: 'pipelinechannel--target_column' },
                temporal_total_weight: {
                  componentInputParameter: 'pipelinechannel--temporal_total_weight',
                },
                time_column: { componentInputParameter: 'pipelinechannel--time_column' },
                time_series_attribute_columns: {
                  componentInputParameter: 'pipelinechannel--time_series_attribute_columns',
                },
                time_series_identifier_columns: {
                  componentInputParameter: 'pipelinechannel--time_series_identifier_columns',
                },
                unavailable_at_forecast_columns: {
                  componentInputParameter: 'pipelinechannel--unavailable_at_forecast_columns',
                },
                weight_column: { componentInputParameter: 'pipelinechannel--weight_column' },
              },
            },
            taskInfo: { name: 'training-configurator-and-validator' },
          },
        },
      },
      inputDefinitions: {
        artifacts: {
          'pipelinechannel--parent_model': {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          'pipelinechannel--available_at_forecast_columns': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--context_window': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--dataflow_service_account': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_subnetwork': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--dataflow_use_public_ips': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--enable_probabilistic_inference': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--encryption_spec_key_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluated_examples_bigquery_path': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_explain_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_batch_predict_max_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_disk_size_gb': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--evaluation_dataflow_max_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--evaluation_dataflow_starting_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--fast_testing': { parameterType: InputDefinitionParameterType.BOOLEAN },
          'pipelinechannel--feature_transform_engine_bigquery_staging_full_dataset_id': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--feature_transform_engine_dataflow_disk_size_gb': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--feature_transform_engine_dataflow_machine_type': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--feature_transform_engine_dataflow_max_num_workers': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--forecast_horizon': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--group_columns': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--group_temporal_total_weight': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          'pipelinechannel--group_total_weight': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          'pipelinechannel--holiday_regions': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--location': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--model_description': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--model_display_name': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--num_selected_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--optimization_objective': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--predefined_split_key': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--project': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--quantiles': { parameterType: InputDefinitionParameterType.LIST },
          'pipelinechannel--root_dir': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--run_evaluation': {
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          'pipelinechannel--set-optional-inputs-data_source_bigquery_table_path': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--set-optional-inputs-data_source_csv_filenames': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--set-optional-inputs-transformations': {
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          'pipelinechannel--stage_1_num_parallel_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--stage_1_tuner_worker_pool_specs_override': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--stage_1_tuning_result_artifact_uri': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--stage_2_num_parallel_trials': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--stage_2_trainer_worker_pool_specs_override': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--study_spec_parameters_override': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--target_column': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--temporal_total_weight': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          'pipelinechannel--test_fraction': { parameterType: InputDefinitionParameterType.DOUBLE },
          'pipelinechannel--time_column': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--time_series_attribute_columns': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--time_series_identifier_columns': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--timestamp_split_key': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--train_budget_milli_node_hours': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          'pipelinechannel--training_fraction': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          'pipelinechannel--transformations': {
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          'pipelinechannel--unavailable_at_forecast_columns': {
            parameterType: InputDefinitionParameterType.LIST,
          },
          'pipelinechannel--validation_fraction': {
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          'pipelinechannel--weight_column': { parameterType: InputDefinitionParameterType.STRING },
          'pipelinechannel--window_max_count': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          'pipelinechannel--window_predefined_column': {
            parameterType: InputDefinitionParameterType.STRING,
          },
          'pipelinechannel--window_stride_length': {
            parameterType: InputDefinitionParameterType.INTEGER,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          'feature-attribution-2-feature_attributions': {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          'feature-attribution-feature_attributions': {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-feature-attribution': {
      executorLabel: 'exec-feature-attribution',
      inputDefinitions: {
        artifacts: {
          predictions_bigquery_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          predictions_gcs_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          dataflow_disk_size_gb: {
            defaultValue: 50,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_machine_type: {
            defaultValue: 'n1-standard-4',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_max_workers_num: {
            defaultValue: 5,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_service_account: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_subnetwork: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_use_public_ips: {
            defaultValue: true,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          dataflow_workers_num: {
            defaultValue: 1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          force_runner_mode: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          problem_type: { parameterType: InputDefinitionParameterType.STRING },
          project: {
            defaultValue: '{{$.pipeline_google_cloud_project_id}}',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          feature_attributions: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-feature-attribution-2': {
      executorLabel: 'exec-feature-attribution-2',
      inputDefinitions: {
        artifacts: {
          predictions_bigquery_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          predictions_gcs_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          dataflow_disk_size_gb: {
            defaultValue: 50,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_machine_type: {
            defaultValue: 'n1-standard-4',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_max_workers_num: {
            defaultValue: 5,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_service_account: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_subnetwork: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_use_public_ips: {
            defaultValue: true,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          dataflow_workers_num: {
            defaultValue: 1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          force_runner_mode: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          problem_type: { parameterType: InputDefinitionParameterType.STRING },
          project: {
            defaultValue: '{{$.pipeline_google_cloud_project_id}}',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          feature_attributions: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-feature-transform-engine': {
      executorLabel: 'exec-feature-transform-engine',
      inputDefinitions: {
        parameters: {
          autodetect_csv_schema: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          bigquery_staging_full_dataset_id: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          data_source_bigquery_table_path: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          data_source_csv_filenames: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_disk_size_gb: {
            defaultValue: 40,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_machine_type: {
            defaultValue: 'n1-standard-16',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_max_num_workers: {
            defaultValue: 25,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_service_account: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_subnetwork: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_use_public_ips: {
            defaultValue: true,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          dataset_level_custom_transformation_definitions: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          dataset_level_transformations: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          feature_selection_algorithm: {
            defaultValue: 'AMI',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          feature_selection_execution_engine: {
            defaultValue: 'dataflow',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_apply_windowing: {
            defaultValue: true,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          forecasting_available_at_forecast_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_context_window: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          forecasting_forecast_horizon: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          forecasting_holiday_regions: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_predefined_window_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_time_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_time_series_attribute_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_time_series_identifier_column: {
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_time_series_identifier_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_unavailable_at_forecast_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_window_max_count: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          forecasting_window_stride_length: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          group_columns: { isOptional: true, parameterType: InputDefinitionParameterType.LIST },
          group_temporal_total_weight: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          group_total_weight: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          legacy_transformations_path: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          location: { parameterType: InputDefinitionParameterType.STRING },
          materialized_examples_format: {
            defaultValue: 'tfrecords_gzip',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          max_selected_features: {
            defaultValue: 1000,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          model_type: { isOptional: true, parameterType: InputDefinitionParameterType.STRING },
          multimodal_image_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          multimodal_tabular_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          multimodal_text_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          multimodal_timeseries_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          predefined_split_key: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          prediction_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
          run_distill: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          run_feature_selection: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          stats_gen_execution_engine: {
            defaultValue: 'dataflow',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          stratified_split_key: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          target_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          temporal_total_weight: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          test_fraction: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          tf_auto_transform_features: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          tf_custom_transformation_definitions: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          tf_transform_execution_engine: {
            defaultValue: 'dataflow',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          tf_transformations_path: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          timestamp_split_key: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          training_fraction: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          validation_fraction: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          weight_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          dataset_stats: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          feature_ranking: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          instance_schema: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          materialized_data: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          training_schema: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          transform_output: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          bigquery_downsampled_test_split_uri: {
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_test_split_uri: { parameterType: InputDefinitionParameterType.STRING },
          bigquery_train_split_uri: { parameterType: InputDefinitionParameterType.STRING },
          bigquery_validation_split_uri: { parameterType: InputDefinitionParameterType.STRING },
          gcp_resources: { parameterType: InputDefinitionParameterType.STRING },
          split_example_counts: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-finalize-eval-quantile-parameters': {
      executorLabel: 'exec-finalize-eval-quantile-parameters',
      inputDefinitions: {
        parameters: {
          quantiles: { isOptional: true, parameterType: InputDefinitionParameterType.LIST },
        },
      },
      outputDefinitions: {
        parameters: {
          forecasting_type: { parameterType: InputDefinitionParameterType.STRING },
          quantiles: { parameterType: InputDefinitionParameterType.LIST },
        },
      },
    },
    'comp-finalize-eval-quantile-parameters-2': {
      executorLabel: 'exec-finalize-eval-quantile-parameters-2',
      inputDefinitions: {
        parameters: {
          quantiles: { isOptional: true, parameterType: InputDefinitionParameterType.LIST },
        },
      },
      outputDefinitions: {
        parameters: {
          forecasting_type: { parameterType: InputDefinitionParameterType.STRING },
          quantiles: { parameterType: InputDefinitionParameterType.LIST },
        },
      },
    },
    'comp-get-or-create-model-description': {
      executorLabel: 'exec-get-or-create-model-description',
      inputDefinitions: {
        parameters: {
          location: { parameterType: InputDefinitionParameterType.STRING },
          original_description: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-get-or-create-model-description-2': {
      executorLabel: 'exec-get-or-create-model-description-2',
      inputDefinitions: {
        parameters: {
          location: { parameterType: InputDefinitionParameterType.STRING },
          original_description: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-get-prediction-image-uri': {
      executorLabel: 'exec-get-prediction-image-uri',
      inputDefinitions: {
        parameters: { model_type: { parameterType: InputDefinitionParameterType.STRING } },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-get-prediction-image-uri-2': {
      executorLabel: 'exec-get-prediction-image-uri-2',
      inputDefinitions: {
        parameters: { model_type: { parameterType: InputDefinitionParameterType.STRING } },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-get-predictions-column': {
      executorLabel: 'exec-get-predictions-column',
      inputDefinitions: {
        parameters: {
          forecasting_type: { parameterType: InputDefinitionParameterType.STRING },
          target_column: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-get-predictions-column-2': {
      executorLabel: 'exec-get-predictions-column-2',
      inputDefinitions: {
        parameters: {
          forecasting_type: { parameterType: InputDefinitionParameterType.STRING },
          target_column: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-importer': {
      executorLabel: 'exec-importer',
      inputDefinitions: {
        parameters: { uri: { parameterType: InputDefinitionParameterType.STRING } },
      },
      outputDefinitions: {
        artifacts: {
          artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-model-batch-explanation': {
      executorLabel: 'exec-model-batch-explanation',
      inputDefinitions: {
        artifacts: {
          explanation_metadata_artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          accelerator_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          accelerator_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_destination_output_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_source_input_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          explanation_metadata: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          explanation_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          gcs_destination_output_uri_prefix: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          gcs_source_uris: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          generate_explanation: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          instances_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          job_display_name: { parameterType: InputDefinitionParameterType.STRING },
          labels: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          machine_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          manual_batch_tuning_parameters_batch_size: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          max_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          model_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
          starting_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          batchpredictionjob: {
            artifactType: {
              schemaTitle: ArtifactType.ARTIFACT,
              schemaVersion: '0.0.1',
            },
          },
          bigquery_output_table: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          gcs_output_directory: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-batch-explanation-2': {
      executorLabel: 'exec-model-batch-explanation-2',
      inputDefinitions: {
        artifacts: {
          explanation_metadata_artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          accelerator_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          accelerator_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_destination_output_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_source_input_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          explanation_metadata: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          explanation_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          gcs_destination_output_uri_prefix: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          gcs_source_uris: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          generate_explanation: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          instances_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          job_display_name: { parameterType: InputDefinitionParameterType.STRING },
          labels: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          machine_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          manual_batch_tuning_parameters_batch_size: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          max_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          model_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
          starting_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          batchpredictionjob: {
            artifactType: {
              schemaTitle: ArtifactType.ARTIFACT,
              schemaVersion: '0.0.1',
            },
          },
          bigquery_output_table: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          gcs_output_directory: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-batch-predict': {
      executorLabel: 'exec-model-batch-predict',
      inputDefinitions: {
        artifacts: {
          model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          accelerator_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          accelerator_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_destination_output_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_source_input_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          excluded_fields: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          explanation_metadata: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          explanation_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          gcs_destination_output_uri_prefix: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          gcs_source_uris: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          generate_explanation: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          included_fields: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          instance_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          instances_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          job_display_name: { parameterType: InputDefinitionParameterType.STRING },
          key_field: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          labels: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          machine_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          manual_batch_tuning_parameters_batch_size: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          max_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          model_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: {
            defaultValue: '{{$.pipeline_google_cloud_project_id}}',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          starting_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          batchpredictionjob: {
            artifactType: {
              schemaTitle: ArtifactType.ARTIFACT,
              schemaVersion: '0.0.1',
            },
          },
          bigquery_output_table: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          gcs_output_directory: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-batch-predict-2': {
      executorLabel: 'exec-model-batch-predict-2',
      inputDefinitions: {
        artifacts: {
          model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          accelerator_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          accelerator_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_destination_output_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          bigquery_source_input_uri: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          excluded_fields: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          explanation_metadata: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          explanation_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          gcs_destination_output_uri_prefix: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          gcs_source_uris: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          generate_explanation: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          included_fields: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          instance_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          instances_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          job_display_name: { parameterType: InputDefinitionParameterType.STRING },
          key_field: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          labels: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          machine_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          manual_batch_tuning_parameters_batch_size: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          max_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          model_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: {
            defaultValue: '{{$.pipeline_google_cloud_project_id}}',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          starting_replica_count: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          batchpredictionjob: {
            artifactType: {
              schemaTitle: ArtifactType.ARTIFACT,
              schemaVersion: '0.0.1',
            },
          },
          bigquery_output_table: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          gcs_output_directory: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-evaluation-forecasting': {
      executorLabel: 'exec-model-evaluation-forecasting',
      inputDefinitions: {
        artifacts: {
          model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          predictions_bigquery_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          predictions_gcs_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          dataflow_disk_size: {
            defaultValue: 50,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_machine_type: {
            defaultValue: 'n1-standard-4',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_max_workers_num: {
            defaultValue: 5,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_service_account: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_subnetwork: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_use_public_ips: {
            defaultValue: true,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          dataflow_workers_num: {
            defaultValue: 1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          example_weight_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_quantiles: {
            defaultValue: [0.5],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_type: {
            defaultValue: 'point',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          ground_truth_bigquery_source: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          ground_truth_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          ground_truth_gcs_source: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          point_evaluation_quantile: {
            defaultValue: 0.5,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          prediction_score_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
          target_field_name: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          evaluation_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-evaluation-forecasting-2': {
      executorLabel: 'exec-model-evaluation-forecasting-2',
      inputDefinitions: {
        artifacts: {
          model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          predictions_bigquery_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          predictions_gcs_source: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          dataflow_disk_size: {
            defaultValue: 50,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_machine_type: {
            defaultValue: 'n1-standard-4',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_max_workers_num: {
            defaultValue: 5,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          dataflow_service_account: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_subnetwork: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataflow_use_public_ips: {
            defaultValue: true,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          dataflow_workers_num: {
            defaultValue: 1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          example_weight_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_quantiles: {
            defaultValue: [0.5],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          forecasting_type: {
            defaultValue: 'point',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          ground_truth_bigquery_source: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          ground_truth_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          ground_truth_gcs_source: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          point_evaluation_quantile: {
            defaultValue: 0.5,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          prediction_score_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          predictions_format: {
            defaultValue: 'jsonl',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
          root_dir: { parameterType: InputDefinitionParameterType.STRING },
          target_field_name: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          evaluation_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-evaluation-import': {
      executorLabel: 'exec-model-evaluation-import',
      inputDefinitions: {
        artifacts: {
          classification_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          embedding_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          explanation: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          feature_attributions: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          forecasting_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          question_answering_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          regression_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          summarization_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          text_generation_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          dataset_path: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataset_paths: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          dataset_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          display_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          problem_type: { isOptional: true, parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: {
          evaluation_resource_name: { parameterType: InputDefinitionParameterType.STRING },
          gcp_resources: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-model-evaluation-import-2': {
      executorLabel: 'exec-model-evaluation-import-2',
      inputDefinitions: {
        artifacts: {
          classification_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          embedding_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          explanation: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          feature_attributions: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          forecasting_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          question_answering_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          regression_metrics: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          summarization_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
          text_generation_metrics: {
            artifactType: { schemaTitle: ArtifactType.METRICS, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          dataset_path: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          dataset_paths: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          dataset_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          display_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          problem_type: { isOptional: true, parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        parameters: {
          evaluation_resource_name: { parameterType: InputDefinitionParameterType.STRING },
          gcp_resources: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-model-upload': {
      executorLabel: 'exec-model-upload',
      inputDefinitions: {
        artifacts: {
          explanation_metadata_artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          parent_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          description: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          display_name: { parameterType: InputDefinitionParameterType.STRING },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          explanation_metadata: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          explanation_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          labels: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          model: { artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' } },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-model-upload-2': {
      executorLabel: 'exec-model-upload-2',
      inputDefinitions: {
        artifacts: {
          explanation_metadata_artifact: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          parent_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          unmanaged_container_model: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          description: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          display_name: { parameterType: InputDefinitionParameterType.STRING },
          encryption_spec_key_name: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          explanation_metadata: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          explanation_parameters: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          labels: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          location: {
            defaultValue: 'us-central1',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          project: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
      outputDefinitions: {
        artifacts: {
          model: { artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' } },
        },
        parameters: { gcp_resources: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-set-optional-inputs': {
      executorLabel: 'exec-set-optional-inputs',
      inputDefinitions: {
        artifacts: {
          vertex_dataset: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          data_source_bigquery_table_path: { parameterType: InputDefinitionParameterType.STRING },
          data_source_csv_filenames: { parameterType: InputDefinitionParameterType.STRING },
          location: { parameterType: InputDefinitionParameterType.STRING },
          model_display_name: { parameterType: InputDefinitionParameterType.STRING },
          project: { parameterType: InputDefinitionParameterType.STRING },
          stats_gen_execution_engine: { parameterType: InputDefinitionParameterType.STRING },
          transformations: { parameterType: InputDefinitionParameterType.STRUCT },
        },
      },
      outputDefinitions: {
        parameters: {
          data_source_bigquery_table_path: { parameterType: InputDefinitionParameterType.STRING },
          data_source_csv_filenames: { parameterType: InputDefinitionParameterType.STRING },
          model_display_name: { parameterType: InputDefinitionParameterType.STRING },
          transformations: { parameterType: InputDefinitionParameterType.STRUCT },
        },
      },
    },
    'comp-split-materialized-data': {
      executorLabel: 'exec-split-materialized-data',
      inputDefinitions: {
        artifacts: {
          materialized_data: {
            artifactType: { schemaTitle: ArtifactType.DATASET, schemaVersion: '0.0.1' },
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          materialized_eval_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          materialized_test_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          materialized_train_split: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
      },
    },
    'comp-string-not-empty': {
      executorLabel: 'exec-string-not-empty',
      inputDefinitions: {
        parameters: { value: { parameterType: InputDefinitionParameterType.STRING } },
      },
      outputDefinitions: {
        parameters: { Output: { parameterType: InputDefinitionParameterType.STRING } },
      },
    },
    'comp-table-to-uri': {
      executorLabel: 'exec-table-to-uri',
      inputDefinitions: {
        artifacts: {
          table: { artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' } },
        },
        parameters: {
          use_bq_prefix: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
        },
      },
      outputDefinitions: {
        parameters: {
          dataset_id: { parameterType: InputDefinitionParameterType.STRING },
          project_id: { parameterType: InputDefinitionParameterType.STRING },
          table_id: { parameterType: InputDefinitionParameterType.STRING },
          uri: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-table-to-uri-2': {
      executorLabel: 'exec-table-to-uri-2',
      inputDefinitions: {
        artifacts: {
          table: { artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' } },
        },
        parameters: {
          use_bq_prefix: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
        },
      },
      outputDefinitions: {
        parameters: {
          dataset_id: { parameterType: InputDefinitionParameterType.STRING },
          project_id: { parameterType: InputDefinitionParameterType.STRING },
          table_id: { parameterType: InputDefinitionParameterType.STRING },
          uri: { parameterType: InputDefinitionParameterType.STRING },
        },
      },
    },
    'comp-training-configurator-and-validator': {
      executorLabel: 'exec-training-configurator-and-validator',
      inputDefinitions: {
        artifacts: {
          dataset_stats: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          instance_schema: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          training_schema: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
        parameters: {
          available_at_forecast_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          context_window: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          enable_probabilistic_inference: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          forecast_horizon: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.INTEGER,
          },
          forecasting_model_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          forecasting_transformations: {
            defaultValue: {},
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRUCT,
          },
          group_columns: { isOptional: true, parameterType: InputDefinitionParameterType.LIST },
          group_temporal_total_weight: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          group_total_weight: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          optimization_objective: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          optimization_objective_precision_value: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          optimization_objective_recall_value: {
            defaultValue: -1,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          prediction_type: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          quantiles: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          run_distill: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          run_evaluation: {
            defaultValue: false,
            isOptional: true,
            parameterType: InputDefinitionParameterType.BOOLEAN,
          },
          split_example_counts: { parameterType: InputDefinitionParameterType.STRING },
          stage_1_deadline_hours: {
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          stage_2_deadline_hours: {
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          target_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          temporal_total_weight: {
            defaultValue: 0,
            isOptional: true,
            parameterType: InputDefinitionParameterType.DOUBLE,
          },
          time_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          time_series_attribute_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          time_series_identifier_column: {
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
          time_series_identifier_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          unavailable_at_forecast_columns: {
            defaultValue: [],
            isOptional: true,
            parameterType: InputDefinitionParameterType.LIST,
          },
          weight_column: {
            defaultValue: '',
            isOptional: true,
            parameterType: InputDefinitionParameterType.STRING,
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          instance_baseline: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
          metadata: {
            artifactType: { schemaTitle: ArtifactType.ARTIFACT, schemaVersion: '0.0.1' },
          },
        },
      },
    },
  },
  deploymentSpec: {
    executors: {
      'exec-automl-forecasting-ensemble': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:1.0.44',
        },
      },
      'exec-automl-forecasting-ensemble-2': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:1.0.44',
        },
      },
      'exec-automl-forecasting-stage-1-tuner': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:1.0.44',
        },
      },
      'exec-automl-forecasting-stage-2-tuner': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:1.0.44',
        },
      },
      'exec-automl-tabular-finalizer': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:1.0.44',
        },
      },
      'exec-calculate-training-parameters': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-calculate-training-parameters-2': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-feature-attribution': {
        container: { args: [], command: [], image: 'gcr.io/ml-pipeline/model-evaluation:v0.9.2' },
      },
      'exec-feature-attribution-2': {
        container: { args: [], command: [], image: 'gcr.io/ml-pipeline/model-evaluation:v0.9.2' },
      },
      'exec-feature-transform-engine': {
        container: {
          args: [],
          image:
            'us-docker.pkg.dev/vertex-ai/automl-tabular/feature-transform-engine:20240214_1325',
          command: [],
        },
      },
      'exec-finalize-eval-quantile-parameters': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-finalize-eval-quantile-parameters-2': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-get-or-create-model-description': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-get-or-create-model-description-2': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-get-prediction-image-uri': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-get-prediction-image-uri-2': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-get-predictions-column': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-get-predictions-column-2': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-importer': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-model-batch-explanation': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/automl-tables-private:1.0.13',
        },
      },
      'exec-model-batch-explanation-2': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/automl-tables-private:1.0.13',
        },
      },
      'exec-model-batch-predict': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:2.3.1',
        },
      },
      'exec-model-batch-predict-2': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:2.3.1',
        },
      },
      'exec-model-evaluation-forecasting': {
        container: { args: [], command: [], image: 'gcr.io/ml-pipeline/model-evaluation:v0.9' },
      },
      'exec-model-evaluation-forecasting-2': {
        container: { args: [], command: [], image: 'gcr.io/ml-pipeline/model-evaluation:v0.9' },
      },
      'exec-model-evaluation-import': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:2.3.1',
        },
      },
      'exec-model-evaluation-import-2': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/google-cloud-pipeline-components:2.3.1',
        },
      },
      'exec-model-upload': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/automl-tables-private:1.0.17',
        },
      },
      'exec-model-upload-2': {
        container: {
          args: [],
          command: [],
          image: 'gcr.io/ml-pipeline/automl-tables-private:1.0.17',
        },
      },
      'exec-set-optional-inputs': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-split-materialized-data': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/dataflow-worker:20240214_1325',
        },
      },
      'exec-string-not-empty': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-table-to-uri': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-table-to-uri-2': {
        container: {
          args: [],
          command: [],
          image: 'us-docker.pkg.dev/vertex-ai/automl-tabular/kfp-v2-base:20240214_1325',
        },
      },
      'exec-training-configurator-and-validator': {
        container: {
          args: [],
          image:
            'us-docker.pkg.dev/vertex-ai/automl-tabular/feature-transform-engine:20240214_1325',
          command: [],
        },
      },
    },
  },
  pipelineInfo: {
    name: 'time-series-dense-encoder-forecasting',
  },
  root: {
    dag: {
      tasks: {
        'automl-tabular-finalizer': {
          cachingOptions: { enableCache: true },
          componentRef: { name: 'comp-automl-tabular-finalizer' },
          dependentTasks: ['exit-handler-1'],
          inputs: {
            parameters: {
              location: { componentInputParameter: 'location' },
              project: { componentInputParameter: 'project' },
              root_dir: { componentInputParameter: 'root_dir' },
            },
          },
          taskInfo: { name: 'automl-tabular-finalizer' },
          triggerPolicy: { strategy: TriggerStrategy.ALL_UPSTREAM_TASKS_COMPLETED },
        },
        'exit-handler-1': {
          componentRef: { name: 'comp-exit-handler-1' },
          dependentTasks: ['set-optional-inputs'],
          inputs: {
            artifacts: {
              'pipelinechannel--parent_model': {},
            },
            parameters: {
              'pipelinechannel--available_at_forecast_columns': {
                componentInputParameter: 'available_at_forecast_columns',
              },
              'pipelinechannel--context_window': { componentInputParameter: 'context_window' },
              'pipelinechannel--dataflow_service_account': {
                componentInputParameter: 'dataflow_service_account',
              },
              'pipelinechannel--dataflow_subnetwork': {
                componentInputParameter: 'dataflow_subnetwork',
              },
              'pipelinechannel--dataflow_use_public_ips': {
                componentInputParameter: 'dataflow_use_public_ips',
              },
              'pipelinechannel--enable_probabilistic_inference': {
                componentInputParameter: 'enable_probabilistic_inference',
              },
              'pipelinechannel--encryption_spec_key_name': {
                componentInputParameter: 'encryption_spec_key_name',
              },
              'pipelinechannel--evaluated_examples_bigquery_path': {
                componentInputParameter: 'evaluated_examples_bigquery_path',
              },
              'pipelinechannel--evaluation_batch_explain_machine_type': {
                componentInputParameter: 'evaluation_batch_explain_machine_type',
              },
              'pipelinechannel--evaluation_batch_explain_max_replica_count': {
                componentInputParameter: 'evaluation_batch_explain_max_replica_count',
              },
              'pipelinechannel--evaluation_batch_explain_starting_replica_count': {
                componentInputParameter: 'evaluation_batch_explain_starting_replica_count',
              },
              'pipelinechannel--evaluation_batch_predict_machine_type': {
                componentInputParameter: 'evaluation_batch_predict_machine_type',
              },
              'pipelinechannel--evaluation_batch_predict_max_replica_count': {
                componentInputParameter: 'evaluation_batch_predict_max_replica_count',
              },
              'pipelinechannel--evaluation_batch_predict_starting_replica_count': {
                componentInputParameter: 'evaluation_batch_predict_starting_replica_count',
              },
              'pipelinechannel--evaluation_dataflow_disk_size_gb': {
                componentInputParameter: 'evaluation_dataflow_disk_size_gb',
              },
              'pipelinechannel--evaluation_dataflow_machine_type': {
                componentInputParameter: 'evaluation_dataflow_machine_type',
              },
              'pipelinechannel--evaluation_dataflow_max_num_workers': {
                componentInputParameter: 'evaluation_dataflow_max_num_workers',
              },
              'pipelinechannel--evaluation_dataflow_starting_num_workers': {
                componentInputParameter: 'evaluation_dataflow_starting_num_workers',
              },
              'pipelinechannel--fast_testing': { componentInputParameter: 'fast_testing' },
              'pipelinechannel--feature_transform_engine_bigquery_staging_full_dataset_id': {
                componentInputParameter:
                  'feature_transform_engine_bigquery_staging_full_dataset_id',
              },
              'pipelinechannel--feature_transform_engine_dataflow_disk_size_gb': {
                componentInputParameter: 'feature_transform_engine_dataflow_disk_size_gb',
              },
              'pipelinechannel--feature_transform_engine_dataflow_machine_type': {
                componentInputParameter: 'feature_transform_engine_dataflow_machine_type',
              },
              'pipelinechannel--feature_transform_engine_dataflow_max_num_workers': {
                componentInputParameter: 'feature_transform_engine_dataflow_max_num_workers',
              },
              'pipelinechannel--forecast_horizon': { componentInputParameter: 'forecast_horizon' },
              'pipelinechannel--group_columns': { componentInputParameter: 'group_columns' },
              'pipelinechannel--group_temporal_total_weight': {
                componentInputParameter: 'group_temporal_total_weight',
              },
              'pipelinechannel--group_total_weight': {
                componentInputParameter: 'group_total_weight',
              },
              'pipelinechannel--holiday_regions': { componentInputParameter: 'holiday_regions' },
              'pipelinechannel--location': { componentInputParameter: 'location' },
              'pipelinechannel--model_description': {
                componentInputParameter: 'model_description',
              },
              'pipelinechannel--model_display_name': {
                componentInputParameter: 'model_display_name',
              },
              'pipelinechannel--num_selected_trials': {
                componentInputParameter: 'num_selected_trials',
              },
              'pipelinechannel--optimization_objective': {
                componentInputParameter: 'optimization_objective',
              },
              'pipelinechannel--predefined_split_key': {
                componentInputParameter: 'predefined_split_key',
              },
              'pipelinechannel--project': { componentInputParameter: 'project' },
              'pipelinechannel--quantiles': { componentInputParameter: 'quantiles' },
              'pipelinechannel--root_dir': { componentInputParameter: 'root_dir' },
              'pipelinechannel--run_evaluation': { componentInputParameter: 'run_evaluation' },
              'pipelinechannel--set-optional-inputs-data_source_bigquery_table_path': {},
              'pipelinechannel--set-optional-inputs-data_source_csv_filenames': {},
              'pipelinechannel--set-optional-inputs-transformations': {},
              'pipelinechannel--stage_1_num_parallel_trials': {
                componentInputParameter: 'stage_1_num_parallel_trials',
              },
              'pipelinechannel--stage_1_tuner_worker_pool_specs_override': {
                componentInputParameter: 'stage_1_tuner_worker_pool_specs_override',
              },
              'pipelinechannel--stage_1_tuning_result_artifact_uri': {
                componentInputParameter: 'stage_1_tuning_result_artifact_uri',
              },
              'pipelinechannel--stage_2_num_parallel_trials': {
                componentInputParameter: 'stage_2_num_parallel_trials',
              },
              'pipelinechannel--stage_2_trainer_worker_pool_specs_override': {
                componentInputParameter: 'stage_2_trainer_worker_pool_specs_override',
              },
              'pipelinechannel--study_spec_parameters_override': {
                componentInputParameter: 'study_spec_parameters_override',
              },
              'pipelinechannel--target_column': { componentInputParameter: 'target_column' },
              'pipelinechannel--temporal_total_weight': {
                componentInputParameter: 'temporal_total_weight',
              },
              'pipelinechannel--test_fraction': { componentInputParameter: 'test_fraction' },
              'pipelinechannel--time_column': { componentInputParameter: 'time_column' },
              'pipelinechannel--time_series_attribute_columns': {
                componentInputParameter: 'time_series_attribute_columns',
              },
              'pipelinechannel--time_series_identifier_columns': {
                componentInputParameter: 'time_series_identifier_columns',
              },
              'pipelinechannel--timestamp_split_key': {
                componentInputParameter: 'timestamp_split_key',
              },
              'pipelinechannel--train_budget_milli_node_hours': {
                componentInputParameter: 'train_budget_milli_node_hours',
              },
              'pipelinechannel--training_fraction': {
                componentInputParameter: 'training_fraction',
              },
              'pipelinechannel--transformations': { componentInputParameter: 'transformations' },
              'pipelinechannel--unavailable_at_forecast_columns': {
                componentInputParameter: 'unavailable_at_forecast_columns',
              },
              'pipelinechannel--validation_fraction': {
                componentInputParameter: 'validation_fraction',
              },
              'pipelinechannel--weight_column': { componentInputParameter: 'weight_column' },
              'pipelinechannel--window_max_count': { componentInputParameter: 'window_max_count' },
              'pipelinechannel--window_predefined_column': {
                componentInputParameter: 'window_predefined_column',
              },
              'pipelinechannel--window_stride_length': {
                componentInputParameter: 'window_stride_length',
              },
            },
          },
          taskInfo: { name: 'exit-handler-1' },
        },
        'set-optional-inputs': {
          cachingOptions: { enableCache: true },
          componentRef: { name: 'comp-set-optional-inputs' },
          inputs: {
            artifacts: { vertex_dataset: {} },
            parameters: {
              data_source_bigquery_table_path: {
                componentInputParameter: 'data_source_bigquery_table_path',
              },
              data_source_csv_filenames: { componentInputParameter: 'data_source_csv_filenames' },
              location: { componentInputParameter: 'location' },
              model_display_name: { componentInputParameter: 'model_display_name' },
              project: { componentInputParameter: 'project' },
              stats_gen_execution_engine: { runtimeValue: { constant: 'bigquery' } },
              transformations: { componentInputParameter: 'transformations' },
            },
          },
          taskInfo: { name: 'set-optional-inputs' },
        },
      },
    },
    inputDefinitions: {
      parameters: {
        available_at_forecast_columns: {
          description: 'The columns that are available at the\nforecast time.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        context_window: {
          defaultValue: 0,
          description: 'The length of the context window.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        data_source_bigquery_table_path: {
          defaultValue: '',
          description: 'The BigQuery table path of format\nbq://bq_project.bq_dataset.bq_table',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        data_source_csv_filenames: {
          defaultValue: '',
          description: 'A string that represents a list of comma\nseparated CSV filenames.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        dataflow_service_account: {
          defaultValue: '',
          description: 'The full service account name.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        dataflow_subnetwork: {
          defaultValue: '',
          description: 'The dataflow subnetwork.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        dataflow_use_public_ips: {
          defaultValue: true,
          description: '`True` to enable dataflow public IPs.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.BOOLEAN,
        },
        enable_probabilistic_inference: {
          defaultValue: false,
          description:
            'If probabilistic inference is enabled, the\nmodel will fit a distribution that captures the uncertainty of a\nprediction. If quantiles are specified, then the quantiles of the\ndistribution are also returned.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.BOOLEAN,
        },
        encryption_spec_key_name: {
          defaultValue: '',
          description: 'The KMS key name.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        evaluated_examples_bigquery_path: {
          defaultValue: '',
          description:
            'The bigquery dataset to write the\npredicted examples into for evaluation, in the format\n`bq://project.dataset`. Only necessary if evaluation is enabled.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        evaluation_batch_explain_machine_type: {
          defaultValue: 'n1-highmem-8',
          description:
            'The prediction server machine type\nfor batch explain components during evaluation.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        evaluation_batch_explain_max_replica_count: {
          defaultValue: 22,
          description:
            'The max number of prediction\nserver for batch explain components during evaluation.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        evaluation_batch_explain_starting_replica_count: {
          defaultValue: 22,
          description:
            'The initial number of\nprediction server for batch explain components during evaluation.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        evaluation_batch_predict_machine_type: {
          defaultValue: 'n1-standard-16',
          description:
            "Machine type for the batch prediction\njob in evaluation, such as 'n1-standard-16'.",
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        evaluation_batch_predict_max_replica_count: {
          defaultValue: 25,
          description: 'The maximum count of replicas\nthe batch prediction job can scale to.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        evaluation_batch_predict_starting_replica_count: {
          defaultValue: 25,
          description:
            'Number of replicas to use\nin the batch prediction cluster at startup time.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        evaluation_dataflow_disk_size_gb: {
          defaultValue: 50,
          description: 'The disk space in GB for dataflow.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        evaluation_dataflow_machine_type: {
          defaultValue: 'n1-standard-16',
          description:
            "Machine type for the dataflow job in\nevaluation, such as 'n1-standard-16'.",
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        evaluation_dataflow_max_num_workers: {
          defaultValue: 25,
          description: 'Maximum number of dataflow workers.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        evaluation_dataflow_starting_num_workers: {
          defaultValue: 22,
          description: 'The initial number of Dataflow\nworkers for evaluation components.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        fast_testing: {
          defaultValue: false,
          description: 'Internal flag used for presubmit tests.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.BOOLEAN,
        },
        feature_transform_engine_bigquery_staging_full_dataset_id: {
          defaultValue: '',
          description: 'The full id of\nthe feature transform engine staging dataset.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        feature_transform_engine_dataflow_disk_size_gb: {
          defaultValue: 40,
          description: 'The disk size of the\ndataflow workers of the feature transform engine.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        feature_transform_engine_dataflow_machine_type: {
          defaultValue: 'n1-standard-16',
          description: 'The dataflow machine type of\nthe feature transform engine.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        feature_transform_engine_dataflow_max_num_workers: {
          defaultValue: 10,
          description: 'The max number of\ndataflow workers of the feature transform engine.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        forecast_horizon: {
          defaultValue: 0,
          description: 'The length of the horizon.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        group_columns: {
          description:
            'A list of time series attribute column names that define the\ntime series hierarchy.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        group_temporal_total_weight: {
          defaultValue: 0,
          description:
            'The weight of the loss for predictions\naggregated over both the horizon and time series in the same hierarchy\ngroup.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        group_total_weight: {
          defaultValue: 0,
          description:
            'The weight of the loss for predictions aggregated over\ntime series in the same group.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        holiday_regions: {
          description: 'The geographical regions where the holiday effect is\napplied in modeling.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        location: {
          description: 'The GCP region that runs the pipeline components.',
          parameterType: InputDefinitionParameterType.STRING,
        },
        model_description: {
          defaultValue: '',
          description: 'Optional description.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        model_display_name: {
          defaultValue:
            'automl-forecasting-model-upload-{{$.pipeline_job_uuid}}-{{$.pipeline_task_uuid}}',
          description: 'Optional display name for model.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        num_selected_trials: {
          defaultValue: 10,
          description: 'Number of selected trails.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        optimization_objective: {
          description:
            '"minimize-rmse", "minimize-mae", "minimize-rmsle",\n"minimize-rmspe", "minimize-wape-mae", "minimize-mape", or\n"minimize-quantile-loss".',
          parameterType: InputDefinitionParameterType.STRING,
        },
        predefined_split_key: {
          defaultValue: '',
          description: 'The predefined_split column name.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        project: {
          description: 'The GCP project that runs the pipeline components.',
          parameterType: InputDefinitionParameterType.STRING,
        },
        quantiles: {
          description:
            'Quantiles to use for probabilistic inference. Up to 5 quantiles\nare allowed of values between 0 and 1, exclusive. Represents the quantiles\nto use for that objective. Quantiles must be unique.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        root_dir: {
          description: 'The root GCS directory for the pipeline components.',
          parameterType: InputDefinitionParameterType.STRING,
        },
        run_evaluation: {
          defaultValue: false,
          description: '`True` to evaluate the ensembled model on the test split.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.BOOLEAN,
        },
        stage_1_num_parallel_trials: {
          defaultValue: 35,
          description: 'Number of parallel trails for stage 1.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        stage_1_tuner_worker_pool_specs_override: {
          description: 'The dictionary for overriding\nstage 1 tuner worker pool spec.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        stage_1_tuning_result_artifact_uri: {
          defaultValue: '',
          description: 'The stage 1 tuning result artifact GCS\nURI.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        stage_2_num_parallel_trials: {
          defaultValue: 35,
          description: 'Number of parallel trails for stage 2.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        stage_2_trainer_worker_pool_specs_override: {
          description: 'The dictionary for overriding\nstage 2 trainer worker pool spec.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        study_spec_parameters_override: {
          description: 'The list for overriding study spec.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        target_column: {
          description: 'The target column name.',
          parameterType: InputDefinitionParameterType.STRING,
        },
        temporal_total_weight: {
          defaultValue: 0,
          description:
            'The weight of the loss for predictions aggregated\nover the horizon for a single time series.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        test_fraction: {
          defaultValue: -1,
          description: 'The test fraction.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        time_column: {
          description: 'The column that indicates the time.',
          parameterType: InputDefinitionParameterType.STRING,
        },
        time_series_attribute_columns: {
          description: 'The columns that are invariant across the\nsame time series.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        time_series_identifier_columns: {
          description: 'The columns that distinguish the different\ntime series.',
          parameterType: InputDefinitionParameterType.LIST,
        },
        timestamp_split_key: {
          defaultValue: '',
          description: 'The timestamp_split column name.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        train_budget_milli_node_hours: {
          description:
            'The train budget of creating this model,\nexpressed in milli node hours i.e. 1,000 value in this field means 1 node\nhour.',
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        training_fraction: {
          defaultValue: -1,
          description: 'The training fraction.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        transformations: {
          description:
            'Dict mapping auto and/or type-resolutions to feature\ncolumns. The supported types are: auto, categorical, numeric, text, and\ntimestamp.',
          parameterType: InputDefinitionParameterType.STRUCT,
        },
        unavailable_at_forecast_columns: {
          description: 'The columns that are unavailable at the\nforecast time.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.LIST,
        },
        validation_fraction: {
          defaultValue: -1,
          description: 'The validation fraction.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.DOUBLE,
        },
        weight_column: {
          defaultValue: '',
          description: 'The weight column name.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        window_max_count: {
          defaultValue: 0,
          description: 'The maximum number of windows that will be generated.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
        window_predefined_column: {
          defaultValue: '',
          description: 'The column that indicate the start of each window.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.STRING,
        },
        window_stride_length: {
          defaultValue: 0,
          description: 'The stride length to generate the window.',
          isOptional: true,
          parameterType: InputDefinitionParameterType.INTEGER,
        },
      },
    },
  },
  schemaVersion: '2.1.0',
  sdkVersion: 'kfp-2.0.0-rc.2',
};
