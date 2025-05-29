/* eslint-disable camelcase */
import { GetExecutionsByContextResponse } from '#~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedExecutionsByContextResponse: GetExecutionsByContextResponse = {
  executions: [
    {
      id: 287,
      name: 'run/c7ea4e4f-f2f3-4ecf-9379-a9441a243887',
      typeId: 12,
      type: 'system.DAGExecution',
      lastKnownState: 2,
      createTimeSinceEpoch: 1712899519170,
      lastUpdateTimeSinceEpoch: 1712899519170,
      properties: {},
      customProperties: {
        display_name: {
          stringValue: '',
        },
        task_name: {
          stringValue: '',
        },
      },
    },
    {
      id: 288,
      typeId: 13,
      type: 'system.ContainerExecution',
      lastKnownState: 5,
      createTimeSinceEpoch: 1712899528735,
      lastUpdateTimeSinceEpoch: 1712899529361,
      properties: {},
      customProperties: {
        cache_fingerprint: {
          stringValue: '7c3190be2e584610488d53da68e945b703d90753bf0cfade5b3cfe395d7f5c20',
        },
        cached_execution_id: {
          stringValue: '211',
        },
        display_name: {
          stringValue: 'digit-classification',
        },
        image: {
          stringValue: '',
        },
        inputs: {
          structValue: {
            fields: {},
          },
        },
        namespace: {
          stringValue: '',
        },
        outputs: {
          structValue: {
            fields: {},
          },
        },
        parent_dag_id: {
          intValue: 287,
        },
        pod_name: {
          stringValue: '',
        },
        pod_uid: {
          stringValue: '',
        },
        task_name: {
          stringValue: 'digit-classification',
        },
      },
    },
    {
      id: 289,
      typeId: 13,
      type: 'system.ContainerExecution',
      lastKnownState: 5,
      createTimeSinceEpoch: 1712899529328,
      lastUpdateTimeSinceEpoch: 1712899529738,
      properties: {},
      customProperties: {
        cache_fingerprint: {
          stringValue: '1122f9fda5483cc0c3dd6950514104b878f2f4f7a0cef4945ea195c0b90e0fb9',
        },
        cached_execution_id: {
          stringValue: '201',
        },
        display_name: {
          stringValue: 'html-visualization',
        },
        image: {
          stringValue: '',
        },
        inputs: {
          structValue: {
            fields: {},
          },
        },
        namespace: {
          stringValue: '',
        },
        outputs: {
          structValue: {
            fields: {},
          },
        },
        parent_dag_id: {
          intValue: 287,
        },
        pod_name: {
          stringValue: '',
        },
        pod_uid: {
          stringValue: '',
        },
        task_name: {
          stringValue: 'html-visualization',
        },
      },
    },
    {
      id: 290,
      typeId: 13,
      type: 'system.ContainerExecution',
      lastKnownState: 5,
      createTimeSinceEpoch: 1712899529332,
      lastUpdateTimeSinceEpoch: 1712899529840,
      properties: {},
      customProperties: {
        cache_fingerprint: {
          stringValue: '1816513632893d5cc27a2e7cc97f77d11c479a577f5be832aa46c467d87f7b33',
        },
        cached_execution_id: {
          stringValue: '222',
        },
        display_name: {
          stringValue: 'create-dataset',
        },
        image: {
          stringValue: '',
        },
        inputs: {
          structValue: {
            fields: {},
          },
        },
        namespace: {
          stringValue: '',
        },
        outputs: {
          structValue: {
            fields: {},
          },
        },
        parent_dag_id: {
          intValue: 287,
        },
        pod_name: {
          stringValue: '',
        },
        pod_uid: {
          stringValue: '',
        },
        task_name: {
          stringValue: 'create-dataset',
        },
      },
    },
    {
      id: 291,
      typeId: 13,
      type: 'system.ContainerExecution',
      lastKnownState: 5,
      createTimeSinceEpoch: 1712899529940,
      lastUpdateTimeSinceEpoch: 1712899530046,
      properties: {},
      customProperties: {
        cache_fingerprint: {
          stringValue: 'b66ac635abe84bb9b6018e9e27a1b43ea1d214439931ec3197049ede0e07177e',
        },
        cached_execution_id: {
          stringValue: '215',
        },
        display_name: {
          stringValue: 'iris-sgdclassifier',
        },
        image: {
          stringValue: '',
        },
        inputs: {
          structValue: {
            fields: {
              test_samples_fraction: {
                nullValue: 0,
                numberValue: 0.3,
                stringValue: '',
                boolValue: false,
              },
            },
          },
        },
        namespace: {
          stringValue: '',
        },
        outputs: {
          structValue: {
            fields: {},
          },
        },
        parent_dag_id: {
          intValue: 287,
        },
        pod_name: {
          stringValue: '',
        },
        pod_uid: {
          stringValue: '',
        },
        task_name: {
          stringValue: 'iris-sgdclassifier',
        },
      },
    },
    {
      id: 292,
      typeId: 13,
      type: 'system.ContainerExecution',
      lastKnownState: 5,
      createTimeSinceEpoch: 1712899531539,
      lastUpdateTimeSinceEpoch: 1712899531647,
      properties: {},
      customProperties: {
        cache_fingerprint: {
          stringValue: '6842ef332bd56a8e7cf55bcb002b70464102018e6d2c2360c5cc1f1587d8893f',
        },
        cached_execution_id: {
          stringValue: '198',
        },
        display_name: {
          stringValue: 'markdown-visualization',
        },
        image: {
          stringValue: '',
        },
        inputs: {
          structValue: {
            fields: {},
          },
        },
        namespace: {
          stringValue: '',
        },
        outputs: {
          structValue: {
            fields: {},
          },
        },
        parent_dag_id: {
          intValue: 287,
        },
        pod_name: {
          stringValue: '',
        },
        pod_uid: {
          stringValue: '',
        },
        task_name: {
          stringValue: 'markdown-visualization',
        },
      },
    },
  ],
};

export const mockGetExecutionsByContext = (): GrpcResponse => {
  const binary = GetExecutionsByContextResponse.encode(mockedExecutionsByContextResponse).finish();
  return createGrpcResponse(binary);
};
