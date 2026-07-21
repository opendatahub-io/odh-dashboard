export const GPUAAS_EVENTS = {
  PAGE_VIEWED: 'Infrastructure Page Viewed',
  PAGE_INTERACTED: 'Infrastructure Page Interacted',
  COHORT_SECTION_TOGGLED: 'Infrastructure Cohort Section Toggled',
  BORROW_LEND_DETAIL_VIEWED: 'Infrastructure Borrow Lend Detail Viewed',
  DATA_REFRESHED: 'Infrastructure Data Refreshed',
  BORROW_LEND_COHORT_FILTER_SELECTED: 'Infrastructure Borrow Lend Cohort Filter Selected',
  BORROW_LEND_QUEUE_FILTER_APPLIED: 'Infrastructure Borrow Lend Queue Filter Applied',
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
    | 'borrowLendDetail'
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
  hasBorrowLendActive: boolean;
};

// TODO: Wire when BorrowLendDetailPopover is instrumented
export type BorrowLendDetailViewedProperties = {
  clusterQueueName: string;
  clusterQueueId: string;
  kueueCohortName: string;
  direction: 'borrowed' | 'lent';
  acceleratorCount: number;
  acceleratorLabel: string;
  counterpartyQueueName: string;
};

export type DataRefreshedProperties = {
  /** Set when refresh outcome can be determined; omitted for fire-and-forget clicks. */
  success?: boolean;
  error?: string;
  secondsSinceLastUpdate?: number;
};

// TODO: Wire when cohort filter dropdown is instrumented
export type BorrowLendCohortFilterSelectedProperties = {
  selectedCohort: string;
  selectedCohortId: string;
  visibleQueueCount: number;
};

// TODO: Wire when queue search field is instrumented
export type BorrowLendQueueFilterAppliedProperties = {
  searchQuery: string;
  matchCount: number;
  isEmptyResult: boolean;
};
