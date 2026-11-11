import { createSegmentTracking } from '../createSegmentTracking';

/** Preserves legacy browser metadata and delivery without initializing an SDK. */
export const createStandaloneAnalytics = (): ReturnType<typeof createSegmentTracking> => {
  const devMode = process.env.APP_ENV === 'development';
  const version = process.env.INTERNAL_DASHBOARD_VERSION || '';

  return createSegmentTracking(() => ({
    clusterID: window.clusterID ?? '',
    devMode,
    version,
  }));
};
