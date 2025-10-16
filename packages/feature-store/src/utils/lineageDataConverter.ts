import { EdgeStyle } from '@patternfly/react-topology';
import {
  LineageData,
  LineageEdge,
  LineageNode,
} from '@odh-dashboard/internal/components/lineage/types';
import { LineageEntityType } from './featureStoreObjects';
import { FeatureStoreLineage, LineageFeatureView, FeatureViewLineage } from '../types/lineage';
import { Entity } from '../types/entities';
import { DataSource } from '../types/dataSources';
import { FeatureService } from '../types/featureServices';
import { FeatureStoreRelationship } from '../types/global';

/**
 * Converts Feature Store lineage data to generic lineage visualization format
 */
export const convertFeatureStoreLineageToVisualizationData = (
  featureStoreLineage: FeatureStoreLineage,
): LineageData => {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const nodeIds = new Set<string>(); // Track which nodes exist

  // Helper to add node only if it doesn't exist
  const addNode = (node: LineageNode) => {
    if (!nodeIds.has(node.id)) {
      nodes.push(node);
      nodeIds.add(node.id);
    }
  };

  featureStoreLineage.objects.entities.forEach((entity: Entity) => {
    addNode({
      id: `entity-${entity.spec.name}`,
      label: `Entity: ${entity.spec.name}`,
      fsObjectTypes: 'entity',
      entityType: 'entity',
      name: entity.spec.name,
      description: entity.spec.description,
      truncateLength: 30,
      layer: 0, // Position entities in layer 0 (leftmost)
    });
  });

  featureStoreLineage.objects.dataSources.forEach((dataSource: DataSource) => {
    addNode({
      id: `datasource-${dataSource.name}`,
      label: `${
        dataSource.type === 'BATCH_FILE'
          ? 'Batch'
          : dataSource.type === 'PUSH_SOURCE'
          ? 'Push'
          : 'Request'
      } Data Source: ${dataSource.name}`,
      fsObjectTypes: 'data_source',
      entityType: 'batch_data_source',
      name: dataSource.name,
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

    addNode({
      id: `featureview-${name}`,
      label: `${
        type === 'batch_feature_view'
          ? 'Batch'
          : type === 'on_demand_feature_view'
          ? 'On demand'
          : 'Stream'
      } Feature View: ${name}`,
      fsObjectTypes: 'feature_view',
      entityType: type,
      features,
      name,
      description,
      truncateLength: 40,
      layer: 2, // Position feature views in layer 2 (third from left)
    });
  });

  featureStoreLineage.objects.featureServices.forEach((featureService: FeatureService) => {
    addNode({
      id: `featureservice-${featureService.spec.name}`,
      label: `FeatureService: ${featureService.spec.name}`,
      fsObjectTypes: 'feature_service',
      entityType: 'feature_service',
      name: featureService.spec.name,
      description: featureService.spec.description,
      truncateLength: 40,
      layer: 3, // Position feature services in layer 3 (rightmost)
    });
  });

  // Create missing nodes from relationships
  // This handles cases where relationships reference objects not in the objects arrays
  const createMissingNodesFromRelationships = () => {
    // Quick check: if we have feature views and feature services in the objects arrays,
    // we likely don't need to create missing nodes (optimization)
    const hasFeatureViews = actualFeatureViews.length > 0;
    const hasFeatureServices = featureStoreLineage.objects.featureServices.length > 0;

    // If we have complete data (both feature views and services present), skip this step
    if (hasFeatureViews && hasFeatureServices) {
      return;
    }

    featureStoreLineage.relationships.forEach((relationship) => {
      // Check source
      if (relationship.source.name && relationship.source.type) {
        const sourceId = mapObjectToNodeId(relationship.source);
        if (sourceId && !nodeIds.has(sourceId)) {
          const config = getObjectTypeConfig(relationship.source.type);
          if (config) {
            addNode({
              id: sourceId,
              label: `${config.labelPrefix}: ${relationship.source.name}`,
              fsObjectTypes: config.fsObjectType,
              entityType: config.entityType,
              name: relationship.source.name,
              truncateLength: 30,
              layer: config.layer,
            });
          }
        }
      }

      // Check target
      if (relationship.target.name && relationship.target.type) {
        const targetId = mapObjectToNodeId(relationship.target);
        if (targetId && !nodeIds.has(targetId)) {
          const config = getObjectTypeConfig(relationship.target.type);
          if (config) {
            addNode({
              id: targetId,
              label: `${config.labelPrefix}: ${relationship.target.name}`,
              fsObjectTypes: config.fsObjectType,
              entityType: config.entityType,
              name: relationship.target.name,
              truncateLength: 30,
              layer: config.layer,
            });
          }
        }
      }
    });
  };

  // Create missing nodes before processing edges
  createMissingNodesFromRelationships();

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

export const convertFeatureViewLineageToVisualizationData = (
  featureViewLineage: FeatureViewLineage,
  featureViewName: string,
): LineageData => {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  // Extract unique objects from relationships
  const uniqueObjects = new Map<string, { type: string; name: string }>();

  featureViewLineage.relationships.forEach((relationship: FeatureStoreRelationship) => {
    const sourceKey = `${relationship.source.type}-${relationship.source.name}`;
    const targetKey = `${relationship.target.type}-${relationship.target.name}`;

    uniqueObjects.set(sourceKey, relationship.source);
    uniqueObjects.set(targetKey, relationship.target);
  });

  // Create nodes for each unique object
  uniqueObjects.forEach((obj, key) => {
    const isCurrentFeatureView = obj.type.includes('featureView') && obj.name === featureViewName;
    const layer = getObjectLayer(obj.type, isCurrentFeatureView);

    nodes.push({
      id: mapObjectToNodeId(obj) || key,
      label: getObjectLabel(obj.type, obj.name),
      fsObjectTypes: mapTypeToFsObjectType(obj.type),
      entityType: mapTypeToEntityType(obj.type),
      name: obj.name,
      truncateLength: 30,
      layer,
      // Highlight the current feature view
      ...(isCurrentFeatureView && { highlighted: true }),
    });
  });

  // Create edges from relationships
  featureViewLineage.relationships.forEach(
    (relationship: FeatureStoreRelationship, index: number) => {
      const sourceId = mapObjectToNodeId(relationship.source);
      const targetId = mapObjectToNodeId(relationship.target);

      if (sourceId && targetId) {
        edges.push({
          id: `fv-edge-${index}`,
          source: sourceId,
          target: targetId,
          edgeStyle: EdgeStyle.default,
          type: 'curved-edge',
        });
      }
    },
  );

  return { nodes, edges };
};

/**
 * Unified configuration for object type mappings
 */
const OBJECT_TYPE_CONFIG = {
  entity: {
    layer: 0,
    labelPrefix: 'Entity',
    fsObjectType: 'entity' as const,
    entityType: 'entity' as const,
    nodeIdPrefix: 'entity',
  },
  dataSource: {
    layer: 1,
    labelPrefix: 'Data Source',
    fsObjectType: 'data_source' as const,
    entityType: 'batch_data_source' as const,
    nodeIdPrefix: 'datasource',
  },
  batchDataSource: {
    layer: 1,
    labelPrefix: 'Batch Data Source',
    fsObjectType: 'data_source' as const,
    entityType: 'batch_data_source' as const,
    nodeIdPrefix: 'datasource',
  },
  pushDataSource: {
    layer: 1,
    labelPrefix: 'Push Data Source',
    fsObjectType: 'data_source' as const,
    entityType: 'push_data_source' as const,
    nodeIdPrefix: 'datasource',
  },
  requestDataSource: {
    layer: 1,
    labelPrefix: 'Request Data Source',
    fsObjectType: 'data_source' as const,
    entityType: 'request_data_source' as const,
    nodeIdPrefix: 'datasource',
  },
  featureView: {
    layer: 2,
    labelPrefix: 'Batch Feature View',
    fsObjectType: 'feature_view' as const,
    entityType: 'batch_feature_view' as const,
    nodeIdPrefix: 'featureview',
  },
  onDemandFeatureView: {
    layer: 2,
    labelPrefix: 'On Demand Feature View',
    fsObjectType: 'feature_view' as const,
    entityType: 'on_demand_feature_view' as const,
    nodeIdPrefix: 'featureview',
  },
  streamFeatureView: {
    layer: 2,
    labelPrefix: 'Stream Feature View',
    fsObjectType: 'feature_view' as const,
    entityType: 'stream_feature_view' as const,
    nodeIdPrefix: 'featureview',
  },
  featureService: {
    layer: 3,
    labelPrefix: 'Feature Service',
    fsObjectType: 'feature_service' as const,
    entityType: 'feature_service' as const,
    nodeIdPrefix: 'featureservice',
  },
} as const;

/**
 * Helper function to safely get object configuration
 */
const getObjectTypeConfig = (objectType: string) => {
  switch (objectType) {
    case 'entity':
      return OBJECT_TYPE_CONFIG.entity;
    case 'dataSource':
      return OBJECT_TYPE_CONFIG.dataSource;
    case 'batchDataSource':
      return OBJECT_TYPE_CONFIG.batchDataSource;
    case 'pushDataSource':
      return OBJECT_TYPE_CONFIG.pushDataSource;
    case 'requestDataSource':
      return OBJECT_TYPE_CONFIG.requestDataSource;
    case 'featureView':
      return OBJECT_TYPE_CONFIG.featureView;
    case 'onDemandFeatureView':
      return OBJECT_TYPE_CONFIG.onDemandFeatureView;
    case 'streamFeatureView':
      return OBJECT_TYPE_CONFIG.streamFeatureView;
    case 'featureService':
      return OBJECT_TYPE_CONFIG.featureService;
    default:
      return null;
  }
};

/**
 * Determines the layer for an object in feature view lineage
 */
const getObjectLayer = (objectType: string, isCurrentFeatureView: boolean): number => {
  if (isCurrentFeatureView) {
    return 2; // Center the current feature view
  }

  const config = getObjectTypeConfig(objectType);
  return config ? config.layer : 1; // Default fallback
};

/**
 * Maps object type to human-readable label
 */
const getObjectLabel = (objectType: string, objectName: string): string => {
  const config = getObjectTypeConfig(objectType);
  const prefix = config ? config.labelPrefix : objectType;
  return `${prefix}: ${objectName}`;
};

/**
 * Maps object type to fsObjectTypes for feature store
 */
const mapTypeToFsObjectType = (
  objectType: string,
): 'entity' | 'data_source' | 'feature_view' | 'feature_service' => {
  const config = getObjectTypeConfig(objectType);
  return config ? config.fsObjectType : 'data_source'; // Default fallback to a valid type
};

/**
 * Maps object type to entityType for visualization
 */
const mapTypeToEntityType = (objectType: string): LineageEntityType => {
  const config = getObjectTypeConfig(objectType);
  return config ? config.entityType : 'batch_data_source'; // Default fallback to a valid type
};

/**
 * Maps a feature store object reference to a lineage node ID
 */
const mapObjectToNodeId = (objectRef: { name?: string; type?: string }): string | null => {
  if (!objectRef.name || !objectRef.type) {
    return null;
  }

  const config = getObjectTypeConfig(objectRef.type);
  if (config) {
    return `${config.nodeIdPrefix}-${objectRef.name}`;
  }

  console.warn(`Unknown object type for lineage mapping: ${objectRef.type}`);
  return null;
};
