import { LineageData } from '@odh-dashboard/internal/components/lineage/types';
import { FeatureStoreLineageSearchFilters } from '../../../types/toolbarTypes';
import { filterNodesBySearch } from '../utils';

jest.mock('@odh-dashboard/internal/components/lineage/graphUtils', () => ({
  findConnectedElements: jest.fn(() => []),
}));

jest.mock('@odh-dashboard/internal/components/lineage/types', () => ({
  ...jest.requireActual('@odh-dashboard/internal/components/lineage/types'),
  convertToLineageEdgeModel: jest.fn((edge) => edge),
}));

const makeNode = (
  id: string,
  name: string,
  fsObjectTypes: 'entity' | 'data_source' | 'feature_view' | 'feature_service',
): LineageData['nodes'][number] => ({
  id,
  name,
  label: name,
  entityType: 'entity',
  fsObjectTypes,
  features: [],
});

const makeData = (
  nodes: LineageData['nodes'] = [],
  edges: LineageData['edges'] = [],
): LineageData => ({ nodes, edges });

describe('filterNodesBySearch', () => {
  it('should return original data when no active filters', () => {
    const data = makeData([makeNode('1', 'my-entity', 'entity')]);
    const filters: FeatureStoreLineageSearchFilters = {};

    expect(filterNodesBySearch(data, filters)).toBe(data);
  });

  it('should return original data when filter arrays are empty', () => {
    const data = makeData([makeNode('1', 'my-entity', 'entity')]);
    const filters: FeatureStoreLineageSearchFilters = { entity: [] };

    expect(filterNodesBySearch(data, filters)).toBe(data);
  });

  it('should treat whitespace-only filter values as inactive', () => {
    const data = makeData([makeNode('1', 'my-entity', 'entity')]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['   ', '  '] };

    expect(filterNodesBySearch(data, filters)).toBe(data);
  });

  it('should return empty result when no nodes match filters', () => {
    const data = makeData([makeNode('1', 'my-entity', 'entity')]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['nonexistent'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should match entity nodes by name', () => {
    const data = makeData([
      makeNode('1', 'customer-entity', 'entity'),
      makeNode('2', 'order-entity', 'entity'),
      makeNode('3', 'my-source', 'data_source'),
    ]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['customer'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('1');
  });

  it('should match feature view nodes by name', () => {
    const data = makeData([
      makeNode('1', 'customer-fv', 'feature_view'),
      makeNode('2', 'order-fv', 'feature_view'),
    ]);
    const filters: FeatureStoreLineageSearchFilters = { featureView: ['order'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('2');
  });

  it('should match data source nodes by name', () => {
    const data = makeData([
      makeNode('1', 'postgres-source', 'data_source'),
      makeNode('2', 'redis-source', 'data_source'),
    ]);
    const filters: FeatureStoreLineageSearchFilters = { dataSource: ['redis'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('2');
  });

  it('should match feature service nodes by name', () => {
    const data = makeData([
      makeNode('1', 'serving-api', 'feature_service'),
      makeNode('2', 'batch-api', 'feature_service'),
    ]);
    const filters: FeatureStoreLineageSearchFilters = { featureService: ['batch'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('2');
  });

  it('should perform case-insensitive matching', () => {
    const data = makeData([makeNode('1', 'CustomerEntity', 'entity')]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['customer'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(1);
  });

  it('should skip whitespace-only values in filter arrays during matching', () => {
    const data = makeData([
      makeNode('1', 'customer-entity', 'entity'),
      makeNode('2', 'order-entity', 'entity'),
    ]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['  ', 'customer', ''] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('1');
  });

  it('should return empty data when input has no nodes', () => {
    const data = makeData([]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['test'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should not match nodes of a different type even if name matches', () => {
    const data = makeData([makeNode('1', 'customer', 'data_source')]);
    const filters: FeatureStoreLineageSearchFilters = { entity: ['customer'] };

    const result = filterNodesBySearch(data, filters);
    expect(result.nodes).toHaveLength(0);
  });
});
