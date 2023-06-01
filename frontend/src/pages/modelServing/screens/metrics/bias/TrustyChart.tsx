import React from 'react';
import { Stack } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { DomainCalculator, MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';

export type TrustyChartProps = {
  title: string;
  abbreviation: string;
  metricType: InferenceMetricType.TRUSTY_AI_SPD | InferenceMetricType.TRUSTY_AI_DIR;
  tooltip?: React.ReactElement<typeof Stack>;
  thresholds: [number, number];
  domain: DomainCalculator;
  id: string;
};

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  abbreviation,
  metricType,
  thresholds,
  domain,
  id,
}) => {
  const THRESHOLD_COLOR = 'red';
  const { data } = React.useContext(ModelServingMetricsContext);
  // const [selectedPayloadName, setSelectedPayloadName] = React.useState<string>();
  //
  // const metricData = data[metricType].data;
  //
  // //TODO: Fix this. This is a short term hack to add a property that will be provided by TrustyAI by release time.
  // metricData.forEach((x, i) => {
  //   if (!x.metric?.requestName) {
  //     x.metric.requestName = `Payload ${i}`;
  //   }
  // });
  //
  // React.useEffect(() => {
  //   if (!selectedPayloadName) {
  //     setSelectedPayloadName(metricData[0]?.metric?.requestName);
  //   }
  // }, [selectedPayloadName, metricData]);
  //
  // const payloadOptions: string[] = metricData.map((payload) => payload.metric.requestName);
  //
  // const selectedPayload = metricData.find((x) => x.metric.requestName === selectedPayloadName);

  // data[metricType].data
  //
  // const chartData = React.useMemo(() => {
  //   const
  // },[]);

  const metric = React.useMemo(() => {
    const metricData = data[metricType].data;

    const values = metricData.find((x) => x.metric.request === id)?.values;

    // const values = [];
    return {
      ...data[metricType],
      data: values,
    };
  }, [data, id, metricType]);

  // const metric = {
  //   ...data[metricType],
  //   data: selectedPayload?.values,
  // };
  //
  // const

  let type;

  if (metricType === InferenceMetricType.TRUSTY_AI_SPD) {
    type = MetricsChartTypes.AREA;
  } else {
    type = MetricsChartTypes.LINE;
  }

  return (
    <MetricsChart
      title={`${title} (${abbreviation})`}
      metrics={{
        name: abbreviation,
        metric: metric,
      }}
      domain={domain}
      thresholds={thresholds.map((t) => ({
        value: t,
        color: THRESHOLD_COLOR,
      }))}
      type={type}
    />
  );
};
export default TrustyChart;
