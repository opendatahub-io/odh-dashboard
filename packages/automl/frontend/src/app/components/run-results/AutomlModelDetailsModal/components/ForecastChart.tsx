import React from 'react';
import { Label, Title } from '@patternfly/react-core';
import type { BackTestingForecastPoint, BackTestingSeriesPerformer } from '~/app/types';
import { COLOR_SCALE } from './chartConstants';
import BacktestCurveChart, { type ChartSeries } from './BacktestCurveChart';

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
  return {
    observed: points.map((p, i) => ({
      x: i,
      y: p.actual,
      name: `Observed: ${p.actual.toFixed(2)} (${formatTimestamp(p.timestamp)})`,
    })),
    predicted: points.map((p, i) => ({
      x: i,
      y: p.predicted,
      name: `Forecast: ${p.predicted.toFixed(2)} (${formatTimestamp(p.timestamp)})`,
    })),
    band: points.map((p, i) => ({
      x: i,
      y: p.upper_bound,
      y0: p.lower_bound,
      name: '',
    })),
  };
}

const CHART_HEIGHT = 220;
const OBSERVED_STYLE = { data: { stroke: COLOR_SCALE[0] } };
const PREDICTED_STYLE = { data: { stroke: COLOR_SCALE[1] } };
const BAND_STYLE = { data: { fill: COLOR_SCALE[1], opacity: 0.15, stroke: 'none' } };

const ForecastChart: React.FC<ForecastChartProps> = ({ performer, title }) => {
  const sorted = React.useMemo(
    () =>
      performer.windows
        .flatMap((w) => w.forecast_data)
        .toSorted((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [performer],
  );

  const { observed, predicted, band } = React.useMemo(() => buildSeriesData(sorted), [sorted]);

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
      { type: 'area', data: band, style: BAND_STYLE },
      { type: 'line', data: observed, style: OBSERVED_STYLE },
      { type: 'line', data: predicted, style: PREDICTED_STYLE },
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
        <Label isCompact>{title}</Label>
      </div>
      <BacktestCurveChart
        series={series}
        tickValues={tickValues}
        tickFormat={tickFormat}
        ariaDesc={`Forecast vs observed for ${performer.item_id}`}
        ariaTitle={`Forecast vs observed — ${title}`}
        height={CHART_HEIGHT}
      />
    </div>
  );
};

export default ForecastChart;
