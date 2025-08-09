import { Features, FeatureRelationship } from '#~/pages/featureStore/types/features';
import { createFeatureStoreFilterUtils } from '#~/pages/featureStore/utils/filterUtils';

export const featureTableFilterKeyMapping: Record<string, string> = {
  feature: 'name',
  project: 'project',
  valueType: 'type',
  featureView: 'featureView',
  owner: 'owner',
};

const featureFilterUtils = createFeatureStoreFilterUtils<Features, FeatureRelationship>(
  featureTableFilterKeyMapping,
  'name', // namePath - Features has name directly
);

export const applyFeatureFilters = (
  features: Features[],
  filterData: Record<string, string | { label: string; value: string } | undefined>,
  relationships: Record<string, FeatureRelationship[]> = {},
): Features[] => featureFilterUtils.applyFilters(features, relationships, filterData);
