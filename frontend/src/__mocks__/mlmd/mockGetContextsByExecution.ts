/* eslint-disable camelcase */

import { Context } from '#~/__mocks__/third_party/mlmd';
import { GetContextsByExecutionResponse } from '#~/__mocks__/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service';
import createGrpcResponse, { GrpcResponse } from './utils';

const mockedContext: Context = {
  id: 106,
  name: 'test-run',
  typeId: 11,
  type: 'system.PipelineRun',
  properties: {},
  customProperties: {
    bucket_session_info: {
      stringValue:
        '{"Region":"us-east-1","Endpoint":"https://s3.amazonaws.com","DisableSSL":false,"SecretName":"secret-3t3ar6","AccessKeyKey":"AWS_ACCESS_KEY_ID","SecretKeyKey":"AWS_SECRET_ACCESS_KEY"}',
    },
    namespace: {
      stringValue: 'jps-fun-world',
    },
    pipeline_root: {
      stringValue: 's3://aballant-pipelines/metrics-visualization-pipeline/${name}',
    },
    resource_name: {
      stringValue: 'run-resource',
    },
  },
  createTimeSinceEpoch: 1712899519123,
  lastUpdateTimeSinceEpoch: 1712899519123,
};

export const mockGetContextsByExecution = (): GrpcResponse => {
  const binary = GetContextsByExecutionResponse.encode({ contexts: [mockedContext] }).finish();
  return createGrpcResponse(binary);
};
