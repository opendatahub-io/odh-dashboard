import React from 'react';
import { EdgeStyle, NodeModel, ComponentFactory } from '@patternfly/react-topology';

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  edgeStyle?: EdgeStyle;
  type?: string;
  isPositioningEdge?: boolean; // Marks edges used only for layout positioning
}

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
  features?: {
    name: string;
    valueType: string;
    description?: string;
    tags?: Record<string, string>;
  }[];
  name: string;
  description?: string;
  truncateLength?: number;
  layer?: number; // Optional layer for positioning (0=leftmost, higher=rightward)
  highlighted?: boolean;
}

export interface LineageData {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface PopoverPosition {
  x: number;
  y: number;
}

export interface PopoverComponentProps {
  node: LineageNode | null;
  position: PopoverPosition | null;
  isVisible: boolean;
  onClose: () => void;
}

export type PopoverComponent = React.ComponentType<PopoverComponentProps>;

export interface LineageProps {
  data: LineageData;
  height?: string;
  loading?: boolean;
  error?: string;
  emptyStateMessage?: string;
  onNodeSelect?: (nodeId: string | null) => void;
  className?: string;
  title?: string;
  showNodePopover?: boolean;
  componentFactory: ComponentFactory;
  popoverComponent?: PopoverComponent;
  toolbarComponent?: React.ComponentType;
  autoResetOnDataChange?: boolean;
}

export const convertToLineageNodeModel = (node: LineageNode): NodeModel => {
  const { id, label, entityType, features, description, truncateLength, layer, highlighted } = node;

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
      highlighted,
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
