/* eslint-disable camelcase */

import {
  getAssetDetailConnectionWarnings,
  getConnectionDisplayName,
  getConnectionName,
} from '~/app/utilities/connectionUtils';
import { mockRhaiConnection } from '~/__mocks__/mockConnection';

describe('getConnectionName', () => {
  it('should return the Secret name for an RHAI connection reference', () => {
    expect(getConnectionName({ type: 'secret', secret_name: 'my-secret' })).toBe('my-secret');
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
      getConnectionDisplayName({ type: 'secret', secret_name: 'my-secret' }, [
        mockRhaiConnection({ secret_name: 'my-secret', name: 'My connection' }),
      ]),
    ).toBe('My connection');
  });

  it('should show unavailable when the connection has no current display name', () => {
    expect(
      getConnectionDisplayName({ type: 'secret', secret_name: 'my-secret' }, [
        mockRhaiConnection({ secret_name: 'my-secret', name: undefined }),
      ]),
    ).toBe('Connection unavailable');
  });

  it('should show unavailable when the connection is absent from a loaded list', () => {
    expect(getConnectionDisplayName({ type: 'secret', secret_name: 'my-secret' })).toBe(
      'Connection unavailable',
    );
  });

  it('should show loading while the connection list is being loaded', () => {
    expect(getConnectionDisplayName({ type: 'secret', secret_name: 'my-secret' }, [], false)).toBe(
      'Loading connection...',
    );
  });

  it('should return an empty string for a missing reference', () => {
    expect(getConnectionDisplayName(undefined)).toBe('');
  });
});

describe('getAssetDetailConnectionWarnings', () => {
  const dchFallbackWarning = {
    code: 'DCH_FALLBACK' as const,
    message: 'Some connections could not be loaded. Showing available connections.',
  };
  const rhaiLookupWarning = {
    code: 'RHAI_LOOKUP_FAILED' as const,
    message: 'Some saved RHOAI connection details could not be loaded.',
  };

  it('should show the detail-specific DCH warning only for an asset with a DCH reference', () => {
    expect(
      getAssetDetailConnectionWarnings([dchFallbackWarning], { type: 'dch', id: 'dch-id' }),
    ).toEqual([
      {
        code: 'DCH_FALLBACK',
        message: "Couldn't load connections from Data Connect Hub.",
      },
    ]);
    expect(
      getAssetDetailConnectionWarnings([dchFallbackWarning], {
        type: 'secret',
        secret_name: 'rhai-secret',
      }),
    ).toEqual([]);
    expect(getAssetDetailConnectionWarnings([dchFallbackWarning])).toEqual([]);
  });

  it('should show a RHOAI lookup warning only for an asset with a RHOAI reference', () => {
    expect(
      getAssetDetailConnectionWarnings([rhaiLookupWarning], {
        type: 'secret',
        secret_name: 'rhai-secret',
      }),
    ).toEqual([rhaiLookupWarning]);
    expect(
      getAssetDetailConnectionWarnings([rhaiLookupWarning], { type: 'dch', id: 'dch-id' }),
    ).toEqual([]);
  });

  it('should preserve connector-type warnings for any asset reference', () => {
    const unresolvedTypeWarning = {
      code: 'UNRESOLVED_CONNECTION_TYPE' as const,
      message: 'Some connection types could not be loaded.',
    };

    expect(
      getAssetDetailConnectionWarnings([unresolvedTypeWarning], {
        type: 'secret',
        secret_name: 'rhai-secret',
      }),
    ).toEqual([unresolvedTypeWarning]);
  });
});
