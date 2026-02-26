import React from 'react';
import { parse, stringify } from 'yaml';
import { DeploymentWizardResources } from './useFormToResourcesTransformer';
import { ModelDeploymentWizardViewMode } from '../ModelDeploymentWizard';

type UseFormYamlResourcesResult = {
  yaml?: string;
  setYaml: (yaml: string) => void;
  resources: DeploymentWizardResources;
};

/**
 * Constructs a list of K8s resources either from the form data or the YAML text.
 */
export const useFormYamlResources = (
  formResources: DeploymentWizardResources,
  viewMode: ModelDeploymentWizardViewMode,
): UseFormYamlResourcesResult => {
  const formYaml = React.useMemo(() => {
    try {
      return stringify(formResources.model);
    } catch (error) {
      return undefined;
    }
  }, [formResources]);

  const [yaml, setYaml] = React.useState<string | undefined>(formYaml);

  // One way sync from the form yaml to the yaml state
  React.useEffect(() => {
    if (viewMode !== 'yaml-edit') {
      try {
        setYaml(formYaml);
      } catch (error) {
        /* empty */
      }
    }
  }, [formYaml, viewMode]);

  const yamlResources = React.useMemo(() => {
    try {
      return yaml ? { model: parse(yaml) } : {};
    } catch (error) {
      return {};
    }
  }, [yaml]);

  return React.useMemo(
    () => ({
      yaml,
      setYaml,
      resources: viewMode === 'yaml-edit' ? yamlResources : formResources,
    }),
    [yaml, yamlResources, formResources, viewMode],
  );
};
