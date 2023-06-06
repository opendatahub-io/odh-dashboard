import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';

type BiasMetricChartWrapperProps = {
  children: React.ReactElement<typeof TrustyChart>;
  name: string;
};

const BiasMetricsChartWrapper: React.FC<BiasMetricChartWrapperProps> = ({ children, name }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const onToggle = (isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection
      toggleContent={
        <span className="pf-u-color-100 pf-u-font-size-xl pf-u-font-family-redhatVF-heading-sans-serif">
          {name}
        </span>
      }
      onToggle={onToggle}
      isExpanded={isExpanded}
    >
      {children}
    </ExpandableSection>
  );
};

export default BiasMetricsChartWrapper;
