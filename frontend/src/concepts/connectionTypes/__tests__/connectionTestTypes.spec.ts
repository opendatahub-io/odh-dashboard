import {
  ConnectionTestStatus,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';

describe('ConnectionTestStatus enum', () => {
  it('should have NOT_TESTED value as "not-tested"', () => {
    expect(ConnectionTestStatus.NOT_TESTED).toBe('not-tested');
  });

  it('should have TESTING value as "testing"', () => {
    expect(ConnectionTestStatus.TESTING).toBe('testing');
  });

  it('should have VERIFIED value as "verified"', () => {
    expect(ConnectionTestStatus.VERIFIED).toBe('verified');
  });

  it('should have FAILED value as "failed"', () => {
    expect(ConnectionTestStatus.FAILED).toBe('failed');
  });

  it('should have exactly 4 values', () => {
    const values = Object.values(ConnectionTestStatus);
    expect(values).toHaveLength(4);
  });
});

describe('CONNECTION_TEST_ANNOTATIONS', () => {
  it('should have STATUS key pointing to the correct annotation path', () => {
    expect(CONNECTION_TEST_ANNOTATIONS.STATUS).toBe('opendatahub.io/connection-test-status');
  });

  it('should have TIMESTAMP key pointing to the correct annotation path', () => {
    expect(CONNECTION_TEST_ANNOTATIONS.TIMESTAMP).toBe('opendatahub.io/connection-test-timestamp');
  });

  it('should have MESSAGE key pointing to the correct annotation path', () => {
    expect(CONNECTION_TEST_ANNOTATIONS.MESSAGE).toBe('opendatahub.io/connection-test-message');
  });

  it('should have exactly 3 annotation keys', () => {
    expect(Object.keys(CONNECTION_TEST_ANNOTATIONS)).toHaveLength(3);
  });
});
