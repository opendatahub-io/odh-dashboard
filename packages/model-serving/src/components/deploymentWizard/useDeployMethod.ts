import React from 'react';
import type { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from './types';
import {
  isModelServingDeploy,
  type Deployment,
  type ModelServingDeploy,
} from '../../../extension-points';

export const useDeployMethod = (
  wizardData: WizardFormData['state'],
): {
  deployMethod?: ResolvedExtension<ModelServingDeploy<Deployment>>;
  deployMethodLoaded: boolean;
  deployMethodErrors: unknown[];
} => {
  const [deployExtensions, deployExtensionsLoaded, deployExtensionsErrors] =
    useResolvedExtensions(isModelServingDeploy);

  return React.useMemo(() => {
    const sortedDeployExtensions = deployExtensions
      .filter((e) =>
        typeof e.properties.isActive === 'function'
          ? e.properties.isActive(wizardData)
          : e.properties.isActive,
      )
      .toSorted((a, b) => (b.properties.priority ?? 0) - (a.properties.priority ?? 0));

    return {
      deployMethod: sortedDeployExtensions.length > 0 ? sortedDeployExtensions[0] : undefined,
      deployMethodLoaded: deployExtensionsLoaded,
      deployMethodErrors: deployExtensionsErrors,
    };
  }, [deployExtensions, wizardData]);
};
