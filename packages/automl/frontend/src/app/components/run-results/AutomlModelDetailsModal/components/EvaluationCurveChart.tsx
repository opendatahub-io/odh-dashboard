/**
 * EvaluationCurveChart — shared chart shell for classification evaluation tabs.
 *
 * Consumers: ROCCurveChart, PrecisionRecallChart
 *
 * Provides the interactive chart canvas (PF Victory), custom SVG tooltip with
 * crosshair + per-series dot indicators, Voronoi hover with linear interpolation
 * (findYAtX), and a side legend with eye-toggle visibility per curve.
 *
 * Each consumer builds its own curve lines and baseline, then passes them in as
 * props — this component handles rendering, tooltip positioning, and legend state.
 */
import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  createContainer,
} from '@patternfly/react-charts/victory';
import { Tooltip } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { truncateLabel } from '~/app/utilities/utils';
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
  'data-testid'?: string;
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
const TOOLTIP_MIN_W = 120;
const CHAR_WIDTH = 6.2;

const CURSOR_LINE = <line stroke={CROSSHAIR_STROKE} strokeDasharray="4 4" strokeWidth={0.5} />;

const CursorVoronoiContainer = createContainer('cursor', 'voronoi');

// Module-level state: Victory's tooltip component only receives `datum` and `active` —
// it has no mechanism to pass arbitrary context (curveLines, labels, cursor position).
// These singletons bridge that gap.
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
  const formattedX = datum.x.toFixed(4);
  const dotX = AXIS_LEFT + datum.x * PLOT_WIDTH;
  const lines = chartState.curveLines;
  const isBinary = lines.length === 1;

  const seriesPoints: SeriesPoint[] = isBinary
    ? [{ label: datum.name, index: 0, y: datum.y }]
    : lines.map((line, idx) => ({
        label: line.label,
        index: idx,
        y: findYAtX(line.points, datum.x),
      }));

  const longestLine = isBinary
    ? Math.max(
        truncateLabel(datum.name).length,
        `${xLabel}: ${formattedX}`.length,
        `${yLabel}: ${datum.y.toFixed(4)}`.length,
      )
    : Math.max(
        `${xLabel}: ${formattedX}`.length,
        ...seriesPoints.map(
          (sp) => `${truncateLabel(sp.label)} ${yLabel}: ${sp.y.toFixed(3)}`.length,
        ),
      );
  const tooltipW = Math.max(TOOLTIP_MIN_W, longestLine * CHAR_WIDTH + TOOLTIP_PAD * 2 + 14);

  const tooltipFlipped = dotX + 15 + tooltipW > CHART_RIGHT;
  const tx = tooltipFlipped ? -tooltipW - 15 : 15;

  const tooltipH = isBinary
    ? TOOLTIP_PAD * 2 + 3 * TOOLTIP_ROW_H
    : TOOLTIP_PAD * 2 + TOOLTIP_ROW_H + seriesPoints.length * TOOLTIP_ROW_H;
  const tooltipCenterY = CHART_PADDING.top + PLOT_HEIGHT / 2;
  const ty = tooltipCenterY - tooltipH / 2;

  return (
    <g className="automl-roc-tooltip">
      {seriesPoints.map((sp) => {
        const spColor = COLOR_SCALE[sp.index % COLOR_SCALE.length];
        const spY = AXIS_BOTTOM - sp.y * PLOT_HEIGHT;
        return (
          <g key={sp.label} transform={`translate(${dotX}, ${spY})`}>
            <circle cx={0} cy={0} r={4} fill={spColor} />
          </g>
        );
      })}
      <g transform={`translate(${dotX}, 0)`}>
        <rect
          x={tx}
          y={ty}
          width={tooltipW}
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
              {truncateLabel(datum.name)}
            </text>
            <text
              x={tx + 14}
              y={ty + TOOLTIP_PAD + TOOLTIP_ROW_H + 4}
              fontSize={11}
              fill="var(--pf-t--global--text--color--regular)"
              fontFamily="var(--pf-t--global--font--family--body)"
            >
              {xLabel}: {formattedX}
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
              {xLabel}: {formattedX}
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
                    {truncateLabel(sp.label)} {yLabel}: {sp.y.toFixed(3)}
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

const EvaluationCurveChart: React.FC<EvaluationCurveChartProps> = ({
  curveLines,
  baselineData,
  baselineStyle,
  xAxisLabel,
  yAxisLabel,
  xMetricLabel,
  yMetricLabel,
  interpolation = 'monotoneX',
  'data-testid': dataTestId = 'evaluation-curve-chart',
}) => {
  const [hiddenCurves, setHiddenCurves] = React.useState<Set<string>>(() => new Set());

  const visibleLines = React.useMemo(
    () => curveLines.filter((line) => !hiddenCurves.has(line.label)),
    [curveLines, hiddenCurves],
  );

  chartState.curveLines = visibleLines;
  chartState.xMetricLabel = xMetricLabel;
  chartState.yMetricLabel = yMetricLabel;

  const toggleCurve = React.useCallback((label: string) => {
    setHiddenCurves((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  return (
    <div data-testid={dataTestId}>
      <div className="automl-roc-curve-chart">
        <div className="automl-roc-curve-chart__chart">
          <Chart
            ariaDesc={`${yAxisLabel} vs ${xAxisLabel}`}
            containerComponent={
              <CursorVoronoiContainer
                constrainToVisibleArea
                cursorComponent={CURSOR_LINE}
                cursorDimension="x"
                voronoiDimension="x"
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
              {visibleLines.map((line) => (
                <ChartLine
                  key={line.label}
                  data={line.points}
                  interpolation={interpolation}
                  style={{
                    data: {
                      stroke: COLOR_SCALE[curveLines.indexOf(line) % COLOR_SCALE.length],
                    },
                  }}
                />
              ))}
            </ChartGroup>
          </Chart>
        </div>
        <div className="automl-roc-curve-legend" data-testid="curve-chart-legend">
          <div className="automl-roc-curve-legend__title" id="curve-legend-title">
            Curves
          </div>
          <ul className="automl-roc-curve-legend__list" aria-labelledby="curve-legend-title">
            <li className="automl-roc-curve-legend__item">
              <ChartLegendDot color={chartColorBlack500.value} />
              <span>Reference</span>
            </li>
            {curveLines.map((line, idx) => {
              const color = COLOR_SCALE[idx % COLOR_SCALE.length];
              const isVisible = !hiddenCurves.has(line.label);
              const isBinary = curveLines.length === 1;
              const labelContent =
                line.label.length > 20 ? (
                  <Tooltip content={line.label}>
                    <span className="automl-roc-curve-legend__label">
                      {truncateLabel(line.label)}
                    </span>
                  </Tooltip>
                ) : (
                  <span className="automl-roc-curve-legend__label">{line.label}</span>
                );

              return (
                <li key={line.label} className="automl-roc-curve-legend__item">
                  {isBinary ? (
                    <>
                      <ChartLegendDot color={color} />
                      {labelContent}
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`automl-roc-curve-legend__toggle${isVisible ? '' : ' m-hidden'}`}
                      onClick={() => toggleCurve(line.label)}
                      aria-label={`Toggle ${line.label}`}
                      aria-pressed={isVisible}
                      data-testid={`legend-toggle-${idx}`}
                    >
                      <ChartLegendDot color={isVisible ? color : 'transparent'} />
                      {labelContent}
                      {isVisible ? (
                        <EyeIcon className="automl-roc-curve-legend__eye" aria-hidden />
                      ) : (
                        <EyeSlashIcon className="automl-roc-curve-legend__eye" aria-hidden />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EvaluationCurveChart;
