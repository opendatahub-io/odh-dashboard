import { DSPipelineKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  initializing?: boolean;
};

export const mockDataSciencePipelineApplicationK8sResource = ({
  namespace = 'test-project',
  initializing = false,
}: MockResourceConfigType): DSPipelineKind => ({
  apiVersion: 'datasciencepipelinesapplications.opendatahub.io/v1alpha1',
  kind: 'DataSciencePipelinesApplication',
  metadata: {
    name: 'pipelines-definition',
    namespace,
  },
  spec: {
    apiServer: {
      enableSamplePipeline: false,
    },
    database: {
      mariaDB: {
        pipelineDBName: 'mlpipeline',
        username: 'mlpipeline',
      },
    },
    objectStorage: {
      externalStorage: {
        bucket: 'test-pipelines-bucket',
        host: 's3.amazonaws.com',
        port: '',
        s3CredentialsSecret: {
          accessKey: 'AWS_ACCESS_KEY_ID',
          secretKey: 'AWS_SECRET_ACCESS_KEY',
          secretName: 'aws-connection-testdb',
        },
        scheme: 'https',
      },
    },
    persistenceAgent: {
      deploy: true,
      numWorkers: 2,
    },
  },
  status: {
    conditions: [
      {
        lastTransitionTime: '2023-07-20T16:58:12Z',
        message: '',
        reason: 'MinimumReplicasAvailable',
        status: initializing ? 'False' : 'True',
        type: 'APIServerReady',
      },
    ],
  },
});
