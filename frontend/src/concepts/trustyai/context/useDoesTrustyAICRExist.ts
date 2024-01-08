import React from 'react';
import { TrustyAIContext } from '~/concepts/trustyai/context/TrustyAIContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useDoesTrustyAICRExist = (): boolean[] => {
  const trustyAIAreaAvailable = useIsAreaAvailable(SupportedArea.TRUSTY_AI).status;
  const { hasCR } = React.useContext(TrustyAIContext);

  return [trustyAIAreaAvailable && hasCR];
};

export default useDoesTrustyAICRExist;
