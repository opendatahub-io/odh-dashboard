import { FieldOptions } from '~/components/FieldList';

export type EdgeS3DataEntry = { key: EDGE_S3_KEYS; value: string }[];

export enum EDGE_S3_KEYS {
  TYPE = 'type',
  ACCESS_KEY_ID = 'access_key_id',
  SECRET_ACCESS_KEY = 'secret_access_key',
  S3_ENDPOINT = 'endpoint_url',
  REGION = 'region',
}

export const EDGE_S3_FIELDS: FieldOptions[] = [
  {
    key: EDGE_S3_KEYS.ACCESS_KEY_ID,
    label: 'Access key',
    isRequired: true,
  },
  {
    key: EDGE_S3_KEYS.SECRET_ACCESS_KEY,
    label: 'Secret key',
    isPassword: true,
    isRequired: true,
  },
  {
    key: EDGE_S3_KEYS.S3_ENDPOINT,
    label: 'Endpoint',
    isRequired: true,
  },
  {
    key: EDGE_S3_KEYS.REGION,
    label: 'Region',
  },
];

export const EMPTY_EDGE_S3_SECRET_DATA: EdgeS3DataEntry = [
  {
    key: EDGE_S3_KEYS.TYPE,
    value: 's3',
  },
  {
    key: EDGE_S3_KEYS.ACCESS_KEY_ID,
    value: '',
  },
  {
    key: EDGE_S3_KEYS.SECRET_ACCESS_KEY,
    value: '',
  },
  {
    key: EDGE_S3_KEYS.S3_ENDPOINT,
    value: '',
  },
  {
    key: EDGE_S3_KEYS.REGION,
    value: '',
  },
];
