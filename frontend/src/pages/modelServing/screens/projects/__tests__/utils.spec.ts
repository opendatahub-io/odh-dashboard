import { mockDataConnection } from '~/__mocks__/mockDataConnection';
import { filterOutConnectionsWithoutBucket } from '~/pages/modelServing/screens/projects/utils';
import { DataConnection } from '~/pages/projects/types';

describe('filterOutConnectionsWithoutBucket', () => {
  it('should return an empty array if input connections array is empty', () => {
    const inputConnections: DataConnection[] = [];
    const result = filterOutConnectionsWithoutBucket(inputConnections);
    expect(result).toEqual([]);
  });

  it('should filter out connections without an AWS_S3_BUCKET property', () => {
    const dataConnections = [
      mockDataConnection({ name: 'name1', s3Bucket: 'bucket1' }),
      mockDataConnection({ name: 'name2', s3Bucket: '' }),
      mockDataConnection({ name: 'name3', s3Bucket: 'bucket2' }),
    ];

    const result = filterOutConnectionsWithoutBucket(dataConnections);

    expect(result).toMatchObject([
      { data: { data: { Name: 'name1' } } },
      { data: { data: { Name: 'name3' } } },
    ]);
  });
});
