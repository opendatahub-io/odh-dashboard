import * as _ from 'lodash';
import { SelectOptionObject } from '@patternfly/react-core';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { DashboardConfig } from '~/types';
import { InferenceMetricType, RuntimeMetricType } from './ModelServingMetricsContext';

export const isModelMetricsEnabled = (
  dashboardNamespace: string,
  dashboardConfig: DashboardConfig,
): boolean => {
  if (dashboardNamespace === 'redhat-ods-applications') {
    return true;
  }
  return dashboardConfig.spec.dashboardConfig.modelMetricsNamespace !== '';
};

export const getRuntimeMetricsQueries = (
  runtime: ServingRuntimeKind,
): Record<RuntimeMetricType, string> => {
  const namespace = runtime.metadata.namespace;
  return {
    [RuntimeMetricType.REQUEST_COUNT]: `TBD`,
    [RuntimeMetricType.AVG_RESPONSE_TIME]: `rate(modelmesh_api_request_milliseconds_sum{exported_namespace="${namespace}"}[1m])/rate(modelmesh_api_request_milliseconds_count{exported_namespace="${namespace}"}[1m])`,
    [RuntimeMetricType.CPU_UTILIZATION]: `TBD`,
    [RuntimeMetricType.MEMORY_UTILIZATION]: `TBD`,
  };
};

export const getInferenceServiceMetricsQueries = (
  inferenceService: InferenceServiceKind,
): Record<InferenceMetricType, string> => {
  const namespace = inferenceService.metadata.namespace;
  const name = inferenceService.metadata.name;
  return {
    // TODO: Do we have two queries? one for success and one for failure?
    [InferenceMetricType.REQUEST_COUNT]: `sum(haproxy_backend_http_responses_total{exported_namespace="${namespace}", route="${name}"})`,
  };
};

export const isTimeframeTitle = (
  timeframe: string | SelectOptionObject,
): timeframe is TimeframeTitle =>
  Object.values(TimeframeTitle).includes(timeframe as TimeframeTitle);

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
  return `${show === 'date' ? `${day} ${month} ` : ''}${hour}:${minuteString}${
    show === 'second' ? `:${secondString}` : ''
  } ${ampm}`;
};

export const getThresholdData = (
  data: { x: number; y: number; name: string }[],
  threshold: number,
): { x: number; y: number }[] =>
  _.uniqBy(
    data.map((data) => ({ name: 'Threshold', x: data.x, y: threshold })),
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
