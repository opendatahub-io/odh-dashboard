import { createSegmentTracking } from '../createSegmentTracking';

/** Preserves legacy browser metadata and delivery without initializing an SDK. */
export const createStandaloneAnalytics = ({
  devMode,
  version,
}: {
  devMode: boolean;
  version: string;
}): ReturnType<typeof createSegmentTracking> =>
  createSegmentTracking(() => ({
    clusterID: window.clusterID ?? '',
    devMode,
    version,
  }));
