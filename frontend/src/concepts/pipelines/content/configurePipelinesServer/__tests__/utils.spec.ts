import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { deleteSecret, getPipelinesCR } from '#~/api';
import { DSPA_SECRET_NAME } from '#~/concepts/pipelines/content/configurePipelinesServer/const';
import { PipelineServerConfigType } from '#~/concepts/pipelines/content/configurePipelinesServer/types';
import { createDSPipelineResourceSpec } from '#~/concepts/pipelines/content/configurePipelinesServer/utils';
import { deleteServer, isGeneratedDSPAExternalStorageSecret } from '#~/concepts/pipelines/utils';
import { DSPipelineAPIServerStore } from '#~/k8sTypes.ts';
import { AwsKeys } from '#~/pages/projects/dataConnections/const';
import { genRandomChars } from '#~/utilities/string';

jest.mock('#~/api', () => ({
  getPipelinesCR: jest.fn(),
  deleteSecret: jest.fn(),
  deletePipelineCR: jest.fn(),
}));

const getPipelinesCRMock = getPipelinesCR as jest.Mock;
const deleteSecretMock = deleteSecret as jest.Mock;

describe('configure pipeline server utils', () => {
  describe('createDSPipelineResourceSpec', () => {
    const createPipelineServerConfig = (enableCaching = true) =>
      ({
        database: {
          useDefault: true,
          value: [],
        },
        objectStorage: {
          newValue: [{ key: 'AWS_S3_ENDPOINT', value: '' }],
        },
        enableInstructLab: false,
        storeYamlInKubernetes: false,
        enableCaching,
      } as PipelineServerConfigType);

    type SecretsResponse = Parameters<typeof createDSPipelineResourceSpec>[1];

    const createSecretsResponse = (
      databaseSecret?: SecretsResponse[0],
      objectStorageSecret?: SecretsResponse[1],
    ): SecretsResponse => [databaseSecret, objectStorageSecret ?? { secretName: '' }];

    it('should create resource spec', () => {
      const spec = createDSPipelineResourceSpec(
        createPipelineServerConfig(),
        createSecretsResponse(),
      );
      expect(spec).toEqual({
        dspVersion: 'v2',
        database: undefined,
        objectStorage: {
          externalStorage: {
            bucket: '',
            host: '',
            region: 'us-east-1',
            s3CredentialsSecret: {
              accessKey: 'AWS_ACCESS_KEY_ID',
              secretKey: 'AWS_SECRET_ACCESS_KEY',
              secretName: '',
            },
            scheme: 'https',
          },
        },
        apiServer: {
          enableSamplePipeline: false,
          cacheEnabled: true,
          managedPipelines: {
            instructLab: {
              state: 'Removed',
            },
          },
        },
      });
    });

    it('should create resource spec without caching', () => {
      const spec = createDSPipelineResourceSpec(
        createPipelineServerConfig(false),
        createSecretsResponse(),
      );
      expect(spec).toEqual({
        dspVersion: 'v2',
        database: undefined,
        objectStorage: {
          externalStorage: {
            bucket: '',
            host: '',
            region: 'us-east-1',
            s3CredentialsSecret: {
              accessKey: 'AWS_ACCESS_KEY_ID',
              secretKey: 'AWS_SECRET_ACCESS_KEY',
              secretName: '',
            },
            scheme: 'https',
          },
        },
        apiServer: {
          enableSamplePipeline: false,
          cacheEnabled: false,
          managedPipelines: {
            instructLab: {
              state: 'Removed',
            },
          },
          pipelineStore: DSPipelineAPIServerStore.DATABASE,
        },
      });
    });

    it('should parse S3 endpoint with scheme', () => {
      const config = createPipelineServerConfig();
      const secretsResponse = createSecretsResponse();
      config.objectStorage.newValue = [
        { key: AwsKeys.S3_ENDPOINT, value: 'http://s3.amazonaws.com' },
      ];
      const spec = createDSPipelineResourceSpec(config, secretsResponse);
      expect(spec.objectStorage.externalStorage?.scheme).toBe('http');
      expect(spec.objectStorage.externalStorage?.host).toBe('s3.amazonaws.com');
    });

    it('should cleanup S3 endpoint host', () => {
      const secretsResponse = createSecretsResponse();
      const config = createPipelineServerConfig();
      config.objectStorage.newValue = [
        { key: AwsKeys.S3_ENDPOINT, value: 'https://s3.amazonaws.com/' },
      ];
      const spec = createDSPipelineResourceSpec(config, secretsResponse);
      expect(spec.objectStorage.externalStorage?.host).toBe('s3.amazonaws.com');
    });

    it('should parse S3 endpoint without scheme', () => {
      const secretsResponse = createSecretsResponse();
      const config = createPipelineServerConfig();
      config.objectStorage.newValue = [{ key: AwsKeys.S3_ENDPOINT, value: 's3.amazonaws.com' }];
      const spec = createDSPipelineResourceSpec(config, secretsResponse);
      expect(spec.objectStorage.externalStorage?.scheme).toBe('https');
      expect(spec.objectStorage.externalStorage?.host).toBe('s3.amazonaws.com');
    });

    it('should include bucket', () => {
      const secretsResponse = createSecretsResponse();
      const config = createPipelineServerConfig();
      config.objectStorage.newValue = [
        ...config.objectStorage.newValue,
        { key: AwsKeys.AWS_S3_BUCKET, value: 'my-bucket' },
      ];
      const spec = createDSPipelineResourceSpec(config, secretsResponse);
      expect(spec.objectStorage.externalStorage?.bucket).toBe('my-bucket');
    });

    it('should create spec with database object', () => {
      const config = createPipelineServerConfig();
      config.database.value = [
        {
          key: 'Username',
          value: 'test-user',
        },
        {
          key: 'Port',
          value: '8080',
        },
        {
          key: 'Host',
          value: 'test.host.com',
        },
        {
          key: 'Database',
          value: 'db-name',
        },
      ];
      const spec = createDSPipelineResourceSpec(
        config,
        createSecretsResponse({
          key: 'password-key',
          name: 'password-name',
        }),
      );
      expect(spec).toEqual({
        dspVersion: 'v2',
        objectStorage: {
          externalStorage: {
            bucket: '',
            host: '',
            region: 'us-east-1',
            s3CredentialsSecret: {
              accessKey: 'AWS_ACCESS_KEY_ID',
              secretKey: 'AWS_SECRET_ACCESS_KEY',
              secretName: '',
            },
            scheme: 'https',
          },
        },
        database: {
          externalDB: {
            host: 'test.host.com',
            passwordSecret: {
              key: 'password-key',
              name: 'password-name',
            },
            pipelineDBName: 'db-name',
            port: '8080',
            username: 'test-user',
          },
        },
        apiServer: {
          enableSamplePipeline: false,
          cacheEnabled: true,
          managedPipelines: {
            instructLab: {
              state: 'Removed',
            },
          },
          pipelineStore: DSPipelineAPIServerStore.DATABASE,
        },
      });
    });
  });

  describe('isGeneratedDSPAObjectStorageSecret', () => {
    it('should return true if name is generated secret name (secret-xxxxxx)', () => {
      expect(isGeneratedDSPAExternalStorageSecret(`secret-${genRandomChars()}`)).toBe(true);
    });
  });

  describe('deletePipelineServer', () => {
    it('should deleteSecret have been called 3 times if name is dspa-secret', async () => {
      const mockDSPA = mockDataSciencePipelineApplicationK8sResource({
        dspaSecretName: DSPA_SECRET_NAME,
      });
      getPipelinesCRMock.mockResolvedValue(mockDSPA);
      await deleteServer('namespace', 'dpsa');
      expect(deleteSecretMock).toHaveBeenCalledTimes(3);
      expect(deleteSecretMock).toHaveBeenNthCalledWith(3, 'namespace', DSPA_SECRET_NAME);
    });
    it('should deleteSecret have been called 3 times if name is not generated', async () => {
      const mockDSPA = mockDataSciencePipelineApplicationK8sResource({});
      getPipelinesCRMock.mockResolvedValue(mockDSPA);
      await deleteServer('namespace', 'dpsa');
      expect(deleteSecretMock).toHaveBeenCalledTimes(3);
    });
    it('should deleteSecret have been called 4 times if name generated', async () => {
      const mockDSPA = mockDataSciencePipelineApplicationK8sResource({
        dspaSecretName: `secret-${genRandomChars()}`,
      });
      getPipelinesCRMock.mockResolvedValue(mockDSPA);
      await deleteServer('namespace', 'dpsa');
      expect(deleteSecretMock).toHaveBeenCalledTimes(4);
    });
  });
});
