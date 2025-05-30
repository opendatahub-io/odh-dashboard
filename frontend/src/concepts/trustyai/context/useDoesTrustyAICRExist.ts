import React from 'react';
import { TrustyAIContext } from '#~/concepts/trustyai/context/TrustyAIContext';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { TRUSTY_CR_NOT_AVAILABLE_STATES } from '#~/concepts/trustyai/types';

const useDoesTrustyAICRExist = (): boolean[] => {
  const trustyAIAreaAvailable = useIsAreaAvailable(SupportedArea.TRUSTY_AI).status;
  const { statusState } = React.useContext(TrustyAIContext);

  const hasCR = !TRUSTY_CR_NOT_AVAILABLE_STATES.includes(statusState.type);

  return [trustyAIAreaAvailable && hasCR];
};

export default useDoesTrustyAICRExist;
