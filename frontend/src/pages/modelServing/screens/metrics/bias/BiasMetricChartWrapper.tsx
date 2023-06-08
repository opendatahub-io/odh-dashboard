import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
import { useBrowserStorage } from '~/components/browserStorage';
import './BiasMetricChartWrapper.scss';

type BiasMetricChartWrapperProps = {
  children: React.ReactElement<typeof TrustyChart>;
  title: string;
  storageKey: string;
};

const BiasMetricsChartWrapper: React.FC<BiasMetricChartWrapperProps> = ({
  children,
  title,
  storageKey,
}) => {
  const [isExpanded, setIsExpanded] = useBrowserStorage(storageKey, true, true, true);

  return (
    <ExpandableSection
      className="dashboard-expandable-section-heading"
      toggleText={title}
      onToggle={setIsExpanded}
      isExpanded={isExpanded}
    >
      {children}
    </ExpandableSection>
  );
};

export default BiasMetricsChartWrapper;
