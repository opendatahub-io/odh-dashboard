import { PipelineNodeModel } from '@patternfly/react-topology';
import { LineageEntityType, LineageNodeData } from './LineageNode';

/**
 * Creates a lineage node with dynamic sizing based on content length
 * @param id - Unique node identifier
 * @param label - Display label for the node
 * @param entityType - Type of lineage entity
 * @param options - Additional options for the node
 * @returns PipelineNodeModel configured for lineage display
 */
export const createLineageNode = (
  id: string,
  label: string,
  entityType: LineageEntityType,
  options: {
    features?: number;
    description?: string;
    truncateLength?: number;
  } = {},
): PipelineNodeModel => {
  const { features, description, truncateLength } = options;

  // Calculate appropriate truncate length based on content and entity type
  // Use shorter lengths for better overview when graph is large
  const defaultTruncateLength = (() => {
    switch (entityType) {
      case 'feature_service':
        return 25; // Reduced for overview mode
      case 'batch_feature_view':
      case 'on_demand_feature_view':
        return 20; // Reduced for overview mode
      case 'entity':
      case 'batch_data_source':
      case 'request_source':
        return 18; // Shorter for overview mode
      default:
        return 20;
    }
  })();

  const nodeData: LineageNodeData = {
    label,
    entityType,
    features,
    description,
    truncateLength: truncateLength ?? defaultTruncateLength,
  };

  return {
    id,
    type: 'lineage-node',
    label, // This is what TaskNode uses for display and sizing calculations
    data: nodeData,
    // No width/height specified - let TaskNode calculate dynamically!
  };
};

/**
 * Estimates the visual width a text label will occupy
 * This is a rough approximation for layout planning
 * @param text - The text to measure
 * @param truncateLength - Maximum character length before truncation
 * @returns Estimated width in pixels
 */
export const estimateNodeWidth = (text: string, truncateLength = 30): number => {
  const effectiveLength = Math.min(text.length, truncateLength);
  // Rough approximation: 8px per character + padding + icon space
  const textWidth = effectiveLength * 8;
  const padding = 32; // Left/right padding
  const iconSpace = 24; // Space for status icon
  const minWidth = 120; // Minimum node width

  return Math.max(minWidth, textWidth + padding + iconSpace);
};

/**
 * Helper to create feature view nodes with appropriate sizing
 */
export const createFeatureViewNode = (
  id: string,
  name: string,
  type: 'batch_feature_view' | 'on_demand_feature_view',
  features?: number,
  truncateLength?: number,
): PipelineNodeModel =>
  createLineageNode(
    id,
    `${type === 'batch_feature_view' ? 'Batch' : 'On demand'} FeatureView: ${name}`,
    type,
    { features, truncateLength },
  );

/**
 * Helper to create feature service nodes
 */
export const createFeatureServiceNode = (
  id: string,
  serviceName: string,
  truncateLength?: number,
): PipelineNodeModel =>
  createLineageNode(id, `FeatureService: ${serviceName}`, 'feature_service', { truncateLength });

/**
 * Helper to create data source nodes
 */
export const createDataSourceNode = (
  id: string,
  sourceName: string,
  truncateLength?: number,
): PipelineNodeModel =>
  createLineageNode(id, `Batch data source: ${sourceName}`, 'batch_data_source', {
    truncateLength,
  });
