type PrometheusQueryResponse<TResultExtraProps extends object = object> = {
  data: {
    result: ({
      value: [number, string];
    } & TResultExtraProps)[];
    resultType: string;
  };
  status: string;
};

type MockPrometheusQueryResponseType = {
  value?: [number, string];
};

export const mockPrometheusQueryResponse = ({
  value = [1704910625.644, '50'],
}: MockPrometheusQueryResponseType): PrometheusQueryResponse => ({
  data: {
    result: [
      {
        value,
      },
    ],
    resultType: 'matrix',
  },
  status: 'success',
});
