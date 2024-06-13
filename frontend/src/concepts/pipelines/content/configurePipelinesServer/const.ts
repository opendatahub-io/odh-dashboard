import { FieldOptions } from '~/components/FieldList';
import { EnvVariableDataEntry } from '~/pages/projects/types';

export const DSPA_SECRET_NAME = 'dashboard-dspa-secret';

export enum ExternalDatabaseSecret {
  KEY = 'db-password',
  NAME = 'pipelines-db-password',
}

export enum DatabaseConnectionKeys {
  HOST = 'Host',
  PORT = 'Port',
  USERNAME = 'Username',
  PASSWORD = 'Password',
  DATABASE = 'Database',
}

export const DATABASE_CONNECTION_FIELDS: FieldOptions[] = [
  {
    key: DatabaseConnectionKeys.HOST,
    label: DatabaseConnectionKeys.HOST,
    isRequired: true,
    placeholder: 'Example, mysql',
  },
  {
    key: DatabaseConnectionKeys.PORT,
    label: DatabaseConnectionKeys.PORT,
    isRequired: true,
    placeholder: 'Example, 3306',
  },
  {
    key: DatabaseConnectionKeys.USERNAME,
    label: DatabaseConnectionKeys.USERNAME,
    isRequired: true,
  },
  {
    key: DatabaseConnectionKeys.PASSWORD,
    label: DatabaseConnectionKeys.PASSWORD,
    isPassword: true,
    isRequired: true,
  },
  {
    key: DatabaseConnectionKeys.DATABASE,
    label: DatabaseConnectionKeys.DATABASE,
    isRequired: true,
    placeholder: 'Example, mlpipelines',
  },
];

export const EMPTY_DATABASE_CONNECTION: EnvVariableDataEntry[] = [
  {
    key: DatabaseConnectionKeys.HOST,
    value: '',
  },
  {
    key: DatabaseConnectionKeys.PORT,
    value: '',
  },
  {
    key: DatabaseConnectionKeys.USERNAME,
    value: '',
  },
  {
    key: DatabaseConnectionKeys.PASSWORD,
    value: '',
  },
  {
    key: DatabaseConnectionKeys.DATABASE,
    value: '',
  },
];

export const storingDataHelpLink =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_ai_cloud_service/1/html/working_on_data_science_projects/working-with-data-science-pipelines_ds-pipelines#storing-data-with-data-science-pipelines_ds-pipelines';
