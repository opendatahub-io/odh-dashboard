/**
 * BacktestCurveChart — shared chart shell for the Back-testing tab.
 *
 * Consumers: BacktestWindowChart (per-window metric line), ForecastChart (observed
 * vs predicted with confidence interval band).
 *
 * Renders a PF Victory chart with Voronoi hover tooltips, a grid-enabled dependent
 * axis, and a caller-configured independent axis (tick values + format). Consumers
 * supply an ordered list of series (line, area, or scatter) with their data and
 * styles — this component handles the chart layout, axes, and tooltip container.
 */
import React from 'react';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartScatter,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { BACKTEST_CHART_PADDING } from './chartConstants';

export type ChartDataPoint = { x: number; y: number; name: string; y0?: number };

export type ChartSeries = {
  type: 'line' | 'area' | 'scatter';
  data: ChartDataPoint[];
  style: Record<string, unknown>;
};

type BacktestCurveChartProps = {
  series: ChartSeries[];
  tickValues: number[];
  tickFormat: (val: number) => string;
  ariaDesc: string;
  ariaTitle: string;
  height?: number;
  'data-testid'?: string;
};

const voronoiLabels = ({ datum }: { datum: ChartDataPoint }) => datum.name;

function renderSeries(s: ChartSeries, idx: number): React.ReactElement {
  switch (s.type) {
    case 'area':
      return <ChartArea key={idx} data={s.data} style={s.style} />;
    case 'scatter':
      return <ChartScatter key={idx} data={s.data} style={s.style} />;
    default:
      return <ChartLine key={idx} data={s.data} style={s.style} />;
  }
}

const BacktestCurveChart: React.FC<BacktestCurveChartProps> = ({
  series,
  tickValues,
  tickFormat,
  ariaDesc,
  ariaTitle,
  height = 300,
  'data-testid': dataTestId,
}) => (
  <div data-testid={dataTestId}>
    <Chart
      ariaDesc={ariaDesc}
      ariaTitle={ariaTitle}
      containerComponent={<ChartVoronoiContainer constrainToVisibleArea labels={voronoiLabels} />}
      height={height}
      padding={BACKTEST_CHART_PADDING}
    >
      <ChartAxis tickFormat={tickFormat} tickValues={tickValues} />
      <ChartAxis dependentAxis showGrid />
      <ChartGroup>{series.map(renderSeries)}</ChartGroup>
    </Chart>
  </div>
);

export default BacktestCurveChart;
