import React from 'react';
import { Select, SelectOption, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { MetricChartLine } from '~/pages/modelServing/screens/metrics/types';
import MetricsChart, { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import SPDTooltip from '~/pages/modelServing/screens/metrics/SPDTooltip';

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

const options = [
  <SelectOption key={0} value="Select a title" isPlaceholder />,
  <SelectOption key={1} value="Mr" />,
  <SelectOption key={2} value="Miss" />,
  <SelectOption key={3} value="Mrs" />,
  <SelectOption key={4} value="Ms" />,
];
const toolbar = (
  <Toolbar>
    <ToolbarContent>
      <ToolbarItem>
        <SPDTooltip />
      </ToolbarItem>
      <ToolbarItem>
        Unique Payloads: <Select onToggle={() => true}>{options}</Select>
      </ToolbarItem>
    </ToolbarContent>
  </Toolbar>
);
const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  metrics,
  threshold,
  minThreshold,
  domainCalc,
}) => (
  <MetricsChart
    title={title}
    metrics={metrics}
    domainCalc={domainCalc}
    toolbar={toolbar}
    threshold={threshold}
    minThreshold={minThreshold}
    thresholdColor="red"
  />
);

export default TrustyChart;
