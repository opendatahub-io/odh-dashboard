import React from 'react';
import { Label, Title } from '@patternfly/react-core';
import type { BackTestingForecastPoint, BackTestingSeriesPerformer } from '~/app/types';
import { BACKTEST_CHART_PADDING, COLOR_SCALE, TOOLTIP_TEXT_PROPS } from './chartConstants';
import BacktestCurveChart, { type ChartDataPoint, type ChartSeries } from './BacktestCurveChart';

type ForecastChartProps = {
  performer: BackTestingSeriesPerformer;
  title: string;
};

type IndexedPoint = { x: number; y: number; name: string };
type BandPoint = { x: number; y: number; y0: number; name: string };

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSeriesData(points: BackTestingForecastPoint[]): {
  observed: IndexedPoint[];
  predicted: IndexedPoint[];
  band: BandPoint[];
} {
  const observed: IndexedPoint[] = [];
  const predicted: IndexedPoint[] = [];
  const band: BandPoint[] = [];
  points.forEach((p, i) => {
    const name = formatTimestamp(p.timestamp);
    observed.push({ x: i, y: p.actual, name });
    predicted.push({ x: i, y: p.predicted, name });
    band.push({ x: i, y: p.upper_bound, y0: p.lower_bound, name: '' });
  });
  return { observed, predicted, band };
}

// --- Custom tooltip -----------------------------------------------------------

type TooltipDataRef = React.RefObject<{ observed: IndexedPoint[]; predicted: IndexedPoint[] }>;

const TOOLTIP_W = 180;
const TOOLTIP_H = 64;
const ROW_H = 18;

const ForecastTooltip = ({
  datum,
  active,
  x,
  dataRef,
  chartWidth,
}: {
  datum?: ChartDataPoint;
  active?: boolean;
  x?: number;
  dataRef: TooltipDataRef;
  chartWidth: number;
  [key: string]: unknown;
}): React.ReactElement => {
  if (!active || !datum || x == null) {
    return <g />;
  }

  const data = dataRef.current;
  if (!data) {
    return <g />;
  }
  const { observed, predicted } = data;
  const idx = Math.round(datum.x);
  const obsValue = idx >= 0 && idx < observed.length ? observed[idx].y.toFixed(2) : '-';
  const predValue = idx >= 0 && idx < predicted.length ? predicted[idx].y.toFixed(2) : '-';
  const header = datum.name;

  const plotRight = chartWidth - BACKTEST_CHART_PADDING.right;
  const flipped = x + 12 + TOOLTIP_W > plotRight;
  const rawTx = flipped ? x - TOOLTIP_W - 12 : x + 12;
  const tx = Math.max(5, Math.min(rawTx, chartWidth - TOOLTIP_W - 5));

  const plotH = CHART_HEIGHT - BACKTEST_CHART_PADDING.top - BACKTEST_CHART_PADDING.bottom;
  const ty = BACKTEST_CHART_PADDING.top + plotH / 2 - TOOLTIP_H / 2;

  const headerY = ty + 14;
  const row1Y = headerY + ROW_H;
  const row2Y = row1Y + ROW_H;

  return (
    <g>
      <rect
        x={tx}
        y={ty}
        width={TOOLTIP_W}
        height={TOOLTIP_H}
        rx={4}
        fill="var(--pf-t--global--background--color--primary--default)"
        stroke="var(--pf-t--global--border--color--default)"
        strokeWidth={1}
      />
      <text x={tx + 10} y={headerY} {...TOOLTIP_TEXT_PROPS}>
        {header}
      </text>
      <circle cx={tx + 14} cy={row1Y - 4} r={4} fill={COLOR_SCALE[1]} />
      <text x={tx + 24} y={row1Y} {...TOOLTIP_TEXT_PROPS}>
        Observed
      </text>
      <text
        x={tx + TOOLTIP_W - 10}
        y={row1Y}
        {...TOOLTIP_TEXT_PROPS}
        fontWeight="bold"
        textAnchor="end"
      >
        {obsValue}
      </text>
      <circle cx={tx + 14} cy={row2Y - 4} r={4} fill={COLOR_SCALE[3]} />
      <text x={tx + 24} y={row2Y} {...TOOLTIP_TEXT_PROPS}>
        Forecast
      </text>
      <text
        x={tx + TOOLTIP_W - 10}
        y={row2Y}
        {...TOOLTIP_TEXT_PROPS}
        fontWeight="bold"
        textAnchor="end"
      >
        {predValue}
      </text>
    </g>
  );
};

