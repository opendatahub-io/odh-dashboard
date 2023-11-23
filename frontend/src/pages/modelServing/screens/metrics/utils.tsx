import * as React from 'react';
import * as _ from 'lodash';
import { BreadcrumbItem, SelectOptionObject } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { RefreshIntervalTitle, TimeframeTitle } from '~/pages/modelServing/screens/types';

import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { BreadcrumbItemType, PrometheusQueryRangeResultValue } from '~/types';
import { BaseMetricRequest, BaseMetricRequestInput, BiasMetricType } from '~/api';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import {
  BIAS_CHART_CONFIGS,
  BIAS_THRESHOLD_COLOR,
} from '~/pages/modelServing/screens/metrics/const';
import { QueryTimeframeStep } from '~/pages/modelServing/screens/const';
import {
  BiasSelectOption,
  DomainCalculator,
  GraphMetricLine,
  GraphMetricPoint,
  MetricChartLine,
  MetricChartThreshold,
  NamedMetricChartLine,
  TranslatePoint,
} from './types';
import { ModelMetricType, ServerMetricType } from './ModelServingMetricsContext';

export const getServerMetricsQueries = (
  server: ServingRuntimeKind,
  currentTimeframe: TimeframeTitle,
): { [key in ServerMetricType]: string } => {
  const namespace = server.metadata.namespace;
  const name = server.metadata.name;
  const responseTimeStep = QueryTimeframeStep[ServerMetricType.AVG_RESPONSE_TIME][currentTimeframe];
  return {
    [ServerMetricType.REQUEST_COUNT]: `sum(increase(modelmesh_api_request_milliseconds_count{namespace="${namespace}",pod=~"modelmesh-serving-${name}-.*"}[${
      QueryTimeframeStep[ServerMetricType.REQUEST_COUNT][currentTimeframe]
    }s]))`,
    [ServerMetricType.AVG_RESPONSE_TIME]: `increase(modelmesh_api_request_milliseconds_sum{namespace="${namespace}",pod=~"modelmesh-serving-${name}-.*"}[${responseTimeStep}s])/increase(modelmesh_api_request_milliseconds_count{namespace="${namespace}",pod=~"modelmesh-serving-${name}-.*"}[${responseTimeStep}s])`,
    [ServerMetricType.CPU_UTILIZATION]: `sum(pod:container_cpu_usage:sum{namespace="${namespace}", pod=~"modelmesh-serving-${name}-.*"})/sum(kube_pod_resource_limit{resource="cpu", pod=~"modelmesh-serving-${name}-.*", namespace="${namespace}"})`,
    [ServerMetricType.MEMORY_UTILIZATION]: `sum(container_memory_working_set_bytes{namespace="${namespace}", pod=~"modelmesh-serving-${name}-.*"})/sum(kube_pod_resource_limit{resource="memory", pod=~"modelmesh-serving-${name}-.*", namespace="${namespace}"})`,
  };
};

export const getModelMetricsQueries = (
  model: InferenceServiceKind,
  currentTimeframe: TimeframeTitle,
): { [key in ModelMetricType]: string } => {
  const namespace = model.metadata.namespace;
  const name = model.metadata.name;

  return {
    [ModelMetricType.REQUEST_COUNT_SUCCESS]: `sum(increase(modelmesh_api_request_milliseconds_count{namespace='${namespace}',vModelId='${name}', code='OK'}[${
      QueryTimeframeStep[ModelMetricType.REQUEST_COUNT_SUCCESS][currentTimeframe]
    }s]))`,
    [ModelMetricType.REQUEST_COUNT_FAILED]: `sum(increase(modelmesh_api_request_milliseconds_count{namespace='${namespace}',vModelId='${name}', code!='OK'}[${
      QueryTimeframeStep[ModelMetricType.REQUEST_COUNT_SUCCESS][currentTimeframe]
    }s]))`,
    [ModelMetricType.TRUSTY_AI_SPD]: `trustyai_spd{model="${name}"}`,
    [ModelMetricType.TRUSTY_AI_DIR]: `trustyai_dir{model="${name}"}`,
  };
};

