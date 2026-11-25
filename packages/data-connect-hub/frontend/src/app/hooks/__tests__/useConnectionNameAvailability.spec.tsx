import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import { getConnectionNameAvailability } from '~/app/api/dch';
import { useConnectionNameAvailability } from '~/app/hooks/useConnectionNameAvailability';
import type { ConnectionNameAvailability } from '~/app/types';

jest.mock('mod-arch-core', () => {
  const { jest: jestMock } = require('@jest/globals') as typeof import('@jest/globals');
  return {
    ...jestMock.requireActual<typeof import('mod-arch-core')>('mod-arch-core'),
    useFetchState: jestMock.fn(),
  };
});
jest.mock('~/app/api/dch');

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetConnectionNameAvailability = jest.mocked(getConnectionNameAvailability);
const mockAvailabilityRequest =
  jest.fn<
    (opts: APIOptions, namespace: string, name: string) => Promise<ConnectionNameAvailability>
  >();
const requestOptions: APIOptions = { signal: new AbortController().signal };
let fetchCallback: FetchStateCallbackPromise<ConnectionNameAvailability> | undefined;

const captureFetchCallback = (callback: FetchStateCallbackPromise<ConnectionNameAvailability>) => {
  fetchCallback = callback;
  return [undefined, false, undefined, jest.fn()] as never;
};

describe('useConnectionNameAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    fetchCallback = undefined;
    mockUseFetchState.mockImplementation(captureFetchCallback as unknown as typeof useFetchState);
    mockGetConnectionNameAvailability.mockImplementation(() => mockAvailabilityRequest);
    mockAvailabilityRequest.mockImplementation(async (_opts, _namespace, name) => ({
      available: name !== 'warehouse',
      conflicts_with: name === 'warehouse' ? ['connection'] : [],
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces the current name before checking availability', async () => {
    const { rerender, result } = renderHook(
      ({ name }: { name: string }) => useConnectionNameAvailability('test-project', name, true),
      { initialProps: { name: '' } },
    );

    rerender({ name: 'ware' });
    expect(result.current[0]).toBeUndefined();
    expect(result.current[1]).toBe(false);

    rerender({ name: 'warehouse' });
    expect(mockGetConnectionNameAvailability).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(fetchCallback).toBeDefined();
    await expect(fetchCallback?.(requestOptions)).resolves.toEqual({
      available: false,
      conflicts_with: ['connection'],
    });
    expect(mockAvailabilityRequest).toHaveBeenCalledWith(
      requestOptions,
      'test-project',
      'warehouse',
    );
  });

  it('does not check availability while disabled', async () => {
    renderHook(() => useConnectionNameAvailability('test-project', 'warehouse', false));

    expect(fetchCallback).toBeDefined();
    await expect(fetchCallback?.(requestOptions)).resolves.toEqual({
      available: true,
      conflicts_with: [],
    });
    expect(mockAvailabilityRequest).not.toHaveBeenCalled();
  });
});
