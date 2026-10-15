import {
  RuntimeCatalogTrackingEvent,
  buildHardwareFiltersValue,
} from '~/odh/pages/runtimeCatalog/tracking/runtimeCatalogTracking';

describe('RuntimeCatalogTrackingEvent', () => {
  it('should have correct event names', () => {
    expect(RuntimeCatalogTrackingEvent.VIEWED).toBe('Runtime Image Library Viewed');
    expect(RuntimeCatalogTrackingEvent.SEARCH_COMMITTED).toBe(
      'Runtime Image Library Search Committed',
    );
    expect(RuntimeCatalogTrackingEvent.HARDWARE_FILTER_APPLIED).toBe(
      'Runtime Image Library Hardware Filter Applied',
    );
    expect(RuntimeCatalogTrackingEvent.ITEM_OPENED).toBe('Runtime Image Library Item Opened');
  });
});

describe('buildHardwareFiltersValue', () => {
  it('should return "none" when no hardware values are selected', () => {
    expect(buildHardwareFiltersValue(undefined)).toBe('none');
    expect(buildHardwareFiltersValue([])).toBe('none');
  });

  it('should return a single value when one hardware filter is selected', () => {
    expect(buildHardwareFiltersValue(['nvidia.com/gpu'])).toBe('nvidia.com/gpu');
  });

  it('should return comma-separated values when multiple hardware filters are selected', () => {
    expect(buildHardwareFiltersValue(['cpu', 'nvidia.com/gpu'])).toBe('cpu, nvidia.com/gpu');
  });
});
