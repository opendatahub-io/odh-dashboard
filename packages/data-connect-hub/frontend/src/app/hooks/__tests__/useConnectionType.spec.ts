import { useFetchState } from 'mod-arch-core';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { getConnectionType } from '~/app/api/dch';
import { useConnectionType } from '~/app/hooks/useConnectionType';
import { testHook } from '~/__tests__/unit/testUtils/hooks';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
}));

jest.mock('~/app/api/dch', () => ({
  getConnectionType: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetConnectionType = jest.mocked(getConnectionType);
const fetchConnectionType = jest.fn();

describe('useConnectionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnectionType.mockReturnValue(fetchConnectionType);
    mockUseFetchState.mockReturnValue([mockConnectionType(), true, undefined, jest.fn()]);
  });

  it('should return the connection type fetch state', () => {
    const result = testHook(useConnectionType)('test-project', 'postgresql');

    expect(result.result.current).toEqual([mockConnectionType(), true, undefined]);
    expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), undefined, {
      initialPromisePurity: true,
    });
  });

  it('should fetch the requested connection type', async () => {
    const opts = { signal: new AbortController().signal };
    fetchConnectionType.mockResolvedValue(mockConnectionType());
    testHook(useConnectionType)('test-project', 'postgresql');
    const callback = mockUseFetchState.mock.calls[0][0];

    await callback(opts);

    expect(mockGetConnectionType).toHaveBeenCalledWith('');
    expect(fetchConnectionType).toHaveBeenCalledWith(opts, 'test-project', 'postgresql');
  });

  it.each([
    ['the namespace is empty', '', 'postgresql', true],
    ['fetching is disabled', 'test-project', 'postgresql', false],
  ])('should not fetch when %s', async (_description, namespace, id, enabled) => {
    testHook(useConnectionType)(namespace, id, enabled);
    const callback = mockUseFetchState.mock.calls[0][0];

    await expect(callback({})).resolves.toBeUndefined();
    expect(mockGetConnectionType).not.toHaveBeenCalled();
    expect(fetchConnectionType).not.toHaveBeenCalled();
  });

  it('should refresh with the new id after rerendering', async () => {
    const result = testHook(useConnectionType)('test-project', 'postgresql');
    result.rerender('test-project', 's3');
    const lastCall = mockUseFetchState.mock.calls[mockUseFetchState.mock.calls.length - 1];
    const callback = lastCall?.[0];

    await callback?.({});

    expect(fetchConnectionType).toHaveBeenCalledWith({}, 'test-project', 's3');
  });
});
