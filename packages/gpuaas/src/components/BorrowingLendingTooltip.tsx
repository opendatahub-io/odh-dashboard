import * as React from 'react';
import ReactDOM from 'react-dom';
import './ClusterSummaryCards.scss';
import {
  Badge,
  Button,
  Content,
  Flex,
  FlexItem,
  Panel,
  PanelMain,
  PanelMainBody,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { CQMetricSeries } from '../hooks/useBorrowingLendingMetrics';
import {
  CHART_COLOR_SCALE,
  TooltipPoint,
  formatTooltipDate,
  getEntryLabel,
  getTooltipPosition,
} from '../utils/borrowingLendingChart';
import { FLYOUT_MAX_WIDTH, TOOLTIP_PAGE_SIZE, TOOLTIP_PANEL_MAX_HEIGHT } from '../const';

export type TooltipSnapshot = {
  id: string;
  /** Top TOOLTIP_PAGE_SIZE by |y|, shown in the floating tooltip. */
  initialPoints: TooltipPoint[];
  allSortedPoints: TooltipPoint[];
  overflowCount: number;
  seriesMap: Map<string, CQMetricSeries>;
  colorByName: Map<string, string>;
  finalLeft: number;
  finalTop: number;
};

export type CustomTooltipProps = {
  /** Injected by Victory's voronoi container */
  active?: boolean;
  x?: number;
  y?: number;
  activePoints?: TooltipPoint[];
  /** Series metadata — passed via React.cloneElement */
  series?: CQMetricSeries[];
  /** cqName → color, keyed to visible render order */
  colorByName?: Map<string, string>;
  /** Ref to the chart container div — used to convert SVG coords to viewport coords */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** Written on every render so the parent can pin the current state on click */
  snapshotRef?: React.MutableRefObject<TooltipSnapshot | null>;
  /** When true, suppresses the hover tooltip (a pinned panel is already visible) */
  isPinned?: boolean;
};

type PinnedTooltipPanelProps = {
  snapshot: TooltipSnapshot;
  onClose: () => void;
};

type TooltipSeriesEntryProps = {
  point: TooltipPoint;
  info: CQMetricSeries | undefined;
  color: string;
};

type TooltipBodyProps = {
  points: TooltipPoint[];
  seriesMap: Map<string, CQMetricSeries>;
  colorByName: Map<string, string>;
};

type TooltipPanelProps = {
  snapshot: TooltipSnapshot;
  /** When provided the panel is interactive (pinned): shows close button, scrollable list, "View more". */
  onClose?: () => void;
};

const buildTooltipSnapshot = (
  activePoints: TooltipPoint[] | undefined,
  series: CQMetricSeries[],
  colorByName: Map<string, string>,
  containerRef: React.RefObject<HTMLDivElement | null> | undefined,
  x: number,
  y: number,
): TooltipSnapshot | null => {
  const allPoints = (activePoints ?? []).filter(
    (p) => p.childName && p.childName !== 'zero-reference' && !p.childName.startsWith('__dot__'),
  );
  if (!allPoints.length) {
    return null;
  }
  const sortedPoints = allPoints.toSorted((a, b) => Math.abs(b.y) - Math.abs(a.y));
  const initialPoints = sortedPoints.slice(0, TOOLTIP_PAGE_SIZE);
  const overflowCount = sortedPoints.length - initialPoints.length;
  const { finalLeft, finalTop } = getTooltipPosition(containerRef, x, y);
  return {
    id: '',
    initialPoints,
    allSortedPoints: sortedPoints,
    overflowCount,
    seriesMap: new Map(series.map((s) => [s.cqName, s])),
    colorByName,
    finalLeft,
    finalTop,
  };
};

const TooltipSeriesEntry: React.FC<TooltipSeriesEntryProps> = ({ point, info, color }) => {
  const net = Math.round(point.y);
  const quota = Math.round(point.nominalQuota ?? 0);
  const usage = Math.round(point.y + (point.nominalQuota ?? 0));
  const borrowing = Math.max(0, net);
  const lending = Math.max(0, -net);
  const entryLabel = getEntryLabel(info, point.childName ?? '');

  return (
    <Stack>
      <StackItem>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'nowrap' }}
          gap={{ default: 'gapXs' }}
        >
          <FlexItem>
            <span className="gpuaas-tooltip-dot" style={{ background: color }} />
          </FlexItem>
          <FlexItem>
            <strong>{entryLabel}</strong>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="small" className="gpuaas-tooltip-subtle">
          {`Usage ${usage} of ${quota} quota`}
        </Content>
      </StackItem>
      <StackItem>
        <Content component="small" className="gpuaas-tooltip-subtle">
          {`Borrowing ${borrowing} · Lending ${lending}`}
        </Content>
      </StackItem>
    </Stack>
  );
};

