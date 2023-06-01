import React from 'react';
import { Stack, ToolbarContent, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import ScheduledMetricSelect from '~/pages/modelServing/screens/metrics/ScheduledMetricSelect';
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
  type?: MetricsChartTypes;
};

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  abbreviation,
  metricType,
  tooltip,
  thresholds,
  domain,
  type = MetricsChartTypes.AREA,
}) => {
  const THRESHOLD_COLOR = 'red';
  const { data } = React.useContext(ModelServingMetricsContext);
  const [selectedPayloadName, setSelectedPayloadName] = React.useState<string>();

  const metricData = data[metricType].data;

  //TODO: Fix this. This is a short term hack to add a property that will be provided by TrustyAI by release time.
  metricData.forEach((x, i) => {
    if (!x.metric?.requestName) {
      x.metric.requestName = `Payload ${i}`;
    }
  });

  React.useEffect(() => {
    if (!selectedPayloadName) {
      setSelectedPayloadName(metricData[0]?.metric?.requestName);
    }
  }, [selectedPayloadName, metricData]);

  const payloadOptions: string[] = metricData.map((payload) => payload.metric.requestName);

  const selectedPayload = metricData.find((x) => x.metric.requestName === selectedPayloadName);

  const metric = {
    ...data[metricType],
    data: selectedPayload?.values,
  };

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
