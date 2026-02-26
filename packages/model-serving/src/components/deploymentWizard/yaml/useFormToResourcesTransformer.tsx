import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  AssembleModelResourceFn,
  isAssembleModelResourceExtension,
  type Deployment,
  type ModelResourceType,
} from '../../../../extension-points';
import type { WizardFormData } from '../types';
import { useWizardFieldApply } from '../useWizardFieldApply';

/**
 * Based on the formData, return the assemble function that will be used to assemble the deployment.
 * @param formData The form in any state
 * @returns The function to assemble and create a Deployment object
 */
const useAssembleDeploymentFn = (
  formData: WizardFormData,
): [AssembleModelResourceFn | undefined, boolean, Error[]] => {
  const [assembleExtensions, assembleExtensionsLoaded, assembleExtensionsErrors] =
    useResolvedExtensions(isAssembleModelResourceExtension);
  const activeExtensions = assembleExtensions.filter((e) =>
    typeof e.properties.isActive === 'function'
      ? e.properties.isActive(formData.state)
      : e.properties.isActive,
  );
  const priorotizedExtensions = activeExtensions.toSorted(
    (a, b) => b.properties.priority - a.properties.priority,
  );
  return [
    priorotizedExtensions.length > 0 ? priorotizedExtensions[0].properties.assemble : undefined,
    assembleExtensionsLoaded,
    assembleExtensionsErrors.filter((error): error is Error => error instanceof Error),
  ];
};

export type DeploymentWizardResources = {
  model?: ModelResourceType;
  // server?: ServerResourceType;
};

/**
 * Based on the formData, return the resources (only LLMInferenceService for now).
 * @param formData The form in any state
 * @param existingDeployment When editing an existing deployment
 * @returns The resources (only LLMInferenceService for now) that will be used to create the deployment
 */
export const useFormToResourcesTransformer = (
  formData: WizardFormData,
  existingDeployment?: Deployment,
): { resources: DeploymentWizardResources; loaded: boolean; errors?: Error[] } => {
  // As of now, the assembleFn is what creates the Deployment / model resource with most form data applied.
  // applyFieldData is then used to apply the field data to the deployment.
  const [assembleDeploymentFn, assembleDeploymentFnLoaded, assembleDeploymentFnErrors] =
    useAssembleDeploymentFn(formData);
  const { applyFieldData, applyExtensionsLoaded, applyExtensionErrors } = useWizardFieldApply(
    formData.state,
    formData.initialData?.navSourceMetadata,
  );

  const loaded = assembleDeploymentFnLoaded && applyExtensionsLoaded;
  const errors = React.useMemo(() => {
    return [...assembleDeploymentFnErrors, ...applyExtensionErrors];
  }, [assembleDeploymentFnErrors, applyExtensionErrors]);

  return React.useMemo(() => {
    if (!assembleDeploymentFn) {
      return { resources: {}, loaded, errors };
    }
    let deployment = assembleDeploymentFn(formData, existingDeployment);
    deployment = applyFieldData(deployment);

    return {
      resources: {
        model: deployment.model,
      },
      loaded,
      errors,
    };
  }, [assembleDeploymentFn, formData, existingDeployment, applyFieldData, loaded, errors]);
};
