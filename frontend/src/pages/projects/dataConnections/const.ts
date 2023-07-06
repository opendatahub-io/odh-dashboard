import { FieldOptions } from '~/components/FieldList';
import { AWSDataEntry } from '~/pages/projects/types';

export enum AWS_KEYS {
  NAME = 'Name',
  ACCESS_KEY_ID = 'Access-Key',
  SECRET_ACCESS_KEY = 'Secret-Key',
  S3_ENDPOINT = 'Endpoint',
  DEFAULT_REGION = 'Region',
  AWS_S3_BUCKET = 'Bucket',
}

export const AWS_FIELDS: FieldOptions[] = [
  {
    key: AWS_KEYS.NAME,
    label: AWS_KEYS.NAME,
    isRequired: true,
  },
  {
    key: AWS_KEYS.ACCESS_KEY_ID,
    label: AWS_KEYS.ACCESS_KEY_ID,
    isRequired: true,
  },
  {
    key: AWS_KEYS.SECRET_ACCESS_KEY,
    label: AWS_KEYS.SECRET_ACCESS_KEY,
    isPassword: true,
    isRequired: true,
  },
  {
    key: AWS_KEYS.S3_ENDPOINT,
    label: AWS_KEYS.S3_ENDPOINT,
    isRequired: true,
  },
  {
    key: AWS_KEYS.DEFAULT_REGION,
    label: AWS_KEYS.DEFAULT_REGION,
  },
  {
    key: AWS_KEYS.AWS_S3_BUCKET,
    label: AWS_KEYS.AWS_S3_BUCKET,
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
