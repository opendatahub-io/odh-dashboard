import React from 'react';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
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

function buildSeriesData(points: BackTestingForecastPoint[]): {
  observed: IndexedPoint[];
  predicted: IndexedPoint[];
  band: BandPoint[];
} {
  const sorted = points.toSorted((a, b) => a.timestamp.localeCompare(b.timestamp));
  return {
    observed: sorted.map((p, i) => ({
      x: i,
      y: p.actual,
      name: `Observed: ${p.actual.toFixed(2)} (${formatTimestamp(p.timestamp)})`,
    })),
    predicted: sorted.map((p, i) => ({
      x: i,
      y: p.predicted,
      name: `Forecast: ${p.predicted.toFixed(2)} (${formatTimestamp(p.timestamp)})`,
    })),
    band: sorted.map((p, i) => ({
      x: i,
      y: p.upper_bound,
      y0: p.lower_bound,
    })),
  };
}

const CHART_SIZE = 400;
const CHART_PADDING = { bottom: 60, left: 80, right: 40, top: 20 };
const OBSERVED_STYLE = { data: { stroke: COLOR_SCALE[0] } };
const PREDICTED_STYLE = { data: { stroke: COLOR_SCALE[1] } };
const BAND_STYLE = { data: { fill: COLOR_SCALE[1], opacity: 0.15, stroke: 'none' } };
const LEGEND_ITEMS = [
  { color: COLOR_SCALE[0], label: 'Observed' },
  { color: COLOR_SCALE[1], label: 'Forecast' },
  { color: COLOR_SCALE[1], label: 'Confidence interval', opacity: 0.4 },
];

const ForecastChart: React.FC<ForecastChartProps> = ({ performer, title }) => {
  const allPoints = React.useMemo(
    () => performer.windows.flatMap((w) => w.forecast_data),
    [performer],
  );

  const sorted = React.useMemo(
    () => allPoints.toSorted((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [allPoints],
  );

  const { observed, predicted, band } = React.useMemo(() => buildSeriesData(sorted), [sorted]);

  const tickFormat = React.useCallback(
    (val: number) => (val < sorted.length ? formatTimestamp(sorted[val].timestamp) : ''),
    [sorted],
  );

  const tickValues = React.useMemo(() => sorted.map((_, i) => i), [sorted]);

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
        height={CHART_SIZE}
        padding={CHART_PADDING}
      >
        <ChartAxis
          tickFormat={tickFormat}
          tickValues={tickValues}
          style={{ tickLabels: { angle: -30, fontSize: 10 } }}
        />
        <ChartAxis dependentAxis showGrid />
        <ChartGroup>
          <ChartArea data={band} style={BAND_STYLE} />
          <ChartLine data={observed} style={OBSERVED_STYLE} />
          <ChartLine data={predicted} style={PREDICTED_STYLE} />
        </ChartGroup>
      </Chart>
      <Flex spaceItems={{ default: 'spaceItemsMd' }} className="pf-v6-u-mt-sm">
        {LEGEND_ITEMS.map(({ color, label, opacity }) => (
          <FlexItem key={label}>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <svg width="20" height="4">
                  <rect width="20" height="4" fill={color} opacity={opacity ?? 1} />
                </svg>
              </FlexItem>
              <FlexItem>{label}</FlexItem>
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </div>
  );
};

export default ForecastChart;
