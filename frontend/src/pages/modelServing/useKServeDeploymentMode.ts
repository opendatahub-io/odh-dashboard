import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { AreaContext } from '#~/concepts/areas/AreaContext';
import { DeploymentMode } from '#~/k8sTypes';

const toDeploymentMode = (mode?: string) => Object.values(DeploymentMode).find((v) => mode === v);

export const useKServeDeploymentMode = (): {
  defaultMode: DeploymentMode;
  isRawAvailable: boolean;
  isServerlessAvailable: boolean;
} => {
  const { dscStatus } = React.useContext(AreaContext);
  // should be "Serverless" or "RawDeployment" or blank from the operator
  const defaultDeploymentMode = toDeploymentMode(
    dscStatus?.components?.kserve?.defaultDeploymentMode,
  );

  const isKServeRawEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_RAW).status;
  const isKServeServerlessAvailable = dscStatus?.components?.kserve?.serverlessMode !== 'Removed';

  let mode = DeploymentMode.Serverless;
  if (!isKServeServerlessAvailable && isKServeRawEnabled) {
    mode = DeploymentMode.RawDeployment;
  }
  if (defaultDeploymentMode && isKServeRawEnabled && isKServeServerlessAvailable) {
    mode = defaultDeploymentMode;
  }

  return {
    defaultMode: mode,
    isRawAvailable: isKServeRawEnabled,
    isServerlessAvailable: isKServeServerlessAvailable,
  };
};
