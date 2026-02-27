import React from 'react';
import { parse, stringify } from 'yaml';
import { DeploymentAssemblyResources } from '../../../../extension-points';

type UseFormYamlResourcesResult = {
  yaml?: string;
  setYaml: (yaml: string) => void;
  resources: DeploymentAssemblyResources;
  error?: Error;
};

/**
 * Constructs a list of K8s resources either from the form data or the YAML text.
 *
 * In form/yaml-preview modes, the YAML string is derived from formResources.
 * In yaml-edit mode, the user's edits are tracked as independent state.
 */
export const useFormYamlResources = (
  formResources: DeploymentAssemblyResources,
): UseFormYamlResourcesResult => {
  const { formAsYaml, formAsYamlError } = React.useMemo(() => {
    try {
      return { formAsYaml: stringify(formResources.model) };
    } catch (error) {
      return {
        formAsYaml: undefined,
        formAsYamlError:
          error instanceof Error ? error : new Error('Failed to convert form resources to YAML'),
      };
    }
  }, [formResources]);

  const [editorYaml, setEditorYaml] = React.useState<string | undefined>(formAsYaml);

  const lastUpdatedSource = React.useRef<'form' | 'editor'>('form');
  const { yamlResources, yamlResourcesError } = React.useMemo(() => {
    try {
      return { yamlResources: editorYaml ? { model: parse(editorYaml) } : {} };
    } catch (error) {
      return {
        yamlResources: {},
        yamlResourcesError:
          error instanceof Error ? error : new Error('Failed to parse invalid YAML'),
      };
    }
  }, [editorYaml]);

  const setYaml = React.useCallback(
    (yaml: string) => {
      setEditorYaml(yaml);
      lastUpdatedSource.current = 'editor';
    },
    [setEditorYaml],
  );

  return React.useMemo(() => {
    return {
      yaml: lastUpdatedSource.current === 'editor' ? editorYaml : formAsYaml,
      setYaml,
      resources: lastUpdatedSource.current === 'editor' ? yamlResources : formResources,
      error: lastUpdatedSource.current === 'editor' ? yamlResourcesError : formAsYamlError,
    };
  }, [
    editorYaml,
    formAsYaml,
    setYaml,
    yamlResources,
    formResources,
    yamlResourcesError,
    formAsYamlError,
  ]);
};
