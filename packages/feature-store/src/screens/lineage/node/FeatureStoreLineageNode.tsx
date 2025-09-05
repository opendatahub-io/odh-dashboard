import React from 'react';
import {
  GraphElement,
  isNode,
  Node,
  observer,
  WithSelectionProps,
  RunStatus,
  useHover,
  ScaleDetailsLevel,
  useAnchor,
  AnchorEnd,
} from '@patternfly/react-topology';
import { CubeIcon } from '@patternfly/react-icons';
import { chart_color_black_500 as chartColorBlack } from '@patternfly/react-tokens';
import { useEdgeHighlighting } from '@odh-dashboard/internal/components/lineage/edge/edgeStateUtils';
import { useLineageClick } from '@odh-dashboard/internal/components/lineage/LineageClickContext';
import LineageTaskPill from '@odh-dashboard/internal/components/lineage/node/LineageTaskPill';
import {
  LineageSourceAnchor,
  LineageTargetAnchor,
} from '@odh-dashboard/internal/components/lineage/anchors/customAnchors';
import { getEntityTypeIcon } from '../../../utils/featureStoreObjects.tsx';

type LineageNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const LineageNodeInner: React.FC<{ element: Node } & WithSelectionProps> = observer(
  ({ element, onSelect, selected }) => {
    const data = element.getData();
    const [hover, hoverRef] = useHover<SVGGElement>();
    const detailsLevel = element.getGraph().getDetailsLevel();
    const { setClickPosition } = useLineageClick();

    // Get the current visualization state to check for highlighting
    const { isConnectedToSelection } = useEdgeHighlighting(element.getId(), selected);

    // Set up custom anchors for precise edge positioning
    // Source anchor positioned at the right edge of the node for outgoing edges
    useAnchor(
      React.useCallback((node: Node) => new LineageSourceAnchor(node), []),
      AnchorEnd.source,
    );
    // Target anchor positioned at the left edge of the node for incoming edges
    useAnchor(
      React.useCallback((node: Node) => new LineageTargetAnchor(node), []),
      AnchorEnd.target,
    );

    const entityIcon = data?.entityType ? (
      getEntityTypeIcon(data.entityType, selected)
    ) : (
      <CubeIcon style={{ color: selected ? '#ffffff' : chartColorBlack.value }} />
    );
    const truncateLength = data?.truncateLength ?? 30;
    const nodeClassName = isConnectedToSelection ? 'pf-m-highlighted' : '';

    // Create badge for feature views showing feature count
    const badge = (() => {
      const featureCount = data?.features?.length ?? 0;
      if (
        data?.entityType &&
        ['batch_feature_view', 'on_demand_feature_view', 'stream_feature_view'].includes(
          data.entityType,
        ) &&
        featureCount > 0
      ) {
        return `${featureCount} feature${featureCount === 1 ? '' : 's'}`;
      }
      return undefined;
    })();

    // Custom click handler that captures mouse position
    const handleNodeClick = React.useCallback(
      (e: React.MouseEvent) => {
        // Store click position for popover positioning
        setClickPosition({
          x: e.clientX,
          y: e.clientY,
        });

        // Call original selection handler with proper signature
        if (onSelect) {
          onSelect(e);
        }
      },
      [setClickPosition, onSelect],
    );

    // Get node bounds for positioning
    const bounds = element.getBounds();

    return (
      <g
        ref={hoverRef}
        className={nodeClassName}
        style={{
          filter: isConnectedToSelection
            ? 'drop-shadow(0 0 6px rgba(0, 123, 255, 0.6))'
            : undefined,
          cursor: 'pointer',
        }}
        onClick={handleNodeClick} // Use our custom click handler
      >
        <LineageTaskPill
          element={element}
          onSelect={() => undefined} // Disable default selection
          selected={selected}
          scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
          status={RunStatus.Idle}
          customStatusIcon={entityIcon}
          hideDetailsAtMedium
          hiddenDetailsShownStatuses={[RunStatus.Idle]}
          truncateLength={truncateLength}
          badge={badge}
          hover={hover}
          width={bounds.width}
          x={0} // Position relative to the group
          y={0}
        />
      </g>
    );
  },
);

const FeatureStoreLineageNode: React.FC<LineageNodeProps> = ({ element, ...rest }) => {
  if (!isNode(element)) {
    throw new Error('LineageNode must be used only on Node elements');
  }
  return <LineageNodeInner element={element} {...rest} />;
};

export default observer(FeatureStoreLineageNode);
