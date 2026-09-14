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
import { useEdgeHighlighting } from '@odh-dashboard/internal/components/lineage/edge/edgeStateUtils';
import { useLineageClick } from '@odh-dashboard/internal/components/lineage/LineageClickContext';
import LineageTaskPill from '@odh-dashboard/internal/components/lineage/node/LineageTaskPill';
import {
  LineageSourceAnchor,
  LineageTargetAnchor,
} from '@odh-dashboard/internal/components/lineage/anchors/customAnchors';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { LINEAGE_PILL_ICON_SIZE } from '../../../utils/featureStoreObjects.tsx';
import FeatureStoreLineagePillIcon from '../../../components/FeatureStoreLineagePillIcon';
import {
  FEATURE_STORE_EVENTS,
  LineageNodeSelectedProperties,
} from '../../../tracking/featureStoreTrackingConstants';
import { useLineagePageType } from '../LineagePageContext';

type LineageNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const LineageNodeInner: React.FC<{ element: Node } & WithSelectionProps> = observer(
  ({ element, onSelect, selected }) => {
    const data = element.getData();
    const [hover, hoverRef] = useHover<SVGGElement>();
    const detailsLevel = element.getGraph().getDetailsLevel();
    const { setClickPosition } = useLineageClick();
    const lineagePageType = useLineagePageType();

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
      <foreignObject
        width={LINEAGE_PILL_ICON_SIZE}
        height={LINEAGE_PILL_ICON_SIZE}
        aria-hidden="true"
      >
        <FeatureStoreLineagePillIcon entityType={data.entityType} selected={selected} />
      </foreignObject>
    ) : (
      <g aria-hidden="true">
        <CubeIcon
          style={{
            color: selected
              ? 'var(--ai-fs-lineage-pill--AccentIconColor)'
              : 'var(--pf-t--global--text--color--regular)',
            width: LINEAGE_PILL_ICON_SIZE,
            height: LINEAGE_PILL_ICON_SIZE,
          }}
        />
      </g>
    );
    const truncateLength = data?.truncateLength ?? 30;
    const nodeClassName = isConnectedToSelection ? 'pf-m-highlighted' : '';
    const pillBackgroundColor =
      !selected && data?.entityType
        ? 'var(--pf-t--global--background--color--primary--default)'
        : undefined;

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

    const handleNodeClick = React.useCallback(
      (e: React.MouseEvent) => {
        const { currentTarget } = e;
        const pillElement =
          currentTarget instanceof Element
            ? currentTarget.querySelector('[data-testid="lineage-pill-background"]') ??
              currentTarget.querySelector('foreignObject') ??
              currentTarget
            : null;

        // Store click position and pill element for popover positioning
        setClickPosition({
          x: e.clientX,
          y: e.clientY,
          pillElement,
        });

        fireMiscTrackingEvent(FEATURE_STORE_EVENTS.LINEAGE_NODE_SELECTED, {
          nodeType: data?.entityType || 'unknown',
          pageType: lineagePageType,
        } satisfies LineageNodeSelectedProperties);

        // Call original selection handler with proper signature
        onSelect?.(e);
      },
      [setClickPosition, onSelect, data?.entityType, lineagePageType],
    );

    // Get node bounds for positioning
    const bounds = element.getBounds();

    // Calculate a reasonable width if bounds.width is 0 (initial render)
    const nodeWidth =
      bounds.width > 0
        ? bounds.width
        : (() => {
            const label = element.getLabel();
            if (label && label.length > 10) {
              // Estimate width for large nodes based on label length
              return Math.max(120, Math.min(200, label.length * 6 + 80));
            }
            // Small nodes or no label
            return 60;
          })();

    return (
      <g
        ref={hoverRef}
        className={nodeClassName}
        data-testid={`feature-store-lineage-node-${element.getId()}`}
        data-lineage-focus-label={badge ? `${element.getLabel()}, ${badge}` : element.getLabel()}
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
          onSelect={undefined} // Disable default selection
          selected={selected}
          scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
          status={RunStatus.Idle}
          customStatusIcon={entityIcon}
          statusIconSize={LINEAGE_PILL_ICON_SIZE}
          hideDetailsAtMedium
          hiddenDetailsShownStatuses={[RunStatus.Idle]}
          truncateLength={truncateLength}
          badge={badge}
          hover={hover}
          width={nodeWidth}
          pillBackgroundColor={pillBackgroundColor}
          x={0} // Position relative to the group
          y={0}
          disableTooltip // Disable small tooltip to avoid conflict with popover
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
