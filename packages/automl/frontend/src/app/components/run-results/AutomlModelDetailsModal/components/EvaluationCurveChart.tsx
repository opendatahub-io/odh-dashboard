import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  createContainer,
} from '@patternfly/react-charts/victory';
import { Flex, FlexItem } from '@patternfly/react-core';
import { chartColorBlack500, CHART_PADDING, COLOR_SCALE, TICK_VALUES } from './chartConstants';
import ChartLegendDot from './ChartLegendDot';

export type CurvePoint = { name: string; x: number; y: number; index: number };
export type CurveLine = { label: string; points: CurvePoint[] };

export function buildCurveLine(
  xValues: number[],
  yValues: number[],
  label: string,
  index: number,
): CurveLine {
  return {
    label,
    points: xValues.map((x, i) => ({ name: label, x, y: yValues[i], index })),
  };
}

type EvaluationCurveChartProps = {
  curveLines: CurveLine[];
  baselineData: { x: number; y: number; name: string }[];
  baselineStyle: { data: Record<string, string | number> };
  xAxisLabel: string;
  yAxisLabel: string;
  xMetricLabel: string;
  yMetricLabel: string;
  interpolation?: React.ComponentProps<typeof ChartLine>['interpolation'];
};

const CHART_WIDTH = 560;
const CHART_HEIGHT = 350;

const AXIS_TICK_STYLE = { tickLabels: { fontSize: 10 } };
const AXIS_LABEL_STYLE = { axisLabel: { fontSize: 11, padding: 40 } };
const DEPENDENT_AXIS_LABEL_STYLE = { axisLabel: { fontSize: 11, padding: 55 } };

const AXIS_LEFT = CHART_PADDING.left;
const AXIS_BOTTOM = CHART_HEIGHT - CHART_PADDING.bottom;
const CHART_RIGHT = CHART_WIDTH - CHART_PADDING.right;

const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

const CROSSHAIR_STROKE = chartColorBlack500.value;
const AXIS_LABEL_W = 48;
const AXIS_LABEL_H = 18;
const TOOLTIP_W = 155;

const CURSOR_LINE = <line stroke={CROSSHAIR_STROKE} strokeDasharray="4 4" strokeWidth={0.5} />;

const CursorVoronoiContainer = createContainer('cursor', 'voronoi');

// Module-level state: Victory's tooltip component only receives `datum` and `active` —
// it has no mechanism to pass arbitrary context (curveLines, labels, cursor position).
// These singletons bridge that gap.
const cursorState = { svgY: 0, dataY: 0 };
const chartState: {
  curveLines: CurveLine[];
  xMetricLabel: string;
  yMetricLabel: string;
} = { curveLines: [], xMetricLabel: '', yMetricLabel: '' };

const TOOLTIP_ROW_H = 16;
const TOOLTIP_PAD = 10;

// Voronoi hover only tracks one series — for multiclass we need each series' y at the hovered x.
// Linearly interpolate between bracketing points so the dot tracks the rendered curve.
// Points are sorted by x on each call because PR data arrives in descending recall order.
export function findYAtX(points: CurvePoint[], targetX: number): number {
  const sorted = points.toSorted((a, b) => a.x - b.x);
  if (targetX <= sorted[0].x) {
    return sorted[0].y;
  }
  for (let i = 1; i < sorted.length; i++) {
    if (targetX <= sorted[i].x) {
      const range = sorted[i].x - sorted[i - 1].x;
      const t = range === 0 ? 0 : (targetX - sorted[i - 1].x) / range;
      return sorted[i - 1].y + t * (sorted[i].y - sorted[i - 1].y);
    }
  }
  return sorted[sorted.length - 1].y;
}

type TooltipDatum = { name: string; x: number; y: number; index: number };

type CurveChartTooltipProps = {
  datum?: TooltipDatum;
  active?: boolean;
  [key: string]: unknown;
};

const YAxisBadge = ({ cy }: { cy: number }): React.ReactElement => (
  <g style={{ transform: `translateY(${cy}px)` }}>
    <rect
      x={AXIS_LEFT - AXIS_LABEL_W - 2}
      y={-AXIS_LABEL_H / 2}
      width={AXIS_LABEL_W}
      height={AXIS_LABEL_H}
      rx={3}
      fill={CROSSHAIR_STROKE}
    />
    <text
      x={AXIS_LEFT - AXIS_LABEL_W / 2 - 2}
      y={4}
      textAnchor="middle"
      fontSize={9}
      fill="white"
      fontFamily="var(--pf-t--global--font--family--body)"
    >
      {cursorState.dataY.toFixed(4)}
    </text>
  </g>
);

