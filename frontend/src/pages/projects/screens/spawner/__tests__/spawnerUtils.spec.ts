import { AwsKeys } from '~/pages/projects/dataConnections/const';
import {
  getExistingVersionsForImageStream,
  isAWSValid,
  checkVersionRecommended,
  getVersion,
} from '~/pages/projects/screens/spawner/spawnerUtils';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { IMAGE_ANNOTATIONS } from '~/pages/projects/screens/spawner/const';

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
      key: AwsKeys.NAME,
      value: name,
    },
    {
      key: AwsKeys.ACCESS_KEY_ID,
      value: accessKey,
    },
    {
      key: AwsKeys.SECRET_ACCESS_KEY,
      value: accessSecret,
    },
    {
      key: AwsKeys.S3_ENDPOINT,
      value: endpoint,
    },
    {
      key: AwsKeys.DEFAULT_REGION,
      value: region,
    },
    {
      key: AwsKeys.AWS_S3_BUCKET,
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
    expect(isAWSValid(getMockAWSData({}), [AwsKeys.AWS_S3_BUCKET])).toBe(false);
  });

  it('should be valid when the bucket field is set to required and the value is set', () => {
    expect(isAWSValid(getMockAWSData({ bucket: 'test-bucket' }), [AwsKeys.AWS_S3_BUCKET])).toBe(
      true,
    );
  });
});

describe('getExistingVersionsForImageStream', () => {
  it('should handle no image tags', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: { spec: { tags: [] }, status: { tags: [] } },
    });
    expect(getExistingVersionsForImageStream(imageStream)).toHaveLength(0);
  });

  it('should return the only default value', () => {
    expect(getExistingVersionsForImageStream(mockImageStreamK8sResource({}))).toHaveLength(1);
  });

  it('should exclude the outdated items', () => {
    // Override the first value
    const imageStream = mockImageStreamK8sResource({
      opts: { spec: { tags: [{ annotations: { [IMAGE_ANNOTATIONS.OUTDATED]: 'true' } }] } },
    });
    expect(getExistingVersionsForImageStream(imageStream)).toHaveLength(0);

    // Add an outdated 2nd value
    const imageStream2 = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [{}, { name: 'test', annotations: { [IMAGE_ANNOTATIONS.OUTDATED]: 'true' } }],
        },
      },
    });
    expect(getExistingVersionsForImageStream(imageStream2)).toHaveLength(1);
  });

  it('should exclude removed tags', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [{ name: 'not-the-available-tag' }],
        },
      },
    });
    expect(getExistingVersionsForImageStream(imageStream)).toHaveLength(0);
  });

  it('should exclude removed tags & outdated ones', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [
            {},
            { name: 'not-the-available-tag' },
            { name: 'should-be-included' },
            { name: 'outdated', annotations: { [IMAGE_ANNOTATIONS.OUTDATED]: 'true' } },
          ],
        },
        status: {
          tags: [{ tag: 'should-be-included' }, { tag: 'outdated' }],
        },
      },
    });
    const result = getExistingVersionsForImageStream(imageStream);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'should-be-included' });
  });
});

describe('checkVersionRecommended', () => {
  it('should return true if the image version is recommended', () => {
    const imageVersion = {
      name: 'test-image',
      annotations: {
        [IMAGE_ANNOTATIONS.RECOMMENDED]: 'true',
      },
    };
    expect(checkVersionRecommended(imageVersion)).toBe(true);
  });

  it('should return false if the image version is not recommended', () => {
    const imageVersion = {
      name: 'test-image',
      annotations: {
        [IMAGE_ANNOTATIONS.RECOMMENDED]: 'false',
      },
    };
    expect(checkVersionRecommended(imageVersion)).toBe(false);
  });

  it('should return false if the image version does not have the recommended annotation', () => {
    const imageVersion = {
      name: 'test-image',
    };
    expect(checkVersionRecommended(imageVersion)).toBe(false);
  });

  it('should return false if the image version is invalid JSON', () => {
    const imageVersion = {
      name: 'test-image',
      annotations: {
        [IMAGE_ANNOTATIONS.RECOMMENDED]: 'invalid-json',
      },
    };
    expect(checkVersionRecommended(imageVersion)).toBe(false);
  });

  it('should get version with a prefix and string parameter', () => {
    expect(getVersion('v3.9', 'v')).toEqual('v3.9');
    expect(getVersion('4.9', 'V')).toEqual('V4.9');
    expect(getVersion('3.1', 'Randomprefix')).toEqual('Randomprefix3.1');
    expect(getVersion('0.1')).toEqual('0.1');
  });

  it('should get version with a number as the parameter', () => {
    expect(getVersion(0.1)).toEqual('0.1');
    expect(getVersion(3.1, 'v')).toEqual('v3.1');
    expect(getVersion(1000.5, 'V')).toEqual('V1000.5');
  });
});
