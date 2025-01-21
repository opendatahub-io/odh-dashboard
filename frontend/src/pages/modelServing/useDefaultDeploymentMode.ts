import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { DeploymentMode } from '~/k8sTypes';

const toDeploymentMode = (mode?: string) => Object.values(DeploymentMode).find((v) => mode === v);

export const useDefaultDeploymentMode = (): DeploymentMode => {
  const { dscStatus } = React.useContext(AreaContext);
  // should be "Serverless" or "RawDeployment" or blank from the operator
  const defaultDeploymentMode = toDeploymentMode(
    dscStatus?.components?.kserve?.defaultDeploymentMode,
  );

  const isKServeRawEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_RAW).status;

  if (!defaultDeploymentMode || !isKServeRawEnabled) {
    return DeploymentMode.Serverless;
  }

  return defaultDeploymentMode;
};
