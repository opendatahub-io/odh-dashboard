import React from 'react';
import { TrustyAIContext } from '~/concepts/trustyai/context/TrustyAIContext';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { TrustyInstallState } from '~/concepts/trustyai/types';

const useDoesTrustyAICRExist = (): boolean[] => {
  const trustyAIAreaAvailable = useIsAreaAvailable(SupportedArea.TRUSTY_AI).status;
  const { statusState } = React.useContext(TrustyAIContext);

  return [trustyAIAreaAvailable && statusState.type === TrustyInstallState.INSTALLED];
};

export default useDoesTrustyAICRExist;
