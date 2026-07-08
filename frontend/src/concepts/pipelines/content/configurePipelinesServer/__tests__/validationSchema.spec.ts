import { AwsKeys } from '#~/pages/projects/dataConnections/const';
import { PipelineServerConfigType } from '#~/concepts/pipelines/content/configurePipelinesServer/types';
import {
  pipelineServerConfigBaseSchema,
  pipelineServerConfigManagedRequiredSchema,
} from '#~/concepts/pipelines/content/configurePipelinesServer/validationSchema';
import {
  DatabaseConnectionKeys,
  EMPTY_DATABASE_CONNECTION,
} from '#~/concepts/pipelines/content/configurePipelinesServer/const';

const validObjectStorage: PipelineServerConfigType['objectStorage'] = {
  newValue: [
    { key: AwsKeys.ACCESS_KEY_ID, value: 'key' },
    { key: AwsKeys.SECRET_ACCESS_KEY, value: 'secret' },
    { key: AwsKeys.S3_ENDPOINT, value: 'https://s3.example.com' },
    { key: AwsKeys.DEFAULT_REGION, value: 'us-east-1' },
    { key: AwsKeys.AWS_S3_BUCKET, value: 'my-bucket' },
  ],
};

const validDatabase: PipelineServerConfigType['database'] = {
  useDefault: false,
  value: [
    { key: DatabaseConnectionKeys.HOST, value: 'mysql' },
    { key: DatabaseConnectionKeys.PORT, value: '3306' },
    { key: DatabaseConnectionKeys.USERNAME, value: 'admin' },
    { key: DatabaseConnectionKeys.PASSWORD, value: 'pass' },
    { key: DatabaseConnectionKeys.DATABASE, value: 'mlpipelines' },
  ],
};

const validConfig: PipelineServerConfigType = {
  database: { useDefault: true, value: EMPTY_DATABASE_CONNECTION },
  objectStorage: validObjectStorage,
  storeYamlInKubernetes: true,
  enableCaching: true,
  enableManagedPipelines: false,
};

describe('pipelineServerConfigBaseSchema', () => {
  it('should accept a valid config with default database', () => {
    expect(pipelineServerConfigBaseSchema.safeParse(validConfig).success).toBe(true);
  });

  it('should accept a valid config with external database', () => {
    const config = { ...validConfig, database: validDatabase };
    expect(pipelineServerConfigBaseSchema.safeParse(config).success).toBe(true);
  });

  it('should reject when required object storage fields are empty', () => {
    const config: PipelineServerConfigType = {
      ...validConfig,
      objectStorage: {
        newValue: [
          { key: AwsKeys.ACCESS_KEY_ID, value: '' },
          { key: AwsKeys.SECRET_ACCESS_KEY, value: 'secret' },
          { key: AwsKeys.S3_ENDPOINT, value: 'https://s3.example.com' },
          { key: AwsKeys.DEFAULT_REGION, value: 'us-east-1' },
          { key: AwsKeys.AWS_S3_BUCKET, value: 'my-bucket' },
        ],
      },
    };
    expect(pipelineServerConfigBaseSchema.safeParse(config).success).toBe(false);
  });

  it('should reject when required object storage fields are whitespace-only', () => {
    const config: PipelineServerConfigType = {
      ...validConfig,
      objectStorage: {
        newValue: [
          { key: AwsKeys.ACCESS_KEY_ID, value: '   ' },
          { key: AwsKeys.SECRET_ACCESS_KEY, value: 'secret' },
          { key: AwsKeys.S3_ENDPOINT, value: 'https://s3.example.com' },
          { key: AwsKeys.DEFAULT_REGION, value: 'us-east-1' },
          { key: AwsKeys.AWS_S3_BUCKET, value: 'my-bucket' },
        ],
      },
    };
    expect(pipelineServerConfigBaseSchema.safeParse(config).success).toBe(false);
  });

  it('should reject when required database fields are empty and useDefault is false', () => {
    const config: PipelineServerConfigType = {
      ...validConfig,
      database: { useDefault: false, value: EMPTY_DATABASE_CONNECTION },
    };
    expect(pipelineServerConfigBaseSchema.safeParse(config).success).toBe(false);
  });

  it('should accept empty database fields when useDefault is true', () => {
    const config: PipelineServerConfigType = {
      ...validConfig,
      database: { useDefault: true, value: EMPTY_DATABASE_CONNECTION },
    };
    expect(pipelineServerConfigBaseSchema.safeParse(config).success).toBe(true);
  });

  it('should accept config with enableManagedPipelines false', () => {
    expect(pipelineServerConfigBaseSchema.safeParse(validConfig).success).toBe(true);
  });

  it('should accept config with enableManagedPipelines true', () => {
    const config = { ...validConfig, enableManagedPipelines: true };
    expect(pipelineServerConfigBaseSchema.safeParse(config).success).toBe(true);
  });
});

describe('pipelineServerConfigManagedRequiredSchema', () => {
  it('should reject when enableManagedPipelines is false', () => {
    expect(pipelineServerConfigManagedRequiredSchema.safeParse(validConfig).success).toBe(false);
  });

  it('should accept when enableManagedPipelines is true', () => {
    const config = { ...validConfig, enableManagedPipelines: true };
    expect(pipelineServerConfigManagedRequiredSchema.safeParse(config).success).toBe(true);
  });

  it('should still reject when object storage is invalid even with managed pipelines enabled', () => {
    const config: PipelineServerConfigType = {
      ...validConfig,
      enableManagedPipelines: true,
      objectStorage: {
        newValue: [
          { key: AwsKeys.ACCESS_KEY_ID, value: '' },
          { key: AwsKeys.SECRET_ACCESS_KEY, value: '' },
          { key: AwsKeys.S3_ENDPOINT, value: '' },
          { key: AwsKeys.DEFAULT_REGION, value: '' },
          { key: AwsKeys.AWS_S3_BUCKET, value: '' },
        ],
      },
    };
    expect(pipelineServerConfigManagedRequiredSchema.safeParse(config).success).toBe(false);
  });
});
