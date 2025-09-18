import { FeatureStoreProject } from '../types/featureStoreProjects';

export const mockFeatureStoreProject = (
  partial?: Partial<FeatureStoreProject>,
): FeatureStoreProject => ({
  spec: {
    name: 'credit_scoring_local',
  },
  meta: {
    createdTimestamp: '2025-06-30T07:46:22.557138Z',
    lastUpdatedTimestamp: '2025-06-30T07:46:22.557138Z',
  },
  ...partial,
});
