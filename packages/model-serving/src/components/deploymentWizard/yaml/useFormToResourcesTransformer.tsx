import React from 'react';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { Deployment } from '../../../../extension-points';
import type { WizardFormData } from '../types';
import { useDeployMethod } from '../useDeployMethod';
import { useWizardFieldApply } from '../useWizardFieldApply';

export type ResourceKey = 'model' | 'server';
export type DeploymentWizardResources = Partial<Record<ResourceKey, K8sResourceCommon>>;

export const useFormToResourcesTransformer = (
  formData: WizardFormData,
  existingDeployment?: Deployment,
): { resources?: DeploymentWizardResources; loaded: boolean; errors?: Error[] } => {
  const { deployMethod, deployMethodLoaded, deployMethodErrors } = useDeployMethod(formData.state);
  const assembleDeployment = deployMethod?.properties.assembleDeployment;
  const { applyFieldData, applyExtensionsLoaded, applyExtensionErrors } = useWizardFieldApply(
    formData.state,
    formData.initialData?.navSourceMetadata,
  );

  const loaded = deployMethodLoaded && applyExtensionsLoaded;
  const errors = React.useMemo(() => {
    return [...deployMethodErrors, ...applyExtensionErrors];
  }, [deployMethodErrors, applyExtensionErrors]);

  return React.useMemo(() => {
    if (!assembleDeployment || typeof assembleDeployment !== 'function') {
      return { resources: undefined, loaded, errors };
    }
    let deployment = assembleDeployment(formData, existingDeployment);
    deployment = applyFieldData(deployment);

    return {
      resources: {
        model: deployment.model,
      },
      loaded,
      errors,
    };
  }, [assembleDeployment, formData, existingDeployment, applyFieldData, loaded, errors]);
};
