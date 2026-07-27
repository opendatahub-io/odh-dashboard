import { ProjectList } from './types/featureStoreProjects';

export const FEATURE_STORE_API_VERSION = 'v1';

/** Max items per page for /all endpoints (Feast API rejects limit > 100 with 422). */
export const FEATURE_STORE_PAGE_SIZE = 100;
export const FEAST_NAMESPACE_LABEL_KEY = 'opendatahub.io/feast';
export const FEAST_NAMESPACE_LABEL_VALUE = 'true';
export const FEATURE_STORE_UI_LABEL_KEY = 'feature-store-ui';
export const FEATURE_STORE_UI_LABEL_VALUE = 'enabled';

export enum FeatureStoreObject {
  ENTITIES = 'entities',
  FEATURE_VIEWS = 'feature-views',
  FEATURE_SERVICES = 'feature-services',
  DATA_SETS = 'datasets',
  DATA_SOURCES = 'data-sources',
  OVERVIEW = 'overview',
  FEATURES = 'features',
}

export enum FeatureStoreSections {
  VALUE_TYPE = 'Value type',
  TAGS = 'Tags',
  CODE_SNIPPET = 'Code snippet',
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
/* eslint-disable camelcase */
export const DEFAULT_PROJECT_LIST: ProjectList = {
  projects: [],
  pagination: {
    page: 0,
    limit: 0,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
};
/* eslint-enable camelcase */
