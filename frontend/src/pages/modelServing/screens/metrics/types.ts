import { DomainTuple, ForAxes } from 'victory-core';
import { ChartThemeDefinitionInterface } from '@patternfly/react-charts/victory';
import { PrometheusQueryRangeResultValue } from '#~/types';
import { BiasMetricType } from '#~/api';
import { ModelMetricType } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import { FetchStateObject } from '#~/utilities/useFetch';

export type TranslatePoint = (line: GraphMetricPoint) => GraphMetricPoint;

type MetricChartLineBase = {
  metric: FetchStateObject<PrometheusQueryRangeResultValue[]>;
  translatePoint?: TranslatePoint;
  theme?: ChartThemeDefinitionInterface;
};
export type NamedMetricChartLine = MetricChartLineBase & {
  name: string;
  color?: string; // Add customColor as an optional property
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
  data: { points: GraphMetricLine; name: string }[];
  maxYValue: number;
  minYValue: number;
  maxXValue: number;
  minXValue: number;
};

export type MetricChartThreshold = {
  value: number;
  color?: string;
  label?: string;
};

export type DomainCalculator = (
  maxYValue: number,
  minYValue: number,
) => ForAxes<DomainTuple> | undefined;

export enum MetricsChartTypes {
  AREA,
  LINE,
  DONUT,
}

export enum MetricsTabKeys {
  PERFORMANCE = 'performance',
  BIAS = 'bias',
  NIM = 'nim',
}

export type BiasChartConfig = {
  title: string;
  abbreviation: string;
  domainCalculator: (userDelta: number | undefined) => DomainCalculator;
  modelMetricKey: ModelMetricType;
  chartType: MetricsChartTypes;
  thresholdOrigin: number;
  defaultDelta: number;
};
export type BiasChartConfigMap = { [key in BiasMetricType]: BiasChartConfig };

export type BiasSelectOption = {
  id: string;
  name: string;
  biasMetricConfig: BiasMetricConfig;
  toString: () => string;
  compareTo: (x: BiasSelectOption) => boolean;
};
