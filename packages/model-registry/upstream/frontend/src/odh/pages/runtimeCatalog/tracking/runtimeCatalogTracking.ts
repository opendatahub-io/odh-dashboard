/**
 * Runtime Image Library Segment event names and property types.
 *
 * Naming convention follows "What-noun Past-Tensed-verb".
 * Fire these using `useUserInteraction()` from `~/concepts/userInteraction`.
 */

export enum RuntimeCatalogTrackingEvent {
  VIEWED = 'Runtime Image Library Viewed',
  SEARCH_COMMITTED = 'Runtime Image Library Search Committed',
  HARDWARE_FILTER_APPLIED = 'Runtime Image Library Hardware Filter Applied',
  ITEM_OPENED = 'Runtime Image Library Item Opened',
}

export type ViewedProperties = {
  tabName: 'runtime-image-library';
};

export type SearchCommittedProperties = {
  hasSearchTerm: boolean;
  /** Comma-joined selected hardware filter values, or 'none'. */
  hardwareFilters: string;
};

export type HardwareFilterAppliedProperties = {
  hardware: string;
};

export type ItemOpenedProperties = {
  runtimeName: string;
  hardware: string;
};

/** Build `hardwareFilters` property from the current filter state. */
export const buildHardwareFiltersValue = (hardwareValues?: string[]): string =>
  hardwareValues && hardwareValues.length > 0 ? hardwareValues.join(', ') : 'none';
