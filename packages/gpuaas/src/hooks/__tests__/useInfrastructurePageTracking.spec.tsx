import { renderHook } from '@testing-library/react';
import useInfrastructurePageTracking from '../useInfrastructurePageTracking';
import type { ClusterMetrics } from '../useInfrastructureMetrics';
import { createTrackingWrapper } from '../../__tests__/unit/testUtils/TrackingProvider';

const mockTrackEvent = jest.fn();
const mockTrackPageEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent, mockTrackPageEvent);

const makeMetrics = (loaded: boolean): ClusterMetrics => ({
  accelerators: { total: 8, inUse: 3 },
  computeUtilization: { percentage: 65 },
  memoryUtilization: { percentage: 42 },
  hardwareUsage: null,
  lastRefreshed: null,
  clusterLoaded: loaded,
  hardwareLoaded: loaded,
  loaded,
  refresh: jest.fn(),
});

describe('useInfrastructurePageTracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should send exactly one custom event after metrics load and preserve its payload', () => {
    const { rerender } = renderHook(({ metrics }) => useInfrastructurePageTracking(metrics, true), {
      initialProps: { metrics: makeMetrics(false) },
      wrapper: TrackingWrapper,
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
    rerender({ metrics: makeMetrics(true) });
    rerender({ metrics: makeMetrics(true) });
    expect(mockTrackEvent.mock.calls).toEqual([
      [
        'Infrastructure Page Viewed',
        {
          path: '/observe-and-monitor/infrastructure',
          sectionCount: 4,
          hasKueueEnabled: true,
          totalAccelerators: 8,
          acceleratorsInUse: 3,
          totalUtilizationPct: 38,
          avgComputeUtilPct: 65,
          avgMemoryUtilPct: 42,
        },
      ],
    ]);
    expect(mockTrackPageEvent).not.toHaveBeenCalled();
  });
});
