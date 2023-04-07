import React from 'react';
import { Card, CardTitle, Stack, StackItem } from '@patternfly/react-core';
import { MetricChartLine } from '~/pages/modelServing/screens/metrics/types';
import MetricsChart, { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';

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
const TrustyChart: React.FC<TrustyChartProps> = ({ title, metrics, domainCalc }) => (
  <Stack>
    <StackItem>
      <Card>
        <CardTitle>{title}</CardTitle>
      </Card>
    </StackItem>
    <StackItem>
      <MetricsChart title={title} metrics={metrics} domainCalc={domainCalc} embedded={true} />
    </StackItem>
  </Stack>
);

export default TrustyChart;
