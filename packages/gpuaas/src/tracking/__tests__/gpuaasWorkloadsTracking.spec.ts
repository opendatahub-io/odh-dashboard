import {
  getWorkloadsFilterClearTrackingProperties,
  getWorkloadsSearchTrackingProperties,
  shouldTrackWorkloadsSearch,
} from '../gpuaasTrackingConstants';

describe('Workloads tracking properties', () => {
  it.each([
    ['', 0],
    ['model', 5],
    ['workload-name', 13],
  ])('returns query length for %j', (query, queryLength) => {
    expect(getWorkloadsSearchTrackingProperties(query)).toEqual({ queryLength });
  });
});

describe('Workloads filter clear tracking', () => {
  it.each([
    [0, { hadActiveFilters: false, filterCount: 0 }],
    [2, { hadActiveFilters: true, filterCount: 2 }],
  ])('reports active filter state before clear: %j', (filterCount, expected) => {
    expect(getWorkloadsFilterClearTrackingProperties(filterCount)).toEqual(expected);
  });
});

describe('Workloads search tracking', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['model', true],
  ])('tracks only non-empty queries: %j', (query, expected) => {
    expect(shouldTrackWorkloadsSearch(query)).toBe(expected);
  });
});
