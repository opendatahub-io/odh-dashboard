import { Features, FeatureRelationship } from '../../types/features';
import { createFeatureStoreFilterUtils, applyTagFilters } from '../../utils/filterUtils';

export const featureTableFilterKeyMapping: Record<string, string> = {
  feature: 'name',
  project: 'project',
  tag: 'tags',
  valueType: 'type',
  featureView: 'featureView',
  owner: 'owner',
};

const featureFilterUtils = createFeatureStoreFilterUtils<Features, FeatureRelationship>(
  featureTableFilterKeyMapping,
  'name', // namePath - Features has name directly
  'tags', // tagsPath - Features has tags directly (not spec.tags)
);

export const applyFeatureFilters = (
  features: Features[],
  filterData: Record<string, string | { label: string; value: string } | undefined>,
  relationships: Record<string, FeatureRelationship[]> = {},
): Features[] => featureFilterUtils.applyFilters(features, relationships, filterData);

export const applyFeatureTagFilters = (features: Features[], tagFilters: string[]): Features[] =>
  applyTagFilters(features, tagFilters, (feature) => feature.tags);
