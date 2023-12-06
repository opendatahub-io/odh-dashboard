import { FieldOptions } from '~/components/FieldList';
import { AWSDataEntry } from '~/pages/projects/types';

export enum AWS_KEYS {
  NAME = 'Name',
  ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID',
  SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY',
  S3_ENDPOINT = 'AWS_S3_ENDPOINT',
  DEFAULT_REGION = 'AWS_DEFAULT_REGION',
  AWS_S3_BUCKET = 'AWS_S3_BUCKET',
}
export const PIPELINE_AWS_KEY = [
  AWS_KEYS.ACCESS_KEY_ID,
  AWS_KEYS.SECRET_ACCESS_KEY,
  AWS_KEYS.S3_ENDPOINT,
  AWS_KEYS.AWS_S3_BUCKET,
];
export const AWS_FIELDS: FieldOptions[] = [
  {
    key: AWS_KEYS.NAME,
    label: AWS_KEYS.NAME,
    isRequired: true,
  },
  {
    key: AWS_KEYS.ACCESS_KEY_ID,
    label: 'Access key',
    isRequired: true,
  },
  {
    key: AWS_KEYS.SECRET_ACCESS_KEY,
    label: 'Secret key',
    isPassword: true,
    isRequired: true,
  },
  {
    key: AWS_KEYS.S3_ENDPOINT,
    label: 'Endpoint',
    isRequired: true,
  },
  {
    key: AWS_KEYS.DEFAULT_REGION,
    label: 'Region',
  },
  {
    key: AWS_KEYS.AWS_S3_BUCKET,
    label: 'Bucket',
  },
];
export const PIPELINE_AWS_FIELDS: FieldOptions[] = [
  {
    key: AWS_KEYS.ACCESS_KEY_ID,
    label: 'Access key',
    isRequired: true,
  },
  {
    key: AWS_KEYS.SECRET_ACCESS_KEY,
    label: 'Secret key',
    isPassword: true,
    isRequired: true,
  },
  {
    key: AWS_KEYS.S3_ENDPOINT,
    label: 'Endpoint',
    isRequired: true,
  },
  {
    key: AWS_KEYS.AWS_S3_BUCKET,
    label: 'Bucket',
    isRequired: true,
  },
];

export const EMPTY_AWS_SECRET_DATA: AWSDataEntry = [
  {
    key: AWS_KEYS.NAME,
    value: '',
  },
  {
    key: AWS_KEYS.ACCESS_KEY_ID,
    value: '',
  },
  {
    key: AWS_KEYS.SECRET_ACCESS_KEY,
    value: '',
  },
  {
    key: AWS_KEYS.AWS_S3_BUCKET,
    value: '',
  },
  {
    key: AWS_KEYS.S3_ENDPOINT,
    value: '',
  },
  {
    key: AWS_KEYS.DEFAULT_REGION,
    value: '',
  },
];
export const EMPTY_AWS_PIPELINE_DATA: AWSDataEntry = [
  {
    key: AWS_KEYS.ACCESS_KEY_ID,
    value: '',
  },
  {
    key: AWS_KEYS.SECRET_ACCESS_KEY,
    value: '',
  },
  {
    key: AWS_KEYS.AWS_S3_BUCKET,
    value: '',
  },
  {
    key: AWS_KEYS.S3_ENDPOINT,
    value: '',
  },
];
