import { resourceTypeMap } from './const';
import { FeatureStoreObject } from '../../const';
import {
  featureDataSetRoute,
  featureDataSourceRoute,
  featureEntityRoute,
  featureRoute,
  featureServiceRoute,
  featureStoreRoute,
  featureViewRoute,
} from '../../routes';
import { MetricsCountResponse } from '../../types/metrics';

export type MetricCardData = {
  entities: number;
  dataSources: number;
  savedDatasets: number;
  features: number;
  featureViews: number;
  featureServices: number;
};

export type MetricCardItem = {
  title: string;
  count: number;
  description: string;
  route: string;
  routeParams?: Record<string, string>;
};

export const processMetricsData = (data: MetricsCountResponse): MetricCardItem[] => {
  let counts: MetricCardData;

  if (data.project && data.counts) {
    counts = data.counts;
  } else if (data.total) {
    counts = data.total;
  } else {
    counts = {
      entities: 0,
      dataSources: 0,
      savedDatasets: 0,
      features: 0,
      featureViews: 0,
      featureServices: 0,
    };
  }

  return [
    {
      title: 'Entities',
      count: counts.entities,
      description:
        'Entities are collections of related features and can be mapped to the domain of your use case.',
      route: featureStoreRoute(FeatureStoreObject.ENTITIES),
    },
    {
      title: 'Data sources',
      count: counts.dataSources,
      description:
        'Data sources such as tables or data warehouses contain the raw data from which features are extracted.',
      route: featureStoreRoute(FeatureStoreObject.DATA_SOURCES),
    },
    {
      title: 'Datasets',
      count: counts.savedDatasets,
      description:
        'Datasets are point-in-time-correct snapshots of feature data used for training or validation.',
      route: featureStoreRoute(FeatureStoreObject.DATA_SETS),
    },
    {
      title: 'Features',
      count: counts.features,
      description: 'A feature is a single data value used in model training or inference.',
      route: featureStoreRoute(FeatureStoreObject.FEATURES),
    },
    {
      title: 'Feature views',
      count: counts.featureViews,
      description:
        'Feature views define groups of related features and how to retrieve them from a source.',
      route: featureStoreRoute(FeatureStoreObject.FEATURE_VIEWS),
    },
    {
      title: 'Feature services',
      count: counts.featureServices,
      description:
        'Feature services are groups of related features from one or more feature views that are designed to be retrieved together for model training, online inference, or GenAI applications like RAG.',
      route: featureStoreRoute(FeatureStoreObject.FEATURE_SERVICES),
    },
  ];
};

export const formatResourceType = (resourceType: string): string => {
  return resourceTypeMap[resourceType] || resourceType;
};

export const getResourceRoute = (
  resourceType: string,
  resourceName: string,
  project: string,
): string => {
  switch (resourceType) {
    case resourceTypeMap.feature_views:
      return featureViewRoute(resourceName, project);
    case resourceTypeMap.entities:
      return featureEntityRoute(resourceName, project);
    case resourceTypeMap.feature_services:
      return featureServiceRoute(resourceName, project);
    case resourceTypeMap.saved_datasets:
      return featureDataSetRoute(resourceName, project);
    case resourceTypeMap.data_sources:
      return featureDataSourceRoute(resourceName, project);
    case resourceTypeMap.features:
      return featureRoute(resourceName, project);
    default:
      return '#';
  }
};
