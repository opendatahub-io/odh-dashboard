import { DSPipelineKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  dspVersion?: string;
  displayName?: string;
  initializing?: boolean;
  dspaSecretName?: string;
};

export const mockDataSciencePipelineApplicationK8sResource = ({
  name = 'dspa',
  namespace = 'test-project',
  dspVersion = 'v2',
  initializing = false,
  dspaSecretName = 'aws-connection-testdb',
}: MockResourceConfigType): DSPipelineKind => ({
  apiVersion: 'datasciencepipelinesapplications.opendatahub.io/v1alpha1',
  kind: 'DataSciencePipelinesApplication',
  metadata: {
    name,
    namespace,
  },
  spec: {
    dspVersion,
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
        region: 'us-east-2',
        bucket: 'test-pipelines-bucket',
        host: 's3.amazonaws.com',
        port: '',
        s3CredentialsSecret: {
          accessKey: 'AWS_ACCESS_KEY_ID',
          secretKey: 'AWS_SECRET_ACCESS_KEY',
          secretName: dspaSecretName,
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
