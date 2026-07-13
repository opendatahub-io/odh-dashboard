/**
 * BacktestCurveChart — shared chart shell for the Back-testing tab.
 *
 * Consumers: BacktestWindowChart (per-window metric line), ForecastChart (observed
 * vs predicted with confidence interval band).
 *
 * Renders a PF Victory chart with a dashed crosshair cursor, Voronoi hover
 * tooltips (white background, small font), a grid-enabled dependent axis, and
 * a caller-configured independent axis (tick values + format). Consumers supply
 * an ordered list of series (line, area, or scatter) with their data and styles
 * — this component handles the chart layout, axes, and tooltip container.
 */
import React from 'react';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLabel,
  ChartLine,
  ChartScatter,
  createContainer,
} from '@patternfly/react-charts/victory';
import { BACKTEST_CHART_PADDING, TOOLTIP_TEXT_PROPS, chartColorBlack500 } from './chartConstants';

export type ChartDataPoint = { x: number; y: number; name: string; y0?: number };

export type ChartSeries = {
  type: 'line' | 'area' | 'scatter';
  data: ChartDataPoint[];
  style: Record<string, unknown>;
  name?: string;
  size?: number;
};

type BacktestCurveChartProps = {
  series: ChartSeries[];
  tickValues: number[];
  tickFormat: (val: number) => string;
  ariaDesc: string;
  height?: number;
  width?: number;
  domainPadding?: number | { x?: number; y?: number };
  voronoiBlacklist?: string[];
  voronoiRadius?: number;
  labelComponent?: React.ReactElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Victory supports function styles but PF types don't expose them
  xAxisStyle?: any;
  yAxisLabel?: string;
  'data-testid'?: string;
};

const CursorVoronoiContainer = createContainer('cursor', 'voronoi');

const CURSOR_LINE = (
  <line stroke={chartColorBlack500.value} strokeDasharray="4 4" strokeWidth={0.5} />
);

const TICK_STYLE = { tickLabels: { fontSize: 12 } };

const FirstTickStartLabel = (props: React.ComponentProps<typeof ChartLabel>) => {
  const anchor = props.index === 0 ? 'start' : props.textAnchor;
  return <ChartLabel {...props} textAnchor={anchor} />;
};
const FIRST_TICK_START = <FirstTickStartLabel />;

const DEFAULT_TOOLTIP_H = 36;
const CHAR_W = 6.5;

const DefaultTooltip = ({
  datum,
  active,
  x,
  chartWidth,
  chartHeight,
}: {
  datum?: ChartDataPoint;
  active?: boolean;
  x?: number;
  chartWidth: number;
  chartHeight: number;
  [key: string]: unknown;
}): React.ReactElement => {
  if (!active || !datum || x == null) {
    return <g />;
  }

  const tooltipW = Math.max(160, datum.name.length * CHAR_W + 20);
  const plotRight = chartWidth - BACKTEST_CHART_PADDING.right;
  const flipped = x + 12 + tooltipW > plotRight;
  const rawTx = flipped ? x - tooltipW - 12 : x + 12;
  const tx = Math.max(5, Math.min(rawTx, chartWidth - tooltipW - 5));

  const plotH = chartHeight - BACKTEST_CHART_PADDING.top - BACKTEST_CHART_PADDING.bottom;
  const ty = BACKTEST_CHART_PADDING.top + plotH / 2 - DEFAULT_TOOLTIP_H / 2;

  return (
    <g>
      <rect
        x={tx}
        y={ty}
        width={tooltipW}
        height={DEFAULT_TOOLTIP_H}
        rx={4}
        fill="var(--pf-t--global--background--color--primary--default)"
        stroke="var(--pf-t--global--border--color--default)"
        strokeWidth={1}
      />
      <text x={tx + 10} y={ty + DEFAULT_TOOLTIP_H / 2 + 4} {...TOOLTIP_TEXT_PROPS}>
        {datum.name}
      </text>
    </g>
  );
};

const voronoiLabels = ({ datum }: { datum: ChartDataPoint }) => datum.name;

function renderSeries(s: ChartSeries, idx: number): React.ReactElement {
  switch (s.type) {
    case 'area':
      return <ChartArea key={idx} name={s.name} data={s.data} style={s.style} />;
    case 'scatter':
      return <ChartScatter key={idx} name={s.name} data={s.data} style={s.style} size={s.size} />;
    default:
      return <ChartLine key={idx} name={s.name} data={s.data} style={s.style} />;
  }
}

const BacktestCurveChart: React.FC<BacktestCurveChartProps> = ({
  series,
  tickValues,
  tickFormat,
  ariaDesc,
  height = 300,
  width,
  domainPadding,
  voronoiBlacklist,
  voronoiRadius,
  labelComponent,
  xAxisStyle,
  yAxisLabel,
  'data-testid': dataTestId,
}) => {
  const maxYChars = React.useMemo(() => {
    const maxAbsY = Math.max(...series.flatMap((s) => s.data.map((d) => Math.abs(d.y))));
    return Math.max(4, Math.round(maxAbsY).toLocaleString().length);
  }, [series]);

  const dynamicLeft = Math.max(BACKTEST_CHART_PADDING.left, maxYChars * 9 + 30);
  const chartPadding = { ...BACKTEST_CHART_PADDING, left: dynamicLeft };
  const yLabelStyle = {
    tickLabels: { fontSize: 12 },
    axisLabel: { fontSize: 12, padding: dynamicLeft - 20 },
  };

  const resolvedLabel = labelComponent ?? (
    <DefaultTooltip chartWidth={width ?? 450} chartHeight={height} />
  );

  return (
    <div data-testid={dataTestId}>
      <Chart
        ariaDesc={ariaDesc}
        containerComponent={
          <CursorVoronoiContainer
            constrainToVisibleArea
            cursorComponent={CURSOR_LINE}
            cursorDimension="x"
            voronoiDimension="x"
            labels={voronoiLabels}
            labelComponent={resolvedLabel}
            radius={voronoiRadius}
            voronoiBlacklist={voronoiBlacklist}
          />
        }
        height={height}
        width={width}
        domainPadding={domainPadding}
        padding={chartPadding}
      >
        <ChartAxis
          orientation="bottom"
          tickFormat={tickFormat}
          tickValues={tickValues}
          tickLabelComponent={FIRST_TICK_START}
          style={xAxisStyle ?? TICK_STYLE}
        />
        <ChartAxis
          dependentAxis
          showGrid
          label={yAxisLabel}
          style={yAxisLabel ? yLabelStyle : TICK_STYLE}
        />
        <ChartGroup groupComponent={<g className="automl-backtest-curves" />}>
          {series.map(renderSeries)}
        </ChartGroup>
      </Chart>
    </div>
  );
};

export default BacktestCurveChart;
