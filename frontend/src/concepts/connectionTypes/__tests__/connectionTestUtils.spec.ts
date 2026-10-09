import { mockConnection } from '#~/__mocks__/mockConnection';
import {
  getConnectionTestType,
  isConnectionTestSupported,
} from '#~/concepts/connectionTypes/connectionTestUtils';

describe('isConnectionTestSupported', () => {
  it.each(['s3', 'uri', 'oci', 'uri-v1', 'oci-v1', 's3_v2'])(
    'should return true for supported type "%s"',
    (connectionType) => {
      expect(isConnectionTestSupported(connectionType)).toBe(true);
    },
  );

  it.each(['postgres', 'ct-new-connection', 's3compatible', 'my-s3', ''])(
    'should return false for unsupported type "%s"',
    (connectionType) => {
      expect(isConnectionTestSupported(connectionType)).toBe(false);
    },
  );

  it('should return false when the connection type is undefined', () => {
    expect(isConnectionTestSupported(undefined)).toBe(false);
  });
});

describe('getConnectionTestType', () => {
  it('should prefer the connection-type-ref annotation', () => {
    const connection = mockConnection({ connectionType: 's3' });
    connection.metadata.annotations['opendatahub.io/connection-type-ref'] = 'uri-v1';
    expect(getConnectionTestType(connection)).toBe('uri-v1');
  });

  it('should fall back to the connection-type annotation', () => {
    expect(getConnectionTestType(mockConnection({ connectionType: 'oci-v1' }))).toBe('oci-v1');
  });
});
