import { DataSet } from '../../types/dataSets';
import { FeatureStoreRelationship } from '../../types/global';
import { createFeatureStoreFilterUtils } from '../../utils/filterUtils';

export const dataSetTableFilterKeyMapping: Record<string, string> = {
  dataSet: 'spec.name',
  featureServiceName: 'spec.featureServiceName',
  project: 'project',
  tag: 'spec.tags',
  featureViews: 'featureViews',
  created: 'meta.createdTimestamp',
  updated: 'meta.lastUpdatedTimestamp',
};

const dataSetFilterUtils = createFeatureStoreFilterUtils<DataSet, FeatureStoreRelationship>(
  dataSetTableFilterKeyMapping,
  'spec.name', // namePath - DataSet has spec.name
  'spec.tags', // tagsPath - DataSet has spec.tags
);

export const applyDataSetFilters = dataSetFilterUtils.applyFilters;

// Storage utilities
export const getStorageType = (storage: DataSet['spec']['storage']): string => {
  const keys = Object.keys(storage);
  return keys[0];
};

export const getStorageConfig = (storage: DataSet['spec']['storage']): Record<string, unknown> => {
  const storageType = getStorageType(storage);

  switch (storageType) {
    case 'fileStorage':
      return 'fileStorage' in storage ? storage.fileStorage : {};
    case 'sparkStorage':
      return 'sparkStorage' in storage ? storage.sparkStorage : {};
    case 'bigqueryStorage':
      return 'bigqueryStorage' in storage ? storage.bigqueryStorage : {};
    case 'redshiftStorage':
      return 'redshiftStorage' in storage ? storage.redshiftStorage : {};
    case 'snowflakeStorage':
      return 'snowflakeStorage' in storage ? storage.snowflakeStorage : {};
    case 'trinoStorage':
      return 'trinoStorage' in storage ? storage.trinoStorage : {};
    case 'athenaStorage':
      return 'athenaStorage' in storage ? storage.athenaStorage : {};
    case 'customStorage':
      return 'customStorage' in storage ? storage.customStorage : {};
    default:
      return {};
  }
};