export const isTimeframeTitle = (
  timeframe: string | SelectOptionObject,
): timeframe is TimeframeTitle =>
  Object.values(TimeframeTitle).includes(timeframe as TimeframeTitle);

export const isRefreshIntervalTitle = (
  refreshInterval: string | SelectOptionObject,
): refreshInterval is RefreshIntervalTitle =>
  Object.values(RefreshIntervalTitle).includes(refreshInterval as RefreshIntervalTitle);

export const convertTimestamp = (timestamp: number, show?: 'date' | 'second'): string => {
  const date = new Date(timestamp);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  let hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const ampm = hour > 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  const minuteString = minute < 10 ? '0' + minute : minute;
  const secondString = second < 10 ? '0' + second : second;
  if (show === 'date') {
    return `${day} ${month}`;
  }
  return `${hour}:${minuteString}${show === 'second' ? `:${secondString}` : ''} ${ampm}`;
};

export const getThresholdData = (data: GraphMetricLine[], threshold: number): GraphMetricLine =>
  _.uniqBy(
    _.uniq(
      data.reduce<number[]>((xValues, line) => [...xValues, ...line.map((point) => point.x)], []),
    ).map((xValue) => ({
      name: 'Threshold',
      x: xValue,
      y: threshold,
    })),
    (value) => value.x,
  );

export const formatToShow = (timeframe: TimeframeTitle): 'date' | 'second' | undefined => {
  switch (timeframe) {
    case TimeframeTitle.ONE_HOUR:
    case TimeframeTitle.ONE_DAY:
      return undefined;
    default:
      return 'date';
  }
};

export const per100: TranslatePoint = (point) => ({
  ...point,
  y: Number((point.y / 100).toFixed(2)),
});

export const toPercentage: TranslatePoint = (point) => ({
  ...point,
  y: point.y * 100,
});

export const createGraphMetricLine = ({
  metric,
  name,
  translatePoint,
}: NamedMetricChartLine): GraphMetricLine =>
  metric.data?.map<GraphMetricPoint>((data) => {
    const point: GraphMetricPoint = {
      x: data[0] * 1000,
      y: parseFloat(data[1]),
      name,
    };
    if (translatePoint) {
      return translatePoint(point);
    }
    return point;
  }) || [];

export const useStableMetrics = (
  metricChartLine: MetricChartLine,
  chartTitle: string,
): NamedMetricChartLine[] => {
  const metricsRef = React.useRef<NamedMetricChartLine[]>([]);

  const metrics = Array.isArray(metricChartLine)
    ? metricChartLine
    : [{ ...metricChartLine, name: metricChartLine.name ?? chartTitle }];

  if (
    metrics.length !== metricsRef.current.length ||
    metrics.some((graphLine, i) => graphLine.metric !== metricsRef.current[i].metric)
  ) {
    metricsRef.current = metrics;
  }
  return metricsRef.current;
};

export const getBreadcrumbItemComponents = (breadcrumbItems: BreadcrumbItemType[]) =>
  breadcrumbItems.map((item) => (
    <BreadcrumbItem
      isActive={item.isActive}
      key={item.label}
      render={() => (item.link ? <Link to={item.link}>{item.label}</Link> : <>{item.label}</>)}
    />
  ));

const checkThresholdValid = (metricType: BiasMetricType, thresholdDelta?: number): boolean => {
  if (thresholdDelta !== undefined) {
    if (metricType === BiasMetricType.SPD) {
      // SPD, no limitation, valid
      return true;
    }

    if (metricType === BiasMetricType.DIR) {
      if (thresholdDelta >= 0 && thresholdDelta < 1) {
        // 0<=DIR<1 , valid
        return true;
      }
      // DIR, not within the range, invalid
      return false;
    }
    // not SPD not DIR, undefined for now, metricType should be selected, invalid
    return false;
  }
  // not input anything, invalid
  return false;
};

