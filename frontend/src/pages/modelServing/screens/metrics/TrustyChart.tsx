import React from 'react';
import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { MetricChartLine } from '~/pages/modelServing/screens/metrics/types';
import MetricsChart, { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import SPDTooltip from '~/pages/modelServing/screens/metrics/SPDTooltip';
import ScheduledMetricSelect, {
  TrustyMetaData,
} from '~/pages/modelServing/screens/metrics/ScheduledMetricSelect';

//Question: Is there some way of passing props through from a parent component to a child without
//redeclaring them - or is this the best way to do it?
type TrustyChartProps = {
  title: string;
  color?: string;
  metrics: MetricChartLine;
  metadata: TrustyMetaData[];
  threshold?: number;
  minThreshold?: number;
  //TODO: Consider a different parameter name
  domainCalc: DomainCalculator;
};

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  metrics,
  metadata,
  threshold,
  minThreshold,
  domainCalc,
}) => (
  // const [isOpen, setIsOpen] = React.useState(false);
  // const [selected, setSelected] = React.useState<string>();

  // const { data } = React.useContext(ModelServingMetricsContext);
  // let metric = {
  //   ...data[InferenceMetricType.TRUSTY_AI_SPD],
  //   data: data[InferenceMetricType.TRUSTY_AI_SPD].data[0]?.values, //map((x) => x?.[0]?.values || []),
  // };

  // const payloads = data[InferenceMetricType.TRUSTY_AI_SPD].data.map((elem, index) => ({
  //   id: 'payload-' + index,
  //   index,
  // }));

  // const showPayload = (id) => {
  //   const index = payloads.filter((x) => id === x.id).index;
  //   metric = {
  //     ...data[InferenceMetricType.TRUSTY_AI_SPD],
  //     data: data[InferenceMetricType.TRUSTY_AI_SPD].data[index]?.values, //map((x) => x?.[0]?.values || []),
  //   };
  // };

  <MetricsChart
    title={title}
    metrics={metrics}
    domainCalc={domainCalc}
    toolbar={
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SPDTooltip />
          </ToolbarItem>
          <ToolbarItem variant="label">Scheduled Metric</ToolbarItem>
          <ToolbarItem>
            <ScheduledMetricSelect metadata={metadata} />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
    }
    threshold={threshold}
    minThreshold={minThreshold}
    thresholdColor="red"
  />
);
export default TrustyChart;
