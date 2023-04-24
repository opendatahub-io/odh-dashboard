import { DomainTuple, ForAxes } from 'victory-core';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';

export type TranslatePoint = (line: GraphMetricPoint) => GraphMetricPoint;

type MetricChartLineBase = {
  metric: ContextResourceData<PrometheusQueryRangeResultValue>;
  translatePoint?: TranslatePoint;
};
export type NamedMetricChartLine = MetricChartLineBase & {
  name: string;
};
export type UnnamedMetricChartLine = MetricChartLineBase & {
  /** Assumes chart title */
  name?: string;
};
export type MetricChartLine = UnnamedMetricChartLine | NamedMetricChartLine[];

export type GraphMetricPoint = {
  x: number;
  y: number;
  name: string;
};
export type GraphMetricLine = GraphMetricPoint[];

export type ProcessedMetrics = {
  data: GraphMetricLine[];
  maxYValue: number;
  minYValue: number;
};

//TODO: color should be an enum of limited PF values and red, not an openended string.
export type MetricChartThreshold = {
  value: number;
  color?: string;
  label?: string;
};

export type DomainCalculator = (maxYValue: number, minYValue: number) => ForAxes<DomainTuple>;

export enum MetricsChartTypes {
  AREA,
  LINE,
}

export enum MetricsTabKeys {
  PERFORMANCE = 'performance',
  BIAS = 'bias',
}
