import { FieldOptions } from '#~/components/FieldList';
import { AWSDataEntry } from '#~/pages/projects/types';

export enum AwsKeys {
  NAME = 'Name',
  ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID',
  SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY',
  S3_ENDPOINT = 'AWS_S3_ENDPOINT',
  DEFAULT_REGION = 'AWS_DEFAULT_REGION',
  AWS_S3_BUCKET = 'AWS_S3_BUCKET',
}
export enum AccessTypes {
  PULL = 'Pull',
  PUSH = 'Push',
}
export const PIPELINE_AWS_KEY = [
  AwsKeys.ACCESS_KEY_ID,
  AwsKeys.SECRET_ACCESS_KEY,
  AwsKeys.S3_ENDPOINT,
  AwsKeys.AWS_S3_BUCKET,
  AwsKeys.DEFAULT_REGION,
];
export const AWS_FIELDS: FieldOptions[] = [
  {
    key: AwsKeys.NAME,
    label: AwsKeys.NAME,
    isRequired: true,
  },
  {
    key: AwsKeys.ACCESS_KEY_ID,
    label: 'Access key',
    isRequired: true,
  },
  {
    key: AwsKeys.SECRET_ACCESS_KEY,
    label: 'Secret key',
    isPassword: true,
    isRequired: true,
  },
  {
    key: AwsKeys.S3_ENDPOINT,
    label: 'Endpoint',
    isRequired: true,
  },
  {
    key: AwsKeys.DEFAULT_REGION,
    label: 'Region',
  },
  {
    key: AwsKeys.AWS_S3_BUCKET,
    label: 'Bucket',
  },
];
export const PIPELINE_AWS_FIELDS: FieldOptions[] = [
  {
    key: AwsKeys.ACCESS_KEY_ID,
    label: 'Access key',
    isRequired: true,
  },
  {
    key: AwsKeys.SECRET_ACCESS_KEY,
    label: 'Secret key',
    isPassword: true,
    isRequired: true,
  },
  {
    key: AwsKeys.S3_ENDPOINT,
    label: 'Endpoint',
    isRequired: true,
  },
  {
    key: AwsKeys.DEFAULT_REGION,
    label: 'Region',
    isRequired: true,
  },
  {
    key: AwsKeys.AWS_S3_BUCKET,
    label: 'Bucket',
    isRequired: true,
  },
];

export const EMPTY_AWS_SECRET_DATA: AWSDataEntry = [
  {
    key: AwsKeys.NAME,
    value: '',
  },
  {
    key: AwsKeys.ACCESS_KEY_ID,
    value: '',
  },
  {
    key: AwsKeys.SECRET_ACCESS_KEY,
    value: '',
  },
  {
    key: AwsKeys.AWS_S3_BUCKET,
    value: '',
  },
  {
    key: AwsKeys.S3_ENDPOINT,
    value: '',
  },
  {
    key: AwsKeys.DEFAULT_REGION,
    value: '',
  },
];
export const EMPTY_AWS_PIPELINE_DATA: AWSDataEntry = [
  {
    key: AwsKeys.ACCESS_KEY_ID,
    value: '',
  },
  {
    key: AwsKeys.SECRET_ACCESS_KEY,
    value: '',
  },
  {
    key: AwsKeys.AWS_S3_BUCKET,
    value: '',
  },
  {
    key: AwsKeys.S3_ENDPOINT,
    value: '',
  },
  {
    key: AwsKeys.DEFAULT_REGION,
    value: 'us-east-1',
  },
];