const TooltipBody: React.FC<TooltipBodyProps> = ({ points, seriesMap, colorByName }) => (
  <Stack hasGutter>
    {points.map((point) => (
      <StackItem key={point.childName}>
        <TooltipSeriesEntry
          point={point}
          info={seriesMap.get(point.childName ?? '')}
          color={colorByName.get(point.childName ?? '') ?? CHART_COLOR_SCALE[0]}
        />
      </StackItem>
    ))}
  </Stack>
);

const TooltipPanel: React.FC<TooltipPanelProps> = ({ snapshot, onClose }) => {
  const pinned = !!onClose;
  const [visibleCount, setVisibleCount] = React.useState(TOOLTIP_PAGE_SIZE);
  const listRef = React.useRef<HTMLDivElement>(null);

  const points = pinned ? snapshot.allSortedPoints.slice(0, visibleCount) : snapshot.initialPoints;
  const remainingCount = pinned ? snapshot.allSortedPoints.length - visibleCount : 0;

  return (
    <Panel
      variant="bordered"
      style={{
        position: 'fixed',
        left: snapshot.finalLeft,
        top: snapshot.finalTop,
        width: 'max-content',
        maxWidth: FLYOUT_MAX_WIDTH,
        zIndex: pinned ? 10000 : 9999,
        pointerEvents: pinned ? 'auto' : 'none',
      }}
    >
      <PanelMain>
        <PanelMainBody>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Content component="small" className="gpuaas-tooltip-header-date">
                {formatTooltipDate(points[0].x)}
              </Content>
            </FlexItem>
            {pinned && (
              <FlexItem>
                <Button variant="plain" aria-label="Close pinned tooltip" onClick={onClose}>
                  <TimesIcon />
                </Button>
              </FlexItem>
            )}
          </Flex>
        </PanelMainBody>
      </PanelMain>
      <PanelMain>
        <PanelMainBody>
          <div
            ref={pinned ? listRef : undefined}
            style={pinned ? { maxHeight: TOOLTIP_PANEL_MAX_HEIGHT, overflowY: 'auto' } : undefined}
          >
            <TooltipBody
              points={points}
              seriesMap={snapshot.seriesMap}
              colorByName={snapshot.colorByName}
            />
          </div>
        </PanelMainBody>
      </PanelMain>
      {snapshot.allSortedPoints.length > TOOLTIP_PAGE_SIZE && (
        <PanelMain>
          <PanelMainBody>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              {(pinned ? remainingCount : snapshot.overflowCount) > 0 && (
                <FlexItem>
                  <Button
                    variant="link"
                    isInline
                    onClick={
                      pinned ? () => setVisibleCount((prev) => prev + TOOLTIP_PAGE_SIZE) : undefined
                    }
                  >
                    View more
                  </Button>
                </FlexItem>
              )}
              <FlexItem>
                <Badge isRead>
                  {`Showing ${
                    pinned
                      ? Math.min(visibleCount, snapshot.allSortedPoints.length)
                      : snapshot.initialPoints.length
                  }/${snapshot.allSortedPoints.length}`}
                </Badge>
              </FlexItem>
            </Flex>
          </PanelMainBody>
        </PanelMain>
      )}
    </Panel>
  );
};

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  x = 0,
  y = 0,
  activePoints,
  series = [],
  colorByName = new Map(),
  containerRef,
  snapshotRef,
  isPinned = false,
}) => {
  // Keep the ref current even while a panel is pinned so clicking re-pins to the latest hover position.
  const hoverData = active
    ? buildTooltipSnapshot(activePoints, series, colorByName, containerRef, x, y)
    : null;

  // eslint-disable-next-line no-param-reassign
  if (snapshotRef) snapshotRef.current = hoverData;

  // Suppress the hover portal while pinned; the ref is already up to date above.
  if (isPinned || !hoverData) {
    return null;
  }

  return ReactDOM.createPortal(<TooltipPanel snapshot={hoverData} />, document.body);
};

export const PinnedTooltipPanel: React.FC<PinnedTooltipPanelProps> = ({ snapshot, onClose }) =>
  ReactDOM.createPortal(
    <TooltipPanel key={snapshot.id} snapshot={snapshot} onClose={onClose} />,
    document.body,
  );
