import * as _ from 'lodash';
import { SelectOptionObject } from '@patternfly/react-core';
import { TimeframeTitle } from '../types';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { ModelServingMetricType } from './ModelServingMetricsContext';
import { DashboardConfig } from 'types';

export const isModelMetricsEnabled = (
  dashboardNamespace: string,
  dashboardConfig: DashboardConfig,
): boolean => {
  if (dashboardNamespace === 'redhat-ods-applications') {
    return true;
  } else {
    return dashboardConfig.spec.dashboardConfig.modelMetricsNamespace !== '';
  }
};

export const getInferenceServiceMetricsQueries = (
  inferenceService: InferenceServiceKind,
): Record<ModelServingMetricType, string> => {
  const namespace = inferenceService.metadata.namespace;
  const name = inferenceService.metadata.name;
  return {
    [ModelServingMetricType.AVG_RESPONSE_TIME]: `query=sum(haproxy_backend_http_average_response_latency_milliseconds{exported_namespace="${namespace}", route="${name}"})`,
    [ModelServingMetricType.ENDPOINT_HEALTH]: `query=sum(rate(haproxy_backend_http_responses_total{exported_namespace="${namespace}", route="${name}", code=~"5xx"}[5m])) > 0`,
    [ModelServingMetricType.FAILED_REQUEST_COUNT]: `query=sum(haproxy_backend_http_responses_total{exported_namespace="${namespace}", route="${name}", code=~"4xx|5xx"})`,
    [ModelServingMetricType.INFERENCE_PERFORMANCE]: `query=sum(rate(modelmesh_api_request_milliseconds_sum{namespace="${namespace}"}[5m]))`,
    [ModelServingMetricType.REQUEST_COUNT]: `query=sum(haproxy_backend_http_responses_total{exported_namespace="${namespace}", route="${name}"})`,
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
    case TimeframeTitle.FIVE_MINUTES:
      return 'second';
    case TimeframeTitle.ONE_HOUR:
    case TimeframeTitle.ONE_DAY:
      return undefined;
    default:
      return 'date';
  }
};
