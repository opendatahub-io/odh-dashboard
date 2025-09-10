export const FEATURE_STORE_API_VERSION = 'v1';
export const FEATURE_STORE_UI_LABEL_KEY = 'feature-store-ui';
export const FEATURE_STORE_UI_LABEL_VALUE = 'enabled';

export enum FeatureStoreObject {
  ENTITIES = 'entities',
  FEATURE_VIEWS = 'featureViews',
  FEATURE_SERVICES = 'featureServices',
}

export enum FeatureStoreSections {
  VALUE_TYPE = 'Value type',
  TAGS = 'Tags',
  INTERACTIVE_EXAMPLE = 'Interactive example',
  DATA_SOURCE = 'Data source',
  ENTITIES = 'Entities',
  SCHEMA = 'Schema',
  INPUTS = 'Inputs',
  CONSUMING_FEATURE_VIEWS = 'Feature views',
}

export const hasContent = (value: string): boolean => !!value.trim().length;

export enum FeatureStoreTabs {
  METRICS = 'Metrics',
  LINEAGE = 'Lineage',
}
