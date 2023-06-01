import React from 'react';
import TrustyChart from '~/pages/modelServing/screens/metrics/TrustyChart';

type BiasMetricChartWrapperProps = {
  children: React.ReactElement<typeof TrustyChart>;
  name: string;
};

//TODO
// * Format title properly
// * Implement hider dropdown
const BiasMetricsChartWrapper: React.FC<BiasMetricChartWrapperProps> = ({ children, name }) => (
  <>
    <p>{name}</p>
    {children}
  </>
);

export default BiasMetricsChartWrapper;
