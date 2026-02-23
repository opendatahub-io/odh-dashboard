import React from 'react';
import { stringify } from 'yaml';
import { DeploymentWizardResources } from './useFormToResourcesTransformer';

type UseFormYamlResourcesResult = {
  yaml?: string;
  // setYaml: (yaml: string) => void;
  // resources: Record<string, K8sResourceCommon>;
  // errors: Error[];
};

/**
 * Constructs a list of K8s resources either from the form data or the YAML text.
 */
export const useFormYamlResources = (
  formResources?: DeploymentWizardResources,
): UseFormYamlResourcesResult => {
  const yaml = React.useMemo(() => {
    if (!formResources) {
      return undefined;
    }

    return stringify(formResources.model);
  }, [formResources]);

  return React.useMemo(
    () => ({
      yaml,
    }),
    [yaml],
  );
};
