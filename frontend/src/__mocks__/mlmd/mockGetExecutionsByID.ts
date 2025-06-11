/* eslint-disable camelcase */
import { GetExecutionsResponse } from '#~/__mocks__/third_party/mlmd';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedGetExecutionsByID: GetExecutionsResponse = {
  executions: [
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
  ],
};

export const mockGetExecutionsByID = (): GrpcResponse => {
  const binary = GetExecutionsResponse.encode(mockedGetExecutionsByID).finish();
  return createGrpcResponse(binary);
};
