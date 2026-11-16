import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { type Deployment } from '../../../../extension-points';
import {
  type AssembleModelResourceFn,
  type DeploymentAssemblyResources,
  isAssembleModelResourceExtension,
} from '../../../../extension-points/deployment-wizard';
import type { WizardFormData } from '../../../shared/types/form-data';
import { useWizardFieldApply } from '../useWizardFieldApply';
import { getConnectionSecret } from '../utils';

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

/**
 * Based on the formData, return the resources (only LLMInferenceService for now).
 * @param formData The form in any state
 * @param existingDeployment When editing an existing deployment
 * @returns The resources (only LLMInferenceService for now) that will be used to create the deployment
 */
export const useFormToResourcesTransformer = (
  formData: WizardFormData,
  existingDeployment?: Deployment,
): {
  resources: DeploymentAssemblyResources<Deployment>;
  setLatestResourcesFromYaml: (newResources: DeploymentAssemblyResources) => void;
  loaded: boolean;
  errors?: Error[];
} => {
  // Keep track of the latest resources from YAML (or edit on first load) so we can merge unmanaged properties added via YAML
  const [lastestResourcesFromYamlOrEdit, setLatestResourcesFromYaml] = React.useState<
    DeploymentAssemblyResources | undefined
  >(existingDeployment);
  // As of now, the assembleFn is what creates the Deployment / model resource with most form data applied.
  // applyFieldData is then used to apply the field data to the deployment.
  const [assembleDeploymentFn, assembleDeploymentFnLoaded, assembleDeploymentFnErrors] =
    useAssembleDeploymentFn(formData);
  const {
    applyAllFieldDataFn: applyFieldData,
    applyExtensionsLoaded,
    applyExtensionErrors,
  } = useWizardFieldApply(formData.state, formData.initialData?.navSourceMetadata);

  const loaded = assembleDeploymentFnLoaded && applyExtensionsLoaded;
  const errors = React.useMemo(() => {
    return [...assembleDeploymentFnErrors, ...applyExtensionErrors];
  }, [assembleDeploymentFnErrors, applyExtensionErrors]);

  const formResources: DeploymentAssemblyResources<Deployment> = React.useMemo(() => {
    if (!assembleDeploymentFn) {
      return {};
    }
    let deployment = assembleDeploymentFn(
      formData,
      lastestResourcesFromYamlOrEdit,
      undefined,
      getConnectionSecret(formData.state),
    );
    deployment = applyFieldData(deployment);

    return {
      model: deployment.model,
      ...(deployment.server ? { server: deployment.server } : {}),
    };
  }, [applyFieldData, assembleDeploymentFn, lastestResourcesFromYamlOrEdit, formData]);

  return React.useMemo(
    () => ({
      resources: formResources,
      setLatestResourcesFromYaml: (newResources: DeploymentAssemblyResources | undefined) => {
        setLatestResourcesFromYaml((prev) => {
          return { ...prev, model: newResources?.model };
        });
      },
      loaded,
      errors,
    }),
    [formResources, loaded, errors],
  );
};
