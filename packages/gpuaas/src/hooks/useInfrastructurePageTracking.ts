import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import type { ClusterMetrics } from './useInfrastructureMetrics';
import { INFRASTRUCTURE_SECTIONS } from '../const';
import { GPUAAS_EVENTS, type PageViewedProperties } from '../tracking/gpuaasTrackingConstants';

const useInfrastructurePageTracking = (
  metrics: ClusterMetrics,
  isKueueAvailable: boolean,
): void => {
  const hasTrackedPageView = React.useRef(false);

  React.useEffect(() => {
    if (metrics.loaded && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      const totalAccelerators = metrics.accelerators?.total;
      const acceleratorsInUse = metrics.accelerators?.inUse;
      const props: PageViewedProperties = {
        path: '/observe-and-monitor/infrastructure',
        sectionCount: INFRASTRUCTURE_SECTIONS.length,
        hasKueueEnabled: isKueueAvailable,
        totalAccelerators,
        acceleratorsInUse,
        totalUtilizationPct:
          totalAccelerators && totalAccelerators > 0
            ? Math.round(((acceleratorsInUse ?? 0) / totalAccelerators) * 100)
            : undefined,
        avgComputeUtilPct: metrics.computeUtilization?.percentage,
        avgMemoryUtilPct: metrics.memoryUtilization?.percentage,
      };
      fireMiscTrackingEvent(GPUAAS_EVENTS.PAGE_VIEWED, props);
    }
  }, [
    metrics.loaded,
    metrics.accelerators,
    metrics.computeUtilization,
    metrics.memoryUtilization,
    isKueueAvailable,
  ]);
};

export default useInfrastructurePageTracking;
