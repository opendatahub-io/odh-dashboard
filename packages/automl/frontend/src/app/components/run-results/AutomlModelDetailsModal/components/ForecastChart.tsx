import React from 'react';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Title } from '@patternfly/react-core';
import type { BackTestingForecastPoint, BackTestingSeriesPerformer } from '~/app/types';
import { COLOR_SCALE } from './chartConstants';

type ForecastChartProps = {
  performer: BackTestingSeriesPerformer;
  title: string;
};

type IndexedPoint = { x: number; y: number; name: string };
type BandPoint = { x: number; y: number; y0: number };

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Expects points already sorted chronologically.
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
    })),
  };
}

const CHART_HEIGHT = 220;
const CHART_PADDING = { bottom: 60, left: 80, right: 40, top: 20 };
const OBSERVED_STYLE = { data: { stroke: COLOR_SCALE[0] } };
const PREDICTED_STYLE = { data: { stroke: COLOR_SCALE[1] } };
const BAND_STYLE = { data: { fill: COLOR_SCALE[1], opacity: 0.15, stroke: 'none' } };

const ForecastChart: React.FC<ForecastChartProps> = ({ performer, title }) => {
  // Flatten all forecast points and sort chronologically — windows may not arrive in time order.
  const sorted = React.useMemo(
    () =>
      performer.windows
        .flatMap((w) => w.forecast_data)
        .toSorted((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [performer],
  );

  const { observed, predicted, band } = React.useMemo(() => buildSeriesData(sorted), [sorted]);

  // Label only the start, middle, and end of the time range to keep the axis readable.
  // Tracking window boundaries would require re-mapping indices after the chronological sort,
  // so we use the simpler approach of evenly spaced anchor points.
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
      // Check whether any other visible tick would produce the same date-only label.
      // When windows are close together (e.g. prediction_length=1), two boundaries can
      // fall on the same calendar day — adding the hour disambiguates just those labels.
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

  return (
    <div data-testid={`forecast-chart-${title.replace(/\s+/g, '-')}`}>
      <Title headingLevel="h3" size="md" className="pf-v6-u-mb-sm">
        {/* eslint-disable-next-line camelcase */}
        {performer.item_id} ({title})
      </Title>
      <Chart
        ariaDesc={`Forecast vs observed for ${performer.item_id}`}
        ariaTitle={`Forecast vs observed — ${title}`}
        containerComponent={
          <ChartVoronoiContainer
            constrainToVisibleArea
            labels={({ datum }: { datum: IndexedPoint }) => datum.name}
          />
        }
        height={CHART_HEIGHT}
        padding={CHART_PADDING}
      >
        <ChartAxis tickFormat={tickFormat} tickValues={tickValues} />
        <ChartAxis dependentAxis showGrid />
        <ChartGroup>
          <ChartArea data={band} style={BAND_STYLE} />
          <ChartLine data={observed} style={OBSERVED_STYLE} />
          <ChartLine data={predicted} style={PREDICTED_STYLE} />
        </ChartGroup>
      </Chart>
    </div>
  );
};

export default ForecastChart;
