/* eslint-disable camelcase */
import {
  ArtifactType,
  InputDefinitionParameterType,
  PipelineVersionKF,
  PipelineVersionKFv2,
  RelationshipKF,
  ResourceTypeKF,
} from '~/concepts/pipelines/kfTypes';

/**
 * @deprecated Use `mockPipelineVersionsListV2` instead.
 */
export const mockPipelineVersionsList: PipelineVersionKF[] = [
  {
    id: 'ad1b7153-d2fd-4e5e-ae12-30c824b19b03',
    name: 'flip coin_version_at_2023-12-01T01:42:09.321Z',
    created_at: '2023-12-01T01:42:15Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '1c0dd0b3-dcdf-4a5d-a4f1-9fda4e20aba6',
    name: 'flip coin_version_at_2023-12-01T01:42:00.825Z',
    created_at: '2023-12-01T01:42:06Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '94a67a78-be66-4b4a-88e7-1c0fdc3f2867',
    name: 'flip coin_version_at_2023-12-01T01:41:31.560Z',
    created_at: '2023-12-01T01:41:41Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '9c34cd40-7195-4030-b540-ef0779b30ce7',
    name: 'flip coin_version_at_2023-12-01T01:41:23.391Z',
    created_at: '2023-12-01T01:41:29Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: 'eaa80f52-a6f9-4ba0-9fd7-bf067f339c5f',
    name: 'flip coin_version_at_2023-12-01T01:41:14.845Z',
    created_at: '2023-12-01T01:41:20Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '27bbb3e2-4a29-4701-9150-ebaabff63b97',
    name: 'flip coin_version_at_2023-12-01T01:41:06.333Z',
    created_at: '2023-12-01T01:41:12Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '6c3f2843-de1a-408c-8bd2-d68c1073b71c',
    name: 'flip coin_version_at_2023-12-01T01:40:56.240Z',
    created_at: '2023-12-01T01:41:03Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: 'd2d51128-87b4-41c0-a519-d00237367b09',
    name: 'flip coin_version_at_2023-12-01T01:40:43.847Z',
    created_at: '2023-12-01T01:40:53Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '5a2013ef-067c-4221-925f-8cbff134189d',
    name: 'flip coin_version_at_2023-12-01T01:40:28.425Z',
    created_at: '2023-12-01T01:40:41Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '31222a28-9b8f-4553-b6d3-54b106a3e5f9',
    name: 'flip coin_version_at_2023-12-01T01:36:34.957Zhdsfjkasdhflkdshfkldshfkladsfhlkadshfksdadsafadsf',
    created_at: '2023-12-01T01:36:48Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
    description: 'dsafdsjkfsahfklsadhflkdsahfkldsfhlasdkhfksldahflkas',
  },
  {
    id: '2f177ef7-6403-4933-acc0-714f556c8835',
    name: 'flip coin_version_at_2023-12-01T00:45:29.894Zsdafjkdsalfjdsklfadlskgnakdg',
    created_at: '2023-12-01T00:45:46Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '38fe6c54-69fd-4011-9ab4-55bcfdf1e1cd',
    name: 'flip coin_version_at_2023-11-29T14:43:43.608Z',
    created_at: '2023-11-29T14:44:00Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
  {
    id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
    name: 'flip coin',
    created_at: '2023-10-03T15:37:54Z',
    resource_references: [
      {
        key: {
          type: ResourceTypeKF.PIPELINE,
          id: '63a09bff-9261-43b9-a2a8-5f2158c5522e',
        },
        relationship: RelationshipKF.OWNER,
      },
    ],
  },
];

export const mockPipelineVersionsListV2: PipelineVersionKFv2[] = [
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
): PipelineVersionKF => ({
  id: '8ce2d041-3eb9-41a0-828c-45209fdf1c20',
  name: 'version-1',
  created_at: '2023-12-07T16:08:01Z',
  resource_references: [
    {
      key: { type: ResourceTypeKF.PIPELINE, id: 'b2ff4cbf-f7f5-4c8a-b454-906bd9b00510' },
      relationship: RelationshipKF.OWNER,
    },
  ],
  description: 'test',
  ...pipelineVersion,
});

export const buildMockPipelineVersionV2 = (
  pipelineVersion?: Partial<PipelineVersionKFv2>,
): PipelineVersionKFv2 => ({
  pipeline_id: '8ce2d041-3eb9-41a0-828c-45209fdf1c20',
  pipeline_version_id: '8ce2d04a0-828c-45209fdf1c20',
  display_name: 'version-1',
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
        inputDefinitions: {
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
      },
      schemaVersion: '2.1.0',
      sdkVersion: 'kfp-2.6.0',
    },
  },
  ...pipelineVersion,
});

export const buildMockPipelineVersions = (
  versions: PipelineVersionKF[] = mockPipelineVersionsList,
  totalSize?: number,
  nextPageToken?: string,
): {
  total_size?: number | undefined;
  next_page_token?: string | undefined;
  versions: PipelineVersionKF[];
} => ({
  versions,
  total_size: totalSize || versions.length,
  next_page_token: nextPageToken,
});

export const buildMockPipelineVersionsV2 = (
  pipeline_versions: PipelineVersionKFv2[] = mockPipelineVersionsListV2,
  totalSize?: number,
  nextPageToken?: string,
): {
  total_size?: number | undefined;
  next_page_token?: string | undefined;
  pipeline_versions: PipelineVersionKFv2[];
} => ({
  pipeline_versions,
  total_size: totalSize || pipeline_versions.length,
  next_page_token: nextPageToken,
});

export const mockPipelineVersionsListPage1 = buildMockPipelineVersions(
  mockPipelineVersionsList.slice(0, 10),
  mockPipelineVersionsList.length,
  'next-page-token',
);

export const mockPipelineVersionsListPage2 = buildMockPipelineVersions(
  mockPipelineVersionsList.slice(10),
  mockPipelineVersionsList.length,
);

export const mockPipelineVersionsListSearch = (
  search: string,
): ReturnType<typeof buildMockPipelineVersions> => {
  const filteredVersions = mockPipelineVersionsList
    .filter((version) => version.name.startsWith(search))
    .slice(0, 10);
  return buildMockPipelineVersions(filteredVersions, filteredVersions.length);
};
