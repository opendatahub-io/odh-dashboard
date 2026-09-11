import { renderHook, waitFor } from '@testing-library/react';
import * as k8sApi from '~/app/api/k8s';
import { useConnections } from '~/app/hooks/useConnections';

jest.mock('~/app/api/k8s');
jest.mock('mod-arch-core', () => {
  const actual = jest.requireActual('mod-arch-core');
  return {
    ...actual,
    useFetchState: (callback: (opts: unknown) => Promise<unknown>, defaultValue: unknown) => {
      const [data, setData] = require('react').useState(defaultValue);
      const [loaded, setLoaded] = require('react').useState(false);
      const [error, setError] = require('react').useState(undefined);

      require('react').useEffect(() => {
        let cancelled = false;
        callback({})
          .then((result: unknown) => {
            if (!cancelled) {
              setData(result);
              setLoaded(true);
            }
          })
          .catch((err: Error) => {
            if (!cancelled) {
              setError(err);
              setLoaded(true);
            }
          });
        return () => {
          cancelled = true;
        };
      }, [callback]);

      return [data, loaded, error];
    },
  };
});

const mockGetConnections = jest.fn();
jest.mocked(k8sApi.getConnections).mockReturnValue(mockGetConnections);

describe('useConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(k8sApi.getConnections).mockReturnValue(mockGetConnections);
  });

  it('should return empty array when no namespace', async () => {
    const { result } = renderHook(() => useConnections(''));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[0]).toEqual([]);
  });

  it('should fetch connections for a namespace', async () => {
    const mockData = [
      { name: 'my-s3-connection', displayName: 'My S3', connectionType: 's3' },
      { name: 'my-uri-connection', displayName: 'My URI', connectionType: 'uri' },
    ];
    mockGetConnections.mockResolvedValue(mockData);

    const { result } = renderHook(() => useConnections('test-project'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[0]).toEqual(mockData);
    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][0].name).toBe('my-s3-connection');
    expect(result.current[0][1].connectionType).toBe('uri');
  });

  it('should handle API errors', async () => {
    mockGetConnections.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useConnections('test-project'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[2]).toBeDefined();
    expect(result.current[2]?.message).toBe('Forbidden');
  });

  it('should return empty array when connections are empty', async () => {
    mockGetConnections.mockResolvedValue([]);

    const { result } = renderHook(() => useConnections('test-project'));

    await waitFor(() => {
      expect(result.current[1]).toBe(true);
    });

    expect(result.current[0]).toEqual([]);
  });
});
