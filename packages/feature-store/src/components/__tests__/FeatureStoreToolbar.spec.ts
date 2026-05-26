import { getSearchFilterPlaceholder } from '../FeatureStoreToolbar';
import { entityTableFilterOptions } from '../../screens/entities/const';
import { featureTableFilterOptions } from '../../screens/features/const';

describe('getSearchFilterPlaceholder', () => {
  it('should return the explicit placeholder when provided', () => {
    expect(
      getSearchFilterPlaceholder('entity', entityTableFilterOptions, 'Custom placeholder'),
    ).toBe('Custom placeholder');
  });

  it('should return "Filter by tag" for the tags filter key', () => {
    expect(getSearchFilterPlaceholder('tags', { tags: 'Tags' })).toBe('Filter by tag');
  });

  it('should return a fallback using the filter key when the label is missing', () => {
    expect(getSearchFilterPlaceholder('unknownKey', {})).toBe('Filter by unknownKey');
  });

  it('should not append " name" for excluded filter keys', () => {
    expect(getSearchFilterPlaceholder('owner', entityTableFilterOptions)).toBe('Filter by owner');
    expect(getSearchFilterPlaceholder('created', entityTableFilterOptions)).toBe(
      'Filter by created after',
    );
    expect(getSearchFilterPlaceholder('updated', entityTableFilterOptions)).toBe(
      'Filter by updated after',
    );
    expect(getSearchFilterPlaceholder('tag', entityTableFilterOptions)).toBe('Filter by tags');
    expect(getSearchFilterPlaceholder('valueType', entityTableFilterOptions)).toBe(
      'Filter by value type',
    );
    expect(getSearchFilterPlaceholder('joinKey', entityTableFilterOptions)).toBe(
      'Filter by join key',
    );
    expect(getSearchFilterPlaceholder('type', { type: 'Type' })).toBe('Filter by type');
    expect(getSearchFilterPlaceholder('storeType', { storeType: 'Store type' })).toBe(
      'Filter by store type',
    );
  });

  it('should not append an extra " name" when the label already ends with " name"', () => {
    expect(getSearchFilterPlaceholder('entity', { entity: 'Entity name' })).toBe(
      'Filter by entity name',
    );
  });

  it('should append " name" for standard searchable filters', () => {
    expect(getSearchFilterPlaceholder('entity', entityTableFilterOptions)).toBe(
      'Filter by entity name',
    );
    expect(getSearchFilterPlaceholder('feature', featureTableFilterOptions)).toBe(
      'Filter by feature name',
    );
    expect(getSearchFilterPlaceholder('featureViews', entityTableFilterOptions)).toBe(
      'Filter by feature views name',
    );
  });
});
