import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { PipelineServerConfigType } from '~/concepts/pipelines/content/configurePipelinesServer/types';
import { createDSPipelineResourceSpec } from '~/concepts/pipelines/content/configurePipelinesServer/utils';

describe('configure pipeline server utils', () => {
  describe('createDSPipelineResourceSpec', () => {
    const createPipelineServerConfig = () =>
      ({
        database: {
          useDefault: true,
          value: [],
        },
        objectStorage: {
          useExisting: true,
          existingName: '',
          existingValue: [],
        },
      } as PipelineServerConfigType);

    type SecretsResponse = Parameters<typeof createDSPipelineResourceSpec>[1];

    const createSecretsResponse = (
      databaseSecret?: SecretsResponse[0],
      objectStorageSecret?: SecretsResponse[1],
    ): SecretsResponse => [databaseSecret, objectStorageSecret ?? { secretName: '', awsData: [] }];

    it('should create resource spec', () => {
      const spec = createDSPipelineResourceSpec(
        createPipelineServerConfig(),
        createSecretsResponse(),
      );
      expect(spec).toEqual({
        database: undefined,
        objectStorage: {
          externalStorage: {
            bucket: '',
            host: '',
            s3CredentialsSecret: {
              accessKey: 'AWS_ACCESS_KEY_ID',
              secretKey: 'AWS_SECRET_ACCESS_KEY',
              secretName: '',
            },
            scheme: 'https',
          },
        },
      });
    });

    it('should parse S3 endpoint with scheme', () => {
      const secretsResponse = createSecretsResponse();
      secretsResponse[1].awsData = [
        { key: AWS_KEYS.S3_ENDPOINT, value: 'http://s3.amazonaws.com' },
      ];
      const spec = createDSPipelineResourceSpec(createPipelineServerConfig(), secretsResponse);
      expect(spec.objectStorage.externalStorage?.scheme).toBe('http');
      expect(spec.objectStorage.externalStorage?.host).toBe('s3.amazonaws.com');
    });

    it('should parse S3 endpoint without scheme', () => {
      const secretsResponse = createSecretsResponse();

      secretsResponse[1].awsData = [{ key: AWS_KEYS.S3_ENDPOINT, value: 's3.amazonaws.com' }];
      const spec = createDSPipelineResourceSpec(createPipelineServerConfig(), secretsResponse);
      expect(spec.objectStorage.externalStorage?.scheme).toBe('https');
      expect(spec.objectStorage.externalStorage?.host).toBe('s3.amazonaws.com');
    });

    it('should include bucket', () => {
      const secretsResponse = createSecretsResponse();
      secretsResponse[1].awsData = [{ key: AWS_KEYS.AWS_S3_BUCKET, value: 'my-bucket' }];
      const spec = createDSPipelineResourceSpec(createPipelineServerConfig(), secretsResponse);
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
        objectStorage: {
          externalStorage: {
            bucket: '',
            host: '',
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
      });
    });
  });
});
