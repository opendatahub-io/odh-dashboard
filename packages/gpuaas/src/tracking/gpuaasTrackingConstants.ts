export const GPUAAS_EVENTS = {
  PAGE_VIEWED: 'Infrastructure Page Viewed',
  PAGE_INTERACTED: 'Infrastructure Page Interacted',
  COHORT_SECTION_TOGGLED: 'Infrastructure Cohort Section Toggled',
  DATA_REFRESHED: 'Infrastructure Data Refreshed',
  BORROW_COHORT_FILTER_SELECTED: 'Infrastructure Borrow Cohort Filter Selected',
  BORROW_QUEUE_FILTER_APPLIED: 'Infrastructure Borrow Queue Filter Applied',
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
