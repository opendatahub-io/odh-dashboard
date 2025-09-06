import { getDataSourceConnectorType } from '../utils';

describe('getDataSourceConnectorType', () => {
  it('should return "File source" for BATCH_FILE type', () => {
    const result = getDataSourceConnectorType('BATCH_FILE');
    expect(result).toBe('File source');
  });

  it('should return "Request source" for REQUEST_SOURCE type', () => {
    const result = getDataSourceConnectorType('REQUEST_SOURCE');
    expect(result).toBe('Request source');
  });

  it('should return "Stream Kafka" for STREAM_KAFKA type', () => {
    const result = getDataSourceConnectorType('STREAM_KAFKA');
    expect(result).toBe('Stream Kafka');
  });

  it('should return "Push source" for PUSH_SOURCE type', () => {
    const result = getDataSourceConnectorType('PUSH_SOURCE');
    expect(result).toBe('Push source');
  });

  it('should return "Unknown" for unknown type', () => {
    const result = getDataSourceConnectorType('UNKNOWN_TYPE' as never);
    expect(result).toBe('Unknown');
  });

  it('should return "Unknown" for undefined type', () => {
    const result = getDataSourceConnectorType(undefined as never);
    expect(result).toBe('Unknown');
  });
});
