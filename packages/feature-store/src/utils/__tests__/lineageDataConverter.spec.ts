import { convertFeatureViewLineageToVisualizationData } from '../lineageDataConverter';
import { FeatureViewLineage } from '../../types/lineage';
import { FeatureColumns } from '../../types/features';

jest.mock('@patternfly/react-topology', () => ({
  EdgeStyle: { default: 'default', dashed: 'dashed' },
}));

const buildRelationship = (
  sourceType: string,
  sourceName: string,
  targetType: string,
  targetName: string,
) => ({
  source: { type: sourceType, name: sourceName },
  target: { type: targetType, name: targetName },
});

describe('convertFeatureViewLineageToVisualizationData', () => {
  const baseLineage: FeatureViewLineage = {
    relationships: [
      buildRelationship('entity', 'driver', 'featureView', 'driver_stats'),
      buildRelationship('dataSource', 'driver_source', 'featureView', 'driver_stats'),
      buildRelationship('feature', 'conv_rate', 'featureView', 'driver_stats'),
      buildRelationship('feature', 'acc_rate', 'featureView', 'driver_stats'),
      buildRelationship('feature', 'avg_daily_trips', 'featureView', 'driver_stats'),
      buildRelationship('featureView', 'driver_stats', 'featureService', 'driver_activity'),
    ],
    pagination: { totalCount: 6, totalPages: 1 },
  };

  const convert = (
    lineage = baseLineage,
    name = 'driver_stats',
    type: 'featureView' | 'onDemandFeatureView' | 'streamFeatureView' = 'featureView',
    features?: FeatureColumns[],
  ) => convertFeatureViewLineageToVisualizationData(lineage, name, type, features);

  it('creates nodes for non-feature objects only', () => {
    const { nodes } = convert();

    const nodeNames = nodes.map((n) => n.name);
    expect(nodeNames).toContain('driver');
    expect(nodeNames).toContain('driver_source');
    expect(nodeNames).toContain('driver_stats');
    expect(nodeNames).toContain('driver_activity');
    expect(nodeNames).not.toContain('conv_rate');
    expect(nodeNames).not.toContain('acc_rate');
    expect(nodeNames).not.toContain('avg_daily_trips');
  });

  it('excludes edges for feature-type relationships', () => {
    const { edges } = convert();

    expect(edges).toHaveLength(3);
    edges.forEach((edge) => {
      expect(edge.source).not.toContain('feature-');
      expect(edge.target).not.toContain('feature-');
    });
  });

  it('derives feature count from relationships when no explicit features are passed', () => {
    const { nodes } = convert();

    const currentNode = nodes.find((n) => n.name === 'driver_stats');
    expect(currentNode?.features).toHaveLength(3);
    expect(currentNode?.features?.map((f) => f.name).toSorted()).toEqual([
      'acc_rate',
      'avg_daily_trips',
      'conv_rate',
    ]);
  });

  it('uses explicit features over relationship-derived ones for the current view', () => {
    const explicitFeatures = [
      { name: 'conv_rate', valueType: 'FLOAT' },
      { name: 'acc_rate', valueType: 'FLOAT', description: 'Acceptance rate' },
      { name: 'avg_daily_trips', valueType: 'INT64' },
    ];

    const { nodes } = convert(baseLineage, 'driver_stats', 'featureView', explicitFeatures);

    const currentNode = nodes.find((n) => n.name === 'driver_stats');
    expect(currentNode?.features).toHaveLength(3);
    expect(currentNode?.features?.[0].valueType).toBe('FLOAT');
    expect(currentNode?.features?.[1].description).toBe('Acceptance rate');
  });

  it('marks the current feature view with highlighted and description', () => {
    const { nodes } = convert();

    const currentNode = nodes.find((n) => n.name === 'driver_stats');
    expect(currentNode?.highlighted).toBe(true);
    expect(currentNode?.description).toBe('Currently viewing this feature view');
  });

  it('does not mark non-current nodes as highlighted', () => {
    const { nodes } = convert();

    const otherNodes = nodes.filter((n) => n.name !== 'driver_stats');
    expect(otherNodes.length).toBeGreaterThan(0);
    otherNodes.forEach((node) => {
      expect(node.highlighted).toBeUndefined();
      expect(node.description).toBeUndefined();
    });
  });

  it('derives features for other feature views in the lineage', () => {
    const multiViewLineage: FeatureViewLineage = {
      relationships: [
        buildRelationship('entity', 'driver', 'featureView', 'driver_stats'),
        buildRelationship('feature', 'conv_rate', 'featureView', 'driver_stats'),
        buildRelationship('entity', 'customer', 'featureView', 'customer_profile'),
        buildRelationship('feature', 'name', 'featureView', 'customer_profile'),
        buildRelationship('feature', 'email', 'featureView', 'customer_profile'),
      ],
      pagination: { totalCount: 5, totalPages: 1 },
    };

    const { nodes } = convert(multiViewLineage);

    const otherView = nodes.find((n) => n.name === 'customer_profile');
    expect(otherView?.features).toHaveLength(2);
    expect(otherView?.features?.map((f) => f.name).toSorted()).toEqual(['email', 'name']);
  });

  it('applies featureViewType to current node entityType', () => {
    const { nodes } = convert(baseLineage, 'driver_stats', 'onDemandFeatureView');

    const currentNode = nodes.find((n) => n.name === 'driver_stats');
    expect(currentNode?.entityType).toBe('on_demand_feature_view');
  });

  it('returns empty nodes and edges for empty relationships', () => {
    const emptyLineage: FeatureViewLineage = {
      relationships: [],
      pagination: { totalCount: 0, totalPages: 0 },
    };

    const result = convert(emptyLineage);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('deduplicates features from duplicate relationships', () => {
    const dupeLineage: FeatureViewLineage = {
      relationships: [
        buildRelationship('feature', 'conv_rate', 'featureView', 'driver_stats'),
        buildRelationship('feature', 'conv_rate', 'featureView', 'driver_stats'),
        buildRelationship('feature', 'acc_rate', 'featureView', 'driver_stats'),
      ],
      pagination: { totalCount: 3, totalPages: 1 },
    };

    const { nodes } = convert(dupeLineage);

    const currentNode = nodes.find((n) => n.name === 'driver_stats');
    expect(currentNode?.features).toHaveLength(2);
  });
});
