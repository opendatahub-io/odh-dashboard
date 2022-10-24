export enum AWS_KEYS {
  NAME = 'Name',
  ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID',
  SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY',
  S3_ENDPOINT = 'AWS_S3_ENDPOINT',
  DEFAULT_REGION = 'AWS_DEFAULT_REGION',
}

export const AWS_REQUIRED_KEYS: AWS_KEYS[] = [
  AWS_KEYS.NAME,
  AWS_KEYS.ACCESS_KEY_ID,
  AWS_KEYS.SECRET_ACCESS_KEY,
];

export const EMPTY_AWS_SECRET_DATA: { key: AWS_KEYS; value: string }[] = [
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
    key: AWS_KEYS.S3_ENDPOINT,
    value: 'https://s3.amazonaws.com/',
  },
  {
    key: AWS_KEYS.DEFAULT_REGION,
    value: 'us-east-1',
  },
];
