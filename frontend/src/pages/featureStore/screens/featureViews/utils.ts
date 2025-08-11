import { FeatureView, OnDemandFeatureViewSources } from '#~/pages/featureStore/types/featureView';
import { FeatureStoreRelationship } from '#~/pages/featureStore/types/global';
import { createFeatureStoreFilterUtils } from '#~/pages/featureStore/utils/filterUtils';
import { SchemaItem } from '#~/pages/featureStore/screens/featureViews/featureViewDetails/FeatureViewSchemaTable';
import { featureEntityRoute } from '#~/pages/featureStore/routes';
import { featureRoute } from '#~/pages/featureStore/FeatureStoreRoutes';

export interface Relationship {
  source: { type: string; name: string };
  target: { type: string; name: string };
}

export const featureViewTableFilterKeyMapping: Record<string, string> = {
  'Feature view': 'spec.name',
  Project: 'project',
  Tags: 'spec.tags',
  Features: 'features',
  Owner: 'spec.owner',
};

const featureViewFilterUtils = createFeatureStoreFilterUtils<FeatureView, FeatureStoreRelationship>(
  featureViewTableFilterKeyMapping,
  'spec.name', // namePath - FeatureView has spec.name
  'spec.tags', // tagsPath - FeatureView has spec.tags
);

const applyStoreTypeFilter = (featureViews: FeatureView[], filterString: string): FeatureView[] => {
  if (!filterString) {
    return featureViews;
  }

  const lowerFilterString = filterString.toLowerCase();

  return featureViews.filter((featureView) => {
    const { online, offline } = featureView.spec;

    const filterConditions = {
      online,
      offline,
      '-': !online && !offline,
    };
    return Object.entries(filterConditions).some(
      ([term, condition]) => term.includes(lowerFilterString) && condition,
    );
  });
};

export const applyFeatureViewFilters = (
  featureViews: FeatureView[],
  relationships: Record<string, FeatureStoreRelationship[]>,
  filterData: Record<string, string | { label: string; value: string } | undefined>,
): FeatureView[] => {
  const storeTypeFilter = filterData['Store type'];
  const otherFilters = { ...filterData };
  delete otherFilters['Store type'];

  let filteredViews = featureViewFilterUtils.applyFilters(
    featureViews,
    relationships,
    otherFilters,
  );

  if (storeTypeFilter) {
    const filterString =
      typeof storeTypeFilter === 'string' ? storeTypeFilter : storeTypeFilter.value;
    filteredViews = applyStoreTypeFilter(filteredViews, filterString);
  }

  return filteredViews;
};

/**
 * Counts occurrences of specified types in relationships
 * @param relationships - Array of relationship objects
 * @param types - Array of types to count (e.g., ['feature', 'dataSource'])
 * @returns Object with type names as keys and counts as values
 */
export const countRelationshipTypes = (
  relationships: Relationship[],
  types: string[],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  // Initialize counts
  types.forEach((type) => (counts[type] = 0));

  // Count occurrences
  relationships.forEach((rel) => {
    if (types.includes(rel.source.type)) {
      counts[rel.source.type]++;
    }
    if (types.includes(rel.target.type)) {
      counts[rel.target.type]++;
    }
  });

  return counts;
};

export const getFeatureViewType = (type: FeatureView['type']): string => {
  switch (type) {
    case 'featureView':
      return 'Batch';
    case 'onDemandFeatureView':
      return 'On demand';
    // case 'streamFeatureView':
    //   return 'Stream';
  }
};

/**
 * Filters relationships for a specific entity by target type
 * @param relationships - The relationships object or array from EntityList
 * @param entityKey - The key of the entity (e.g., 'driver', 'zipcode')
 * @param targetType - The type to filter by (e.g., 'featureService', 'featureView', 'dataSource')
 * @returns Array of relationships that match the target type
 */
export const getRelationshipsByTargetType = <
  T extends { target: { type: string }; source: { type: string } },
>(
  relationships: Record<string, T[] | undefined> | T[],
  entityKey: string,
  type: string,
  position: 'source' | 'target' = 'target',
): T[] => {
  // Check if relationships is an object (Record) or array
  const entityRelationships = Array.isArray(relationships)
    ? relationships
    : relationships[entityKey];

  return (
    entityRelationships?.filter((relationship) =>
      position === 'source' ? relationship.source.type === type : relationship.target.type === type,
    ) || []
  );
};

/**
 * Formats data sources for different feature view types
 * @param featureView - The feature view object
 * @returns Array of formatted data source objects for table display
 */
