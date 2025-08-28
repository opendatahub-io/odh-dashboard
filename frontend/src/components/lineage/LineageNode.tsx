import React from 'react';
import {
  GraphElement,
  isNode,
  Node,
  observer,
  WithSelectionProps,
  TaskNode,
  RunStatus,
  useHover,
  ScaleDetailsLevel,
  useAnchor,
  AnchorEnd,
  TaskNodeSourceAnchor,
  TaskNodeTargetAnchor,
} from '@patternfly/react-topology';
import {
  TableIcon,
  DatabaseIcon,
  CubeIcon,
  ShareAltIcon,
  CodeBranchIcon,
} from '@patternfly/react-icons';
import { useEdgeHighlighting } from './edge/edgeStateUtils';

// Define the types of lineage entities
export type LineageEntityType =
  | 'entity'
  | 'batch_data_source'
  | 'batch_feature_view'
  | 'on_demand_feature_view'
  | 'feature_service'
  | 'request_source';

export interface LineageNodeData {
  label: string;
  entityType: LineageEntityType;
  features?: number; // For feature views
  description?: string;
  truncateLength?: number; // Control text truncation (default: 30 for lineage)
}

type LineageNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

// Icon mapping for different entity types
const getEntityIcon = (entityType: LineageEntityType) => {
  switch (entityType) {
    case 'entity':
      return <TableIcon />;
    case 'batch_data_source':
      return <DatabaseIcon />;
    case 'batch_feature_view':
      return <CubeIcon />;
    case 'on_demand_feature_view':
      return <ShareAltIcon />;
    case 'feature_service':
      return <CodeBranchIcon />;
    case 'request_source':
      return <DatabaseIcon />;
    default:
      return <CubeIcon />;
  }
};

// Status mapping for different entity types (optional - for visual variety)
const getEntityStatus = (entityType: LineageEntityType): RunStatus => {
  switch (entityType) {
    case 'entity':
      return RunStatus.Succeeded;
    case 'batch_data_source':
      return RunStatus.Succeeded;
    case 'batch_feature_view':
      return RunStatus.Succeeded;
    case 'on_demand_feature_view':
      return RunStatus.InProgress;
    case 'feature_service':
      return RunStatus.Succeeded;
    case 'request_source':
      return RunStatus.Succeeded;
    default:
      return RunStatus.Succeeded;
  }
};

const LineageNodeInner: React.FC<{ element: Node } & WithSelectionProps> = observer(
  ({ element, onSelect, selected }) => {
    const data = element.getData();
    const [hover, hoverRef] = useHover<SVGGElement>();
    const detailsLevel = element.getGraph().getDetailsLevel();

    // Get the current visualization state to check for highlighting
    const { isConnectedToSelection } = useEdgeHighlighting(element.getId(), selected);

    // Set up proper anchors for edge connections with better positioning
    useAnchor(
      React.useCallback(
        (node: Node) => new TaskNodeSourceAnchor(node, ScaleDetailsLevel.high, 0, false),
        [],
      ),
      AnchorEnd.source,
    );
    useAnchor(
      React.useCallback(
        (node: Node) => new TaskNodeTargetAnchor(node, 0, ScaleDetailsLevel.high, 0, false),
        [],
      ),
      AnchorEnd.target,
    );

    // Get the appropriate icon and status for this entity type
    const entityIcon = data?.entityType ? getEntityIcon(data.entityType) : <CubeIcon />;
    const entityStatus = data?.entityType ? getEntityStatus(data.entityType) : RunStatus.Succeeded;

    // Use custom truncate length or default to 30 for lineage nodes
    const truncateLength = data?.truncateLength ?? 30;

    // Apply highlighting styles
    const nodeClassName = isConnectedToSelection ? 'pf-m-highlighted' : '';

    return (
      <g
        ref={hoverRef}
        className={nodeClassName}
        style={{
          filter: isConnectedToSelection
            ? 'drop-shadow(0 0 6px rgba(0, 123, 255, 0.6))'
            : undefined,
        }}
      >
        <TaskNode
          element={element}
          onSelect={onSelect}
          selected={selected}
          scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
          status={entityStatus}
          customStatusIcon={entityIcon}
          hideDetailsAtMedium
          hiddenDetailsShownStatuses={[RunStatus.Succeeded, RunStatus.InProgress]}
          truncateLength={truncateLength}
        />
      </g>
    );
  },
);

const LineageNode: React.FC<LineageNodeProps> = ({ element, ...rest }) => {
  if (!isNode(element)) {
    throw new Error('LineageNode must be used only on Node elements');
  }
  return <LineageNodeInner element={element} {...rest} />;
};

export default observer(LineageNode);
