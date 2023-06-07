import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
import { useBrowserStorage } from '~/components/browserStorage';
import './BiasMetricChartWrapper.scss';

type BiasMetricChartWrapperProps = {
  children: React.ReactElement<typeof TrustyChart>;
  name: string;
  storageKey: string;
};

const BiasMetricsChartWrapper: React.FC<BiasMetricChartWrapperProps> = ({
  children,
  name,
  storageKey,
}) => {
  const [isExpanded, setIsExpanded] = useBrowserStorage(storageKey, true, true, true);

  const onToggle = (isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection
      className="dashboard-expandable-section-heading"
      toggleText={name}
      onToggle={onToggle}
      isExpanded={isExpanded}
    >
      {children}
    </ExpandableSection>
  );
};

export default BiasMetricsChartWrapper;