const XAxisBadge = ({ dotX, label }: { dotX: number; label: string }): React.ReactElement => (
  <g style={{ transform: `translateX(${dotX}px)` }}>
    <rect
      x={-AXIS_LABEL_W / 2}
      y={AXIS_BOTTOM + 3}
      width={AXIS_LABEL_W}
      height={AXIS_LABEL_H}
      rx={3}
      fill={CROSSHAIR_STROKE}
    />
    <text
      x={0}
      y={AXIS_BOTTOM + 3 + AXIS_LABEL_H / 2 + 4}
      textAnchor="middle"
      fontSize={9}
      fill="white"
      fontFamily="var(--pf-t--global--font--family--body)"
    >
      {label}
    </text>
  </g>
);

type SeriesPoint = { label: string; index: number; y: number };

const CurveChartTooltip = ({
  datum,
  active,
}: CurveChartTooltipProps): React.ReactElement | null => {
  if (!active || !datum) {
    return <g />;
  }

  const xLabel = chartState.xMetricLabel;
  const yLabel = chartState.yMetricLabel;
  const fpr = datum.x.toFixed(4);
  const dotX = AXIS_LEFT + datum.x * PLOT_WIDTH;
  const cy = cursorState.svgY;
  const lines = chartState.curveLines;
  const isBinary = lines.length === 1;

  const tooltipFlipped = dotX + 15 + TOOLTIP_W > CHART_RIGHT;
  const tx = tooltipFlipped ? -TOOLTIP_W - 15 : 15;

  const seriesPoints: SeriesPoint[] = isBinary
    ? [{ label: datum.name, index: 0, y: datum.y }]
    : lines.map((line, idx) => ({
        label: line.label,
        index: idx,
        y: findYAtX(line.points, datum.x),
      }));

  const tooltipH = isBinary
    ? TOOLTIP_PAD * 2 + 3 * TOOLTIP_ROW_H
    : TOOLTIP_PAD * 2 + TOOLTIP_ROW_H + seriesPoints.length * TOOLTIP_ROW_H;
  const ty = Math.max(CHART_PADDING.top - cy, Math.min(-tooltipH / 2, AXIS_BOTTOM - tooltipH - cy));

  return (
    <g className="automl-roc-tooltip">
      <YAxisBadge cy={cy} />
      <XAxisBadge dotX={dotX} label={fpr} />
      {seriesPoints.map((sp) => {
        const spColor = COLOR_SCALE[sp.index % COLOR_SCALE.length];
        const spY = AXIS_BOTTOM - sp.y * PLOT_HEIGHT;
        return (
          <g key={sp.label} style={{ transform: `translate(${dotX}px, ${spY}px)` }}>
            <circle cx={0} cy={0} r={4} fill={spColor} />
          </g>
        );
      })}
      <g style={{ transform: `translate(${dotX}px, ${cy}px)` }}>
        <rect
          x={tx}
          y={ty}
          width={TOOLTIP_W}
          height={tooltipH}
          rx={4}
          fill="var(--pf-t--global--background--color--primary--default)"
          stroke="var(--pf-t--global--border--color--default)"
          strokeWidth={1}
        />
        {isBinary ? (
          <>
            <circle cx={tx + 14} cy={ty + TOOLTIP_PAD} r={3} fill={COLOR_SCALE[0]} />
            <text
              x={tx + 24}
              y={ty + TOOLTIP_PAD + 4}
              fontSize={11}
              fill="var(--pf-t--global--text--color--regular)"
              fontFamily="var(--pf-t--global--font--family--body)"
            >
              {datum.name}
            </text>
            <text
              x={tx + 14}
              y={ty + TOOLTIP_PAD + TOOLTIP_ROW_H + 4}
              fontSize={11}
              fill="var(--pf-t--global--text--color--regular)"
              fontFamily="var(--pf-t--global--font--family--body)"
            >
              {xLabel}: {fpr}
            </text>
            <text
              x={tx + 14}
              y={ty + TOOLTIP_PAD + 2 * TOOLTIP_ROW_H + 4}
              fontSize={11}
              fill="var(--pf-t--global--text--color--regular)"
              fontFamily="var(--pf-t--global--font--family--body)"
            >
              {yLabel}: {datum.y.toFixed(4)}
            </text>
          </>
        ) : (
          <>
            <text
              x={tx + 10}
              y={ty + TOOLTIP_PAD + 4}
              fontSize={10}
              fontWeight="bold"
              fill="var(--pf-t--global--text--color--regular)"
              fontFamily="var(--pf-t--global--font--family--body)"
            >
              {xLabel}: {fpr}
            </text>
            {seriesPoints.map((sp, i) => {
              const spColor = COLOR_SCALE[sp.index % COLOR_SCALE.length];
              const rowY = ty + TOOLTIP_PAD + (i + 1) * TOOLTIP_ROW_H;
              return (
                <g key={sp.label}>
                  <circle cx={tx + 10} cy={rowY} r={3} fill={spColor} />
                  <text
                    x={tx + 20}
                    y={rowY + 4}
                    fontSize={10}
                    fill="var(--pf-t--global--text--color--regular)"
                    fontFamily="var(--pf-t--global--font--family--body)"
                  >
                    {sp.label} {yLabel}: {sp.y.toFixed(3)}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </g>
    </g>
  );
};

const handleCursorChange = (point: { x: number; y: number } | null): void => {
  if (point) {
    // Clamp to [0,1] — cursor can report values outside the data domain near chart edges.
    cursorState.dataY = Math.max(0, Math.min(1, point.y));
    cursorState.svgY = AXIS_BOTTOM - cursorState.dataY * PLOT_HEIGHT;
  }
};

const EvaluationCurveChart: React.FC<EvaluationCurveChartProps> = ({
  curveLines,
  baselineData,
  baselineStyle,
  xAxisLabel,
  yAxisLabel,
  xMetricLabel,
  yMetricLabel,
  interpolation = 'monotoneX',
}) => {
  chartState.curveLines = curveLines;
  chartState.xMetricLabel = xMetricLabel;
  chartState.yMetricLabel = yMetricLabel;

  const lineStyles = React.useMemo(
    () =>
      curveLines.map((_, idx) => ({
        data: { stroke: COLOR_SCALE[idx % COLOR_SCALE.length] },
      })),
    [curveLines],
  );

  return (
    <div data-testid="evaluation-curve-chart">
      <div className="automl-roc-curve-chart">
        <Chart
          ariaDesc={`${yAxisLabel} vs ${xAxisLabel}`}
          containerComponent={
            <CursorVoronoiContainer
              constrainToVisibleArea
              cursorComponent={CURSOR_LINE}
              onCursorChange={handleCursorChange}
              voronoiDimension="x"
              // Return empty string to suppress tooltip for baseline points; non-empty
              // string (space) triggers our custom CurveChartTooltip for model curves.
              labels={({ datum }: { datum: { name: string } }) =>
                datum.name.startsWith('Reference') || datum.name.startsWith('No-skill') ? '' : ' '
              }
              labelComponent={<CurveChartTooltip />}
              voronoiBlacklist={['baseline']}
            />
          }
          height={CHART_HEIGHT}
          width={CHART_WIDTH}
          padding={CHART_PADDING}
        >
          <ChartAxis
            showGrid
            dependentAxis
            label={yAxisLabel}
            tickValues={TICK_VALUES}
            style={{ ...AXIS_TICK_STYLE, ...DEPENDENT_AXIS_LABEL_STYLE }}
          />
          <ChartAxis
            showGrid
            label={xAxisLabel}
            tickValues={TICK_VALUES}
            style={{ ...AXIS_TICK_STYLE, ...AXIS_LABEL_STYLE }}
          />
          <ChartLine name="baseline" data={baselineData} style={baselineStyle} />
          <ChartGroup groupComponent={<g className="automl-roc-curves" />}>
            {curveLines.map((line, idx) => (
              <ChartLine
                key={line.label}
                data={line.points}
                interpolation={interpolation}
                style={lineStyles[idx]}
              />
            ))}
          </ChartGroup>
        </Chart>
      </div>
      <Flex
        gap={{ default: 'gapLg' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        className="pf-v6-u-mt-sm pf-v6-u-font-size-sm"
      >
        <FlexItem>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <ChartLegendDot color={chartColorBlack500.value} />
            </FlexItem>
            <FlexItem>Reference</FlexItem>
          </Flex>
        </FlexItem>
        {curveLines.map((line, idx) => (
          <FlexItem key={line.label}>
            <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <ChartLegendDot color={COLOR_SCALE[idx % COLOR_SCALE.length]} />
              </FlexItem>
              <FlexItem>{line.label}</FlexItem>
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </div>
  );
};

export default EvaluationCurveChart;
