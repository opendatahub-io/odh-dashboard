import { createSecret, assembleSecret } from '~/api';
import { DSPipelineKind } from '~/k8sTypes';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import {
  isSecretAWSSecretKind,
  convertAWSSecretData,
} from '~/pages/projects/screens/detail/data-connections/utils';
import { AWSDataEntry, DataConnectionType } from '~/pages/projects/types';
import { dataEntryToRecord } from '~/utilities/dataEntryToRecord';
import { DATABASE_CONNECTION_KEYS, EXTERNAL_DATABASE_SECRET } from './const';
import { ObjectStorageExisting, PipelineServerConfigType } from './types';

type SecretsResponse = [
  (
    | {
        key: string;
        name: string;
      }
    | undefined
  ),
  {
    secretName: string;
    awsData: AWSDataEntry;
  },
];

export const isUseExisting = (config: unknown): config is ObjectStorageExisting =>
  (config as ObjectStorageExisting).existingName !== undefined;

const createDatabaseSecret = (
  databaseConfig: PipelineServerConfigType['database'],
  projectName: string,
  dryRun: boolean,
): Promise<
  | {
      key: string;
      name: string;
    }
  | undefined
> => {
  if (!databaseConfig.useDefault) {
    const secretKey = EXTERNAL_DATABASE_SECRET.KEY;
    const databaseRecord = databaseConfig.value?.reduce<Record<string, string>>(
      (acc, { key, value }) => ({ ...acc, [key]: value }),
      {},
    );
    const assembledSecret = assembleSecret(
      projectName,
      {
        [secretKey]: databaseRecord[DATABASE_CONNECTION_KEYS.PASSWORD],
      },
      'generic',
      EXTERNAL_DATABASE_SECRET.NAME,
    );

    return createSecret(assembledSecret, { dryRun: dryRun }).then((secret) => ({
      key: secretKey,
      name: secret.metadata.name,
    }));
  }

  return Promise.resolve(undefined);
};

const createObjectStorageSecret = (
  objectStorageConfig: PipelineServerConfigType['objectStorage'],
  projectName: string,
  dryRun: boolean,
): Promise<{
  secretName: string;
  awsData: AWSDataEntry;
}> => {
  if (objectStorageConfig.useExisting) {
    return Promise.resolve({
      secretName: objectStorageConfig.existingName,
      awsData: objectStorageConfig.existingValue,
    });
  }
  const assembledSecret = assembleSecret(
    projectName,
    objectStorageConfig.newValue.reduce<Record<string, string>>(
      (acc, { key, value }) => ({ ...acc, [key]: value }),
      {},
    ),
    'aws',
  );

  return createSecret(assembledSecret, { dryRun: dryRun }).then((secret) => {
    if (isSecretAWSSecretKind(secret)) {
      return {
        secretName: assembledSecret.metadata.name,
        awsData: convertAWSSecretData({
          type: DataConnectionType.AWS,
          data: secret,
        }),
      };
    }
    throw new Error('Error creating data connection');
  });
};

const createSecrets = (config: PipelineServerConfigType, projectName: string) =>
  new Promise<SecretsResponse>((resolve, reject) => {
    Promise.all([
      createDatabaseSecret(config.database, projectName, true),
      createObjectStorageSecret(config.objectStorage, projectName, true),
    ])
      .then(() => {
        Promise.all([
          createDatabaseSecret(config.database, projectName, false),
          createObjectStorageSecret(config.objectStorage, projectName, false),
        ])
          .then((resp) => resolve(resp))
          .catch(reject);
      })
      .catch(reject);
  });

export const createDSPipelineResourceSpec = (
  config: PipelineServerConfigType,
  [databaseSecret, objectStorageSecret]: SecretsResponse,
): DSPipelineKind['spec'] => {
  {
    const awsRecord = dataEntryToRecord(objectStorageSecret.awsData);
    const databaseRecord = dataEntryToRecord(config.database.value);

    const [, externalStorageScheme, externalStorageHost] =
      awsRecord.AWS_S3_ENDPOINT?.match(/^(?:(\w+):\/\/)?(.*)/) ?? [];

    return {
      objectStorage: {
        externalStorage: {
          host: externalStorageHost?.replace(/\/$/, '') || '',
          scheme: externalStorageScheme || 'https',
          bucket: awsRecord.AWS_S3_BUCKET || '',
          s3CredentialsSecret: {
            accessKey: AWS_KEYS.ACCESS_KEY_ID,
            secretKey: AWS_KEYS.SECRET_ACCESS_KEY,
            secretName: objectStorageSecret?.secretName,
          },
        },
      },
      database: databaseSecret
        ? {
            externalDB: {
              host: databaseRecord?.[DATABASE_CONNECTION_KEYS.HOST],
              passwordSecret: {
                key: databaseSecret.key,
                name: databaseSecret.name,
              },
              pipelineDBName: databaseRecord?.[DATABASE_CONNECTION_KEYS.DATABASE],
              port: databaseRecord?.[DATABASE_CONNECTION_KEYS.PORT],
              username: databaseRecord?.[DATABASE_CONNECTION_KEYS.USERNAME],
            },
          }
        : undefined,
    };
  }
};

export const configureDSPipelineResourceSpec = (
  config: PipelineServerConfigType,
  projectName: string,
): Promise<DSPipelineKind['spec']> =>
  createSecrets(config, projectName).then((secretsResponse) =>
    createDSPipelineResourceSpec(config, secretsResponse),
  );
