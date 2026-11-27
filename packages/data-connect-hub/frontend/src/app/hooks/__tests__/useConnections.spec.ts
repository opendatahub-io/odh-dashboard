import { useFetchState } from 'mod-arch-core';
import { getConnections } from '~/app/api/dch';
import { ConnectionTypeInstance } from '~/app/components/ConnectionType';
import { useConnections } from '~/app/hooks/useConnections';
import { Connection } from '~/app/types';
import { POLL_INTERVAL } from '~/app/utilities/const';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual<typeof import('mod-arch-core')>('mod-arch-core'),
  useFetchState: jest.fn(),
}));
jest.mock('~/app/api/dch', () => ({ getConnections: jest.fn() }));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetConnections = jest.mocked(getConnections);
const fetchConnections = jest.fn();

describe('useConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchConnections.mockResolvedValue([]);
    mockGetConnections.mockReturnValue(fetchConnections);
    mockUseFetchState.mockReturnValue([[], true, undefined, jest.fn()]);
  });

  it.each([undefined, { resolveConnectionTypes: false }, { resolveConnectionTypes: true }])(
    'should fetch connections with resolution options %j',
    async (options) => {
      const connectionType = mockConnectionType().original;
      const connections: Connection[] = [
        {
          metadata: { id: 'connection-id' },
          resource: {
            name: 'warehouse',
            data_connection_type_id: connectionType.metadata.id,
            data_connection_type: connectionType,
            format: 'tabular',
            credentials_ref: { secret: 'warehouse' },
          },
          status: { state: 'ready' },
        },
      ];
      fetchConnections.mockResolvedValue(connections);
      const opts = { signal: new AbortController().signal };
      testHook(useConnections)('test-project', true, options);

      const result = await mockUseFetchState.mock.calls[0][0](opts);

      if (options?.resolveConnectionTypes) {
        expect(result).toEqual([
          {
            ...connections[0],
            resource: {
              ...connections[0].resource,
              data_connection_type: expect.any(ConnectionTypeInstance),
            },
          },
        ]);
      } else {
        expect(result).toBe(connections);
      }

      expect(fetchConnections).toHaveBeenCalledWith(opts, 'test-project', {
        resolveConnectionTypes: options?.resolveConnectionTypes ?? false,
      });
      expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), [], {
        refreshRate: options?.resolveConnectionTypes
          ? Math.max(POLL_INTERVAL, 60000)
          : POLL_INTERVAL,
        initialPromisePurity: true,
      });
    },
  );

  it.each([
    ['the namespace is empty', '', true],
    ['polling is disabled', 'test-project', false],
  ])('should not fetch when %s', async (_description, namespace, pollingEnabled) => {
    testHook(useConnections)(namespace, pollingEnabled, { resolveConnectionTypes: true });

    await expect(mockUseFetchState.mock.calls[0][0]({})).resolves.toEqual([]);
    expect(mockGetConnections).not.toHaveBeenCalled();
    if (!pollingEnabled) {
      expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), [], {
        refreshRate: 0,
        initialPromisePurity: true,
      });
    }
  });

  it('should keep the fetch callback stable for equivalent inline options', () => {
    const result = testHook(useConnections)('test-project', true, { resolveConnectionTypes: true });
    const callback = mockUseFetchState.mock.calls[0][0];

    result.rerender('test-project', true, { resolveConnectionTypes: true });

    expect(mockUseFetchState.mock.lastCall?.[0]).toBe(callback);
  });

  it('should fetch with updated resolution options after rerendering', async () => {
    const result = testHook(useConnections)('test-project', true);
    result.rerender('test-project', true, { resolveConnectionTypes: true });

    await mockUseFetchState.mock.lastCall?.[0]({});

    expect(fetchConnections).toHaveBeenCalledWith({}, 'test-project', {
      resolveConnectionTypes: true,
    });
  });
});
