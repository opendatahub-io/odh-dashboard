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
  SELECTION_EVENT,
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
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  getEntityTypeIcon,
  getEntityTypeBackgroundColor,
  getEntityTypeAccentColor,
} from '../../../utils/featureStoreObjects.tsx';
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

    const hasTypeColors = !selected && !!data?.entityType;
    const entityIcon = data?.entityType ? (
      <g aria-hidden="true">{getEntityTypeIcon(data.entityType, selected)}</g>
    ) : (
      <g aria-hidden="true">
        <CubeIcon style={{ color: selected ? '#ffffff' : chartColorBlack.var }} />
      </g>
    );
    const truncateLength = data?.truncateLength ?? 30;
    const nodeClassName = isConnectedToSelection ? 'pf-m-highlighted' : '';
    const pillBackgroundColor = hasTypeColors
      ? getEntityTypeBackgroundColor(data.entityType)
      : undefined;
    const pillAccentColor = hasTypeColors ? getEntityTypeAccentColor(data.entityType) : undefined;

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

    const [isFocused, setIsFocused] = React.useState(false);

    const resolvePillElement = React.useCallback((container: Element): Element | null => {
      const pillRect = container.querySelector('[data-testid="lineage-pill-background"]');
      if (pillRect?.tagName === 'rect') {
        return pillRect;
      }

      const rects = Array.from(container.querySelectorAll('rect'));
      for (const rect of rects) {
        if (rect.getAttribute('data-focus-ring') === 'true') {
          continue;
        }
        const className = rect.getAttribute('class') || '';
        if (
          className.includes('pill') ||
          className.includes('background') ||
          className.includes('Background')
        ) {
          return rect;
        }
      }
      return null;
    }, []);

    const selectNode = React.useCallback(() => {
      const id = element.getId();
      const controller = element.getController();
      controller.setState({ selectedIds: [id] });
      controller.fireEvent(SELECTION_EVENT, [id]);
      element.raise();
    }, [element]);

    const activateNode = React.useCallback(
      (e: React.MouseEvent | React.KeyboardEvent, clientPosition?: { x: number; y: number }) => {
        const container = e.currentTarget;
        let pillElement: Element | null = null;

        if (e.target instanceof Element && e.target !== container) {
          pillElement = e.target;
          while (pillElement && pillElement !== container) {
            if (pillElement.tagName === 'rect') {
              if (pillElement.getAttribute('data-focus-ring') === 'true') {
                pillElement = pillElement.parentElement;
                continue;
              }
              const className = pillElement.getAttribute('class') || '';
              if (
                className.includes('pill') ||
                className.includes('background') ||
                className.includes('Background')
              ) {
                break;
              }
            }
            pillElement = pillElement.parentElement;
          }
        }

        if (!pillElement || pillElement.tagName !== 'rect') {
          pillElement = resolvePillElement(container);
        }

        let { x, y } = clientPosition ?? {};
        if (x === undefined || y === undefined) {
          const rect = container.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }

        setClickPosition({
          x,
          y,
          pillElement: pillElement?.tagName === 'rect' ? pillElement : null,
        });

        fireMiscTrackingEvent(FEATURE_STORE_EVENTS.LINEAGE_NODE_SELECTED, {
          nodeType: data?.entityType || 'unknown',
          pageType: lineagePageType,
        } satisfies LineageNodeSelectedProperties);
      },
      [setClickPosition, data?.entityType, lineagePageType, resolvePillElement],
    );

    const handleNodeClick = React.useCallback(
      (e: React.MouseEvent) => {
        activateNode(e, { x: e.clientX, y: e.clientY });
        onSelect?.(e);
      },
      [activateNode, onSelect],
    );

    const handleNodeKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateNode(e);
          selectNode();
        }
      },
      [activateNode, selectNode],
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

    const accessibleName = badge ? `${element.getLabel()}, ${badge}` : element.getLabel();
    const nodeHeight = bounds.height > 0 ? bounds.height : 32;

    return (
      <g
        ref={hoverRef}
        className={nodeClassName}
        role="button"
        tabIndex={0}
        aria-label={accessibleName}
        aria-pressed={selected}
        data-testid={`feature-store-lineage-node-${element.getId()}`}
        style={{
          filter: isConnectedToSelection
            ? 'drop-shadow(0 0 6px rgba(0, 123, 255, 0.6))'
            : undefined,
          cursor: 'pointer',
        }}
        onClick={handleNodeClick}
        onKeyDown={handleNodeKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {isFocused && (
          <rect
            data-focus-ring="true"
            x={-4}
            y={-4}
            width={nodeWidth + 8}
            height={nodeHeight + 8}
            fill="none"
            stroke="var(--pf-t--global--color--brand--default)"
            strokeWidth={2}
            rx={(nodeHeight + 8) / 2}
            pointerEvents="none"
            aria-hidden="true"
          />
        )}
        <LineageTaskPill
          element={element}
          onSelect={undefined} // Disable default selection
          selected={selected}
          scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
          status={RunStatus.Idle}
          customStatusIcon={entityIcon}
          hideDetailsAtMedium
          hiddenDetailsShownStatuses={[RunStatus.Idle]}
          truncateLength={truncateLength}
          badge={badge}
          hover={hover}
          width={nodeWidth}
          pillBackgroundColor={pillBackgroundColor}
          pillAccentColor={pillAccentColor}
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
