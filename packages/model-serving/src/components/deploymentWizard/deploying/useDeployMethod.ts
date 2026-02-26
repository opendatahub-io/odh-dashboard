import React from 'react';
import type { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { WizardFormData } from '../types';
import {
  isModelServingDeploy,
  type Deployment,
  type ModelServingDeploy,
} from '../../../../extension-points';
import { DeploymentWizardResources } from '../yaml/useFormToResourcesTransformer';

export type DeployExtension = ResolvedExtension<ModelServingDeploy<Deployment>>['properties'];

export const useDeployMethod = (
  wizardData: WizardFormData['state'],
  resources?: DeploymentWizardResources,
): {
  deployMethod?: ResolvedExtension<ModelServingDeploy<Deployment>>;
  deployMethodLoaded: boolean;
  deployMethodErrors: Error[];
} => {
  const [deployExtensions, deployExtensionsLoaded, deployExtensionsErrors] =
    useResolvedExtensions(isModelServingDeploy);

  return React.useMemo(() => {
    const sortedDeployExtensions = deployExtensions
      .filter((e) =>
        typeof e.properties.isActive === 'function'
          ? e.properties.isActive(wizardData, resources)
          : e.properties.isActive,
      )
      .toSorted((a, b) => b.properties.priority - a.properties.priority);

    return {
      deployMethod: sortedDeployExtensions.length > 0 ? sortedDeployExtensions[0] : undefined,
      deployMethodLoaded: deployExtensionsLoaded,
      deployMethodErrors: deployExtensionsErrors.filter(
        (error): error is Error => error instanceof Error,
      ),
    };
  }, [deployExtensions, deployExtensionsErrors, deployExtensionsLoaded, wizardData, resources]);
};
