import { EdgeStyle, NodeModel } from '@patternfly/react-topology';
import { FeatureColumns } from '../../types/features';

export type LineageEntityType =
  | 'entity'
  | 'batch_data_source'
  | 'push_data_source'
  | 'request_data_source'
  | 'batch_feature_view'
  | 'on_demand_feature_view'
  | 'stream_feature_view'
  | 'feature_service';

export interface LineageNode {
  id: string;
  label: string;
  entityType: LineageEntityType;
  fsObjectTypes: 'entity' | 'data_source' | 'feature_view' | 'feature_service';
  features?: FeatureColumns[];
  description?: string;
  truncateLength?: number;
  layer?: number; // Optional layer for positioning (0=leftmost, higher=rightward)
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  edgeStyle?: EdgeStyle;
  type?: string;
  isPositioningEdge?: boolean; // Marks edges used only for layout positioning
}

export interface LineageData {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface LineageProps {
  data: LineageData;
  height?: string;
  loading?: boolean;
  error?: string;
  emptyStateMessage?: string;
  onNodeSelect?: (nodeId: string | null) => void;
  className?: string;
  title?: string;
  showNodePopover?: boolean; // Enable/disable node popover functionality (default: true)
}

export const convertToLineageNodeModel = (node: LineageNode): NodeModel => {
  const { id, label, entityType, features, description, truncateLength, layer } = node;

  return {
    id,
    type: 'lineage-node',
    label,
    data: {
      label,
      entityType,
      features,
      description,
      truncateLength,
      layer,
    },
  };
};

export interface TopologyEdgeModel {
  id: string;
  type: string;
  source: string;
  target: string;
  edgeStyle?: EdgeStyle;
  data?: {
    isPositioningEdge?: boolean;
  };
}

export const convertToLineageEdgeModel = (edge: LineageEdge): TopologyEdgeModel => {
  const {
    id,
    source,
    target,
    edgeStyle = EdgeStyle.default,
    type = 'curved-edge',
    isPositioningEdge,
  } = edge;

  return {
    id,
    type,
    source,
    target,
    edgeStyle,
    data: {
      isPositioningEdge,
    },
  };
};
