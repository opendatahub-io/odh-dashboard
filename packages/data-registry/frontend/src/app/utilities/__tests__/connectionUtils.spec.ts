/* eslint-disable camelcase */

import { getConnectionDisplayName, getConnectionName } from '~/app/utilities/connectionUtils';

describe('getConnectionName', () => {
  it('should return the Secret name for an RHAI connection reference', () => {
    expect(getConnectionName({ type: 'rhai', secret_name: 'my-secret' })).toBe('my-secret');
  });

  it('should return the connection ID for a DCH connection reference', () => {
    expect(getConnectionName({ type: 'dch', id: 'connection-id' })).toBe('connection-id');
  });

  it('should return a string reference unchanged', () => {
    expect(getConnectionName('my-secret')).toBe('my-secret');
  });

  it('should return undefined for a missing reference', () => {
    expect(getConnectionName(null)).toBeUndefined();
  });
});

describe('getConnectionDisplayName', () => {
  it('should return the display name for a matching connection', () => {
    expect(
      getConnectionDisplayName({ type: 'rhai', secret_name: 'my-secret' }, [
        { name: 'my-secret', displayName: 'My connection' },
      ]),
    ).toBe('My connection');
  });

  it('should fall back to the connection name when display name is unavailable', () => {
    expect(
      getConnectionDisplayName({ type: 'rhai', secret_name: 'my-secret' }, [{ name: 'my-secret' }]),
    ).toBe('my-secret');
  });

  it('should fall back to the reference when the connection is not loaded', () => {
    expect(getConnectionDisplayName({ type: 'rhai', secret_name: 'my-secret' })).toBe('my-secret');
  });

  it('should return an empty string for a missing reference', () => {
    expect(getConnectionDisplayName(undefined)).toBe('');
  });
});
