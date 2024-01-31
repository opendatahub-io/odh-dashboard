import { createSecret, assembleSecret } from '~/api';
import { DSPipelineKind } from '~/k8sTypes';
import { AWS_KEYS, PIPELINE_AWS_FIELDS } from '~/pages/projects/dataConnections/const';
import { dataEntryToRecord } from '~/utilities/dataEntryToRecord';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import { DATABASE_CONNECTION_KEYS, EXTERNAL_DATABASE_SECRET } from './const';
import { PipelineServerConfigType } from './types';

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
  },
];

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
    const databaseRecord = databaseConfig.value.reduce<Record<string, string>>(
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

    return createSecret(assembledSecret, { dryRun }).then((secret) => ({
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
}> => {
  const assembledSecret = assembleSecret(
    projectName,
    objectStorageConfig.newValue.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {}),
    'generic',
  );

  return createSecret(assembledSecret, { dryRun }).then((secret) => ({
    secretName: secret.metadata.name,
  }));
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
  const databaseRecord = dataEntryToRecord(config.database.value);
  const awsRecord = dataEntryToRecord(config.objectStorage.newValue);
  const [, externalStorageScheme, externalStorageHost] = awsRecord.AWS_S3_ENDPOINT?.match(
    /^(?:(\w+):\/\/)?(.*)/,
  ) ?? [undefined];

  return {
    objectStorage: {
      externalStorage: {
        host: externalStorageHost?.replace(/\/$/, '') || '',
        scheme: externalStorageScheme || 'https',
        bucket: awsRecord.AWS_S3_BUCKET || '',
        s3CredentialsSecret: {
          accessKey: AWS_KEYS.ACCESS_KEY_ID,
          secretKey: AWS_KEYS.SECRET_ACCESS_KEY,
          secretName: objectStorageSecret.secretName,
        },
      },
    },
    database: databaseSecret
      ? {
          externalDB: {
            host: databaseRecord[DATABASE_CONNECTION_KEYS.HOST],
            passwordSecret: {
              key: databaseSecret.key,
              name: databaseSecret.name,
            },
            pipelineDBName: databaseRecord[DATABASE_CONNECTION_KEYS.DATABASE],
            port: databaseRecord[DATABASE_CONNECTION_KEYS.PORT],
            username: databaseRecord[DATABASE_CONNECTION_KEYS.USERNAME],
          },
        }
      : undefined,
  };
};

export const configureDSPipelineResourceSpec = (
  config: PipelineServerConfigType,
  projectName: string,
): Promise<DSPipelineKind['spec']> =>
  createSecrets(config, projectName).then((secretsResponse) =>
    createDSPipelineResourceSpec(config, secretsResponse),
  );

export const objectStorageIsValid = (objectStorage: EnvVariableDataEntry[]): boolean =>
  objectStorage.every(({ key, value }) =>
    PIPELINE_AWS_FIELDS.filter((field) => field.isRequired)
      .map((field) => field.key)
      .includes(key)
      ? !!value
      : true,
  );

export const getLabelName = (index: string): string => {
  const field = PIPELINE_AWS_FIELDS.find((field) => field.key === index);
  return field ? field.label : '';
};
