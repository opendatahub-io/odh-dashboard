import React from 'react';
import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import { ExplainabilityContext } from '~/concepts/explainability/ExplainabilityContext';

const useBiasMetricsInstalled = () => {
  const biasMetricsEnabled = useBiasMetricsEnabled();
  const { hasCR } = React.useContext(ExplainabilityContext);

  return [biasMetricsEnabled && hasCR];
};

export default useBiasMetricsInstalled;
