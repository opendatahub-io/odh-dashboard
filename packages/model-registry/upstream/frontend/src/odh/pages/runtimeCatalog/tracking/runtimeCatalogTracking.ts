/**
 * Runtime Image Library Segment event names and property types.
 *
 * Naming convention follows "What-noun Past-Tensed-verb".
 * Fire these using `useUserInteraction()` from `~/concepts/userInteraction`.
 */

export enum RuntimeCatalogTrackingEvent {
  SEARCH_COMMITTED = 'Runtime Image Library Search Committed',
  ITEM_OPENED = 'Runtime Image Library Item Opened',
}

export type SearchCommittedProperties = {
  hasSearchTerm: boolean;
  /** Comma-joined selected hardware filter values, or 'none'. */
  hardwareFilters: string;
};

export type ItemOpenedProperties = {
  runtimeName: string;
  hardware: string;
};

/** Build `hardwareFilters` property from the current filter state. */
export const buildHardwareFiltersValue = (hardwareValues?: string[]): string =>
  hardwareValues && hardwareValues.length > 0 ? hardwareValues.join(', ') : 'none';
