import { findConnectedElements } from '@odh-dashboard/internal/components/lineage/graphUtils';
import { LineageData, TopologyEdgeModel } from '@odh-dashboard/internal/components/lineage/types';
import { mockFeatureStoreLineage } from '../../../__mocks__/mockLineage';
import { mockEntity } from '../../../__mocks__/mockEntities';
import { FeatureViewLineage } from '../../../types/lineage';
import {
  applyLineageFilters,
  extractFilterOptionsFromFeatureViewLineage,
  extractFilterOptionsFromLineage,
  filterNodesBySearch,
  filterNodesWithoutRelationships,
} from '../utils';

jest.mock('@odh-dashboard/internal/components/lineage/graphUtils', () => ({
  findConnectedElements: jest.fn(),
}));

jest.mock('@patternfly/react-topology', () => ({
  EdgeStyle: { default: 'default', dashed: 'dashed' },
}));

const mockFindConnectedElements = jest.mocked(findConnectedElements);

const buildRelationship = (
  sourceType: string,
  sourceName: string,
  targetType: string,
  targetName: string,
) => ({
  source: { type: sourceType, name: sourceName },
  target: { type: targetType, name: targetName },
});

const lineageData: LineageData = {
  nodes: [
    {
      id: 'entity-driver',
      label: 'Entity: driver',
      name: 'driver',
      fsObjectTypes: 'entity',
      entityType: 'entity',
    },
    {
      id: 'featureview-driver_stats',
      label: 'Batch Feature View: driver_stats',
      name: 'driver_stats',
      fsObjectTypes: 'feature_view',
      entityType: 'batch_feature_view',
    },
    {
      id: 'datasource-driver_source',
      label: 'Batch Data Source: driver_source',
      name: 'driver_source',
      fsObjectTypes: 'data_source',
      entityType: 'batch_data_source',
    },
    {
      id: 'featureservice-driver_activity',
      label: 'FeatureService: driver_activity',
      name: 'driver_activity',
      fsObjectTypes: 'feature_service',
      entityType: 'feature_service',
    },
  ],
  edges: [
    { id: 'fv-edge-0', source: 'entity-driver', target: 'featureview-driver_stats' },
    { id: 'fv-edge-1', source: 'datasource-driver_source', target: 'featureview-driver_stats' },
    {
      id: 'positioning-edge-2-3',
      source: 'featureview-driver_stats',
      target: 'featureservice-driver_activity',
      isPositioningEdge: true,
    },
  ],
};

describe('extractFilterOptionsFromLineage', () => {
  it('maps each store object to a project-scoped filter option', () => {
    const options = extractFilterOptionsFromLineage(mockFeatureStoreLineage());

    expect(options.entity).toEqual([
      {
        id: 'credit_scoring_local-entity-user_id',
        name: 'user_id',
        description: expect.any(String),
      },
    ]);
    expect(options.dataSource.map((option) => option.id)).toEqual([
      'credit_scoring_local-datasource-loan_data',
    ]);
    expect(options.featureView.map((option) => option.id)).toEqual([
      'credit_scoring_local-featureview-zipcode_features',
    ]);
    expect(options.featureService.map((option) => option.id)).toEqual([
      'credit_scoring_local-featureservice-credit_scoring_service',
    ]);
  });

  it('skips objects without a name', () => {
    const lineages = mockFeatureStoreLineage({
      objects: {
        entities: [mockEntity({ spec: { name: '' } }), mockEntity()],
        dataSources: [],
        featureViews: [],
        featureServices: [],
        features: [],
      },
    });

    const options = extractFilterOptionsFromLineage(lineages);

    expect(options.entity.map((option) => option.name)).toEqual(['user_id']);
  });

  it('returns empty buckets for a feature view lineage', () => {
    const featureViewLineage: FeatureViewLineage = {
      relationships: [buildRelationship('entity', 'driver', 'featureView', 'driver_stats')],
      pagination: { totalCount: 1, totalPages: 1 },
    };

    const options = extractFilterOptionsFromLineage(featureViewLineage);

    expect(options).toEqual({
      entity: [],
      featureView: [],
      dataSource: [],
      featureService: [],
    });
  });
});

describe('extractFilterOptionsFromFeatureViewLineage', () => {
  it('buckets relationship objects by their type', () => {
    const featureViewLineage: FeatureViewLineage = {
      relationships: [
        buildRelationship('entity', 'driver', 'featureView', 'driver_stats'),
        buildRelationship(
          'onDemandFeatureView',
          'conv_rate_view',
          'streamFeatureView',
          'stream_view',
        ),
        buildRelationship('batchDataSource', 'batch_source', 'pushDataSource', 'push_source'),
        buildRelationship('featureView', 'driver_stats', 'featureService', 'driver_activity'),
      ],
      pagination: { totalCount: 4, totalPages: 1 },
    };

    const options = extractFilterOptionsFromFeatureViewLineage(featureViewLineage, 'rbac');

    expect(options.entity.map((option) => option.id)).toEqual(['rbac-entity-driver']);
    expect(options.featureView.map((option) => option.name)).toEqual([
      'driver_stats',
      'conv_rate_view',
      'stream_view',
    ]);
    expect(options.dataSource.map((option) => option.name)).toEqual([
      'batch_source',
      'push_source',
    ]);
    expect(options.featureService.map((option) => option.name)).toEqual(['driver_activity']);
  });

  it('returns empty buckets for a store lineage', () => {
    const options = extractFilterOptionsFromFeatureViewLineage(mockFeatureStoreLineage(), 'rbac');

    expect(options.entity).toEqual([]);
    expect(options.featureView).toEqual([]);
    expect(options.dataSource).toEqual([]);
    expect(options.featureService).toEqual([]);
  });
});

