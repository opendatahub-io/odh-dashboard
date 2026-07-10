import * as React from 'react';
import { EmptyState, EmptyStateBody, Spinner, Tooltip } from '@patternfly/react-core';
import { ChartLineIcon } from '@patternfly/react-icons';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLabel,
  ChartLegend,
  ChartLine,
  ChartPoint,
  ChartScatter,
  ChartThemeColor,
  createContainer,
} from '@patternfly/react-charts/victory';
import { LineSegment } from 'victory-core';
import { CustomTooltip, PinnedTooltipPanel, TooltipSnapshot } from './BorrowingLendingTooltip';
import { CQMetricSeries } from '../hooks/useBorrowingLendingMetrics';
import {
  CHART_COLOR_SCALE,
  buildColorByName,
  buildLegendData,
  buildLegendEvents,
  buildYDomain,
  formatXTick,
  getYAxisTicks,
  formatYTick,
} from '../utils/borrowingLendingChart';
import { AXIS_DIRECTION_LABEL_STYLE, CHART_HEIGHT, CHART_PADDING, SEVEN_DAYS_MS } from '../const';

const CursorVoronoiContainer = createContainer('voronoi', 'cursor');

type ConditionalPointProps = {
  active?: boolean;
  x?: number;
  y?: number;
  style?: object;
  size?: number;
  datum?: unknown;
};

type LegendLabelProps = { datum?: { name?: string; fullName?: string }; [key: string]: unknown };

type BorrowingLendingChartProps = {
  series: CQMetricSeries[];
  loaded: boolean;
  error: Error | undefined;
  chartWidth?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
};

const ConditionalPoint: React.FC<ConditionalPointProps> = ({ active, ...rest }) => {
  if (!active) {
    return null;
  }
  return <ChartPoint {...rest} />;
};

const LegendLabel = ({ datum, ...rest }: LegendLabelProps) => {
  const ref = React.useRef<SVGGElement>(null);
  const isTruncated = datum?.fullName && datum.name !== datum.fullName;
  return (
    <g ref={ref}>
      <ChartLabel {...rest} />
      {isTruncated && (
        <Tooltip content={datum.fullName} position="right" enableFlip triggerRef={ref} />
      )}
    </g>
  );
};

