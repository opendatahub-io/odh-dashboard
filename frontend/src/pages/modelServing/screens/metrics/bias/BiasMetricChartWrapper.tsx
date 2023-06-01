import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';

type BiasMetricChartWrapperProps = {
  children: React.ReactElement<typeof TrustyChart>;
  name: string;
};

//TODO
// * Format title properly
const BiasMetricsChartWrapper: React.FC<BiasMetricChartWrapperProps> = ({ children, name }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const onToggle = (isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection toggleContent={<h2>{name}</h2>} onToggle={onToggle} isExpanded={isExpanded}>
      {children}
    </ExpandableSection>
  );
};

export default BiasMetricsChartWrapper;
