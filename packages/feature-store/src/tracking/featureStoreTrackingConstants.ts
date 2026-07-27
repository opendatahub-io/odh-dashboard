export type FeatureStoreResourceType =
  | 'entity'
  | 'feature'
  | 'featureView'
  | 'featureService'
  | 'dataSource'
  | 'dataSet'
  | 'featureStore';

export const RESOURCE_TYPES: Record<string, FeatureStoreResourceType> = {
  ENTITY: 'entity',
  FEATURE: 'feature',
  FEATURE_VIEW: 'featureView',
  FEATURE_SERVICE: 'featureService',
  DATA_SOURCE: 'dataSource',
  DATA_SET: 'dataSet',
  FEATURE_STORE: 'featureStore',
} as const;

export const FEATURE_STORE_EVENTS = {
  SEARCH_PERFORMED: 'Feature Store Search Performed',
  SEARCH_RESULT_SELECTED: 'Feature Store Search Result Selected',
  FILTER_APPLIED: 'Feature Store Filter Applied',
  FILTER_REMOVED: 'Feature Store Filter Removed',
  LINEAGE_NODE_SELECTED: 'Feature Store Lineage Node Selected',
  LINEAGE_FILTER_APPLIED: 'Feature Store Lineage Filter Applied',
  TAB_SWITCHED: 'Feature Store Tab Switched',
  OVERVIEW_CARD_CLICKED: 'Feature Store Overview Card Clicked',
  POPULAR_TAG_CLICKED: 'Feature Store Popular Tag Clicked',
  RECENTLY_VIEWED_SELECTED: 'Feature Store Recently Viewed Selected',
  LINEAGE_NAVIGATION_PERFORMED: 'Feature Store Lineage Navigation Performed',
  CODE_COPIED: 'Feature Store Code Copied',
  HELP_VIEWED: 'Feature Store Help Viewed',
  PROJECT_SELECTED: 'Feature Store Project Selected',
  WORKBENCH_CONNECTION_VIEWED: 'Feature Store Workbench Connection Viewed',
} as const;

export type SearchPerformedProperties = {
  resultCount: number;
  pageType: 'overview' | 'list' | 'detail';
  resourceType?: string;
};

export type SearchResultSelectedProperties = {
  resultType: string;
  pageType: 'overview' | 'list' | 'detail';
  resourceType?: string;
};

export type FilterAppliedProperties = {
  filterAttribute: string;
  resourceType: FeatureStoreResourceType;
};

export type FilterRemovedProperties = {
  action: 'removeOne' | 'clearAll';
  filterAttribute?: string;
  resourceType: FeatureStoreResourceType;
};

export type LineageNodeSelectedProperties = {
  nodeType: string;
  pageType: 'overview' | 'detail';
};

export type LineageFilterAppliedProperties = {
  filterType: string;
  hideObjects?: boolean;
  pageType: 'overview' | 'detail';
};

export type TabSwitchedProperties = {
  tabName: string;
  pageType: 'overview' | 'detail';
  resourceType: FeatureStoreResourceType;
};

export type OverviewCardClickedProperties = {
  cardType: 'resourceSummary';
  targetResourceType: string;
};

export type PopularTagClickedProperties = {
  clickTarget: 'featureViewLink' | 'viewAllButton';
};

export type RecentlyViewedSelectedProperties = {
  resourceType: string;
};

export type LineageNavigationPerformedProperties = {
  targetResourceType: string;
  pageType: 'overview' | 'detail';
};

export type CodeCopiedProperties = {
  resourceType: string;
};

export type HelpViewedProperties = {
  helpType: 'integration' | 'columnInfo' | 'codeHelp';
  pageType: 'overview' | 'list' | 'detail';
  resourceType?: string;
};

export type ProjectSelectedProperties = {
  isSwitch: boolean;
  storeCount: number;
  pageType: 'overview' | 'list' | 'detail';
};

export type WorkbenchConnectionViewedProperties = {
  featureStoreProject: string;
};
