import { act, renderHook } from '@testing-library/react';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { usePipelineServerStatus } from '../usePipelineServerStatus';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);

const unreadyDspa = {
  apiVersion: 'v1',
  kind: 'DataSciencePipelinesApplication',
  metadata: { name: 'pipeline-server', namespace: 'test-project' },
  status: { conditions: [{ type: 'Ready', status: 'False' }] },
};

const readyDspa = {
  ...unreadyDspa,
  status: { conditions: [{ type: 'Ready', status: 'True' }] },
};

describe('usePipelineServerStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report a successfully observed unready DSPA as starting', () => {
    mockUseK8sWatchResourceList.mockReturnValue([[unreadyDspa], true, undefined]);

    const { result } = renderHook(() => usePipelineServerStatus('test-project'));

    expect(result.current).toStrictEqual({ loaded: true, isStarting: true, error: undefined });
  });

  it('should stop reporting starting when the watch fails after observing an unready DSPA', () => {
    const error = new Error('watch interrupted');
    mockUseK8sWatchResourceList.mockReturnValue([[unreadyDspa], true, error]);

    const { result } = renderHook(() => usePipelineServerStatus('test-project'));

    expect(result.current).toStrictEqual({ loaded: true, isStarting: false, error });
  });

  it('should return a readiness error when DSPA conditions are not an array', () => {
    const invalidDspa = {
      ...unreadyDspa,
      status: { conditions: 'invalid' },
    } as unknown as typeof unreadyDspa;
    mockUseK8sWatchResourceList.mockReturnValue([[invalidDspa], true, undefined]);

    const { result } = renderHook(() => usePipelineServerStatus('test-project'));

    expect(result.current.loaded).toBe(true);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.error).toEqual(
      new Error('Pipeline server returned invalid readiness conditions.'),
    );
  });

  it('should expose a Ready transition after observing the DSPA', () => {
    mockUseK8sWatchResourceList.mockReturnValue([[unreadyDspa], true, undefined]);

    const { result, rerender } = renderHook(() => usePipelineServerStatus('test-project'));

    expect(result.current.isStarting).toBe(true);
    mockUseK8sWatchResourceList.mockReturnValue([[readyDspa], true, undefined]);
    rerender();

    expect(result.current.isStarting).toBe(false);
  });

  it('should wait for the Ready confirmation delay before marking the server loaded', () => {
    jest.useFakeTimers();
    mockUseK8sWatchResourceList.mockReturnValue([[readyDspa], true, undefined]);

    const { result, unmount } = renderHook(() => usePipelineServerStatus('test-project'));

    try {
      expect(result.current.loaded).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(result.current.loaded).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.loaded).toBe(true);
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('should accept Ready when observedGeneration is omitted', () => {
    jest.useFakeTimers();
    const readyWithoutObservedGeneration = {
      ...readyDspa,
      metadata: { ...readyDspa.metadata, generation: 2 },
    };
    mockUseK8sWatchResourceList.mockReturnValue([
      [readyWithoutObservedGeneration],
      true,
      undefined,
    ]);

    const { result, unmount } = renderHook(() => usePipelineServerStatus('test-project'));

    try {
      expect(result.current.isStarting).toBe(false);
      expect(result.current.loaded).toBe(false);

      act(() => jest.advanceTimersByTime(2000));

      expect(result.current.loaded).toBe(true);
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('should report a DSPA as starting when Ready is for an older generation', () => {
    const staleReadyDspa = {
      ...readyDspa,
      metadata: { ...readyDspa.metadata, generation: 2 },
      status: {
        conditions: [{ type: 'Ready', status: 'True', observedGeneration: 1 }],
      },
    };
    mockUseK8sWatchResourceList.mockReturnValue([[staleReadyDspa], true, undefined]);

    const { result } = renderHook(() => usePipelineServerStatus('test-project'));

    expect(result.current.loaded).toBe(true);
    expect(result.current.isStarting).toBe(true);
  });
});
