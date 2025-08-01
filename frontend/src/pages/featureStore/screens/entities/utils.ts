import { Entity } from '#~/pages/featureStore/types/entities';
import { FeatureStoreRelationship } from '#~/pages/featureStore/types/global';
import { createFeatureStoreFilterUtils } from '../../utils/filterUtils';

export const entityTableFilterKeyMapping: Record<string, string> = {
  entity: 'spec.name',
  joinKey: 'spec.joinKey',
  valueType: 'spec.valueType',
  owner: 'spec.owner',
  project: 'project',
  tag: 'spec.tags',
  featureViews: 'featureViews',
};

const entityFilterUtils = createFeatureStoreFilterUtils<Entity, FeatureStoreRelationship>(
  entityTableFilterKeyMapping,
);

export const applyEntityFilters = entityFilterUtils.applyFilters;