export const formatFeatureViewDataSources = (
  featureView: FeatureView,
): Array<{
  sourceType: string;
  name: string;
  fileUrl: string;
  createdDate: string;
  lastModifiedDate: string;
}> => {
  const dataSources: Array<{
    sourceType: string;
    name: string;
    fileUrl: string;
    createdDate: string;
    lastModifiedDate: string;
  }> = [];
  switch (featureView.type) {
    case 'featureView': {
      if ('batchSource' in featureView.spec) {
        dataSources.push({
          sourceType: 'Batch',
          name: featureView.spec.batchSource.name || '-',
          fileUrl: featureView.spec.batchSource.fileOptions.uri || '-',
          createdDate: featureView.spec.batchSource.meta?.createdTimestamp || '-',
          lastModifiedDate: featureView.spec.batchSource.meta?.lastUpdatedTimestamp || '-',
        });
      }

      if ('streamSource' in featureView.spec && featureView.spec.streamSource) {
        dataSources.push({
          sourceType: 'Stream',
          name: featureView.spec.streamSource.name || '-',
          fileUrl: '-',
          createdDate: featureView.spec.streamSource.meta.createdTimestamp || '-',
          lastModifiedDate: featureView.spec.streamSource.meta.lastUpdatedTimestamp || '-',
        });
      }

      break;
    }

    case 'onDemandFeatureView': {
      if ('sources' in featureView.spec) {
        Object.entries(featureView.spec.sources).forEach(([, source]) => {
          if (source.requestDataSource) {
            dataSources.push({
              sourceType: 'On-Demand',
              name: source.requestDataSource.name || '-',
              fileUrl: '-',
              createdDate: source.requestDataSource.meta.createdTimestamp || '-',
              lastModifiedDate: source.requestDataSource.meta.lastUpdatedTimestamp || '-',
            });
          }

          if (source.featureViewProjection?.batchSource) {
            dataSources.push({
              sourceType: 'Projection',
              name: source.featureViewProjection.batchSource.name || '-',
              fileUrl: source.featureViewProjection.batchSource.fileOptions.uri || '-',
              createdDate: source.featureViewProjection.batchSource.meta?.createdTimestamp || '-',
              lastModifiedDate:
                source.featureViewProjection.batchSource.meta?.lastUpdatedTimestamp || '-',
            });
          }
        });
      }

      break;
    }

    default:
      break;
  }

  return dataSources;
};

/**
 * Formats on-demand feature view sources for display
 * @param sources - The OnDemandFeatureViewSources object from feature view spec
 * @returns Array of formatted source objects for display
 */
export const formatOnDemandFeatureViewSources = (
  sources: OnDemandFeatureViewSources,
): Array<{
  sourceKey: string;
  sourceType: 'requestDataSource' | 'featureViewProjection';
  name: string;
  description?: string;
  schema?: Array<{
    name: string;
    valueType: string;
    description?: string;
    tags?: Record<string, string>;
  }>;
  features?: Array<{
    name: string;
    valueType: string;
    description?: string;
    tags?: Record<string, string>;
  }>;
  batchSource?: {
    name: string;
    fileUrl: string;
    createdDate: string;
    lastModifiedDate: string;
  };
}> => {
  const formattedSources: Array<{
    sourceKey: string;
    sourceType: 'requestDataSource' | 'featureViewProjection';
    name: string;
    description?: string;
    schema?: Array<{
      name: string;
      valueType: string;
      description?: string;
      tags?: Record<string, string>;
    }>;
    features?: Array<{
      name: string;
      valueType: string;
      description?: string;
      tags?: Record<string, string>;
    }>;
    batchSource?: {
      name: string;
      fileUrl: string;
      createdDate: string;
      lastModifiedDate: string;
    };
  }> = [];

  Object.entries(sources).forEach(([sourceKey, { requestDataSource, featureViewProjection }]) => {
    if (requestDataSource) {
      formattedSources.push({
        sourceKey,
        sourceType: 'requestDataSource',
        name: requestDataSource.name || sourceKey,
        description: undefined,
        schema: requestDataSource.requestDataOptions.schema,
      });
    }

    if (featureViewProjection) {
      const { batchSource } = featureViewProjection;
      formattedSources.push({
        sourceKey,
        sourceType: 'featureViewProjection',
        name: featureViewProjection.name || sourceKey,
        description: undefined,
        features: featureViewProjection.featureColumns,
        batchSource: batchSource
          ? {
              name: batchSource.name || '-',
              fileUrl: batchSource.fileOptions.uri || '-',
              createdDate: batchSource.meta?.createdTimestamp || '-',
              lastModifiedDate: batchSource.meta?.lastUpdatedTimestamp || '-',
            }
          : undefined,
      });
    }
  });

  return formattedSources;
};

export const getSchemaItemValue = (item: SchemaItem, key: string): string => {
  switch (key) {
    case 'column':
      return item.column;
    case 'type':
      return item.type;
    case 'dataType':
      return item.dataType;
    case 'description':
      return item.description;
    default:
      return '';
  }
};

export const getSchemaItemLink = (
  item: SchemaItem,
  featureView: FeatureView,
  currentProject?: string,
): string => {
  const project = featureView.project || currentProject;
  if (!project) {
    return '#';
  }

  return item.type === 'ENTITY'
    ? featureEntityRoute(item.column, project)
    : item.type === 'FEATURE'
    ? featureRoute(item.column, featureView.spec.name, project)
    : '#';
};