const checkBatchSizeValid = (batchSize?: number): boolean => {
  if (batchSize !== undefined) {
    if (Number.isInteger(batchSize)) {
      // size > 2, integer, valid
      if (batchSize >= 2) {
        return true;
      }
      // size <= 2, invalid
      return false;
    }
    // not an integer, invalid
    return false;
  }
  // not input anything, invalid
  return false;
};

export const checkConfigurationFieldsValid = (
  configurations: BaseMetricRequest,
  metricType?: BiasMetricType,
) =>
  metricType !== undefined &&
  configurations.requestName !== '' &&
  configurations.protectedAttribute !== '' &&
  configurations.privilegedAttribute !== '' &&
  configurations.unprivilegedAttribute !== '' &&
  configurations.outcomeName !== '' &&
  configurations.favorableOutcome !== '' &&
  configurations.batchSize !== undefined &&
  configurations.batchSize > 0 &&
  checkThresholdValid(metricType, configurations.thresholdDelta) &&
  checkBatchSizeValid(configurations.batchSize);

export const isMetricType = (
  metricType: string | SelectOptionObject,
): metricType is BiasMetricType =>
  Object.values(BiasMetricType).includes(metricType as BiasMetricType);

export const byId =
  <T extends { id: string | number }, U extends T | T['id']>(arg: U) =>
  (arg2: T) => {
    if (typeof arg === 'object') {
      return arg2.id === arg.id;
    }
    return arg2.id === arg;
  };

export const byNotId =
  <T extends { id: string | number }, U extends T | T['id']>(arg: U) =>
  (arg2: T) => {
    if (typeof arg === 'object') {
      return arg2.id !== arg.id;
    }
    return arg2.id !== arg;
  };

export const calculateThresholds = (origin: number, delta: number) => [
  origin + delta,
  origin - delta,
];

export const createChartThresholds = (x: BiasMetricConfig): MetricChartThreshold[] => {
  const { thresholdOrigin, defaultDelta } = BIAS_CHART_CONFIGS[x.metricType];
  const [maxThreshold, minThreshold] = calculateThresholds(
    thresholdOrigin,
    x.thresholdDelta ?? defaultDelta,
  );

  return [
    {
      value: maxThreshold,
      color: BIAS_THRESHOLD_COLOR,
    },
    {
      value: minThreshold,
      color: BIAS_THRESHOLD_COLOR,
    },
  ];
};
export const createBiasSelectOption = (biasMetricConfig: BiasMetricConfig): BiasSelectOption => {
  const { id, name } = biasMetricConfig;
  return {
    id,
    name,
    biasMetricConfig,
    toString: () => name,
    compareTo: byId(id),
  };
};
export const isBiasSelectOption = (obj: SelectOptionObject): obj is BiasSelectOption =>
  'biasMetricConfig' in obj;

export const convertInputType = (input: string) => {
  if (input !== '' && !isNaN(Number(input))) {
    return Number(input);
  }
  if (input.toLowerCase() === 'true') {
    return true;
  }
  if (input.toLowerCase() === 'false') {
    return false;
  }
  return input;
};

export const convertConfigurationRequestType = (
  configuration: BaseMetricRequestInput,
): BaseMetricRequest => ({
  ...configuration,
  privilegedAttribute: convertInputType(configuration.privilegedAttribute),
  unprivilegedAttribute: convertInputType(configuration.unprivilegedAttribute),
  favorableOutcome: convertInputType(configuration.favorableOutcome),
});

export const getThresholdDefaultDelta = (metricType?: BiasMetricType) =>
  metricType && BIAS_CHART_CONFIGS[metricType].defaultDelta;

export const convertPrometheusNaNToZero = (
  data: PrometheusQueryRangeResultValue[],
): PrometheusQueryRangeResultValue[] =>
  data.map((value) => [value[0], isNaN(Number(value[1])) ? '0' : value[1]]);

export const defaultDomainCalculator: DomainCalculator = (maxYValue, minYValue) =>
  maxYValue === 0 && minYValue === 0 ? { y: [0, 10] } : undefined;
