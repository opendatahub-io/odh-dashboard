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
};
