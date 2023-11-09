import React from 'react';
import { ExplainabilityContext } from '~/concepts/explainability/ExplainabilityContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useDoesTrustyAICRExist = () => {
  const trustyAIAreaAvailable = useIsAreaAvailable(SupportedArea.TRUSTY_AI).status;
  const { hasCR } = React.useContext(ExplainabilityContext);

  return [trustyAIAreaAvailable && hasCR];
};

export default useDoesTrustyAICRExist;
