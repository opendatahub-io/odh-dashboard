import { EdgeStyle } from '@patternfly/react-topology';
import {
  LineageData,
  LineageNode,
  LineageEdge,
} from '@odh-dashboard/internal/components/lineage/types';
import { FeatureStoreLineage, LineageFeatureView } from '../types/lineage';
import { Entity } from '../types/entities';
import { DataSource } from '../types/dataSources';
import { FeatureService } from '../types/featureServices';

/**
 * Converts Feature Store lineage data to generic lineage visualization format
 */
export const convertFeatureStoreLineageToVisualizationData = (
  featureStoreLineage: FeatureStoreLineage,
): LineageData => {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  featureStoreLineage.objects.entities.forEach((entity: Entity) => {
    nodes.push({
      id: `entity-${entity.spec.name}`,
      label: `Entity: ${entity.spec.name}`,
      entityType: 'entity',
      description: entity.spec.description,
      truncateLength: 30,
      layer: 0, // Position entities in layer 0 (leftmost)
    });
  });

  featureStoreLineage.objects.dataSources.forEach((dataSource: DataSource) => {
    nodes.push({
      id: `datasource-${dataSource.name}`,
      label: `${
        dataSource.type === 'batch' ? 'Batch' : dataSource.type === 'push' ? 'Push' : 'Request'
      } Data Source: ${dataSource.name}`,
      entityType: 'batch_data_source',
      description: dataSource.description,
      truncateLength: 30,
      layer: 1, // Position data sources in layer 1 (second from left)
    });
  });

  // Filter out pagination metadata objects (they have totalCount and totalPages properties)
  const actualFeatureViews = featureStoreLineage.objects.featureViews.filter(
    (item) => !('totalCount' in item && 'totalPages' in item),
  );

  actualFeatureViews.forEach((lineageFeatureView: LineageFeatureView) => {
    const { name, description, features } =
      'featureView' in lineageFeatureView
        ? lineageFeatureView.featureView.spec
        : 'onDemandFeatureView' in lineageFeatureView
        ? lineageFeatureView.onDemandFeatureView.spec
        : lineageFeatureView.streamFeatureView.spec;
    const type =
      'featureView' in lineageFeatureView
        ? 'batch_feature_view'
        : 'onDemandFeatureView' in lineageFeatureView
        ? 'on_demand_feature_view'
        : 'stream_feature_view';

    nodes.push({
      id: `featureview-${name}`,
      label: `${
        type === 'batch_feature_view'
          ? 'Batch'
          : type === 'on_demand_feature_view'
          ? 'On demand'
          : 'Stream'
      } Feature View: ${name}`,
      entityType: type,
      features: features.length,
      description,
      truncateLength: 40,
      layer: 2, // Position feature views in layer 2 (third from left)
    });
  });

  featureStoreLineage.objects.featureServices.forEach((featureService: FeatureService) => {
    nodes.push({
      id: `featureservice-${featureService.spec.name}`,
      label: `FeatureService: ${featureService.spec.name}`,
      entityType: 'feature_service',
      description: featureService.spec.description,
      truncateLength: 40,
      layer: 3, // Position feature services in layer 3 (rightmost)
    });
  });

  // Add invisible positioning edges to ensure proper layer ordering
  // These edges help DagreLayout position nodes correctly even when there are no direct relationships
  const addPositioningEdges = () => {
    const layerGroups: { [key: number]: LineageNode[] } = {};

    // Group nodes by layer
    nodes.forEach((node) => {
      const layer = node.layer ?? 999;
      layerGroups[layer] = layerGroups[layer] ?? [];
      layerGroups[layer].push(node);
    });

    const sortedLayers = Object.keys(layerGroups)
      .map(Number)
      .toSorted((a, b) => a - b);

    // Add invisible edges between consecutive layers to enforce ordering
    for (let i = 0; i < sortedLayers.length - 1; i++) {
      const currentLayer = sortedLayers[i];
      const nextLayer = sortedLayers[i + 1];

      // Connect first node of current layer to first node of next layer
      if (layerGroups[currentLayer].length > 0 && layerGroups[nextLayer].length > 0) {
        const sourceNode = layerGroups[currentLayer][0];
        const targetNode = layerGroups[nextLayer][0];

        edges.push({
          id: `positioning-edge-${currentLayer}-${nextLayer}`,
          source: sourceNode.id,
          target: targetNode.id,
          edgeStyle: EdgeStyle.default,
          type: 'curved-edge',
          isPositioningEdge: true, // Mark as positioning edge for potential styling
        });
      }
    }
  };

  // Add positioning edges first
  addPositioningEdges();

  // Create edges based on relationships
  featureStoreLineage.relationships.forEach((relationship, index) => {
    const edgeId = `edge-${index}`;

    const sourceId = mapObjectToNodeId(relationship.source);
    const targetId = mapObjectToNodeId(relationship.target);

    if (sourceId && targetId) {
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        edgeStyle: EdgeStyle.default,
        type: 'curved-edge',
      });
    }
  });

  // TODO: Hiding the indirect relationships for now
  // featureStoreLineage.indirectRelationships.forEach((relationship, index) => {
  //   const edgeId = `indirect-edge-${index}`;

  //   const sourceId = mapObjectToNodeId(relationship.source);
  //   const targetId = mapObjectToNodeId(relationship.target);

  //   if (sourceId && targetId) {
  //     edges.push({
  //       id: edgeId,
  //       source: sourceId,
  //       target: targetId,
  //       edgeStyle: EdgeStyle.dashed, // Use dashed style for indirect relationships
  //       type: 'curved-edge',
  //     });
  //   }
  // });

  return { nodes, edges };
};

/**
 * Maps a feature store object reference to a lineage node ID
 */
const mapObjectToNodeId = (objectRef: { name?: string; type?: string }): string | null => {
  if (!objectRef.name || !objectRef.type) {
    return null;
  }

  switch (objectRef.type) {
    case 'entity':
      return `entity-${objectRef.name}`;
    case 'dataSource':
      return `datasource-${objectRef.name}`;
    case 'featureView':
    case 'onDemandFeatureView':
    case 'streamFeatureView':
      return `featureview-${objectRef.name}`;
    case 'featureService':
      return `featureservice-${objectRef.name}`;
    default:
      console.warn(`Unknown object type for lineage mapping: ${objectRef.type}`);
      return null;
  }
};
