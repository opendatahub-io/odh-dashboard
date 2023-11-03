import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import { isAWSValid } from '~/pages/projects/screens/spawner/spawnerUtils';
import { EnvVariableDataEntry } from '~/pages/projects/types';

describe('isAWSValid', () => {
  const getMockAWSData = ({
    name = 'test-name',
    accessKey = 'test-access-key',
    accessSecret = 'test-access-secret',
    endpoint = 'test-endpoint',
    region = '',
    bucket = '',
  }): EnvVariableDataEntry[] => [
    {
      key: AWS_KEYS.NAME,
      value: name,
    },
    {
      key: AWS_KEYS.ACCESS_KEY_ID,
      value: accessKey,
    },
    {
      key: AWS_KEYS.SECRET_ACCESS_KEY,
      value: accessSecret,
    },
    {
      key: AWS_KEYS.S3_ENDPOINT,
      value: endpoint,
    },
    {
      key: AWS_KEYS.DEFAULT_REGION,
      value: region,
    },
    {
      key: AWS_KEYS.AWS_S3_BUCKET,
      value: bucket,
    },
  ];

  it('should be valid when all the required fields are met', () => {
    expect(isAWSValid(getMockAWSData({}))).toBe(true);
  });

  it('should be invalid when the name field is missing', () => {
    expect(isAWSValid(getMockAWSData({ name: '' }))).toBe(false);
  });

  it('should be invalid when the access key field is missing', () => {
    expect(isAWSValid(getMockAWSData({ accessKey: '' }))).toBe(false);
  });

  it('should be invalid when the secret key field is missing', () => {
    expect(isAWSValid(getMockAWSData({ accessSecret: '' }))).toBe(false);
  });

  it('should be invalid when the endpoint field is missing', () => {
    expect(isAWSValid(getMockAWSData({ endpoint: '' }))).toBe(false);
  });

  it('should be invalid when the bucket field is set to required while the value is missing', () => {
    expect(isAWSValid(getMockAWSData({}), [AWS_KEYS.AWS_S3_BUCKET])).toBe(false);
  });

  it('should be valid when the bucket field is set to required and the value is set', () => {
    expect(isAWSValid(getMockAWSData({ bucket: 'test-bucket' }), [AWS_KEYS.AWS_S3_BUCKET])).toBe(
      true,
    );
  });
});