const BorrowingLendingChart: React.FC<BorrowingLendingChartProps> = ({
  series,
  loaded,
  error,
  chartWidth = 0,
  containerRef,
}) => {
  const [hiddenSeries, setHiddenSeries] = React.useState<Set<string>>(new Set());
  const [pinnedSnapshot, setPinnedSnapshot] = React.useState<TooltipSnapshot | null>(null);
  const activeSnapshotRef = React.useRef<TooltipSnapshot | null>(null);

  const toggleSeries = React.useCallback((cqName: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(cqName)) {
        next.delete(cqName);
      } else {
        next.add(cqName);
      }
      return next;
    });
  }, []);

  const hasSomeData = series.some((s) => s.data.length > 0);
  const showChart = loaded && !error && hasSomeData;

  const { minY, maxY } = buildYDomain(series);
  const yTicks = getYAxisTicks(minY, maxY);
  const colorByName = buildColorByName(series, hiddenSeries);
  const legendData = buildLegendData(series, hiddenSeries);
  const legendEvents = buildLegendEvents(toggleSeries);
  const now = Date.now();
  const domainStart = now - SEVEN_DAYS_MS;

  return (
    <>
      {!loaded && !error && <EmptyState icon={Spinner} titleText="Loading" headingLevel="h4" />}
      {error && (
        <EmptyState titleText="Error loading metrics" headingLevel="h4">
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      )}
      {loaded && !error && !hasSomeData && (
        <EmptyState
          icon={ChartLineIcon}
          titleText="No borrowing/lending activity detected"
          headingLevel="h4"
          data-testid="borrowing-lending-empty-state"
        >
          <EmptyStateBody>
            No accelerator usage data is available for the selected cluster queues over the past 7
            days.
          </EmptyStateBody>
        </EmptyState>
      )}
      {showChart && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          data-testid="borrowing-lending-chart-has-data"
          onClick={(e) => {
            if (e.target instanceof SVGTextElement) {
              return;
            }
            if (activeSnapshotRef.current) {
              setPinnedSnapshot({ ...activeSnapshotRef.current, id: crypto.randomUUID() });
            }
          }}
        >
          <Chart
            ariaTitle="Borrowing and lending trends"
            containerComponent={
              <CursorVoronoiContainer
                cursorDimension="x"
                cursorComponent={
                  <LineSegment
                    style={{ strokeDasharray: '2 3', strokeOpacity: 0.4, strokeWidth: 1 }}
                  />
                }
                labels={() => ' '}
                labelComponent={
                  <CustomTooltip
                    series={series}
                    colorByName={colorByName}
                    containerRef={containerRef}
                    snapshotRef={activeSnapshotRef}
                    isPinned={pinnedSnapshot !== null}
                  />
                }
                mouseFollowTooltips
                voronoiDimension="x"
                voronoiPadding={50}
              />
            }
            domain={{ x: [domainStart, now], y: [minY, maxY] }}
            height={CHART_HEIGHT}
            width={chartWidth}
            padding={CHART_PADDING}
            themeColor={ChartThemeColor.multiOrdered}
            legendData={legendData}
            legendOrientation="vertical"
            legendPosition="right"
            legendComponent={
              <ChartLegend
                title="Cluster queues"
                style={{ title: { fontWeight: 'bold' } }}
                events={legendEvents}
                labelComponent={<LegendLabel />}
              />
            }
          >
            <ChartLabel
              text="Borrow"
              x={4}
              y={CHART_PADDING.top - 12}
              style={AXIS_DIRECTION_LABEL_STYLE}
              textAnchor="start"
            />
            <ChartLabel
              text="Lend"
              x={4}
              y={CHART_HEIGHT - CHART_PADDING.bottom - 12}
              style={AXIS_DIRECTION_LABEL_STYLE}
              textAnchor="start"
            />
            <ChartLine
              data={[
                { x: domainStart, y: 0 },
                { x: now, y: 0 },
              ]}
              style={{
                data: {
                  stroke: 'var(--pf-t--chart--global--stroke--Color--200, #d2d2d2)',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                },
              }}
              name="zero-reference"
            />
            <ChartAxis
              tickFormat={formatXTick}
              tickCount={7}
              fixLabelOverlap
              offsetY={CHART_PADDING.bottom}
              style={{ tickLabels: { fontSize: 11 } }}
            />
            <ChartAxis
              dependentAxis
              tickValues={yTicks}
              tickFormat={formatYTick}
              showGrid
              style={{ tickLabels: { fontSize: 11 } }}
            />
            <ChartGroup>
              {series.map((s) =>
                hiddenSeries.has(s.cqName) ? null : (
                  <ChartLine
                    key={s.cqName}
                    data={s.data.map((d) => ({ ...d, nominalQuota: s.nominalQuota }))}
                    name={s.cqName}
                    interpolation="stepAfter"
                  />
                ),
              )}
            </ChartGroup>
            {series.map((s) =>
              hiddenSeries.has(s.cqName) ? null : (
                <ChartScatter
                  key={`__dot__${s.cqName}`}
                  name={`__dot__${s.cqName}`}
                  data={s.data.map((d) => ({ ...d, nominalQuota: s.nominalQuota }))}
                  dataComponent={<ConditionalPoint />}
                  style={{
                    data: {
                      fill: colorByName.get(s.cqName) ?? CHART_COLOR_SCALE[0],
                      stroke: 'white',
                      strokeWidth: 2,
                    },
                  }}
                  size={5}
                />
              ),
            )}
          </Chart>
        </div>
      )}
      {pinnedSnapshot && (
        <PinnedTooltipPanel snapshot={pinnedSnapshot} onClose={() => setPinnedSnapshot(null)} />
      )}
    </>
  );
};

export default BorrowingLendingChart;
