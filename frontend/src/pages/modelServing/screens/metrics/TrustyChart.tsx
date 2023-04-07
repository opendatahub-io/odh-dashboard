import React from 'react';
import { Select, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
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
  //TODO: Consider a different parameter name
  domainCalc: DomainCalculator;
};

const toolbar = (
  <Toolbar>
    <ToolbarContent>
      <ToolbarItem>
        <SPDTooltip />
      </ToolbarItem>
      <ToolbarItem>
        <Select onToggle={(x) => x}></Select>
      </ToolbarItem>
    </ToolbarContent>
  </Toolbar>
);
const TrustyChart: React.FC<TrustyChartProps> = ({ title, metrics, domainCalc }) => (
  <MetricsChart title={title} metrics={metrics} domainCalc={domainCalc} toolbar={toolbar} />
);

export default TrustyChart;
