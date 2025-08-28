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
import { DatabaseIcon, CubeIcon, CodeBranchIcon, BuildIcon } from '@patternfly/react-icons';
import {
  chart_color_blue_200 as chartColorBlue,
  chart_color_green_200 as chartColorGreen,
  chart_color_purple_200 as chartColorPurple,
  chart_color_black_500 as chartColorBlack,
} from '@patternfly/react-tokens';
import { useEdgeHighlighting } from './edge/edgeStateUtils';

// Define the types of lineage entities
export type LineageEntityType =
  | 'entity'
  | 'batch_data_source'
  | 'push_data_source'
  | 'request_data_source'
  | 'batch_feature_view'
  | 'on_demand_feature_view'
  | 'stream_feature_view'
  | 'feature_service';

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
const getEntityIcon = (entityType: LineageEntityType, selected = false) => {
  const iconColor = selected ? '#ffffff' : undefined;

  switch (entityType) {
    case 'entity':
      return <CodeBranchIcon style={{ color: iconColor || chartColorBlack.value }} />;
    case 'batch_data_source':
    case 'push_data_source':
    case 'request_data_source':
      return <DatabaseIcon style={{ color: iconColor || chartColorBlue.value }} />;
    case 'batch_feature_view':
    case 'on_demand_feature_view':
    case 'stream_feature_view':
      return <BuildIcon style={{ color: iconColor || chartColorPurple.value }} />;
    case 'feature_service':
      return <BuildIcon style={{ color: iconColor || chartColorGreen.value }} />;
    default:
      return <CubeIcon style={{ color: iconColor || chartColorBlack.value }} />;
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

    const entityIcon = data?.entityType ? (
      getEntityIcon(data.entityType, selected)
    ) : (
      <CubeIcon style={{ color: selected ? '#ffffff' : chartColorBlack.value }} />
    );
    const truncateLength = data?.truncateLength ?? 30;
    const nodeClassName = isConnectedToSelection ? 'pf-m-highlighted' : '';

    // Create badge for feature views showing feature count
    const badge = (() => {
      if (
        data?.entityType &&
        ['batch_feature_view', 'on_demand_feature_view', 'stream_feature_view'].includes(
          data.entityType,
        ) &&
        data.features !== undefined &&
        data.features > 0
      ) {
        return `${data.features} feature${data.features === 1 ? '' : 's'}`;
      }
      return undefined;
    })();

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
          status={RunStatus.Idle}
          customStatusIcon={entityIcon}
          hideDetailsAtMedium
          hiddenDetailsShownStatuses={[RunStatus.Idle]}
          truncateLength={truncateLength}
          badge={badge}
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
