/* eslint-disable camelcase */
import {
  ArgoWorkflowPipelineVersion,
  ArtifactType,
  InputDefinitionParameterType,
  InputOutputDefinition,
  PipelineKFCallCommon,
  PipelineVersionKF,
} from '#~/concepts/pipelines/kfTypes';

export type BuildMockPipelinveVersionsType = PipelineKFCallCommon<{
  pipeline_versions: (PipelineVersionKF | ArgoWorkflowPipelineVersion)[];
}>;

export const mockPipelineVersionsList: PipelineVersionKF[] = [
  {
    pipeline_id: 'f9ccf7d7-ceb6-41f2-a1a1-35f0ddef0921',
    pipeline_version_id: '04aff21b-15d6-40a1-a4ac-8f89c416127e',
    display_name: 'v2 pipeline_version_at_2024-02-01T15:05:59.848Z',
    created_at: '2024-02-01T15:06:04Z',
    pipeline_spec: {
      components: {
        'comp-create-dataset': {
          executorLabel: 'exec-create-dataset',
          outputDefinitions: {
            artifacts: {
              iris_dataset: {
                artifactType: {
                  schemaTitle: ArtifactType.DATASET,
                  schemaVersion: '0.0.1',
                },
              },
            },
          },
        },
        'comp-normalize-dataset': {
          executorLabel: 'exec-normalize-dataset',
          inputDefinitions: {
            artifacts: {
              input_iris_dataset: {
                artifactType: {
                  schemaTitle: ArtifactType.DATASET,
                  schemaVersion: '0.0.1',
                },
              },
            },
            parameters: {
              min_max_scaler: {
                parameterType: InputDefinitionParameterType.BOOLEAN,
              },
              standard_scaler: {
                parameterType: InputDefinitionParameterType.BOOLEAN,
              },
            },
          },
          outputDefinitions: {
            artifacts: {
              normalized_iris_dataset: {
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
              normalized_iris_dataset: {
                artifactType: {
                  schemaTitle: ArtifactType.DATASET,
                  schemaVersion: '0.0.1',
                },
              },
            },
            parameters: {
              n_neighbors: {
                parameterType: InputDefinitionParameterType.INTEGER,
              },
            },
          },
          outputDefinitions: {
            artifacts: {
              model: {
                artifactType: {
                  schemaTitle: ArtifactType.MODEL,
                  schemaVersion: '0.0.1',
                },
              },
            },
          },
        },
      },
      deploymentSpec: {
        executors: {
          'exec-create-dataset': {
            container: {
              args: ['--executor_input', '{{$}}', '--function_to_execute', 'create_dataset'],
              command: [
                'sh',
                '-c',
                '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.6.0\' \'--no-deps\' \'typing-extensions>=3.7.4,<5; python_version<"3.9"\' && "$0" "$@"\n',
                'sh',
                '-ec',
                'program_path=$(mktemp -d)\n\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
                "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef create_dataset(iris_dataset: Output[Dataset]):\n    import pandas as pd\n\n    csv_url = 'https://archive.ics.uci.edu/ml/machine-learning-databases/iris/iris.data'\n    col_names = [\n        'Sepal_Length', 'Sepal_Width', 'Petal_Length', 'Petal_Width', 'Labels'\n    ]\n    df = pd.read_csv(csv_url, names=col_names)\n\n    with open(iris_dataset.path, 'w') as f:\n        df.to_csv(f)\n\n",
              ],
              image: 'quay.io/hukhan/iris-base:1',
            },
          },
          'exec-normalize-dataset': {
            container: {
              args: ['--executor_input', '{{$}}', '--function_to_execute', 'normalize_dataset'],
              command: [
                'sh',
                '-c',
                '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.6.0\' \'--no-deps\' \'typing-extensions>=3.7.4,<5; python_version<"3.9"\' && "$0" "$@"\n',
                'sh',
                '-ec',
                'program_path=$(mktemp -d)\n\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
                "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef normalize_dataset(\n    input_iris_dataset: Input[Dataset],\n    normalized_iris_dataset: Output[Dataset],\n    standard_scaler: bool,\n    min_max_scaler: bool,\n):\n    if standard_scaler is min_max_scaler:\n        raise ValueError(\n            'Exactly one of standard_scaler or min_max_scaler must be True.')\n\n    import pandas as pd\n    from sklearn.preprocessing import MinMaxScaler\n    from sklearn.preprocessing import StandardScaler\n\n    with open(input_iris_dataset.path) as f:\n        df = pd.read_csv(f)\n    labels = df.pop('Labels')\n\n    if standard_scaler:\n        scaler = StandardScaler()\n    if min_max_scaler:\n        scaler = MinMaxScaler()\n\n    df = pd.DataFrame(scaler.fit_transform(df))\n    df['Labels'] = labels\n    normalized_iris_dataset.metadata['state'] = \"Normalized\"\n    with open(normalized_iris_dataset.path, 'w') as f:\n        df.to_csv(f)\n\n",
              ],
              image: 'quay.io/hukhan/iris-base:1',
            },
          },
          'exec-train-model': {
            container: {
              args: ['--executor_input', '{{$}}', '--function_to_execute', 'train_model'],
              command: [
                'sh',
                '-c',
                '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.6.0\' \'--no-deps\' \'typing-extensions>=3.7.4,<5; python_version<"3.9"\' && "$0" "$@"\n',
                'sh',
                '-ec',
                'program_path=$(mktemp -d)\n\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
                "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef train_model(\n    normalized_iris_dataset: Input[Dataset],\n    model: Output[Model],\n    n_neighbors: int,\n):\n    import pickle\n\n    import pandas as pd\n    from sklearn.model_selection import train_test_split\n    from sklearn.neighbors import KNeighborsClassifier\n\n    with open(normalized_iris_dataset.path) as f:\n        df = pd.read_csv(f)\n\n    y = df.pop('Labels')\n    X = df\n\n    X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)\n\n    clf = KNeighborsClassifier(n_neighbors=n_neighbors)\n    clf.fit(X_train, y_train)\n\n    model.metadata['framework'] = 'scikit-learn'\n    with open(model.path, 'wb') as f:\n        pickle.dump(clf, f)\n\n",
              ],
              image: 'quay.io/hukhan/iris-base:1',
            },
          },
        },
      },
      pipelineInfo: {
        name: 'iris-training-pipeline',
      },
      root: {
        dag: {
          tasks: {
            'create-dataset': {
              cachingOptions: {
                enableCache: true,
              },
              componentRef: {
                name: 'comp-create-dataset',
              },
              taskInfo: {
                name: 'create-dataset',
              },
            },
            'normalize-dataset': {
              cachingOptions: {
                enableCache: true,
              },
              componentRef: {
                name: 'comp-normalize-dataset',
              },
              dependentTasks: ['create-dataset'],
              inputs: {
                artifacts: {
                  input_iris_dataset: {
                    taskOutputArtifact: {
                      outputArtifactKey: 'iris_dataset',
                      producerTask: 'create-dataset',
                    },
                  },
                },
                parameters: {
                  min_max_scaler: {
                    runtimeValue: {
                      constant: 'false',
                    },
                  },
                  standard_scaler: {
                    runtimeValue: {
                      constant: 'true',
                    },
                  },
                },
              },
              taskInfo: {
                name: 'normalize-dataset',
              },
            },
            'train-model': {
              cachingOptions: {
                enableCache: true,
              },
              componentRef: {
                name: 'comp-train-model',
              },
              dependentTasks: ['normalize-dataset'],
              inputs: {
                artifacts: {
                  normalized_iris_dataset: {
                    taskOutputArtifact: {
                      outputArtifactKey: 'normalized_iris_dataset',
                      producerTask: 'normalize-dataset',
                    },
                  },
                },
                parameters: {
                  n_neighbors: {
                    componentInputParameter: 'neighbors',
                  },
                },
              },
              taskInfo: {
                name: 'train-model',
              },
            },
          },
        },
        inputDefinitions: {
          parameters: {
            min_max_scaler: {
              parameterType: InputDefinitionParameterType.BOOLEAN,
            },
            neighbors: {
              parameterType: InputDefinitionParameterType.INTEGER,
            },
            standard_scaler: {
              parameterType: InputDefinitionParameterType.BOOLEAN,
            },
          },
        },
      },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.6.0',
    },
  },
];

export const buildMockPipelineVersion = (
  pipelineVersion?: Partial<PipelineVersionKF>,
  inputDefinitions: InputOutputDefinition = {
    parameters: {
      min_max_scaler: {
        parameterType: InputDefinitionParameterType.BOOLEAN,
      },
      neighbors: {
        parameterType: InputDefinitionParameterType.INTEGER,
      },
      standard_scaler: {
        parameterType: InputDefinitionParameterType.STRING,
      },
    },
  },
): PipelineVersionKF => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const display_name = pipelineVersion?.display_name || 'Test pipeline version';
  const pipeline_version_id = display_name.replace(/ /g, '-').toLowerCase();
  return {
    pipeline_id: '8ce2d041-3eb9-41a0-828c-45209fdf1c20',
    pipeline_version_id,
    display_name,
    created_at: '2023-12-07T16:08:01Z',
    description: 'test',

    pipeline_spec: {
      platform_spec: {
        platforms: {
          kubernetes: {
            deploymentSpec: {
              executors: {
                'exec-normalize-dataset': {
                  container: { image: '' },
                  pvcMount: [
                    {
                      mountPath: '/data/1',
                      taskOutputParameter: {
                        outputParameterKey: 'name',
                        producerTask: 'create-dataset',
                      },
                    },
                  ],
                },
                'exec-train-model': {
                  container: { image: '' },
                  pvcMount: [
                    {
                      mountPath: '/data/2',
                      taskOutputParameter: {
                        outputParameterKey: 'name',
                        producerTask: 'normalize-dataset',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      pipeline_spec: {
        components: {
          'comp-create-dataset': {
            executorLabel: 'exec-create-dataset',
            outputDefinitions: {
              artifacts: {
                iris_dataset: {
                  artifactType: {
                    schemaTitle: ArtifactType.DATASET,
                    schemaVersion: '0.0.1',
                  },
                },
              },
            },
          },
          'comp-normalize-dataset': {
            executorLabel: 'exec-normalize-dataset',
            inputDefinitions: {
              artifacts: {
                input_iris_dataset: {
                  artifactType: {
                    schemaTitle: ArtifactType.DATASET,
                    schemaVersion: '0.0.1',
                  },
                },
              },
              parameters: {
                min_max_scaler: {
                  parameterType: InputDefinitionParameterType.BOOLEAN,
                },
                standard_scaler: {
                  parameterType: InputDefinitionParameterType.STRING,
                },
              },
            },
            outputDefinitions: {
              artifacts: {
                normalized_iris_dataset: {
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
                normalized_iris_dataset: {
                  artifactType: {
                    schemaTitle: ArtifactType.DATASET,
                    schemaVersion: '0.0.1',
                  },
                },
              },
              parameters: {
                n_neighbors: {
                  parameterType: InputDefinitionParameterType.INTEGER,
                },
              },
            },
            outputDefinitions: {
              artifacts: {
                model: {
                  artifactType: {
                    schemaTitle: ArtifactType.MODEL,
                    schemaVersion: '0.0.1',
                  },
                },
              },
            },
          },
        },
        deploymentSpec: {
          executors: {
            'exec-create-dataset': {
              container: {
                args: ['--executor_input', '{{$}}', '--function_to_execute', 'create_dataset'],
                command: [
                  'sh',
                  '-c',
                  '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.6.0\' \'--no-deps\' \'typing-extensions>=3.7.4,<5; python_version<"3.9"\' && "$0" "$@"\n',
                  'sh',
                  '-ec',
                  'program_path=$(mktemp -d)\n\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
                  "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef create_dataset(iris_dataset: Output[Dataset]):\n    import pandas as pd\n\n    csv_url = 'https://archive.ics.uci.edu/ml/machine-learning-databases/iris/iris.data'\n    col_names = [\n        'Sepal_Length', 'Sepal_Width', 'Petal_Length', 'Petal_Width', 'Labels'\n    ]\n    df = pd.read_csv(csv_url, names=col_names)\n\n    with open(iris_dataset.path, 'w') as f:\n        df.to_csv(f)\n\n",
                ],
                image: 'quay.io/hukhan/iris-base:1',
              },
            },
            'exec-normalize-dataset': {
              container: {
                args: ['--executor_input', '{{$}}', '--function_to_execute', 'normalize_dataset'],
                command: [
                  'sh',
                  '-c',
                  '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.6.0\' \'--no-deps\' \'typing-extensions>=3.7.4,<5; python_version<"3.9"\' && "$0" "$@"\n',
                  'sh',
                  '-ec',
                  'program_path=$(mktemp -d)\n\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
                  "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef normalize_dataset(\n    input_iris_dataset: Input[Dataset],\n    normalized_iris_dataset: Output[Dataset],\n    standard_scaler: bool,\n    min_max_scaler: bool,\n):\n    if standard_scaler is min_max_scaler:\n        raise ValueError(\n            'Exactly one of standard_scaler or min_max_scaler must be True.')\n\n    import pandas as pd\n    from sklearn.preprocessing import MinMaxScaler\n    from sklearn.preprocessing import StandardScaler\n\n    with open(input_iris_dataset.path) as f:\n        df = pd.read_csv(f)\n    labels = df.pop('Labels')\n\n    if standard_scaler:\n        scaler = StandardScaler()\n    if min_max_scaler:\n        scaler = MinMaxScaler()\n\n    df = pd.DataFrame(scaler.fit_transform(df))\n    df['Labels'] = labels\n    normalized_iris_dataset.metadata['state'] = \"Normalized\"\n    with open(normalized_iris_dataset.path, 'w') as f:\n        df.to_csv(f)\n\n",
                ],
                image: 'quay.io/hukhan/iris-base:1',
              },
            },
            'exec-train-model': {
              container: {
                args: ['--executor_input', '{{$}}', '--function_to_execute', 'train_model'],
                command: [
                  'sh',
                  '-c',
                  '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.6.0\' \'--no-deps\' \'typing-extensions>=3.7.4,<5; python_version<"3.9"\' && "$0" "$@"\n',
                  'sh',
                  '-ec',
                  'program_path=$(mktemp -d)\n\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
                  "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef train_model(\n    normalized_iris_dataset: Input[Dataset],\n    model: Output[Model],\n    n_neighbors: int,\n):\n    import pickle\n\n    import pandas as pd\n    from sklearn.model_selection import train_test_split\n    from sklearn.neighbors import KNeighborsClassifier\n\n    with open(normalized_iris_dataset.path) as f:\n        df = pd.read_csv(f)\n\n    y = df.pop('Labels')\n    X = df\n\n    X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)\n\n    clf = KNeighborsClassifier(n_neighbors=n_neighbors)\n    clf.fit(X_train, y_train)\n\n    model.metadata['framework'] = 'scikit-learn'\n    with open(model.path, 'wb') as f:\n        pickle.dump(clf, f)\n\n",
                ],
                image: 'quay.io/hukhan/iris-base:1',
              },
            },
          },
        },
        pipelineInfo: {
          name: 'iris-training-pipeline',
        },
        root: {
          dag: {
            tasks: {
              'create-dataset': {
                cachingOptions: {
                  enableCache: true,
                },
                componentRef: {
                  name: 'comp-create-dataset',
                },
                taskInfo: {
                  name: 'create-dataset',
                },
              },
              'normalize-dataset': {
                cachingOptions: {
                  enableCache: true,
                },
                componentRef: {
                  name: 'comp-normalize-dataset',
                },
                dependentTasks: ['create-dataset'],
                inputs: {
                  artifacts: {
                    input_iris_dataset: {
                      taskOutputArtifact: {
                        outputArtifactKey: 'iris_dataset',
                        producerTask: 'create-dataset',
                      },
                    },
                  },
                  parameters: {
                    min_max_scaler: {
                      runtimeValue: {
                        constant: 'false',
                      },
                    },
                    standard_scaler: {
                      runtimeValue: {
                        constant: 'true',
                      },
                    },
                  },
                },
                taskInfo: {
                  name: 'normalize-dataset',
                },
              },
              'train-model': {
                cachingOptions: {
                  enableCache: true,
                },
                componentRef: {
                  name: 'comp-train-model',
                },
                dependentTasks: ['normalize-dataset'],
                inputs: {
                  artifacts: {
                    normalized_iris_dataset: {
                      taskOutputArtifact: {
                        outputArtifactKey: 'normalized_iris_dataset',
                        producerTask: 'normalize-dataset',
                      },
                    },
                  },
                  parameters: {
                    n_neighbors: {
                      componentInputParameter: 'neighbors',
                    },
                  },
                },
                taskInfo: {
                  name: 'train-model',
                },
              },
            },
          },
          inputDefinitions,
        },
        schemaVersion: '2.1.0',
        sdkVersion: 'kfp-2.6.0',
      },
    },
    ...pipelineVersion,
  };
};

export const buildMockPipelineVersions = (
  pipeline_versions: (PipelineVersionKF | ArgoWorkflowPipelineVersion)[] = mockPipelineVersionsList,
  totalSize?: number,
  nextPageToken?: string,
): BuildMockPipelinveVersionsType => ({
  pipeline_versions,
  total_size: totalSize || pipeline_versions.length,
  next_page_token: nextPageToken,
});

type MockArgoWorkflowPipelineVersionType = {
  pipelineId?: string;
  pipelineVersionId?: string;
};

export const mockArgoWorkflowPipelineVersion = ({
  pipelineId = 'test-pipeline',
  pipelineVersionId = 'test-pipeline-version',
}: MockArgoWorkflowPipelineVersionType): ArgoWorkflowPipelineVersion => ({
  pipeline_id: pipelineId,
  pipeline_version_id: pipelineVersionId,
  display_name: 'argo unsupported',
  created_at: '2024-07-12T11:34:36Z',
  pipeline_spec: {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Workflow',
    metadata: {
      annotations: {
        'pipelines.kubeflow.org/kfp_sdk_version': '1.8.22',
        'pipelines.kubeflow.org/pipeline_compilation_time': '2023-09-26T08:36:45.160091',
        'pipelines.kubeflow.org/pipeline_spec':
          '{"description": "A sample pipeline to generate Confusion Matrix for UI visualization.", "name": "confusion-matrix-pipeline"}',
      },
      generateName: 'confusion-matrix-pipeline-',
      labels: {
        'pipelines.kubeflow.org/kfp_sdk_version': '1.8.22',
      },
    },
    spec: {
      arguments: {},
      entrypoint: 'confusion-matrix-pipeline',
      serviceAccountName: 'pipeline-runner',
      templates: [
        {
          dag: {
            tasks: [
              {
                arguments: {},
                name: 'confusion-visualization',
                template: 'confusion-visualization',
              },
            ],
          },
          inputs: {},
          metadata: {},
          name: 'confusion-matrix-pipeline',
          outputs: {},
        },
        {
          container: {
            args: [
              '--matrix-uri',
              'https://raw.githubusercontent.com/kubeflow/pipelines/master/samples/core/visualization/confusion_matrix.csv',
              '----output-paths',
              '/tmp/outputs/mlpipeline_ui_metadata/data',
            ],
            command: [
              'sh',
              '-ec',
              'program_path=$(mktemp)\nprintf "%s" "$0" > "$program_path"\npython3 -u "$program_path" "$@"\n',
              "def confusion_visualization(matrix_uri = 'https://raw.githubusercontent.com/kubeflow/pipelines/master/samples/core/visualization/confusion_matrix.csv'):\n    \"\"\"Provide confusion matrix csv file to visualize as metrics.\"\"\"\n    import json\n\n    metadata = {\n        'outputs' : [{\n          'type': 'confusion_matrix',\n          'format': 'csv',\n          'schema': [\n            {'name': 'target', 'type': 'CATEGORY'},\n            {'name': 'predicted', 'type': 'CATEGORY'},\n            {'name': 'count', 'type': 'NUMBER'},\n          ],\n          'source': matrix_uri,\n          'labels': ['rose', 'lily', 'iris'],\n        }]\n    }\n\n    from collections import namedtuple\n    visualization_output = namedtuple('VisualizationOutput', [\n        'mlpipeline_ui_metadata'])\n    return visualization_output(json.dumps(metadata))\n\nimport argparse\n_parser = argparse.ArgumentParser(prog='Confusion visualization', description='Provide confusion matrix csv file to visualize as metrics.')\n_parser.add_argument(\"--matrix-uri\", dest=\"matrix_uri\", type=str, required=False, default=argparse.SUPPRESS)\n_parser.add_argument(\"----output-paths\", dest=\"_output_paths\", type=str, nargs=1)\n_parsed_args = vars(_parser.parse_args())\n_output_files = _parsed_args.pop(\"_output_paths\", [])\n\n_outputs = confusion_visualization(**_parsed_args)\n\n_output_serializers = [\n    str,\n\n]\n\nimport os\nfor idx, output_file in enumerate(_output_files):\n    try:\n        os.makedirs(os.path.dirname(output_file))\n    except OSError:\n        pass\n    with open(output_file, 'w') as f:\n        f.write(_output_serializers[idx](_outputs[idx]))\n",
            ],
            image: 'python:3.7',
            name: '',
            resources: {},
          },
          inputs: {},
          metadata: {
            annotations: {
              'pipelines.kubeflow.org/arguments.parameters':
                '{"matrix_uri": "https://raw.githubusercontent.com/kubeflow/pipelines/master/samples/core/visualization/confusion_matrix.csv"}',
              'pipelines.kubeflow.org/component_ref': '{}',
              'pipelines.kubeflow.org/component_spec':
                '{"description": "Provide confusion matrix csv file to visualize as metrics.", "implementation": {"container": {"args": [{"if": {"cond": {"isPresent": "matrix_uri"}, "then": ["--matrix-uri", {"inputValue": "matrix_uri"}]}}, "----output-paths", {"outputPath": "mlpipeline_ui_metadata"}], "command": ["sh", "-ec", "program_path=$(mktemp)\\nprintf \\"%s\\" \\"$0\\" > \\"$program_path\\"\\npython3 -u \\"$program_path\\" \\"$@\\"\\n", "def confusion_visualization(matrix_uri = \'https://raw.githubusercontent.com/kubeflow/pipelines/master/samples/core/visualization/confusion_matrix.csv\'):\\n    \\"\\"\\"Provide confusion matrix csv file to visualize as metrics.\\"\\"\\"\\n    import json\\n\\n    metadata = {\\n        \'outputs\' : [{\\n          \'type\': \'confusion_matrix\',\\n          \'format\': \'csv\',\\n          \'schema\': [\\n            {\'name\': \'target\', \'type\': \'CATEGORY\'},\\n            {\'name\': \'predicted\', \'type\': \'CATEGORY\'},\\n            {\'name\': \'count\', \'type\': \'NUMBER\'},\\n          ],\\n          \'source\': matrix_uri,\\n          \'labels\': [\'rose\', \'lily\', \'iris\'],\\n        }]\\n    }\\n\\n    from collections import namedtuple\\n    visualization_output = namedtuple(\'VisualizationOutput\', [\\n        \'mlpipeline_ui_metadata\'])\\n    return visualization_output(json.dumps(metadata))\\n\\nimport argparse\\n_parser = argparse.ArgumentParser(prog=\'Confusion visualization\', description=\'Provide confusion matrix csv file to visualize as metrics.\')\\n_parser.add_argument(\\"--matrix-uri\\", dest=\\"matrix_uri\\", type=str, required=False, default=argparse.SUPPRESS)\\n_parser.add_argument(\\"----output-paths\\", dest=\\"_output_paths\\", type=str, nargs=1)\\n_parsed_args = vars(_parser.parse_args())\\n_output_files = _parsed_args.pop(\\"_output_paths\\", [])\\n\\n_outputs = confusion_visualization(**_parsed_args)\\n\\n_output_serializers = [\\n    str,\\n\\n]\\n\\nimport os\\nfor idx, output_file in enumerate(_output_files):\\n    try:\\n        os.makedirs(os.path.dirname(output_file))\\n    except OSError:\\n        pass\\n    with open(output_file, \'w\') as f:\\n        f.write(_output_serializers[idx](_outputs[idx]))\\n"], "image": "python:3.7"}}, "inputs": [{"default": "https://raw.githubusercontent.com/kubeflow/pipelines/master/samples/core/visualization/confusion_matrix.csv", "name": "matrix_uri", "optional": true, "type": "String"}], "name": "Confusion visualization", "outputs": [{"name": "mlpipeline_ui_metadata", "type": "UI_metadata"}]}',
            },
            labels: {
              'pipelines.kubeflow.org/enable_caching': 'true',
              'pipelines.kubeflow.org/kfp_sdk_version': '1.8.22',
              'pipelines.kubeflow.org/pipeline-sdk-type': 'kfp',
            },
          },
          name: 'confusion-visualization',
          outputs: {
            artifacts: [
              {
                name: 'mlpipeline-ui-metadata',
                path: '/tmp/outputs/mlpipeline_ui_metadata/data',
              },
            ],
          },
        },
      ],
    },
    status: {
      finishedAt: null,
      startedAt: null,
    },
  },
});
export const mockMetricsVisualizationVersion: PipelineVersionKF = {
  pipeline_id: 'metrics-pipeline',
  pipeline_version_id: 'metrics-pipeline-version',
  display_name: 'metrics visualization',
  created_at: '2024-06-19T11:28:05Z',
  pipeline_spec: {
    components: {
      'comp-digit-classification': {
        executorLabel: 'exec-digit-classification',
        outputDefinitions: {
          artifacts: {
            metrics: {
              artifactType: {
                schemaTitle: ArtifactType.METRICS,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      },
      'comp-html-visualization': {
        executorLabel: 'exec-html-visualization',
        outputDefinitions: {
          artifacts: {
            html_artifact: {
              artifactType: {
                schemaTitle: ArtifactType.HTML,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      },
      'comp-iris-sgdclassifier': {
        executorLabel: 'exec-iris-sgdclassifier',
        inputDefinitions: {
          parameters: {
            test_samples_fraction: {
              parameterType: InputDefinitionParameterType.DOUBLE,
            },
          },
        },
        outputDefinitions: {
          artifacts: {
            metrics: {
              artifactType: {
                schemaTitle: ArtifactType.CLASSIFICATION_METRICS,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      },
      'comp-markdown-visualization': {
        executorLabel: 'exec-markdown-visualization',
        outputDefinitions: {
          artifacts: {
            markdown_artifact: {
              artifactType: {
                schemaTitle: ArtifactType.MARKDOWN,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      },
      'comp-wine-classification': {
        executorLabel: 'exec-wine-classification',
        outputDefinitions: {
          artifacts: {
            metrics: {
              artifactType: {
                schemaTitle: ArtifactType.CLASSIFICATION_METRICS,
                schemaVersion: '0.0.1',
              },
            },
          },
        },
      },
    },
    deploymentSpec: {
      executors: {
        'exec-digit-classification': {
          container: {
            args: ['--executor_input', '{{$}}', '--function_to_execute', 'digit_classification'],
            command: [
              'sh',
              '-c',
              '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.7.0\' \'--no-deps\' \'typing-extensions\u003e=3.7.4,\u003c5; python_version\u003c"3.9"\'  \u0026\u0026  python3 -m pip install --quiet --no-warn-script-location \'scikit-learn\' \u0026\u0026 "$0" "$@"\n',
              'sh',
              '-ec',
              'program_path=$(mktemp -d)\n\nprintf "%s" "$0" \u003e "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
              "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef digit_classification(metrics: Output[Metrics]):\n    from sklearn import model_selection\n    from sklearn.linear_model import LogisticRegression\n    from sklearn import datasets\n    from sklearn.metrics import accuracy_score\n\n    # Load digits dataset\n    iris = datasets.load_iris()\n\n    # # Create feature matrix\n    X = iris.data\n\n    # Create target vector\n    y = iris.target\n\n    #test size\n    test_size = 0.33\n\n    seed = 7\n    #cross-validation settings\n    kfold = model_selection.KFold(n_splits=10, random_state=seed, shuffle=True)\n\n    #Model instance\n    model = LogisticRegression()\n    scoring = 'accuracy'\n    results = model_selection.cross_val_score(model, X, y, cv=kfold, scoring=scoring)\n\n    #split data\n    X_train, X_test, y_train, y_test = model_selection.train_test_split(X, y, test_size=test_size, random_state=seed)\n    #fit model\n    model.fit(X_train, y_train)\n\n    #accuracy on test set\n    result = model.score(X_test, y_test)\n    metrics.log_metric('accuracy', (result*100.0))\n\n",
            ],
            image: 'ubi8/python-39:latest',
          },
        },
        'exec-html-visualization': {
          container: {
            args: ['--executor_input', '{{$}}', '--function_to_execute', 'html_visualization'],
            command: [
              'sh',
              '-c',
              '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.7.0\' \'--no-deps\' \'typing-extensions\u003e=3.7.4,\u003c5; python_version\u003c"3.9"\' \u0026\u0026 "$0" "$@"\n',
              'sh',
              '-ec',
              'program_path=$(mktemp -d)\n\nprintf "%s" "$0" \u003e "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
              "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef html_visualization(html_artifact: Output[HTML]):\n    html_content = '\u003c!DOCTYPE html\u003e\u003chtml\u003e\u003cbody\u003e\u003ch1\u003eHello world\u003c/h1\u003e\u003c/body\u003e\u003c/html\u003e'\n    with open(html_artifact.path, 'w') as f:\n        f.write(html_content)\n\n",
            ],
            image: 'python:3.7',
          },
        },
        'exec-iris-sgdclassifier': {
          container: {
            args: ['--executor_input', '{{$}}', '--function_to_execute', 'iris_sgdclassifier'],
            command: [
              'sh',
              '-c',
              '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.7.0\' \'--no-deps\' \'typing-extensions\u003e=3.7.4,\u003c5; python_version\u003c"3.9"\'  \u0026\u0026  python3 -m pip install --quiet --no-warn-script-location \'scikit-learn\' \u0026\u0026 "$0" "$@"\n',
              'sh',
              '-ec',
              'program_path=$(mktemp -d)\n\nprintf "%s" "$0" \u003e "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
              "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef iris_sgdclassifier(test_samples_fraction: float, metrics: Output[ClassificationMetrics]):\n    from sklearn import datasets, model_selection\n    from sklearn.linear_model import SGDClassifier\n    from sklearn.metrics import confusion_matrix\n\n    iris_dataset = datasets.load_iris()\n    train_x, test_x, train_y, test_y = model_selection.train_test_split(\n        iris_dataset['data'], iris_dataset['target'], test_size=test_samples_fraction)\n\n\n    classifier = SGDClassifier()\n    classifier.fit(train_x, train_y)\n    predictions = model_selection.cross_val_predict(classifier, train_x, train_y, cv=3)\n    metrics.log_confusion_matrix(\n        ['Setosa', 'Versicolour', 'Virginica'],\n        confusion_matrix(train_y, predictions).tolist() # .tolist() to convert np array to list.\n    )\n\n",
            ],
            image: 'ubi8/python-39:latest',
          },
        },
        'exec-markdown-visualization': {
          container: {
            args: ['--executor_input', '{{$}}', '--function_to_execute', 'markdown_visualization'],
            command: [
              'sh',
              '-c',
              '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.7.0\' \'--no-deps\' \'typing-extensions\u003e=3.7.4,\u003c5; python_version\u003c"3.9"\' \u0026\u0026 "$0" "$@"\n',
              'sh',
              '-ec',
              'program_path=$(mktemp -d)\n\nprintf "%s" "$0" \u003e "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
              "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef markdown_visualization(markdown_artifact: Output[Markdown]):\n    markdown_content = '## Hello world \\n\\n Markdown content'\n    with open(markdown_artifact.path, 'w') as f:\n        f.write(markdown_content)\n\n",
            ],
            image: 'python:3.7',
          },
        },
        'exec-wine-classification': {
          container: {
            args: ['--executor_input', '{{$}}', '--function_to_execute', 'wine_classification'],
            command: [
              'sh',
              '-c',
              '\nif ! [ -x "$(command -v pip)" ]; then\n    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\nfi\n\nPIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location \'kfp==2.7.0\' \'--no-deps\' \'typing-extensions\u003e=3.7.4,\u003c5; python_version\u003c"3.9"\'  \u0026\u0026  python3 -m pip install --quiet --no-warn-script-location \'scikit-learn\' \u0026\u0026 "$0" "$@"\n',
              'sh',
              '-ec',
              'program_path=$(mktemp -d)\n\nprintf "%s" "$0" \u003e "$program_path/ephemeral_component.py"\n_KFP_RUNTIME=true python3 -m kfp.dsl.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
              "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef wine_classification(metrics: Output[ClassificationMetrics]):\n    from sklearn.ensemble import RandomForestClassifier\n    from sklearn.metrics import roc_curve\n    from sklearn.datasets import load_wine\n    from sklearn.model_selection import train_test_split, cross_val_predict\n\n    X, y = load_wine(return_X_y=True)\n    # Binary classification problem for label 1.\n    y = y == 1\n\n    X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=42)\n    rfc = RandomForestClassifier(n_estimators=10, random_state=42)\n    rfc.fit(X_train, y_train)\n    y_scores = cross_val_predict(rfc, X_train, y_train, cv=3, method='predict_proba')\n    y_predict = cross_val_predict(rfc, X_train, y_train, cv=3, method='predict')\n    fpr, tpr, thresholds = roc_curve(y_true=y_train, y_score=y_scores[:,1], pos_label=True)\n    thresholds[0] = 2\n    metrics.log_roc_curve(fpr, tpr, thresholds)\n\n",
            ],
            image: 'ubi8/python-39:latest',
          },
        },
      },
    },
    pipelineInfo: {
      name: 'metrics-visualization-pipeline',
    },
    root: {
      dag: {
        outputs: {
          artifacts: {
            'digit-classification-metrics': {
              artifactSelectors: [
                {
                  outputArtifactKey: 'metrics',
                  producerSubtask: 'digit-classification',
                },
              ],
            },
            'iris-sgdclassifier-metrics': {
              artifactSelectors: [
                {
                  outputArtifactKey: 'metrics',
                  producerSubtask: 'iris-sgdclassifier',
                },
              ],
            },
            'wine-classification-metrics': {
              artifactSelectors: [
                {
                  outputArtifactKey: 'metrics',
                  producerSubtask: 'wine-classification',
                },
              ],
            },
          },
        },
        tasks: {
          'digit-classification': {
            cachingOptions: {
              enableCache: true,
            },
            componentRef: {
              name: 'comp-digit-classification',
            },
            taskInfo: {
              name: 'digit-classification',
            },
          },
          'html-visualization': {
            cachingOptions: {
              enableCache: true,
            },
            componentRef: {
              name: 'comp-html-visualization',
            },
            taskInfo: {
              name: 'html-visualization',
            },
          },
          'iris-sgdclassifier': {
            cachingOptions: {
              enableCache: true,
            },
            componentRef: {
              name: 'comp-iris-sgdclassifier',
            },
            inputs: {
              parameters: {
                test_samples_fraction: {
                  runtimeValue: {
                    constant: '0.3',
                  },
                },
              },
            },
            taskInfo: {
              name: 'iris-sgdclassifier',
            },
          },
          'markdown-visualization': {
            cachingOptions: {
              enableCache: true,
            },
            componentRef: {
              name: 'comp-markdown-visualization',
            },
            taskInfo: {
              name: 'markdown-visualization',
            },
          },
          'wine-classification': {
            cachingOptions: {
              enableCache: true,
            },
            componentRef: {
              name: 'comp-wine-classification',
            },
            taskInfo: {
              name: 'wine-classification',
            },
          },
        },
      },
      outputDefinitions: {
        artifacts: {
          'digit-classification-metrics': {
            artifactType: {
              schemaTitle: ArtifactType.METRICS,
              schemaVersion: '0.0.1',
            },
          },
          'iris-sgdclassifier-metrics': {
            artifactType: {
              schemaTitle: ArtifactType.CLASSIFICATION_METRICS,
              schemaVersion: '0.0.1',
            },
          },
          'wine-classification-metrics': {
            artifactType: {
              schemaTitle: ArtifactType.CLASSIFICATION_METRICS,
              schemaVersion: '0.0.1',
            },
          },
        },
      },
    },
    schemaVersion: '2.1.0',
    sdkVersion: 'kfp-2.7.0',
  },
};
