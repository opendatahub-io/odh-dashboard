/**
 * Shared Prometheus query-range response shapes.
 * Pure wire types — not tied to a feature package.
 */

export type PrometheusQueryRangeResultValue = [number, string];

export type PrometheusQueryRangeResponseDataResult = {
  metric: {
    request?: string;
    pod?: string;
  };
  values: PrometheusQueryRangeResultValue[];
};

export type PrometheusQueryRangeResponseData = {
  result?: PrometheusQueryRangeResponseDataResult[];
  resultType: string;
};

export type PrometheusQueryRangeResponse = {
  data: PrometheusQueryRangeResponseData;
  status: string;
};
