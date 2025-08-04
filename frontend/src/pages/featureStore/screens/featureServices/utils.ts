import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import { FeatureStoreRelationship } from '#~/pages/featureStore/types/global';
import { createFeatureStoreFilterUtils } from '#~/pages/featureStore/utils/filterUtils';

export const featureServiceTableFilterKeyMapping: Record<string, string> = {
  featureService: 'spec.name',
  tags: 'spec.tags',
  featureViews: 'featureViews',
  owner: 'spec.owner',
  project: 'project',
};

const featureServiceFilterUtils = createFeatureStoreFilterUtils<
  FeatureService,
  FeatureStoreRelationship
>(featureServiceTableFilterKeyMapping);

export const applyFeatureServiceFilters = featureServiceFilterUtils.applyFilters;
