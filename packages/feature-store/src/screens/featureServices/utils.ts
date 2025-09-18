import { FeatureService } from '../../types/featureServices';
import { FeatureStoreRelationship } from '../../types/global';
import { createFeatureStoreFilterUtils } from '../../utils/filterUtils';

export const featureServiceTableFilterKeyMapping: Record<string, string> = {
  featureService: 'spec.name',
  tag: 'spec.tags',
  featureViews: 'featureViews',
  owner: 'spec.owner',
  project: 'project',
  created: 'meta.createdTimestamp',
  updated: 'meta.lastUpdatedTimestamp',
};

const featureServiceFilterUtils = createFeatureStoreFilterUtils<
  FeatureService,
  FeatureStoreRelationship
>(featureServiceTableFilterKeyMapping, 'spec.name', 'spec.tags');

export const applyFeatureServiceFilters = featureServiceFilterUtils.applyFilters;
