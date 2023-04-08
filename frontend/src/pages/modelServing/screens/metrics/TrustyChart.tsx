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

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  metrics,
  threshold,
  minThreshold,
  domainCalc,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string>();

  const options = [
    { value: 'opt-0', disabled: false },
    { value: 'opt-1', disabled: false },
    { value: 'opt-2', disabled: false },
  ];

  const onToggle = () => setIsOpen(!isOpen);
  const onSelect = (event, selection) => {
    setSelected(selection);
    setIsOpen(false);
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
                {options.map((option, index) => (
                  <SelectOption key={index} value={option.value} />
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
