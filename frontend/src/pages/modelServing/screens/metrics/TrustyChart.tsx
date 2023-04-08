import React from 'react';
import { Select, SelectOption, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { MetricChartLine } from '~/pages/modelServing/screens/metrics/types';
import MetricsChart, { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import SPDTooltip from '~/pages/modelServing/screens/metrics/SPDTooltip';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';

//Question: Is there some way of passing props through from a parent component to a child without
//redeclaring them - or is this the best way to do it?
type TrustyChartProps = {
  title: string;
  color?: string;
  metrics: MetricChartLine;
  threshold?: number;
  minThreshold?: number;
  //TODO: Consider a different parameter name
  domainCalc: DomainCalculator;
};

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  metrics,
  threshold,
  minThreshold,
  domainCalc,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string>();

  const { data } = React.useContext(ModelServingMetricsContext);
  let metric = {
    ...data[InferenceMetricType.TRUSTY_AI_SPD],
    data: data[InferenceMetricType.TRUSTY_AI_SPD].data[0]?.values, //map((x) => x?.[0]?.values || []),
  };

  const payloads = data[InferenceMetricType.TRUSTY_AI_SPD].data.map((elem, index) => ({
    id: 'payload-' + index,
    index,
  }));

  const showPayload = (id) => {
    const index = payloads.filter((x) => id === x.id).index;
    metric = {
      ...data[InferenceMetricType.TRUSTY_AI_SPD],
      data: data[InferenceMetricType.TRUSTY_AI_SPD].data[index]?.values, //map((x) => x?.[0]?.values || []),
    };
  };

  const onToggle = () => setIsOpen(!isOpen);
  const onSelect = (event, selection) => {
    console.log('select: %O', selection);
    setSelected(selection);
    setIsOpen(false);
    //showPayload(selection);
  };

  return (
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
            <ToolbarItem>
              <Select onToggle={onToggle} isOpen={isOpen} onSelect={onSelect} selections={selected}>
                {payloads.map((payload, index) => (
                  <SelectOption key={index} value={payload.id} />
                ))}
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      }
      threshold={threshold}
      minThreshold={minThreshold}
      thresholdColor="red"
    />
  );
};

export default TrustyChart;