// --- Component ----------------------------------------------------------------

const CHART_HEIGHT = 220;
const FORECAST_DOMAIN_PADDING = { x: 30 };
const FORECAST_VORONOI_BLACKLIST = ['band-fill', 'predicted-line'];
const OBSERVED_STYLE = { data: { stroke: COLOR_SCALE[1] } };
const PREDICTED_STYLE = { data: { stroke: COLOR_SCALE[3] } };
const BAND_STYLE = { data: { fill: COLOR_SCALE[0], opacity: 0.5, stroke: 'none' } };

const ForecastChart: React.FC<ForecastChartProps> = ({ performer, title }) => {
  const sorted = React.useMemo(
    () =>
      performer.windows
        .flatMap((w) => w.forecast_data)
        .toSorted((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [performer],
  );

  const { observed, predicted, band } = React.useMemo(() => buildSeriesData(sorted), [sorted]);

  const dataRef = React.useRef({ observed, predicted });
  dataRef.current = { observed, predicted };

  const tooltipElement = React.useMemo(
    () => <ForecastTooltip dataRef={dataRef} chartWidth={450} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref is stable
    [],
  );

  const tickValues = React.useMemo(() => {
    const n = sorted.length;
    if (n === 0) {
      return [];
    }
    if (n <= 2) {
      return sorted.map((_, i) => i);
    }
    return [0, Math.floor(n / 2), n - 1];
  }, [sorted]);

  const tickFormat = React.useCallback(
    (val: number) => {
      if (val >= sorted.length) {
        return '';
      }
      const ts = sorted[val].timestamp;
      const dateLabel = new Date(ts).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const otherTicks = tickValues.filter((i) => i !== val && i < sorted.length);
      const collidesWithAnother = otherTicks.some(
        (i) =>
          new Date(sorted[i].timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }) === dateLabel,
      );
      return collidesWithAnother
        ? new Date(ts).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
          })
        : dateLabel;
    },
    [sorted, tickValues],
  );

  const series: ChartSeries[] = React.useMemo(
    () => [
      { type: 'area', name: 'band-fill', data: band, style: BAND_STYLE },
      { type: 'line', data: observed, style: OBSERVED_STYLE },
      { type: 'line', name: 'predicted-line', data: predicted, style: PREDICTED_STYLE },
    ],
    [band, observed, predicted],
  );

  return (
    <div
      className="automl-forecast-card"
      data-testid={`forecast-chart-${title.replace(/\s+/g, '-')}`}
    >
      <div className="automl-forecast-card__header">
        {/* eslint-disable-next-line camelcase */}
        <Title headingLevel="h4" size="md">
          {performer.item_id}
        </Title>
        <Label isCompact variant="outline">
          {title}
        </Label>
      </div>
      <BacktestCurveChart
        series={series}
        tickValues={tickValues}
        tickFormat={tickFormat}
        ariaDesc={`Forecast vs observed for ${performer.item_id}`}
        height={CHART_HEIGHT}
        domainPadding={FORECAST_DOMAIN_PADDING}
        voronoiBlacklist={FORECAST_VORONOI_BLACKLIST}
        labelComponent={tooltipElement}
        yAxisLabel="Value"
      />
    </div>
  );
};

export default ForecastChart;
