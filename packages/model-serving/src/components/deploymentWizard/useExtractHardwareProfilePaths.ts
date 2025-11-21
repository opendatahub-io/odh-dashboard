import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import { isModelServingDeploymentFormDataExtension } from '../../../extension-points';

export const useExtractHardwareProfilePaths = (platformId?: string): CrPathConfig | undefined => {
  const [formDataExtensions] = useResolvedExtensions(isModelServingDeploymentFormDataExtension);
  const formDataExtension = React.useMemo(
    () => formDataExtensions.find((ext) => ext.properties.platform === platformId) ?? null,
    [formDataExtensions, platformId],
  );
  return formDataExtension?.properties.hardwareProfilePaths;
};
