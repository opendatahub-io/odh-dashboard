import { Entity } from '../../types/entities';
import { FeatureStoreRelationship } from '../../types/global';
import { createFeatureStoreFilterUtils } from '../../utils/filterUtils';

export const entityTableFilterKeyMapping: Record<string, string> = {
  entity: 'spec.name',
  joinKey: 'spec.joinKey',
  valueType: 'spec.valueType',
  owner: 'spec.owner',
  project: 'project',
  tag: 'spec.tags',
  featureViews: 'featureViews',
  created: 'meta.createdTimestamp',
  updated: 'meta.lastUpdatedTimestamp',
};

const entityFilterUtils = createFeatureStoreFilterUtils<Entity, FeatureStoreRelationship>(
  entityTableFilterKeyMapping,
  'spec.name', // namePath - Entity has spec.name
  'spec.tags', // tagsPath - Entity has spec.tags
);

export const applyEntityFilters = entityFilterUtils.applyFilters;
