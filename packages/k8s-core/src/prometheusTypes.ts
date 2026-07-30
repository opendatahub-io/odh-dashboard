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

export type PrometheusQueryResponse<TResultExtraProps extends object = object> = {
  data: {
    result: ({
      value: [number, string];
    } & TResultExtraProps)[];
    resultType: string;
  };
  status: string;
};
