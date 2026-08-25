import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { TRUSTY_CR_NOT_AVAILABLE_STATES } from '../types';
import { TrustyAIContext } from '../context/TrustyAIContext';

const useDoesTrustyAICRExist = (): boolean[] => {
  const trustyAIAreaAvailable = useIsAreaAvailable(SupportedArea.TRUSTY_AI).status;
  const { statusState } = React.useContext(TrustyAIContext);

  const hasCR = !TRUSTY_CR_NOT_AVAILABLE_STATES.includes(statusState.type);

  return [trustyAIAreaAvailable && hasCR];
};

export default useDoesTrustyAICRExist;
