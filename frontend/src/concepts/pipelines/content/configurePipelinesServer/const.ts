import { FieldOptions } from '~/components/FieldList';
import { EnvVariableDataEntry } from '~/pages/projects/types';

export enum EXTERNAL_DATABASE_SECRET {
  KEY = 'db-password',
  NAME = 'pipelines-db-password',
}

export enum DATABASE_CONNECTION_KEYS {
  HOST = 'Host',
  PORT = 'Port',
  USERNAME = 'Username',
  PASSWORD = 'Password',
  DATABASE = 'Database',
}

export const DATABASE_CONNECTION_FIELDS: FieldOptions[] = [
  {
    key: DATABASE_CONNECTION_KEYS.HOST,
    label: DATABASE_CONNECTION_KEYS.HOST,
    isRequired: true,
    placeholder: 'Example, mysql',
  },
  {
    key: DATABASE_CONNECTION_KEYS.PORT,
    label: DATABASE_CONNECTION_KEYS.PORT,
    isRequired: true,
    placeholder: 'Example, 3306',
  },
  {
    key: DATABASE_CONNECTION_KEYS.USERNAME,
    label: DATABASE_CONNECTION_KEYS.USERNAME,
    isRequired: true,
  },
  {
    key: DATABASE_CONNECTION_KEYS.PASSWORD,
    label: DATABASE_CONNECTION_KEYS.PASSWORD,
    isPassword: true,
    isRequired: true,
  },
  {
    key: DATABASE_CONNECTION_KEYS.DATABASE,
    label: DATABASE_CONNECTION_KEYS.DATABASE,
    isRequired: true,
    placeholder: 'Example, mlpipelines',
  },
];

export const EMPTY_DATABASE_CONNECTION: EnvVariableDataEntry[] = [
  {
    key: DATABASE_CONNECTION_KEYS.HOST,
    value: '',
  },
  {
    key: DATABASE_CONNECTION_KEYS.PORT,
    value: '',
  },
  {
    key: DATABASE_CONNECTION_KEYS.USERNAME,
    value: '',
  },
  {
    key: DATABASE_CONNECTION_KEYS.PASSWORD,
    value: '',
  },
  {
    key: DATABASE_CONNECTION_KEYS.DATABASE,
    value: '',
  },
];
