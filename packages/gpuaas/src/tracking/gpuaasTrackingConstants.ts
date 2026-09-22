import { QUOTA_NODE_TYPE, QuotaNodeType } from '../types';
import { ClusterQueueWorkloadsToolbarFilterOptions } from '../const';

export const GPUAAS_EVENTS = {
  PAGE_VIEWED: 'Infrastructure Page Viewed',
  PAGE_INTERACTED: 'Infrastructure Page Interacted',
  COHORT_SECTION_TOGGLED: 'Infrastructure Cohort Section Toggled',
  DATA_REFRESHED: 'Infrastructure Data Refreshed',
  BORROW_COHORT_FILTER_SELECTED: 'Infrastructure Borrow Cohort Filter Selected',
  BORROW_QUEUE_FILTER_APPLIED: 'Infrastructure Borrow Queue Filter Applied',
  QUOTA_USAGE_TAB_VIEWED: 'Infrastructure Quota Usage Tab Viewed',
  QUOTA_USAGE_TAB_INTERACTED: 'Infrastructure Quota Usage Tab Interacted',
  COHORT_TREE_EXPAND_COLLAPSE_ALL_SELECTED:
    'Infrastructure Cohort Tree Expand Collapse All Selected',
  COHORT_TREE_SEARCH_APPLIED: 'Infrastructure Cohort Tree Search Applied',
  QUOTA_USAGE_DETAIL_SECTION_TOGGLED: 'Infrastructure Quota Usage Detail Section Toggled',
  COHORT_BREADCRUMB_SELECTED: 'Infrastructure Cohort Breadcrumb Selected',
  VIEW_KUEUE_PROJECTS_SELECTED: 'Infrastructure View Kueue Projects Selected',
  BORROWING_POPOVER_LINK_SELECTED: 'Infrastructure Borrowing Popover Link Selected',
  DRAWER_WORKLOADS_FILTER_APPLIED: 'Infrastructure Drawer Workloads Filter Applied',
} as const;

export const QUOTA_USAGE_INTERACTION_TYPES = {
  treeSelect: 'tree-select',
  treeSearch: 'tree-search',
  expandCollapseAll: 'expand-collapse-all',
  refresh: 'refresh',
  detailSectionToggle: 'detail-section-toggle',
  viewProjects: 'view-projects',
  workloadsFilter: 'workloads-filter',
  breadcrumb: 'breadcrumb',
} as const;

export const QUOTA_USAGE_DETAIL_SECTION_NAMES = {
  summary: 'summary',
  hardwareUsage: 'hardware-usage',
  workloads: 'workloads',
} as const;

export const QUOTA_USAGE_DETAIL_SECTION_IDS = {
  summary: 'quota-usage-summary',
  hardwareUsage: 'quota-usage-accelerator-table',
  workloads: 'quota-usage-workloads',
} as const;

export const QUOTA_USAGE_DETAIL_SECTION_NAMES_BY_ID = {
  [QUOTA_USAGE_DETAIL_SECTION_IDS.summary]: QUOTA_USAGE_DETAIL_SECTION_NAMES.summary,
  [QUOTA_USAGE_DETAIL_SECTION_IDS.hardwareUsage]: QUOTA_USAGE_DETAIL_SECTION_NAMES.hardwareUsage,
  [QUOTA_USAGE_DETAIL_SECTION_IDS.workloads]: QUOTA_USAGE_DETAIL_SECTION_NAMES.workloads,
} as const;

export type PageViewedProperties = {
  path: string;
  sectionCount: number;
  hasKueueEnabled: boolean;
  totalAccelerators?: number;
  acceleratorsInUse?: number;
  totalUtilizationPct?: number;
  avgComputeUtilPct?: number;
  avgMemoryUtilPct?: number;
};

export type PageInteractedProperties = {
  firstInteractionType:
    | 'refresh'
    | 'cohortFilter'
    | 'queueFilter'
    | 'cohortToggle'
    | 'borrowDetail'
    | 'trendLegendToggle';
  secondsSincePageLoad: number;
};

// TODO: Wire when CohortAccordionGroup toggle interactions are instrumented
export type CohortSectionToggledProperties = {
  kueueCohortName: string;
  kueueCohortId: string;
  isUncohortedBucket: boolean;
  isExpanded: boolean;
  clusterQueueCount: number;
  hasBorrowActive: boolean;
};

export type DataRefreshedProperties = {
  /** Set when refresh outcome can be determined; omitted for fire-and-forget clicks. */
  refreshSource?: 'utilization' | 'quota-usage';
  outcome?: 'click';
  success?: boolean;
  error?: string;
  secondsSinceLastUpdate?: number;
};

// TODO: Wire when cohort filter dropdown is instrumented
export type BorrowCohortFilterSelectedProperties = {
  selectedCohort: string;
  selectedCohortId: string;
  visibleQueueCount: number;
};

// TODO: Wire when queue search field is instrumented
export type BorrowQueueFilterAppliedProperties = {
  searchQuery: string;
  matchCount: number;
  isEmptyResult: boolean;
};

export type QuotaUsageTabViewedProperties = {
  path: string;
  tabName: 'quota-usage';
  cohortCount: number;
  clusterQueueCount: number;
  hasUnassignedBucket: boolean;
  hasKueueEnabled: boolean;
};

export type QuotaUsageTabInteractedProperties = {
  interactionType: (typeof QUOTA_USAGE_INTERACTION_TYPES)[keyof typeof QUOTA_USAGE_INTERACTION_TYPES];
  secondsSinceTabLoad: number;
};

export type CohortTreeExpandCollapseAllSelectedProperties = {
  isExpanded: boolean;
};

export type CohortTreeSearchAppliedProperties = {
  matchCount: number;
  isEmptyResult: boolean;
};

export type QuotaUsageDetailSectionToggledProperties = {
  sectionName: (typeof QUOTA_USAGE_DETAIL_SECTION_NAMES)[keyof typeof QUOTA_USAGE_DETAIL_SECTION_NAMES];
  isExpanded: boolean;
  nodeType: 'cohort' | 'cluster-queue' | 'unassigned-bucket';
};

export const QUOTA_NODE_TYPE_TRACKING: Record<
  QuotaNodeType,
  QuotaUsageDetailSectionToggledProperties['nodeType']
> = {
  [QUOTA_NODE_TYPE.unassigned]: 'unassigned-bucket',
  [QUOTA_NODE_TYPE.cohort]: 'cohort',
  [QUOTA_NODE_TYPE.clusterQueue]: 'cluster-queue',
};

export type CohortBreadcrumbSelectedProperties = {
  breadcrumbLevel: number;
  targetNodeType: 'cohort' | 'cluster-queue' | 'unassigned-bucket';
};

export type ViewKueueProjectsSelectedProperties = {
  projectCount: number;
};

export type BorrowingPopoverLinkSelectedProperties = {
  gpusBorrowing: number;
};

export type DrawerWorkloadsFilterAppliedProperties = {
  filterAttribute: ClusterQueueWorkloadsToolbarFilterOptions;
  filterValue: string;
  matchCount: number;
};
