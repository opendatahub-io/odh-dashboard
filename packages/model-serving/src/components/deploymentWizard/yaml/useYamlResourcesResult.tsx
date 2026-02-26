import React from 'react';
import { parse, stringify } from 'yaml';
import { DeploymentWizardResources } from './useFormToResourcesTransformer';

type UseFormYamlResourcesResult = {
  yaml?: string;
  setYaml: (yaml: string) => void;
  resources: DeploymentWizardResources;
};

/**
 * Constructs a list of K8s resources either from the form data or the YAML text.
 *
 * In form/yaml-preview modes, the YAML string is derived from formResources.
 * In yaml-edit mode, the user's edits are tracked as independent state.
 */
export const useFormYamlResources = (
  formResources: DeploymentWizardResources,
): UseFormYamlResourcesResult => {
  const formAsYaml = React.useMemo(() => {
    try {
      return stringify(formResources.model);
    } catch (error) {
      return undefined;
    }
  }, [formResources]);

  const [editorYaml, setEditorYaml] = React.useState<string | undefined>(formAsYaml);

  const lastUpdatedSource = React.useRef<'form' | 'editor'>('form');
  const yamlResources = React.useMemo<DeploymentWizardResources>(() => {
    try {
      return editorYaml ? { model: parse(editorYaml) } : {};
    } catch (error) {
      return {};
    }
  }, [editorYaml]);

  const setYaml = React.useCallback(
    (yaml: string) => {
      setEditorYaml(yaml);
      lastUpdatedSource.current = 'editor';
    },
    [setEditorYaml],
  );

  return React.useMemo(
    () => ({
      yaml: lastUpdatedSource.current === 'editor' ? editorYaml : formAsYaml,
      setYaml,
      resources: lastUpdatedSource.current === 'editor' ? yamlResources : formResources,
    }),
    [editorYaml, formAsYaml, setYaml, yamlResources, formResources],
  );
};