describe('filterNodesWithoutRelationships', () => {
  it('drops nodes reachable only through positioning edges', () => {
    const data: LineageData = {
      nodes: [
        ...lineageData.nodes.slice(0, 3),
        {
          id: 'featureservice-isolated',
          label: 'FeatureService: isolated',
          name: 'isolated',
          fsObjectTypes: 'feature_service',
          entityType: 'feature_service',
        },
      ],
      edges: [
        { id: 'fv-edge-0', source: 'entity-driver', target: 'featureview-driver_stats' },
        {
          id: 'positioning-edge-2-3',
          source: 'featureview-driver_stats',
          target: 'featureservice-isolated',
          isPositioningEdge: true,
        },
      ],
    };

    const filtered = filterNodesWithoutRelationships(data);

    expect(filtered.nodes.map((node) => node.id)).toEqual([
      'entity-driver',
      'featureview-driver_stats',
    ]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(['fv-edge-0']);
  });
});

describe('filterNodesBySearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the data unchanged when no filter is active', () => {
    expect(filterNodesBySearch(lineageData, { entity: [], featureView: [] })).toBe(lineageData);
  });

  it('keeps matching nodes and the nodes connected to them', () => {
    mockFindConnectedElements.mockReturnValue([
      'entity-driver',
      'fv-edge-0',
      'featureview-driver_stats',
    ]);

    const filtered = filterNodesBySearch(lineageData, { entity: ['driver'] });

    expect(mockFindConnectedElements).toHaveBeenCalledWith(
      'entity-driver',
      expect.arrayContaining([expect.objectContaining({ source: 'entity-driver' })]),
    );
    expect(filtered.nodes.map((node) => node.id)).toEqual([
      'entity-driver',
      'featureview-driver_stats',
    ]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(['fv-edge-0']);

    const edgesPassedToTraversal: TopologyEdgeModel[] = mockFindConnectedElements.mock.calls[0][1];
    // 'positioning-edge-2-3' is the only positioning edge in the fixture, so it must never be
    // handed to the traversal: layout-only edges must not make nodes look connected.
    expect(edgesPassedToTraversal.every((edge) => !edge.data?.isPositioningEdge)).toBe(true);
    expect(edgesPassedToTraversal.map((edge) => edge.id)).not.toContain('positioning-edge-2-3');
  });

  it('returns an empty result when no node matches the filters', () => {
    const filtered = filterNodesBySearch(lineageData, { entity: ['does-not-exist'] });

    expect(filtered).toEqual({ nodes: [], edges: [] });
    expect(mockFindConnectedElements).not.toHaveBeenCalled();
  });

  it('matches feature view names case-insensitively on partial input', () => {
    mockFindConnectedElements.mockReturnValue(['featureview-driver_stats']);

    const filtered = filterNodesBySearch(lineageData, { featureView: ['DRIVER_ST'] });

    expect(filtered.nodes.map((node) => node.id)).toEqual(['featureview-driver_stats']);
  });
});

describe('applyLineageFilters', () => {
  it('returns the data unchanged when no option is set', () => {
    expect(applyLineageFilters(lineageData, {})).toBe(lineageData);
  });

  it('drops nodes reachable only through positioning edges when hiding unconnected nodes', () => {
    const filtered = applyLineageFilters(lineageData, { hideNodesWithoutRelationships: true });

    expect(filtered.nodes.map((node) => node.id)).toEqual([
      'entity-driver',
      'featureview-driver_stats',
      'datasource-driver_source',
    ]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(['fv-edge-0', 'fv-edge-1']);
  });

  it('applies both the search filters and the hide-unconnected filter', () => {
    // The search also keeps the feature service and the positioning edge that links it,
    // so only the second filter can drop them.
    mockFindConnectedElements.mockReturnValue([
      'entity-driver',
      'fv-edge-0',
      'featureview-driver_stats',
      'featureservice-driver_activity',
    ]);

    const filtered = applyLineageFilters(lineageData, {
      searchFilters: { entity: ['driver'] },
      hideNodesWithoutRelationships: true,
    });

    expect(filtered.nodes.map((node) => node.id)).toEqual([
      'entity-driver',
      'featureview-driver_stats',
    ]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(['fv-edge-0']);
  });
});
