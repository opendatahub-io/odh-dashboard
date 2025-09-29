import React from 'react';
import { FeatureStoreObject } from './const';
import DataSetIcon from './icons/header-icons/DataSetIcon';
import DataSourceIcon from './icons/header-icons/DataSourceIcon';
import EntityIcon from './icons/header-icons/EntityIcon';
import FeatureIcon from './icons/header-icons/FeatureIcon';
import FeatureServiceIcon from './icons/header-icons/FeatureServiceIcon';
import FeatureStoreIcon from './icons/header-icons/FeatureStoreIcon';
import FeatureViewIcon from './icons/header-icons/FeatureViewIcon';

export type FeatureStoreObjectType =
  | 'entity'
  | 'data_source'
  | 'feature_view'
  | 'feature_service'
  | 'feature'
  | 'data_set'
  | 'feature_store';

export const getFeatureStoreObjectDisplayName = (
  featureStoreObject: FeatureStoreObject,
): string => {
  switch (featureStoreObject) {
    case FeatureStoreObject.ENTITIES:
      return 'Entities';
    case FeatureStoreObject.FEATURE_VIEWS:
      return 'Feature views';
    case FeatureStoreObject.FEATURE_SERVICES:
      return 'Feature services';
    case FeatureStoreObject.DATA_SETS:
      return 'Datasets';
    case FeatureStoreObject.DATA_SOURCES:
      return 'Data sources';
    case FeatureStoreObject.OVERVIEW:
      return 'Feature store overview';
    case FeatureStoreObject.FEATURES:
      return 'Features';
    default:
      return featureStoreObject;
  }
};

export const getFeatureStoreObjectIcon = (
  objectType: FeatureStoreObjectType,
): React.ComponentType => {
  switch (objectType) {
    case 'entity':
      return EntityIcon;
    case 'data_source':
      return DataSourceIcon;
    case 'feature_view':
      return FeatureViewIcon;
    case 'feature_service':
      return FeatureServiceIcon;
    case 'feature':
      return FeatureIcon;
    case 'data_set':
      return DataSetIcon;
    case 'feature_store':
      return FeatureStoreIcon;
    default:
      return FeatureStoreIcon;
  }
};

export const getFeatureStoreObjectIconElement = (
  objectType: FeatureStoreObjectType,
  props?: React.ComponentProps<React.ComponentType>,
): React.ReactElement => {
  const IconComponent = getFeatureStoreObjectIcon(objectType);
  return React.createElement(IconComponent, props);
};

export const getFeatureStoreObjectBackgroundColor = (
  objectType: FeatureStoreObjectType,
): string => {
  switch (objectType) {
    case 'entity':
      return 'var(--ai-fs-entity--BackgroundColor)';
    case 'data_source':
      return 'var(--ai-fs-data-source--BackgroundColor)';
    case 'feature_view':
      return 'var(--ai-fs-feature-view--BackgroundColor)';
    case 'feature_service':
      return 'var(--ai-fs-feature-service--BackgroundColor)';
    case 'feature':
      return 'var(--ai-fs-feature--BackgroundColor)';
    case 'data_set':
      return 'var(--ai-fs-data-set--BackgroundColor)';
    case 'feature_store':
      return 'var(--ai-fs-feature-store--BackgroundColor)';
    default:
      return 'var(--ai-fs-feature-store--BackgroundColor)';
  }
};

export const getFeatureStoreObjectIconColor = (objectType: FeatureStoreObjectType): string => {
  switch (objectType) {
    case 'entity':
      return 'var(--ai-fs-entity--IconColor)';
    case 'data_source':
      return 'var(--ai-fs-data-source--IconColor)';
    case 'feature_view':
      return 'var(--ai-fs-feature-view--IconColor)';
    case 'feature_service':
      return 'var(--ai-fs-feature-service--IconColor)';
    case 'feature':
      return 'var(--ai-fs-feature--IconColor)';
    case 'data_set':
      return 'var(--ai-fs-data-set--IconColor)';
    case 'feature_store':
      return 'var(--ai-fs-feature-store--IconColor)';
    default:
      return 'var(--ai-fs-feature-store--IconColor)';
  }
};

const TITLE_TO_TYPE_MAP: Record<string, FeatureStoreObjectType> = {
  entities: 'entity',
  'data sources': 'data_source',
  datasets: 'data_set',
  features: 'feature',
  'feature views': 'feature_view',
  'feature services': 'feature_service',
};

export const getFeatureStoreObjectTypeFromTitle = (title: string): FeatureStoreObjectType => {
  return TITLE_TO_TYPE_MAP[title.toLowerCase()] ?? 'feature_store';
};

export const getFeatureStoreObjectDescription = (
  featureStoreObject: FeatureStoreObject,
): string => {
  switch (featureStoreObject) {
    case FeatureStoreObject.ENTITIES:
      return 'Select a feature store repository to view and manage its entities. Entities are collections of related features and can be mapped to your use case (for example, customers, products, transactions).';
    case FeatureStoreObject.DATA_SOURCES:
      return 'Select a feature store repository to view and manage its data sources. Data sources provide the raw data that feeds into your feature store.';
    case FeatureStoreObject.FEATURES:
      return 'Select a feature store repository to view its features. A feature is a schema containing a name and a type, and is used to represent the data stored in feature views for both training and serving purposes.';
    case FeatureStoreObject.FEATURE_VIEWS:
      return 'Select a feature store repository to view and manage its feature views. A feature view defines how to retrieve a logical group of features from a specific data source. It binds a data source to one or more entities and contains the logic for transforming the raw data into feature values.';
    case FeatureStoreObject.FEATURE_SERVICES:
      return "Select a feature store repository to view and manage its feature services. Feature services groups features from across one or more Feature views to serve a specific model's needs for training, inference, or GenAI applications like RAG. Feature service acts as a managed API for a model, ensuring features are served consistently.";
    case FeatureStoreObject.DATA_SETS:
      return 'View and manage datasets created from feature services. Datasets are point-in-time-correct snapshots of feature services,data and are used for training,  or validation, and analysis.';
    case FeatureStoreObject.OVERVIEW:
      return '';
    default:
      return 'Feature store object details';
  }
};
